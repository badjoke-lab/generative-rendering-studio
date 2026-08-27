import type { PointField, Rgba, Vec2 } from "./index";
import type { RasterPixels } from "./sampling";

export interface RasterMaskOptions {
  readonly strength?: number;
  readonly invert?: boolean;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function maskValueAtUv(raster: RasterPixels, uv: Vec2) {
  const x = Math.round(clamp01(uv[0]) * Math.max(0, raster.width - 1));
  const y = Math.round(clamp01(uv[1]) * Math.max(0, raster.height - 1));
  const offset = (y * raster.width + x) * 4;
  const r = raster.data[offset] ?? 0;
  const g = raster.data[offset + 1] ?? 0;
  const b = raster.data[offset + 2] ?? 0;
  const a = (raster.data[offset + 3] ?? 0) / 255;
  return clamp01(((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * a);
}

export function applyRasterMaskToPointField(
  field: PointField,
  mask: RasterPixels,
  options: RasterMaskOptions = {},
): PointField {
  const strength = clamp01(options.strength ?? 1);
  const invert = options.invert ?? false;

  return {
    kind: "point-field",
    samples: field.samples.map((sample) => {
      const rawMask = sample.sourceUv ? maskValueAtUv(mask, sample.sourceUv) : 1;
      const resolvedMask = invert ? 1 - rawMask : rawMask;
      const visibility = 1 - strength + resolvedMask * strength;
      const sourceColor = sample.color ?? ([1, 1, 1, 1] as Rgba);
      const color: Rgba = [sourceColor[0], sourceColor[1], sourceColor[2], sourceColor[3] * visibility];
      return {
        ...sample,
        color,
        density: (sample.density ?? 1) * visibility,
      };
    }),
  };
}
