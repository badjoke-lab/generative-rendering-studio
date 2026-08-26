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
});
