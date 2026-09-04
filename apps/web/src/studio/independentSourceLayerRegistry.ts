import { useSyncExternalStore } from "react";
import type { IndependentSourceLayerState } from "./IndependentSourceLayers";

export interface IndependentSourceLayerRegistrySnapshot {
  readonly layers: readonly IndependentSourceLayerState[];
  readonly patchLayer: (layerId: string, patch: Partial<Omit<IndependentSourceLayerState, "id" | "sourceId" | "raster">>) => void;
  readonly removeLayer: (layerId: string) => void;
  readonly moveLayer: (layerId: string, toIndex: number) => void;
}

const emptyPatch: IndependentSourceLayerRegistrySnapshot["patchLayer"] = () => undefined;
const emptyRemove: IndependentSourceLayerRegistrySnapshot["removeLayer"] = () => undefined;
const emptyMove: IndependentSourceLayerRegistrySnapshot["moveLayer"] = () => undefined;
let snapshot: IndependentSourceLayerRegistrySnapshot = {
  layers: [],
  patchLayer: emptyPatch,
  removeLayer: emptyRemove,
  moveLayer: emptyMove,
};
const listeners = new Set<() => void>();

export function publishIndependentSourceLayerRegistry(next: IndependentSourceLayerRegistrySnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useIndependentSourceLayerRegistry() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
