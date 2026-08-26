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
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function sampleRasterToPointField(
  raster: RasterPixels,
  options: RasterSampleOptions = {},
): PointField {
  const maxPoints = Math.max(1, options.maxPoints ?? 12000);
  const alphaThreshold = options.alphaThreshold ?? 0.05;
  const luminanceThreshold = options.luminanceThreshold ?? 0.04;
  const total = Math.max(1, raster.width * raster.height);
  const step = Math.max(1, Math.ceil(Math.sqrt(total / maxPoints)));
  const samples = [];

  for (let y = 0; y < raster.height; y += step) {
    for (let x = 0; x < raster.width; x += step) {
      const i = (y * raster.width + x) * 4;
      const r = raster.data[i] ?? 0;
      const g = raster.data[i + 1] ?? 0;
      const b = raster.data[i + 2] ?? 0;
      const a = (raster.data[i + 3] ?? 0) / 255;
      const l = luminance(r, g, b);
      if (a < alphaThreshold || l < luminanceThreshold) continue;

      const px = raster.width <= 1 ? 0 : (x / (raster.width - 1)) * 2 - 1;
      const py = raster.height <= 1 ? 0 : 1 - (y / (raster.height - 1)) * 2;
      const color: Rgba = [r / 255, g / 255, b / 255, a];
      samples.push({
        position: [px, py, 0] as const,
        color,
        density: l,
        sourceUv: [x / Math.max(1, raster.width - 1), y / Math.max(1, raster.height - 1)] as const,
      });
    }
  }

  return { kind: "point-field", samples };
}

export function pointFieldToFloat32(field: PointField) {
  const positions = new Float32Array(field.samples.length * 2);
  const colors = new Float32Array(field.samples.length * 4);
  field.samples.forEach((sample, index) => {
    positions[index * 2] = sample.position[0];
    positions[index * 2 + 1] = sample.position[1];
    const color = sample.color ?? [1, 1, 1, 1];
    colors.set(color, index * 4);
  });
  return { positions, colors };
}
