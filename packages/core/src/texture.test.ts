import { describe, expect, it } from "vitest";
import { applyRasterTextureToPointField, type PointField } from "./index";

const field: PointField = {
  kind: "point-field",
  samples: [
    { position: [-0.5, 0, 0], sourceUv: [0, 0], color: [0.25, 0.25, 0.25, 0.4], density: 0.8 },
    { position: [0.5, 0, 0], sourceUv: [1, 0], color: [0.75, 0.75, 0.75, 0.7], density: 0.6 },
  ],
};

const redBlueTexture = {
  width: 2,
  height: 1,
  data: new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 64,
  ]),
};

describe("applyRasterTextureToPointField", () => {
  it("replaces RGB by stable source UV without changing point identity or visibility", () => {
    const textured = applyRasterTextureToPointField(field, redBlueTexture);

    expect(textured.samples).toHaveLength(field.samples.length);
    expect(textured.samples.map((sample) => sample.position)).toEqual(field.samples.map((sample) => sample.position));
    expect(textured.samples.map((sample) => sample.sourceUv)).toEqual(field.samples.map((sample) => sample.sourceUv));
    expect(textured.samples.map((sample) => sample.density)).toEqual(field.samples.map((sample) => sample.density));
    expect(textured.samples[0]?.color).toEqual([1, 0, 0, 0.4]);
    expect(textured.samples[1]?.color).toEqual([0, 0, 1, 0.7]);
  });

  it("is deterministic and leaves samples without source UV untouched", () => {
    const withoutUv: PointField = { kind: "point-field", samples: [{ position: [0, 0, 0], color: [0, 1, 0, 1], density: 0.5 }] };
    const first = applyRasterTextureToPointField(withoutUv, redBlueTexture);
    const second = applyRasterTextureToPointField(withoutUv, redBlueTexture);

    expect(first).toEqual(second);
    expect(first).toEqual(withoutUv);
  });
});
