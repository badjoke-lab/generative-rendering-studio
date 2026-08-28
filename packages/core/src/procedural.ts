import type { FieldSample, PointField } from "./index";

export type PrimitiveProceduralSourceKind = "sphere" | "torus" | "grid" | "spiral";
export type FlowNoiseProceduralSourceKind = "wave" | "ribbon" | "vortex" | "noise";
export type OrganicProceduralPresetKind = "bloom" | "filament" | "cluster";

// User-facing procedural kinds currently exposed by the browser UI.
export type GeneratedProceduralSourceKind = PrimitiveProceduralSourceKind | FlowNoiseProceduralSourceKind;
// Full generator surface. Organic presets can land in core before a reviewed UI slice exposes them.
export type ProceduralGeneratorKind = GeneratedProceduralSourceKind | OrganicProceduralPresetKind;

// Compatibility alias for the historical primitive-source surface.
export type ProceduralSourceKind = PrimitiveProceduralSourceKind;

export interface ProceduralPointFieldOptions {
  readonly kind: ProceduralGeneratorKind;
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

function generateWave(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const columns = Math.max(16, Math.ceil(Math.sqrt(count * 5)));
  const rows = Math.max(2, Math.ceil(count / columns));
  const phase = hash01(0, seed) * TAU;
  for (let row = 0; row < rows && samples.length < count; row += 1) {
    for (let column = 0; column < columns && samples.length < count; column += 1) {
      const i = row * columns + column;
      const tx = columns <= 1 ? 0 : column / (columns - 1);
      const ty = rows <= 1 ? 0.5 : row / (rows - 1);
      const x = tx * 2 - 1;
      const band = (ty - 0.5) * 0.42;
      const y = Math.sin(x * Math.PI * 2.2 + phase) * 0.34 + band;
      const z = Math.cos(x * Math.PI * 1.6 + phase) * 0.12 + (hash01(i, seed + 19) - 0.5) * 0.025;
      samples.push(sample([x * scale, y * scale, z * scale], 0.7 + 0.3 * (1 - Math.abs(band) / 0.21), 4));
    }
  }
  return samples;
}

function generateRibbon(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const columns = Math.max(16, Math.ceil(Math.sqrt(count * 6)));
  const rows = Math.max(2, Math.ceil(count / columns));
  const phase = hash01(1, seed) * TAU;
  for (let row = 0; row < rows && samples.length < count; row += 1) {
    for (let column = 0; column < columns && samples.length < count; column += 1) {
      const i = row * columns + column;
      const t = columns <= 1 ? 0 : column / (columns - 1);
      const across = rows <= 1 ? 0 : row / (rows - 1) * 2 - 1;
      const x = t * 2 - 1;
      const center = Math.sin(t * TAU * 1.35 + phase) * 0.3;
      const twist = Math.cos(t * TAU * 2 + phase) * 0.11;
      const y = center + across * twist;
      const z = across * Math.sin(t * TAU * 2 + phase) * 0.18 + (hash01(i, seed + 31) - 0.5) * 0.01;
      samples.push(sample([x * scale, y * scale, z * scale], 0.72 + 0.28 * (1 - Math.abs(across)), 5));
    }
  }
  return samples;
}

function generateVortex(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const arms = 4;
  const turns = 4.5;
  const phase = hash01(2, seed) * TAU;
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const arm = i % arms;
    const radialNoise = (hash01(i, seed + 43) - 0.5) * 0.035;
    const radius = Math.min(0.95, 0.05 + Math.pow(t, 0.68) * 0.88 + radialNoise);
    const angle = t * turns * TAU + (arm / arms) * TAU + phase;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (0.5 - t) * 0.32;
    samples.push(sample([x * scale, y * scale, z * scale], 0.5 + 0.5 * (1 - t * 0.55), 6));
  }
  return samples;
}

function generateNoise(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (hash01(i * 3 + 0, seed + 59) * 2 - 1) * 0.94;
    const y = (hash01(i * 3 + 1, seed + 61) * 2 - 1) * 0.94;
    const noise = hash01(i * 3 + 2, seed + 67);
    const radial = Math.sqrt(x * x + y * y);
    const warp = Math.sin((x + noise * 0.35) * 7.5) * Math.cos((y - noise * 0.2) * 6.5);
    const warpedX = Math.max(-0.99, Math.min(0.99, x + warp * 0.045));
    const warpedY = Math.max(-0.99, Math.min(0.99, y + warp * 0.045));
    const z = (noise - 0.5) * 0.42;
    const density = Math.max(0.2, Math.min(1, 0.95 - radial * 0.3 + Math.abs(warp) * 0.2));
    samples.push(sample([warpedX * scale, warpedY * scale, z * scale], density, 7));
  }
  return samples;
}

function generateBloom(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const petals = 7;
  const phase = hash01(3, seed) * TAU;
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const angle = t * TAU * 9 + phase + (hash01(i, seed + 71) - 0.5) * 0.035;
    const petal = 0.56 + 0.28 * Math.cos(petals * angle);
    const layer = 0.35 + 0.65 * Math.sqrt(hash01(i, seed + 73));
    const radius = Math.min(0.94, petal * layer);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = Math.sin(petals * angle * 0.5) * (1 - layer) * 0.22;
    samples.push(sample([x * scale, y * scale, z * scale], 0.55 + 0.45 * layer, 8));
  }
  return samples;
}

function generateFilament(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const strands = 9;
  const phase = hash01(4, seed) * TAU;
  for (let i = 0; i < count; i += 1) {
    const strand = i % strands;
    const step = Math.floor(i / strands);
    const steps = Math.max(1, Math.ceil(count / strands) - 1);
    const t = Math.min(1, step / steps);
    const offset = (strand / Math.max(1, strands - 1) - 0.5) * 0.7;
    const sway = Math.sin(t * TAU * (1.15 + strand * 0.035) + phase + strand * 0.44) * 0.18;
    const x = (t * 2 - 1) * 0.9;
    const y = offset + sway + (hash01(i, seed + 79) - 0.5) * 0.025;
    const z = Math.cos(t * TAU * 1.7 + strand * 0.65 + phase) * 0.16;
    samples.push(sample([x * scale, y * scale, z * scale], 0.62 + 0.38 * (1 - Math.abs(offset)), 9));
  }
  return samples;
}

function generateCluster(count: number, scale: number, seed: number) {
  const samples: FieldSample[] = [];
  const centers = Array.from({ length: 6 }, (_, index) => {
    const angle = hash01(index * 5 + 1, seed + 83) * TAU;
    const radius = 0.18 + hash01(index * 5 + 2, seed + 89) * 0.52;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
  for (let i = 0; i < count; i += 1) {
    const centerIndex = Math.floor(hash01(i, seed + 97) * centers.length) % centers.length;
    const center = centers[centerIndex] ?? [0, 0];
    const angle = hash01(i * 3 + 1, seed + 101) * TAU;
    const radial = Math.pow(hash01(i * 3 + 2, seed + 103), 1.7) * 0.24;
    const x = Math.max(-0.98, Math.min(0.98, center[0] + Math.cos(angle) * radial));
    const y = Math.max(-0.98, Math.min(0.98, center[1] + Math.sin(angle) * radial));
    const z = (hash01(i * 3 + 3, seed + 107) - 0.5) * 0.26;
    const density = 0.58 + 0.42 * (1 - Math.min(1, radial / 0.24));
    samples.push(sample([x * scale, y * scale, z * scale], density, 10));
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
    case "wave":
      samples = generateWave(count, scale, seed);
      break;
    case "ribbon":
      samples = generateRibbon(count, scale, seed);
      break;
    case "vortex":
      samples = generateVortex(count, scale, seed);
      break;
    case "noise":
      samples = generateNoise(count, scale, seed);
      break;
    case "bloom":
      samples = generateBloom(count, scale, seed);
      break;
    case "filament":
      samples = generateFilament(count, scale, seed);
      break;
    case "cluster":
      samples = generateCluster(count, scale, seed);
      break;
  }

  return { kind: "point-field", samples };
}
