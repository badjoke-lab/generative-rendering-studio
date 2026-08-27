import type { PointField, Rgba, Vec2 } from "./index";
import type { RasterPixels } from "./sampling";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function textureColorAtUv(raster: RasterPixels, uv: Vec2): Rgba {
  const x = Math.round(clamp01(uv[0]) * Math.max(0, raster.width - 1));
  const y = Math.round(clamp01(uv[1]) * Math.max(0, raster.height - 1));
  const offset = (y * raster.width + x) * 4;
  return [
    (raster.data[offset] ?? 0) / 255,
    (raster.data[offset + 1] ?? 0) / 255,
    (raster.data[offset + 2] ?? 0) / 255,
    (raster.data[offset + 3] ?? 255) / 255,
  ];
}

export function applyRasterTextureToPointField(field: PointField, texture: RasterPixels): PointField {
  return {
    kind: "point-field",
    samples: field.samples.map((sample) => {
      if (!sample.sourceUv) return sample;
      const textureColor = textureColorAtUv(texture, sample.sourceUv);
      const sourceColor = sample.color ?? ([1, 1, 1, 1] as Rgba);
      const color: Rgba = [textureColor[0], textureColor[1], textureColor[2], sourceColor[3]];
      return { ...sample, color };
    }),
  };
}
