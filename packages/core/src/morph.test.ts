import { describe, expect, it } from "vitest";
import { applyMorphEasing, createMorphMapping, morphMappingToFloat32 } from "./morph";
import type { PointField } from "./index";

const a: PointField = { kind: "point-field", samples: [
  { position: [-1, -1, 0], color: [1, 0, 0, 1] },
  { position: [1, 1, 0], color: [0, 1, 0, 1] },
] };
const b: PointField = { kind: "point-field", samples: [
  { position: [-0.5, 1, 0], color: [0, 0, 1, 1] },
  { position: [0, 0, 0], color: [1, 1, 1, 1] },
  { position: [0.5, -1, 0], color: [1, 1, 0, 1] },
] };

function polarField(centerX: number, radiusAt: (angle: number) => number): PointField {
  return {
    kind: "point-field",
    samples: Array.from({ length: 256 }, (_, index) => {
      const angle = (index / 256) * Math.PI * 2;
      const radius = radiusAt(angle);
      return {
        position: [centerX + Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as const,
        color: [1, 1, 1, 1] as const,
      };
    }),
  };
}

function wrappedAngleDifference(a: number, b: number) {
  return Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
}

describe("morph mapping", () => {
  it("is deterministic and uses the larger point count", () => {
    const first = createMorphMapping(a, b);
    const second = createMorphMapping(a, b);
    expect(first).toEqual(second);
    expect(first.pairs).toHaveLength(3);
    expect(morphMappingToFloat32(first).toPositions).toHaveLength(6);
  });

  it("preserves angular locality instead of pairing scanlines", () => {
    const from = polarField(-0.4, () => 0.35);
    const to = polarField(0.4, (angle) => {
      const sector = Math.floor((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4));
      return sector % 2 === 0 ? 0.22 : 0.5;
    });
    const mapping = createMorphMapping(from, to);
    const fromCenterX = -0.4;
    const toCenterX = 0.4;
    const differences = mapping.pairs.map((pair) => wrappedAngleDifference(
      Math.atan2(pair.from[1], pair.from[0] - fromCenterX),
      Math.atan2(pair.to[1], pair.to[0] - toCenterX),
    ));
    const average = differences.reduce((sum, value) => sum + value, 0) / differences.length;

    expect(mapping.pairs).toHaveLength(256);
    expect(average).toBeLessThan(0.12);
  });

  it("clamps easing progress", () => {
    expect(applyMorphEasing(-1, "linear")).toBe(0);
    expect(applyMorphEasing(2, "smoothstep")).toBe(1);
    expect(applyMorphEasing(0.5, "ease-in-out")).toBeCloseTo(0.5);
  });
});
