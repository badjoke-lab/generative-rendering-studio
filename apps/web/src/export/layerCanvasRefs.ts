import type { RefObject } from "react";

export function getLayerCanvas(
  layerId: string,
  canvasRefs: ReadonlyMap<string, RefObject<HTMLCanvasElement | null>>,
) {
  return canvasRefs.get(layerId)?.current ?? null;
}

export function hasAllLayerCanvases(
  layerIds: readonly string[],
  canvasRefs: ReadonlyMap<string, RefObject<HTMLCanvasElement | null>>,
) {
  return layerIds.every((layerId) => Boolean(getLayerCanvas(layerId, canvasRefs)));
}
