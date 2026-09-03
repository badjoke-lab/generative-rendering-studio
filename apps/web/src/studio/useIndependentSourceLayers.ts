import { useCallback, useEffect, useRef, useState } from "react";
import type { RasterPixels } from "@grs/core";
import {
  createIndependentSourceLayerState,
  moveIndependentSourceLayer,
  patchIndependentSourceLayer,
  removeIndependentSourceLayer,
  type IndependentSourceLayerState,
} from "./IndependentSourceLayers";
import { publishIndependentSourceLayerRegistry } from "./independentSourceLayerRegistry";

export function useIndependentSourceLayers() {
  const [layers, setLayers] = useState<readonly IndependentSourceLayerState[]>([]);
  const nextLayerOrdinal = useRef(2);

  const createLayer = useCallback((label: string, raster: RasterPixels) => {
    const ordinal = nextLayerOrdinal.current;
    nextLayerOrdinal.current += 1;
    return createIndependentSourceLayerState({
      id: `source-layer-${ordinal}`,
      sourceId: `project-source-${ordinal}`,
      label,
      raster,
    });
  }, []);

  const addLayer = useCallback((label: string, raster: RasterPixels) => {
    const layer = createLayer(label, raster);
    setLayers((current) => [...current, layer]);
    return layer.id;
  }, [createLayer]);

  const replaceSingleLayer = useCallback((label: string, raster: RasterPixels) => {
    const layer = createLayer(label, raster);
    setLayers([layer]);
    return layer.id;
  }, [createLayer]);

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

  useEffect(() => {
    publishIndependentSourceLayerRegistry({ layers, patchLayer });
  }, [layers, patchLayer]);

  return {
    layers,
    addLayer,
    replaceSingleLayer,
    removeLayer,
    patchLayer,
    moveLayer,
    clearLayers,
  } as const;
}
