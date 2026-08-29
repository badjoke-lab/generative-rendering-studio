function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Preserve source structure when the renderer replaces source RGB with one tint.
 *
 * A flat/uniform source (including procedural fields that intentionally use one
 * source color) stays fully opaque. For tonal raster sources, the dominant
 * light/dark polarity is treated as the substrate and the opposite tonal range
 * becomes the tint's alpha mask. This prevents a bright image background from
 * turning into a solid tint rectangle while retaining grayscale structure.
 */
export function buildRecolorMaskedColors(colors: Float32Array) {
  const count = Math.floor(colors.length / 4);
  const output = new Float32Array(colors);
  if (count === 0) return output;

  let alphaWeight = 0;
  let mean = 0;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const alpha = colors[offset + 3] ?? 0;
    if (alpha <= 0) continue;
    mean += luminance(colors[offset] ?? 0, colors[offset + 1] ?? 0, colors[offset + 2] ?? 0) * alpha;
    alphaWeight += alpha;
  }
  if (alphaWeight <= 0) return output;
  mean /= alphaWeight;

  let variance = 0;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const alpha = colors[offset + 3] ?? 0;
    if (alpha <= 0) continue;
    const value = luminance(colors[offset] ?? 0, colors[offset + 1] ?? 0, colors[offset + 2] ?? 0);
    const delta = value - mean;
    variance += delta * delta * alpha;
  }
  const spread = Math.sqrt(variance / alphaWeight);

  // Uniform generated sources use their tint as the actual render color; do not
  // erase them merely because their source color happens to be white or black.
  if (spread < 0.035) return output;

  const lightSubstrate = mean >= 0.5;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const sourceAlpha = colors[offset + 3] ?? 0;
    const value = luminance(colors[offset] ?? 0, colors[offset + 1] ?? 0, colors[offset + 2] ?? 0);
    const tonalInk = lightSubstrate ? 1 - value : value;
    output[offset + 3] = sourceAlpha * Math.min(1, Math.max(0, tonalInk));
  }

  return output;
}
