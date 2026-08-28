import type { FieldSample, PointField } from "./index";

export type ProceduralSourceKind = "sphere" | "torus" | "grid" | "spiral";

export interface ProceduralPointFieldOptions {
  readonly kind: ProceduralSourceKind;
  readonly count?: number;
  readonly scale?: number;
  readonly seed?: number;
}

const TAU = Math.PI * 2;

function clampCount(value: number | undefined) {
  return Math.max(16, Math.min(50000, Math.round(value ?? 6000)));
}

function clampScale(value: number | undefined) {
  return Math.max(0.05, Math.min(1.5, value ?? 0.9));
}

function hash01(index: number, seed: number) {
  let x = (index ^ seed) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
}

function sample(position: readonly [number, number, number], density = 1, group = 0): FieldSample {
  return {
    position,
    density,
    color: [1, 1, 1, 1],
    group,
  };
}

function generateSphere(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const y = 1 - t * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i + hash01(i, seed) * 0.025;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    samples.push(sample([x * scale, y * scale, z * scale], 0.7 + 0.3 * (1 - Math.abs(z)), 0));
  }
  return samples;
}

function generateTorus(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const major = 0.62;
  const minor = 0.28;
  const uCount = Math.max(8, Math.round(Math.sqrt(count * 2)));
  const vCount = Math.max(4, Math.ceil(count / uCount));
  for (let v = 0; v < vCount && samples.length < count; v += 1) {
    for (let u = 0; u < uCount && samples.length < count; u += 1) {
      const i = v * uCount + u;
      const a = (u / uCount) * TAU + hash01(i, seed) * 0.01;
      const b = (v / vCount) * TAU;
      const ring = major + minor * Math.cos(b);
      const x = ring * Math.cos(a);
      const y = minor * Math.sin(b);
      const z = ring * Math.sin(a);
      samples.push(sample([x * scale, y * scale, z * scale], 0.75 + 0.25 * Math.cos(b) ** 2, 1));
    }
  }
  return samples;
}

function generateGrid(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const side = Math.max(4, Math.ceil(Math.sqrt(count)));
  for (let y = 0; y < side && samples.length < count; y += 1) {
    for (let x = 0; x < side && samples.length < count; x += 1) {
      const i = y * side + x;
      const nx = side <= 1 ? 0 : (x / (side - 1)) * 2 - 1;
      const ny = side <= 1 ? 0 : 1 - (y / (side - 1)) * 2;
      const jitter = (hash01(i, seed) - 0.5) * (2 / side) * 0.08;
      samples.push(sample([(nx + jitter) * scale, (ny - jitter) * scale, 0], 1, 2));
    }
  }
  return samples;
}

function generateSpiral(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const turns = 7;
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const angle = t * turns * TAU + hash01(i, seed) * 0.012;
    const radius = Math.pow(t, 0.72) * scale;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (t - 0.5) * 0.35 * scale;
    samples.push(sample([x, y, z], 0.55 + 0.45 * t, 3));
  }
  return samples;
}

export function generateProceduralPointField(options: ProceduralPointFieldOptions): PointField {
  const count = clampCount(options.count);
  const scale = clampScale(options.scale);
  const seed = options.seed ?? 1;

  let samples: readonly FieldSample[];
  switch (options.kind) {
    case "sphere":
      samples = generateSphere(count, scale, seed);
      break;
    case "torus":
      samples = generateTorus(count, scale, seed);
      break;
    case "grid":
      samples = generateGrid(count, scale, seed);
      break;
    case "spiral":
      samples = generateSpiral(count, scale, seed);
      break;
  }

  return { kind: "point-field", samples };
}
