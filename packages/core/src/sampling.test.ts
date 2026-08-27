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

  it("keeps shared video samples anchored to the same source UV and point position across frames", () => {
    const width = 8;
    const height = 4;
    const frame = (offset: number) => {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 1; y <= 2; y += 1) {
        for (let x = offset; x < offset + 4; x += 1) {
          const i = (y * width + x) * 4;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }
      return sampleRasterToPointField(
        { width, height, data },
        { maxPoints: width * height, edgeWeight: 0, ditherStrength: 0 },
      );
    };

    const first = frame(1);
    const second = frame(2);
    const firstByUv = new Map(first.samples.map((sample) => [sample.sourceUv?.join(","), sample.position]));
    const shared = second.samples.filter((sample) => firstByUv.has(sample.sourceUv?.join(",")));

    expect(shared.length).toBeGreaterThan(0);
    for (const sample of shared) {
      expect(sample.position).toEqual(firstByUv.get(sample.sourceUv?.join(",")));
    }
  });
});
