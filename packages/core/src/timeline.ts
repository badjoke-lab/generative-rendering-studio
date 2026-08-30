export type KeyframeEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "step";

export interface NumericKeyframe {
  readonly time: number;
  readonly value: number;
  readonly easing: KeyframeEasing;
}

export interface LayerOpacityTrack {
  readonly id: string;
  readonly kind: "layer-opacity";
  readonly layerId: string;
  readonly keyframes: readonly NumericKeyframe[];
}

export interface MotionStrengthTrack {
  readonly id: string;
  readonly kind: "motion-strength";
  readonly keyframes: readonly NumericKeyframe[];
}

export interface CameraTrack {
  readonly id: string;
  readonly kind: "camera";
  readonly panX: readonly NumericKeyframe[];
  readonly panY: readonly NumericKeyframe[];
  readonly zoom: readonly NumericKeyframe[];
  readonly rotation: readonly NumericKeyframe[];
}

export interface CameraSample {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
  readonly rotation: number;
}

export type TimelineTrack = LayerOpacityTrack | MotionStrengthTrack | CameraTrack;

export interface StudioTimeline {
  readonly duration: number;
  readonly playhead: number;
  readonly tracks: readonly TimelineTrack[];
}

function clampTime(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampMotionStrength(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(2, Math.max(0, value));
}

function clampCameraPan(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

function clampCameraZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(3, Math.max(0.25, value));
}

function clampCameraRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(180, Math.max(-180, value));
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function applyEasing(easing: KeyframeEasing, progress: number): number {
  const t = clampUnit(progress);
  switch (easing) {
    case "step":
      return 0;
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    case "linear":
    default:
      return t;
  }
}

export function createNumericKeyframe(
  time: number,
  value: number,
  easing: KeyframeEasing = "linear",
): NumericKeyframe {
  return {
    time: clampTime(time),
    value: Number.isFinite(value) ? value : 0,
    easing,
  };
}

export function normalizeNumericKeyframes(keyframes: readonly NumericKeyframe[]): readonly NumericKeyframe[] {
  const sorted = keyframes
    .map((keyframe) => createNumericKeyframe(keyframe.time, keyframe.value, keyframe.easing))
    .sort((a, b) => a.time - b.time);

  const normalized: NumericKeyframe[] = [];
  for (const keyframe of sorted) {
    const previous = normalized.at(-1);
    if (previous?.time === keyframe.time) normalized[normalized.length - 1] = keyframe;
    else normalized.push(keyframe);
  }
  return normalized;
}

export function sampleNumericKeyframes(keyframes: readonly NumericKeyframe[], time: number): number | null {
  const normalized = normalizeNumericKeyframes(keyframes);
  if (normalized.length === 0) return null;

  const sampleTime = clampTime(time);
  if (sampleTime <= normalized[0].time) return normalized[0].value;
  if (sampleTime >= normalized[normalized.length - 1].time) return normalized[normalized.length - 1].value;

  for (let index = 0; index < normalized.length - 1; index += 1) {
    const from = normalized[index];
    const to = normalized[index + 1];
    if (sampleTime > to.time) continue;

    const span = Math.max(Number.EPSILON, to.time - from.time);
    const progress = applyEasing(from.easing, (sampleTime - from.time) / span);
    return from.value + (to.value - from.value) * progress;
  }

  return normalized[normalized.length - 1].value;
}

export function createLayerOpacityTrack(
  id: string,
  layerId: string,
  keyframes: readonly NumericKeyframe[] = [],
): LayerOpacityTrack {
  return {
    id,
    kind: "layer-opacity",
    layerId,
    keyframes: normalizeNumericKeyframes(
      keyframes.map((keyframe) => ({ ...keyframe, value: clampUnit(keyframe.value) })),
    ),
  };
}

export function sampleLayerOpacityTrack(track: LayerOpacityTrack, time: number): number | null {
  const sampled = sampleNumericKeyframes(track.keyframes, time);
  return sampled === null ? null : clampUnit(sampled);
}

export function createMotionStrengthTrack(
  id: string,
  keyframes: readonly NumericKeyframe[] = [],
): MotionStrengthTrack {
  return {
    id,
    kind: "motion-strength",
    keyframes: normalizeNumericKeyframes(
      keyframes.map((keyframe) => ({ ...keyframe, value: clampMotionStrength(keyframe.value) })),
    ),
  };
}

export function sampleMotionStrengthTrack(track: MotionStrengthTrack, time: number): number | null {
  const sampled = sampleNumericKeyframes(track.keyframes, time);
  return sampled === null ? null : clampMotionStrength(sampled);
}

export function createCameraTrack(
  id: string,
  channels: {
    readonly panX?: readonly NumericKeyframe[];
    readonly panY?: readonly NumericKeyframe[];
    readonly zoom?: readonly NumericKeyframe[];
    readonly rotation?: readonly NumericKeyframe[];
  } = {},
): CameraTrack {
  const normalize = (keyframes: readonly NumericKeyframe[] | undefined, clamp: (value: number) => number) =>
    normalizeNumericKeyframes((keyframes ?? []).map((keyframe) => ({ ...keyframe, value: clamp(keyframe.value) })));
  return {
    id,
    kind: "camera",
    panX: normalize(channels.panX, clampCameraPan),
    panY: normalize(channels.panY, clampCameraPan),
    zoom: normalize(channels.zoom, clampCameraZoom),
    rotation: normalize(channels.rotation, clampCameraRotation),
  };
}

export function sampleCameraTrack(track: CameraTrack, time: number): CameraSample | null {
  if (track.panX.length + track.panY.length + track.zoom.length + track.rotation.length === 0) return null;
  return {
    panX: clampCameraPan(sampleNumericKeyframes(track.panX, time) ?? 0),
    panY: clampCameraPan(sampleNumericKeyframes(track.panY, time) ?? 0),
    zoom: clampCameraZoom(sampleNumericKeyframes(track.zoom, time) ?? 1),
    rotation: clampCameraRotation(sampleNumericKeyframes(track.rotation, time) ?? 0),
  };
}

export function createStudioTimeline(
  duration = 5,
  tracks: readonly TimelineTrack[] = [],
  playhead = 0,
): StudioTimeline {
  const normalizedDuration = normalizeDuration(duration);
  return {
    duration: normalizedDuration,
    playhead: Math.min(normalizedDuration, clampTime(playhead)),
    tracks: [...tracks],
  };
}

export function setTimelinePlayhead(timeline: StudioTimeline, playhead: number): StudioTimeline {
  const nextPlayhead = Math.min(timeline.duration, clampTime(playhead));
  return nextPlayhead === timeline.playhead ? timeline : { ...timeline, playhead: nextPlayhead };
}
