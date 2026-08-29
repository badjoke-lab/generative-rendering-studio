import type { RendererKind } from "./index";

export type BlendMode = "normal" | "add" | "multiply" | "screen";

export interface SceneLayer {
  readonly id: string;
  readonly sourceId: string;
  readonly renderer: RendererKind;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: BlendMode;
}

export interface SceneLayerInput {
  readonly id: string;
  readonly sourceId: string;
  readonly renderer: RendererKind;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
}

export interface StudioScene {
  readonly id: string;
  readonly layers: readonly SceneLayer[];
}

function clampOpacity(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function clampInsertIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.min(length, Math.max(0, Math.trunc(index)));
}

function clampMoveIndex(index: number, length: number): number {
  if (length <= 1) return 0;
  if (!Number.isFinite(index)) return length - 1;
  return Math.min(length - 1, Math.max(0, Math.trunc(index)));
}

export function createSceneLayer(input: SceneLayerInput): SceneLayer {
  return {
    id: input.id,
    sourceId: input.sourceId,
    renderer: input.renderer,
    visible: input.visible ?? true,
    opacity: clampOpacity(input.opacity),
    blendMode: input.blendMode ?? "normal",
  };
}

export function createStudioScene(id: string, layers: readonly SceneLayer[] = []): StudioScene {
  return { id, layers: [...layers] };
}

export function insertSceneLayer(
  layers: readonly SceneLayer[],
  layer: SceneLayer,
  index = layers.length,
): readonly SceneLayer[] {
  if (layers.some((candidate) => candidate.id === layer.id)) {
    throw new Error(`duplicate-layer-id:${layer.id}`);
  }

  const next = [...layers];
  next.splice(clampInsertIndex(index, next.length), 0, layer);
  return next;
}

export function removeSceneLayer(layers: readonly SceneLayer[], layerId: string): readonly SceneLayer[] {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) return layers;
  const next = [...layers];
  next.splice(index, 1);
  return next;
}

export function moveSceneLayer(
  layers: readonly SceneLayer[],
  layerId: string,
  targetIndex: number,
): readonly SceneLayer[] {
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);
  if (currentIndex < 0 || layers.length <= 1) return layers;

  const next = [...layers];
  const [layer] = next.splice(currentIndex, 1);
  next.splice(clampMoveIndex(targetIndex, layers.length), 0, layer);
  return next;
}

export function updateSceneLayer(
  layers: readonly SceneLayer[],
  layerId: string,
  patch: Partial<Pick<SceneLayer, "visible" | "opacity" | "blendMode" | "renderer">>,
): readonly SceneLayer[] {
  let changed = false;
  const next = layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    const updated: SceneLayer = {
      ...layer,
      ...patch,
      opacity: patch.opacity === undefined ? layer.opacity : clampOpacity(patch.opacity),
    };
    changed =
      changed ||
      updated.visible !== layer.visible ||
      updated.opacity !== layer.opacity ||
      updated.blendMode !== layer.blendMode ||
      updated.renderer !== layer.renderer;
    return changed ? updated : layer;
  });
  return changed ? next : layers;
}
