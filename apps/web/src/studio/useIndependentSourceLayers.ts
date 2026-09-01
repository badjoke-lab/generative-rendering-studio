import { useCallback, useState } from "react";
import type { RasterPixels } from "@grs/core";
import {
  createIndependentSourceLayerState,
  moveIndependentSourceLayer,
  patchIndependentSourceLayer,
  removeIndependentSourceLayer,
  type IndependentSourceLayerState,
} from "./IndependentSourceLayers";

export function useIndependentSourceLayers() {
  const [layers, setLayers] = useState<readonly IndependentSourceLayerState[]>([]);

  const addLayer = useCallback((label: string, raster: RasterPixels) => {
    setLayers((current) => {
      const ordinal = current.length + 2;
      const id = `source-layer-${ordinal}`;
      return [
        ...current,
        createIndependentSourceLayerState({
          id,
          sourceId: `project-source-${ordinal}`,
          label,
          raster,
        }),
      ];
    });
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setLayers((current) => removeIndependentSourceLayer(current, layerId));
  }, []);

  const patchLayer = useCallback((layerId: string, patch: Partial<Omit<IndependentSourceLayerState, "id" | "sourceId" | "raster">>) => {
    setLayers((current) => patchIndependentSourceLayer(current, layerId, patch));
  }, []);

  const moveLayer = useCallback((layerId: string, toIndex: number) => {
    setLayers((current) => moveIndependentSourceLayer(current, layerId, toIndex));
  }, []);

  const clearLayers = useCallback(() => setLayers([]), []);

  return {
    layers,
    setLayers,
    addLayer,
    removeLayer,
    patchLayer,
    moveLayer,
    clearLayers,
  } as const;
}
