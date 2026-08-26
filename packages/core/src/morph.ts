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

function spatialOrder(field: PointField) {
  return field.samples
    .map((sample, index) => ({ index, x: sample.position[0], y: sample.position[1] }))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.index - b.index)
    .map((entry) => entry.index);
}

export function createMorphMapping(from: PointField, to: PointField): MorphMapping {
  const count = Math.max(from.samples.length, to.samples.length);
  if (count === 0) return { pairs: [] };

  const fromOrder = spatialOrder(from);
  const toOrder = spatialOrder(to);
  const pairs: MorphPair[] = [];

  for (let i = 0; i < count; i += 1) {
    const fromIndex = fromOrder[sourceIndexForTarget(i, fromOrder.length, count)] ?? 0;
    const toIndex = toOrder[sourceIndexForTarget(i, toOrder.length, count)] ?? 0;
    pairs.push({
      from: positionOf(from, fromIndex),
      to: positionOf(to, toIndex),
      fromColor: colorOf(from, fromIndex),
      toColor: colorOf(to, toIndex),
    });
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
