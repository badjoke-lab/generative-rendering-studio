import { describe, expect, it } from "vitest";
import { createIndependentSourceLayerState } from "./IndependentSourceLayers";
import { publishIndependentSourceLayerRegistry } from "./independentSourceLayerRegistry";

const raster = new ImageData(1, 1);

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
