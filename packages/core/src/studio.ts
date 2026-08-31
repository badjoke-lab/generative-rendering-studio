import type { RendererKind } from "./index";

export type BlendMode = "normal" | "add" | "multiply" | "screen";

export interface LayerClip {
  readonly timelineStart: number;
  readonly duration: number;
  readonly sourceStart: number;
}

export interface LayerClipInput {
  readonly timelineStart?: number;
  readonly duration?: number;
  readonly sourceStart?: number;
}

export interface LayerClipSample {
  readonly active: boolean;
  readonly localTime: number;
  readonly sourceTime: number;
}

export interface SourceBoundLayerClipSample extends LayerClipSample {
  readonly sourceProgress: number;
}

export interface SceneLayer {
  readonly id: string;
  readonly sourceId: string;
  readonly renderer: RendererKind;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: BlendMode;
  readonly clip?: LayerClip;
}

export interface SceneLayerInput {
  readonly id: string;
  readonly sourceId: string;
  readonly renderer: RendererKind;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
  readonly clip?: LayerClipInput;
}

export interface StudioScene {
  readonly id: string;
  readonly layers: readonly SceneLayer[];
}

export interface SceneLayerTimelineSample {
  readonly layer: SceneLayer;
  readonly active: boolean;
  readonly localTime: number;
  readonly sourceTime: number;
}

export interface StudioSceneTimelineSample {
  readonly timelineTime: number;
  readonly layers: readonly SceneLayerTimelineSample[];
  readonly activeLayers: readonly SceneLayerTimelineSample[];
}

const MIN_CLIP_DURATION = 0.001;

function clampOpacity(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function clampNonNegative(value: number | undefined, fallback = 0): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeClipDuration(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.max(MIN_CLIP_DURATION, value);
}

function requireSourceDuration(sourceDuration: number): number {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    throw new Error("invalid-source-duration");
  }
  return sourceDuration;
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

function sameLayerClip(a: LayerClip | undefined, b: LayerClip | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.timelineStart === b.timelineStart && a.duration === b.duration && a.sourceStart === b.sourceStart;
}

export function createLayerClip(input: LayerClipInput = {}): LayerClip {
  return {
    timelineStart: clampNonNegative(input.timelineStart),
    duration: normalizeClipDuration(input.duration),
    sourceStart: clampNonNegative(input.sourceStart),
  };
}

export function createSourceBoundLayerClip(input: LayerClipInput, sourceDuration: number): LayerClip {
  const boundedSourceDuration = requireSourceDuration(sourceDuration);
  const maxSourceStart = Math.max(0, boundedSourceDuration - Math.min(MIN_CLIP_DURATION, boundedSourceDuration));
  const sourceStart = Math.min(maxSourceStart, clampNonNegative(input.sourceStart));
  const remainingSourceDuration = Math.max(0, boundedSourceDuration - sourceStart);
  const minDuration = Math.min(MIN_CLIP_DURATION, remainingSourceDuration);
  const requestedDuration = input.duration === undefined || !Number.isFinite(input.duration)
    ? remainingSourceDuration
    : input.duration;
  const duration = Math.min(remainingSourceDuration, Math.max(minDuration, requestedDuration));

  return {
    timelineStart: clampNonNegative(input.timelineStart),
    duration,
    sourceStart,
  };
}

export function sampleLayerClip(clip: LayerClip | undefined, timelineTime: number): LayerClipSample {
  const sampleTime = clampNonNegative(timelineTime);
  if (!clip) return { active: true, localTime: sampleTime, sourceTime: sampleTime };

  const localTime = sampleTime - clip.timelineStart;
  const active = localTime >= 0 && localTime < clip.duration;
  const boundedLocalTime = Math.min(clip.duration, Math.max(0, localTime));
  return {
    active,
    localTime: boundedLocalTime,
    sourceTime: clip.sourceStart + boundedLocalTime,
  };
}

export function sampleSourceBoundLayerClip(
  clip: LayerClip,
  timelineTime: number,
  sourceDuration: number,
): SourceBoundLayerClipSample {
  const boundedSourceDuration = requireSourceDuration(sourceDuration);
  const sample = sampleLayerClip(clip, timelineTime);
  const sourceTime = Math.min(boundedSourceDuration, Math.max(0, sample.sourceTime));
  return {
    ...sample,
    sourceTime,
    sourceProgress: sourceTime / boundedSourceDuration,
  };
}

export function createSceneLayer(input: SceneLayerInput): SceneLayer {
  return {
    id: input.id,
    sourceId: input.sourceId,
    renderer: input.renderer,
    visible: input.visible ?? true,
    opacity: clampOpacity(input.opacity),
    blendMode: input.blendMode ?? "normal",
    ...(input.clip ? { clip: createLayerClip(input.clip) } : {}),
  };
}

export function createStudioScene(id: string, layers: readonly SceneLayer[] = []): StudioScene {
  return { id, layers: [...layers] };
}

export function getStudioSceneTimelineDuration(scene: Pick<StudioScene, "layers">): number {
  return scene.layers.reduce((duration, layer) => {
    if (!layer.clip) return duration;
    return Math.max(duration, layer.clip.timelineStart + layer.clip.duration);
  }, 0);
}

export function sampleStudioSceneTimeline(
  scene: Pick<StudioScene, "layers">,
  timelineTime: number,
): StudioSceneTimelineSample {
  const sampleTime = clampNonNegative(timelineTime);
  const layers = scene.layers.map((layer): SceneLayerTimelineSample => {
    const clipSample = sampleLayerClip(layer.clip, sampleTime);
    return {
      layer,
      active: layer.visible && clipSample.active,
      localTime: clipSample.localTime,
      sourceTime: clipSample.sourceTime,
    };
  });

  return {
    timelineTime: sampleTime,
    layers,
    activeLayers: layers.filter((sample) => sample.active),
  };
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

export function setSceneLayerClip(
  layers: readonly SceneLayer[],
  layerId: string,
  clip: LayerClipInput | null,
): readonly SceneLayer[] {
  let changed = false;
  const next = layers.map((layer) => {
    if (layer.id !== layerId) return layer;

    if (clip === null) {
      if (!layer.clip) return layer;
      const { clip: _removedClip, ...withoutClip } = layer;
      changed = true;
      return withoutClip;
    }

    const normalizedClip = createLayerClip(clip);
    if (sameLayerClip(layer.clip, normalizedClip)) return layer;
    changed = true;
    return { ...layer, clip: normalizedClip };
  });
  return changed ? next : layers;
}
