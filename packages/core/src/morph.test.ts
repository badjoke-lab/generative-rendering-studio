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

describe("morph mapping", () => {
  it("is deterministic and uses the larger point count", () => {
    const first = createMorphMapping(a, b);
    const second = createMorphMapping(a, b);
    expect(first).toEqual(second);
    expect(first.pairs).toHaveLength(3);
    expect(morphMappingToFloat32(first).toPositions).toHaveLength(6);
  });

  it("clamps easing progress", () => {
    expect(applyMorphEasing(-1, "linear")).toBe(0);
    expect(applyMorphEasing(2, "smoothstep")).toBe(1);
    expect(applyMorphEasing(0.5, "ease-in-out")).toBeCloseTo(0.5);
  });
});
