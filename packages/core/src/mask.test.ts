import { describe, expect, it } from "vitest";
import { applyRasterMaskToPointField, type PointField } from "./index";

const field: PointField = {
  kind: "point-field",
  samples: [
    { position: [-0.5, 0, 0], sourceUv: [0, 0], color: [1, 0, 0, 1], density: 0.8 },
    { position: [0.5, 0, 0], sourceUv: [1, 0], color: [0, 1, 0, 1], density: 0.6 },
  ],
};

const blackWhiteMask = {
  width: 2,
  height: 1,
  data: new Uint8ClampedArray([
    0, 0, 0, 255,
    255, 255, 255, 255,
  ]),
};

describe("applyRasterMaskToPointField", () => {
  it("changes visibility without changing point count, positions, or source UV identity", () => {
    const masked = applyRasterMaskToPointField(field, blackWhiteMask);

    expect(masked.samples).toHaveLength(field.samples.length);
    expect(masked.samples.map((sample) => sample.position)).toEqual(field.samples.map((sample) => sample.position));
    expect(masked.samples.map((sample) => sample.sourceUv)).toEqual(field.samples.map((sample) => sample.sourceUv));
    expect(masked.samples[0]?.color?.[3]).toBe(0);
    expect(masked.samples[0]?.density).toBe(0);
    expect(masked.samples[1]?.color?.[3]).toBeCloseTo(1);
    expect(masked.samples[1]?.density).toBeCloseTo(0.6);
  });

  it("supports partial strength and inversion deterministically", () => {
    const first = applyRasterMaskToPointField(field, blackWhiteMask, { strength: 0.5, invert: true });
    const second = applyRasterMaskToPointField(field, blackWhiteMask, { strength: 0.5, invert: true });

    expect(first).toEqual(second);
    expect(first.samples[0]?.color?.[3]).toBeCloseTo(1);
    expect(first.samples[1]?.color?.[3]).toBeCloseTo(0.5);
  });
});
