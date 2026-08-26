import { describe, expect, it } from "vitest";
import { createEmptyProject, PROJECT_SCHEMA_VERSION, sampleRasterToPointField } from "./index";

describe("project document", () => {
  it("creates a deterministic brand-neutral empty document", () => {
    const project = createEmptyProject(42);
    expect(project).toEqual({
      schemaVersion: PROJECT_SCHEMA_VERSION,
      seed: 42,
      sources: [],
      renders: [],
    });
    expect(JSON.stringify(project)).not.toMatch(/GRS|Generative Rendering Studio/i);
  });
});

describe("raster sampling", () => {
  it("is deterministic with edge weighting and ordered dithering", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255,
      0, 0, 0, 255, 255, 255, 255, 255,
    ]);
    const raster = { width: 2, height: 2, data };
    const options = { maxPoints: 16, luminanceThreshold: 0.2, edgeWeight: 0.8, ditherStrength: 0.5 };
    const first = sampleRasterToPointField(raster, options);
    const second = sampleRasterToPointField(raster, options);
    expect(second).toEqual(first);
    expect(first.samples.length).toBeGreaterThan(0);
    expect(first.samples.every((sample) => (sample.density ?? 0) >= 0 && (sample.density ?? 0) <= 1)).toBe(true);
  });
});
