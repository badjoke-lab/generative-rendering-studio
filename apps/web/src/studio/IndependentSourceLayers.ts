import type { RasterPixels } from "@grs/core";
import type { IndependentSourceBlendMode } from "./IndependentSourceLayerPanel";

export interface IndependentSourceLayerState {
  readonly id: string;
  readonly sourceId: string;
  readonly label: string;
  readonly raster: RasterPixels;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: IndependentSourceBlendMode;
  readonly timingEnabled: boolean;
  readonly timelineStart: number;
  readonly duration: number;
}

export function createIndependentSourceLayerState({
  id,
  sourceId,
  label,
  raster,
  visible = true,
  opacity = 0.72,
  blendMode = "normal",
  timingEnabled = false,
  timelineStart = 0,
  duration = 3,
}: {
  id: string;
  sourceId: string;
  label: string;
  raster: RasterPixels;
  visible?: boolean;
  opacity?: number;
  blendMode?: IndependentSourceBlendMode;
  timingEnabled?: boolean;
  timelineStart?: number;
  duration?: number;
}): IndependentSourceLayerState {
  return {
    id,
    sourceId,
    label,
    raster,
    visible,
    opacity: Math.max(0, Math.min(1, opacity)),
    blendMode,
    timingEnabled,
    timelineStart: Math.max(0, timelineStart),
    duration: Math.max(0.25, duration),
  };
}

export function updateIndependentSourceLayer(
  layers: readonly IndependentSourceLayerState[],
  layerId: string,
  update: (layer: IndependentSourceLayerState) => IndependentSourceLayerState,
) {
  return layers.map((layer) => layer.id === layerId ? update(layer) : layer);
}

export function removeIndependentSourceLayer(
  layers: readonly IndependentSourceLayerState[],
  layerId: string,
) {
  return layers.filter((layer) => layer.id !== layerId);
}

export function moveIndependentSourceLayer(
  layers: readonly IndependentSourceLayerState[],
  layerId: string,
  toIndex: number,
) {
  const fromIndex = layers.findIndex((layer) => layer.id === layerId);
  if (fromIndex < 0) return [...layers];

  const next = [...layers];
  const [layer] = next.splice(fromIndex, 1);
  const boundedIndex = Math.max(0, Math.min(next.length, toIndex));
  next.splice(boundedIndex, 0, layer);
  return next;
}
