import { describe, expect, it } from "vitest";
import type { RasterPixels } from "@grs/core";
import { createIndependentSourceLayerState } from "./IndependentSourceLayers";
import { publishIndependentSourceLayerRegistry } from "./independentSourceLayerRegistry";

const raster: RasterPixels = {
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([0, 0, 0, 255]),
};

describe("independent source layer registry", () => {
  it("accepts array-backed layer snapshots", () => {
    const layer = createIndependentSourceLayerState({
      id: "layer-2",
      sourceId: "source-2",
      label: "Layer 2",
      raster,
    });

    expect(() => publishIndependentSourceLayerRegistry({
      layers: [layer],
      patchLayer: () => undefined,
    })).not.toThrow();
  });
});
