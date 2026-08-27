import type { RasterPixels } from "./sampling";

/**
 * Returns alpha-weighted BT.709 luminance in the normalized 0..1 range.
 * Fully transparent pixels do not influence the result.
 */
export function analyzeRasterLuminance(raster: RasterPixels) {
  let weightedLuminance = 0;
  let alphaWeight = 0;

  for (let offset = 0; offset < raster.data.length; offset += 4) {
    const r = (raster.data[offset] ?? 0) / 255;
    const g = (raster.data[offset + 1] ?? 0) / 255;
    const b = (raster.data[offset + 2] ?? 0) / 255;
    const alpha = (raster.data[offset + 3] ?? 0) / 255;
    if (alpha <= 0) continue;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    weightedLuminance += luminance * alpha;
    alphaWeight += alpha;
  }

  return alphaWeight > 0 ? Math.min(1, Math.max(0, weightedLuminance / alphaWeight)) : 0;
}

/**
 * Maps a normalized analysis value to a bounded render-size multiplier.
 * Strength 0 preserves the user's base size. Strength 1 maps black -> 0.35x
 * and white -> 1.65x without changing sample identity or coordinates.
 */
export function analysisValueToSizeScale(value: number, strength = 1) {
  const normalizedValue = Math.min(1, Math.max(0, value));
  const normalizedStrength = Math.min(1, Math.max(0, strength));
  return 1 + (normalizedValue - 0.5) * 1.3 * normalizedStrength;
}
