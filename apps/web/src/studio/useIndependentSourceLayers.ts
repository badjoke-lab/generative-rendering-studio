import { useCallback, useRef, useState } from "react";
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
  const nextLayerOrdinal = useRef(2);

  const addLayer = useCallback((label: string, raster: RasterPixels) => {
    const ordinal = nextLayerOrdinal.current;
    nextLayerOrdinal.current += 1;
    const id = `source-layer-${ordinal}`;
    setLayers((current) => [
      ...current,
      createIndependentSourceLayerState({
        id,
        sourceId: `project-source-${ordinal}`,
        label,
        raster,
      }),
    ]);
    return id;
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
    addLayer,
    removeLayer,
    patchLayer,
    moveLayer,
    clearLayers,
  } as const;
}
