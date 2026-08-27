import type { PointField, Rgba, Vec3 } from "./index";

export type MorphEasing = "linear" | "ease-in-out" | "smoothstep";

export interface MorphPair {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly fromColor: Rgba;
  readonly toColor: Rgba;
}

export interface MorphMapping {
  readonly pairs: readonly MorphPair[];
}

const MORPH_ANGLE_BUCKETS = 128;
const TAU = Math.PI * 2;

function colorOf(field: PointField, index: number): Rgba {
  return field.samples[index]?.color ?? [1, 1, 1, 1];
}

function positionOf(field: PointField, index: number): Vec3 {
  return field.samples[index]?.position ?? [0, 0, 0];
}

function normalizedIndex(index: number, count: number) {
  return count <= 1 ? 0 : index / (count - 1);
}

function sourceIndexForTarget(index: number, sourceCount: number, targetCount: number) {
  if (sourceCount <= 1 || targetCount <= 1) return 0;
  return Math.min(sourceCount - 1, Math.round(normalizedIndex(index, targetCount) * (sourceCount - 1)));
}

function centroid(field: PointField) {
  if (field.samples.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const sample of field.samples) {
    x += sample.position[0];
    y += sample.position[1];
  }
  return { x: x / field.samples.length, y: y / field.samples.length };
}

function angularBuckets(field: PointField, bucketCount = MORPH_ANGLE_BUCKETS) {
  const buckets: Array<Array<{ index: number; radius: number; x: number; y: number }>> = Array.from(
    { length: bucketCount },
    () => [],
  );
  if (field.samples.length === 0) return buckets.map(() => [] as number[]);

  const center = centroid(field);
  field.samples.forEach((sample, index) => {
    const x = sample.position[0];
    const y = sample.position[1];
    const dx = x - center.x;
    const dy = y - center.y;
    const angle = (Math.atan2(dy, dx) + TAU) % TAU;
    const bucket = Math.min(bucketCount - 1, Math.floor((angle / TAU) * bucketCount));
    buckets[bucket].push({ index, radius: Math.hypot(dx, dy), x, y });
  });

  return buckets.map((entries) => entries
    .sort((a, b) => a.radius - b.radius || a.x - b.x || a.y - b.y || a.index - b.index)
    .map((entry) => entry.index));
}

function nearestNonEmptyBucket(buckets: readonly (readonly number[])[], index: number) {
  if (buckets[index]?.length) return buckets[index];
  for (let distance = 1; distance < buckets.length; distance += 1) {
    const lower = buckets[(index - distance + buckets.length) % buckets.length];
    if (lower?.length) return lower;
    const upper = buckets[(index + distance) % buckets.length];
    if (upper?.length) return upper;
  }
  return [] as readonly number[];
}

function outputCountByBucket(
  fromBuckets: readonly (readonly number[])[],
  toBuckets: readonly (readonly number[])[],
  outputCount: number,
) {
  if (outputCount <= 0) return fromBuckets.map(() => 0);
  const fromTotal = Math.max(1, fromBuckets.reduce((sum, bucket) => sum + bucket.length, 0));
  const toTotal = Math.max(1, toBuckets.reduce((sum, bucket) => sum + bucket.length, 0));
  const weights = fromBuckets.map((bucket, index) => Math.max(
    bucket.length / fromTotal,
    (toBuckets[index]?.length ?? 0) / toTotal,
  ));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) return fromBuckets.map(() => 0);

  const raw = weights.map((weight) => (weight / weightTotal) * outputCount);
  const counts = raw.map((value) => Math.floor(value));
  let remaining = outputCount - counts.reduce((sum, value) => sum + value, 0);
  const remainderOrder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; i < remainderOrder.length && remaining > 0; i += 1, remaining -= 1) {
    counts[remainderOrder[i].index] += 1;
  }
  return counts;
}

function sampledBucketIndex(bucket: readonly number[], index: number, outputCount: number) {
  if (bucket.length === 0) return 0;
  return bucket[sourceIndexForTarget(index, bucket.length, outputCount)] ?? bucket[0] ?? 0;
}

export function createMorphMapping(from: PointField, to: PointField): MorphMapping {
  const count = Math.max(from.samples.length, to.samples.length);
  if (count === 0) return { pairs: [] };

  const fromBuckets = angularBuckets(from);
  const toBuckets = angularBuckets(to);
  const bucketCounts = outputCountByBucket(fromBuckets, toBuckets, count);
  const pairs: MorphPair[] = [];

  for (let bucketIndex = 0; bucketIndex < bucketCounts.length; bucketIndex += 1) {
    const bucketCount = bucketCounts[bucketIndex] ?? 0;
    if (bucketCount <= 0) continue;
    const fromBucket = nearestNonEmptyBucket(fromBuckets, bucketIndex);
    const toBucket = nearestNonEmptyBucket(toBuckets, bucketIndex);

    for (let i = 0; i < bucketCount; i += 1) {
      const fromIndex = sampledBucketIndex(fromBucket, i, bucketCount);
      const toIndex = sampledBucketIndex(toBucket, i, bucketCount);
      pairs.push({
        from: positionOf(from, fromIndex),
        to: positionOf(to, toIndex),
        fromColor: colorOf(from, fromIndex),
        toColor: colorOf(to, toIndex),
      });
    }
  }

  return { pairs };
}

export function applyMorphEasing(progress: number, easing: MorphEasing) {
  const t = Math.min(1, Math.max(0, progress));
  if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  if (easing === "smoothstep") return t * t * (3 - 2 * t);
  return t;
}

export function morphMappingToFloat32(mapping: MorphMapping) {
  const fromPositions = new Float32Array(mapping.pairs.length * 2);
  const toPositions = new Float32Array(mapping.pairs.length * 2);
  const fromColors = new Float32Array(mapping.pairs.length * 4);
  const toColors = new Float32Array(mapping.pairs.length * 4);

  mapping.pairs.forEach((pair, index) => {
    fromPositions[index * 2] = pair.from[0];
    fromPositions[index * 2 + 1] = pair.from[1];
    toPositions[index * 2] = pair.to[0];
    toPositions[index * 2 + 1] = pair.to[1];
    fromColors.set(pair.fromColor, index * 4);
    toColors.set(pair.toColor, index * 4);
  });

  return { fromPositions, toPositions, fromColors, toColors };
}
