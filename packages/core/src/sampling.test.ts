import { describe, expect, it } from "vitest";
import { pointFieldToFloat32, sampleRasterToPointField } from "./sampling";

describe("sampleRasterToPointField", () => {
  it("samples visible pixels deterministically", () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      0, 0, 0, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
    ]);
    const first = sampleRasterToPointField({ width: 2, height: 2, data }, { maxPoints: 4 });
    const second = sampleRasterToPointField({ width: 2, height: 2, data }, { maxPoints: 4 });
    expect(first).toEqual(second);
    expect(first.samples).toHaveLength(3);
    expect(pointFieldToFloat32(first).positions).toHaveLength(6);
  });

  it("preserves a wide raster's aspect ratio in canonical point space", () => {
    const width = 4;
    const height = 2;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const field = sampleRasterToPointField({ width, height, data }, { maxPoints: width * height });
    const xs = field.samples.map((sample) => sample.position[0]);
    const ys = field.samples.map((sample) => sample.position[1]);
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    expect(xSpan).toBeCloseTo(2);
    expect(ySpan).toBeCloseTo(1);
    expect(xSpan / ySpan).toBeCloseTo(width / height);
  });
});
