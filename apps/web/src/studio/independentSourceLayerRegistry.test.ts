import { describe, expect, it, vi } from "vitest";
import type { RasterPixels } from "@grs/core";
import { createIndependentSourceLayerState } from "./IndependentSourceLayers";
import { publishIndependentSourceLayerRegistry } from "./independentSourceLayerRegistry";

const raster: RasterPixels = {
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([0, 0, 0, 255]),
};

describe("independent source layer registry", () => {
  it("accepts array-backed layer snapshots and controls", () => {
    const layer = createIndependentSourceLayerState({
      id: "layer-2",
      sourceId: "source-2",
      label: "Layer 2",
      raster,
    });
    const patchLayer = vi.fn();
    const removeLayer = vi.fn();
    const moveLayer = vi.fn();

    expect(() => publishIndependentSourceLayerRegistry({
      layers: [layer],
      patchLayer,
      removeLayer,
      moveLayer,
    })).not.toThrow();
  });
});
