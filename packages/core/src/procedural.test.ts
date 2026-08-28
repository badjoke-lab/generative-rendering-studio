import { describe, expect, it } from "vitest";
import { generateProceduralPointField, type ProceduralSourceKind } from "./procedural";

const kinds: readonly ProceduralSourceKind[] = ["sphere", "torus", "grid", "spiral"];

describe("generateProceduralPointField", () => {
  it.each(kinds)("generates a bounded deterministic %s field", (kind) => {
    const first = generateProceduralPointField({ kind, count: 512, scale: 0.8, seed: 42 });
    const second = generateProceduralPointField({ kind, count: 512, scale: 0.8, seed: 42 });

    expect(first.kind).toBe("point-field");
    expect(first.samples).toHaveLength(512);
    expect(second).toEqual(first);

    for (const sample of first.samples) {
      expect(Number.isFinite(sample.position[0])).toBe(true);
      expect(Number.isFinite(sample.position[1])).toBe(true);
      expect(Number.isFinite(sample.position[2])).toBe(true);
      expect(Math.abs(sample.position[0])).toBeLessThanOrEqual(1.01);
      expect(Math.abs(sample.position[1])).toBeLessThanOrEqual(1.01);
      expect(Math.abs(sample.position[2])).toBeLessThanOrEqual(1.01);
      expect(sample.density ?? 0).toBeGreaterThan(0);
      expect(sample.density ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it("keeps generator identity independent from renderer identity", () => {
    const field = generateProceduralPointField({ kind: "spiral", count: 64, seed: 7 });
    expect(field.kind).toBe("point-field");
    expect("renderer" in field).toBe(false);
  });

  it("clamps extreme counts and scales to safe bounds", () => {
    const tiny = generateProceduralPointField({ kind: "grid", count: 1, scale: 0 });
    const huge = generateProceduralPointField({ kind: "sphere", count: 1000000, scale: 99 });

    expect(tiny.samples).toHaveLength(16);
    expect(huge.samples).toHaveLength(50000);
    expect(Math.max(...tiny.samples.map((sample) => Math.abs(sample.position[0])))).toBeLessThanOrEqual(0.051);
    expect(Math.max(...huge.samples.slice(0, 2000).map((sample) => Math.abs(sample.position[0])))).toBeLessThanOrEqual(1.51);
  });
});
