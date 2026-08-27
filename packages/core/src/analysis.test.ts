import { describe, expect, it } from "vitest";
import { analysisValueToSizeScale, analyzeRasterLuminance } from "./index";

describe("analyzeRasterLuminance", () => {
  it("returns deterministic normalized luminance for black, white and mixed pixels", () => {
    const black = { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) };
    const white = { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) };
    const mixed = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) };

    expect(analyzeRasterLuminance(black)).toBeCloseTo(0);
    expect(analyzeRasterLuminance(white)).toBeCloseTo(1);
    expect(analyzeRasterLuminance(mixed)).toBeCloseTo(0.5);
  });

  it("ignores fully transparent pixels", () => {
    const raster = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        255, 255, 255, 0,
        0, 0, 0, 255,
      ]),
    };
    expect(analyzeRasterLuminance(raster)).toBeCloseTo(0);
  });
});

describe("analysisValueToSizeScale", () => {
  it("keeps the user size at zero strength and maps black/white symmetrically at full strength", () => {
    expect(analysisValueToSizeScale(0, 0)).toBeCloseTo(1);
    expect(analysisValueToSizeScale(1, 0)).toBeCloseTo(1);
    expect(analysisValueToSizeScale(0, 1)).toBeCloseTo(0.35);
    expect(analysisValueToSizeScale(0.5, 1)).toBeCloseTo(1);
    expect(analysisValueToSizeScale(1, 1)).toBeCloseTo(1.65);
  });
});
