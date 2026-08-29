import { describe, expect, it } from "vitest";
import { buildRecolorMaskedColors } from "./recolorMask";

function rgba(...values: number[]) {
  return new Float32Array(values);
}

describe("buildRecolorMaskedColors", () => {
  it("uses dark tones as ink on a light substrate", () => {
    const result = buildRecolorMaskedColors(
      rgba(
        1, 1, 1, 1,
        0.95, 0.95, 0.95, 1,
        0.5, 0.5, 0.5, 1,
        0, 0, 0, 1,
      ),
    );

    expect(result[3]).toBeCloseTo(0, 5);
    expect(result[7]).toBeCloseTo(0.05, 5);
    expect(result[11]).toBeCloseTo(0.5, 5);
    expect(result[15]).toBeCloseTo(1, 5);
  });

  it("uses light tones as ink on a dark substrate", () => {
    const result = buildRecolorMaskedColors(
      rgba(
        0, 0, 0, 1,
        0.05, 0.05, 0.05, 1,
        0.5, 0.5, 0.5, 1,
        1, 1, 1, 1,
      ),
    );

    expect(result[3]).toBeCloseTo(0, 5);
    expect(result[7]).toBeCloseTo(0.05, 5);
    expect(result[11]).toBeCloseTo(0.5, 5);
    expect(result[15]).toBeCloseTo(1, 5);
  });

  it("keeps uniform generated-source colors opaque", () => {
    const result = buildRecolorMaskedColors(
      rgba(
        1, 1, 1, 1,
        1, 1, 1, 0.7,
        1, 1, 1, 0.4,
      ),
    );

    expect(Array.from(result)).toEqual([
      1, 1, 1, 1,
      1, 1, 1, expect.closeTo(0.7, 5),
      1, 1, 1, expect.closeTo(0.4, 5),
    ]);
  });

  it("multiplies the tonal mask by source alpha", () => {
    const result = buildRecolorMaskedColors(
      rgba(
        1, 1, 1, 1,
        0, 0, 0, 0.4,
        0.4, 0.4, 0.4, 0.5,
      ),
    );

    expect(result[7]).toBeCloseTo(0.4, 5);
    expect(result[11]).toBeCloseTo(0.3, 5);
  });
});
