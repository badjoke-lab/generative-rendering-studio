import { describe, expect, it } from "vitest";
import { buildStableGlyphIndices } from "./stableGlyphs";

function whiteColors(count: number) {
  return new Float32Array(Array.from({ length: count }, () => [1, 1, 1, 1]).flat());
}

describe("buildStableGlyphIndices", () => {
  it("keeps Symbols identities attached to positions when earlier samples enter the frame", () => {
    const stablePositions = new Float32Array([
      -0.35, 0.20,
      0.15, -0.10,
      0.55, 0.30,
    ]);
    const withEarlierSample = new Float32Array([
      -0.80, 0.45,
      -0.35, 0.20,
      0.15, -0.10,
      0.55, 0.30,
    ]);

    const first = buildStableGlyphIndices(stablePositions, whiteColors(3), "symbols");
    const second = buildStableGlyphIndices(withEarlierSample, whiteColors(4), "symbols");

    expect(Array.from(second.slice(1))).toEqual(Array.from(first));
  });

  it("keeps binary and density presets driven by source luminance", () => {
    const positions = new Float32Array([0, 0, 0.5, 0]);
    const colors = new Float32Array([
      0.1, 0.1, 0.1, 1,
      0.9, 0.9, 0.9, 1,
    ]);

    expect(Array.from(buildStableGlyphIndices(positions, colors, "binary"))).toEqual([0, 1]);
    const density = Array.from(buildStableGlyphIndices(positions, colors, "density"));
    expect(density[0]).toBeLessThan(density[1]);
  });
});
