import { createRef, useMemo, useRef, type RefObject } from "react";

export function useLayerCanvasRefs(layerIds: readonly string[]) {
  const refsByLayerId = useRef(new Map<string, RefObject<HTMLCanvasElement | null>>());

  return useMemo(() => {
    const activeLayerIds = new Set(layerIds);
    for (const layerId of refsByLayerId.current.keys()) {
      if (!activeLayerIds.has(layerId)) refsByLayerId.current.delete(layerId);
    }

    const refs = new Map<string, RefObject<HTMLCanvasElement | null>>();
    for (const layerId of layerIds) {
      let canvasRef = refsByLayerId.current.get(layerId);
      if (!canvasRef) {
        canvasRef = createRef<HTMLCanvasElement>();
        refsByLayerId.current.set(layerId, canvasRef);
      }
      refs.set(layerId, canvasRef);
    }
    return refs as ReadonlyMap<string, RefObject<HTMLCanvasElement | null>>;
  }, [layerIds]);
}
