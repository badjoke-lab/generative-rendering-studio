import type { PointField, Rgba } from "./index";

export interface RasterPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface RasterSampleOptions {
  readonly maxPoints?: number;
  readonly alphaThreshold?: number;
  readonly luminanceThreshold?: number;
  readonly edgeWeight?: number;
  readonly ditherStrength?: number;
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pixelLuminance(raster: RasterPixels, x: number, y: number) {
  const sx = Math.min(raster.width - 1, Math.max(0, x));
  const sy = Math.min(raster.height - 1, Math.max(0, y));
  const i = (sy * raster.width + sx) * 4;
  return luminance(raster.data[i] ?? 0, raster.data[i + 1] ?? 0, raster.data[i + 2] ?? 0);
}

function edgeMagnitude(raster: RasterPixels, x: number, y: number) {
  const gx = pixelLuminance(raster, x + 1, y) - pixelLuminance(raster, x - 1, y);
  const gy = pixelLuminance(raster, x, y + 1) - pixelLuminance(raster, x, y - 1);
  return Math.min(1, Math.sqrt(gx * gx + gy * gy));
}

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

function orderedDither(x: number, y: number) {
  const value = BAYER_4X4[(y & 3) * 4 + (x & 3)] ?? 0;
  return (value + 0.5) / 16 - 0.5;
}

function rasterAspectScale(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  if (safeWidth >= safeHeight) return [1, safeHeight / safeWidth] as const;
  return [safeWidth / safeHeight, 1] as const;
}

export function sampleRasterToPointField(
  raster: RasterPixels,
  options: RasterSampleOptions = {},
): PointField {
  const maxPoints = Math.max(1, options.maxPoints ?? 12000);
  const alphaThreshold = options.alphaThreshold ?? 0.05;
  const luminanceThreshold = options.luminanceThreshold ?? 0.04;
  const edgeWeight = Math.min(1, Math.max(0, options.edgeWeight ?? 0));
  const ditherStrength = Math.min(1, Math.max(0, options.ditherStrength ?? 0));
  const total = Math.max(1, raster.width * raster.height);
  const step = Math.max(1, Math.ceil(Math.sqrt(total / maxPoints)));
  const samples = [];
  const [aspectScaleX, aspectScaleY] = rasterAspectScale(raster.width, raster.height);

  for (let y = 0; y < raster.height; y += step) {
    for (let x = 0; x < raster.width; x += step) {
      const i = (y * raster.width + x) * 4;
      const r = raster.data[i] ?? 0;
      const g = raster.data[i + 1] ?? 0;
      const b = raster.data[i + 2] ?? 0;
      const a = (raster.data[i + 3] ?? 0) / 255;
      const l = luminance(r, g, b);
      const edge = edgeWeight > 0 ? edgeMagnitude(raster, x, y) : 0;
      const importance = Math.max(l, edge * edgeWeight);
      const threshold = luminanceThreshold + orderedDither(x, y) * ditherStrength * 0.16;
      if (a < alphaThreshold || importance < threshold) continue;

      const normalizedX = raster.width <= 1 ? 0 : (x / (raster.width - 1)) * 2 - 1;
      const normalizedY = raster.height <= 1 ? 0 : 1 - (y / (raster.height - 1)) * 2;
      const px = normalizedX * aspectScaleX;
      const py = normalizedY * aspectScaleY;
      const color: Rgba = [r / 255, g / 255, b / 255, a];
      samples.push({
        position: [px, py, 0] as const,
        color,
        density: Math.min(1, importance),
        sourceUv: [x / Math.max(1, raster.width - 1), y / Math.max(1, raster.height - 1)] as const,
      });
    }
  }

  return { kind: "point-field", samples };
}

export function pointFieldToFloat32(field: PointField) {
  const positions = new Float32Array(field.samples.length * 2);
  const colors = new Float32Array(field.samples.length * 4);
  const densities = new Float32Array(field.samples.length);
  field.samples.forEach((sample, index) => {
    positions[index * 2] = sample.position[0];
    positions[index * 2 + 1] = sample.position[1];
    const color = sample.color ?? [1, 1, 1, 1];
    colors.set(color, index * 4);
    densities[index] = sample.density ?? 1;
  });
  return { positions, colors, densities };
}
