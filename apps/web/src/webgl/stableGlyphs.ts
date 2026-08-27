export type GlyphPreset = "binary" | "density" | "symbols";

function luminanceAt(colors: Float32Array, index: number) {
  const base = index * 4;
  return 0.2126 * (colors[base] ?? 1) + 0.7152 * (colors[base + 1] ?? 1) + 0.0722 * (colors[base + 2] ?? 1);
}

function spatialHash(x: number, y: number) {
  const qx = Math.round((x + 2) * 4096);
  const qy = Math.round((y + 2) * 4096);
  let hash = Math.imul(qx ^ 0x9e3779b9, 0x85ebca6b);
  hash ^= Math.imul(qy ^ 0x7f4a7c15, 0xc2b2ae35);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x27d4eb2d);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

/**
 * Build glyph identities without depending on active-sample array order.
 *
 * Video sampling uses raster-anchored positions. A contour crossing the sampling
 * threshold can insert/remove samples between frames; using the array index for
 * the Symbols preset would then change every later glyph even where the source
 * position itself did not move. Spatial hashing keeps the identity attached to
 * the raster position instead.
 */
export function buildStableGlyphIndices(
  positions: Float32Array,
  colors: Float32Array,
  preset: GlyphPreset,
) {
  const count = Math.floor(positions.length / 2);
  const glyphs = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const l = luminanceAt(colors, i);
    if (preset === "binary") {
      glyphs[i] = l >= 0.5 ? 1 : 0;
    } else if (preset === "density") {
      glyphs[i] = Math.min(7, Math.floor(l * 8));
    } else {
      glyphs[i] = 2 + (spatialHash(positions[i * 2] ?? 0, positions[i * 2 + 1] ?? 0) % 6);
    }
  }
  return glyphs;
}
