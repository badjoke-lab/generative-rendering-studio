import { describe, expect, it } from "vitest";
import {
  createCameraTrack,
  createLayerOpacityTrack,
  createMorphProgressTrack,
  createMotionStrengthTrack,
  createNumericKeyframe,
  createStudioTimeline,
  normalizeNumericKeyframes,
  sampleCameraTrack,
  sampleLayerOpacityTrack,
  sampleMorphProgressTrack,
  sampleMotionStrengthTrack,
  sampleNumericKeyframes,
  setTimelinePlayhead,
} from "./timeline";

describe("timeline and numeric keyframes", () => {
  it("normalizes keyframes by time and keeps the last value at duplicate timestamps", () => {
    const normalized = normalizeNumericKeyframes([
      createNumericKeyframe(2, 20),
      createNumericKeyframe(1, 10),
      createNumericKeyframe(1, 11, "ease-in"),
      createNumericKeyframe(-5, 5),
      createNumericKeyframe(Number.NaN, Number.NaN),
    ]);

    expect(normalized).toEqual([
      { time: 0, value: 0, easing: "linear" },
      { time: 1, value: 11, easing: "ease-in" },
      { time: 2, value: 20, easing: "linear" },
    ]);
  });

  it("samples linearly and clamps before the first and after the final keyframe", () => {
    const keys = [createNumericKeyframe(1, 10), createNumericKeyframe(3, 30)];

    expect(sampleNumericKeyframes(keys, 0)).toBe(10);
    expect(sampleNumericKeyframes(keys, 2)).toBe(20);
    expect(sampleNumericKeyframes(keys, 4)).toBe(30);
    expect(sampleNumericKeyframes([], 1)).toBeNull();
  });

  it("applies the outgoing keyframe easing deterministically", () => {
    const sample = (easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "step", time = 0.5) =>
      sampleNumericKeyframes([
        createNumericKeyframe(0, 0, easing),
        createNumericKeyframe(1, 1),
      ], time);

    expect(sample("linear")).toBeCloseTo(0.5, 6);
    expect(sample("ease-in")).toBeCloseTo(0.25, 6);
    expect(sample("ease-out")).toBeCloseTo(0.75, 6);
    expect(sample("ease-in-out")).toBeCloseTo(0.5, 6);
    expect(sample("step", 0.75)).toBe(0);
    expect(sample("step", 1)).toBe(1);
  });

  it("creates bounded layer-opacity tracks with sorted keyframes", () => {
    const track = createLayerOpacityTrack("opacity-a", "layer-a", [
      createNumericKeyframe(2, 2),
      createNumericKeyframe(0, -1),
      createNumericKeyframe(1, 0.4, "ease-out"),
    ]);

    expect(track.id).toBe("opacity-a");
    expect(track.kind).toBe("layer-opacity");
    expect(track.layerId).toBe("layer-a");
    expect(track.keyframes).toEqual([
      { time: 0, value: 0, easing: "linear" },
      { time: 1, value: 0.4, easing: "ease-out" },
      { time: 2, value: 1, easing: "linear" },
    ]);
    expect(sampleLayerOpacityTrack(track, 10)).toBe(1);
    expect(sampleLayerOpacityTrack(createLayerOpacityTrack("empty", "layer-a"), 1)).toBeNull();
  });

  it("creates bounded Motion strength tracks and samples the same keyframe interpolation", () => {
    const track = createMotionStrengthTrack("motion-strength", [
      createNumericKeyframe(4, 4),
      createNumericKeyframe(0, -1),
      createNumericKeyframe(2, 1, "ease-in-out"),
    ]);

    expect(track.kind).toBe("motion-strength");
    expect(track.keyframes).toEqual([
      { time: 0, value: 0, easing: "linear" },
      { time: 2, value: 1, easing: "ease-in-out" },
      { time: 4, value: 2, easing: "linear" },
    ]);
    expect(sampleMotionStrengthTrack(track, 1)).toBeCloseTo(0.5, 6);
    expect(sampleMotionStrengthTrack(track, 3)).toBeCloseTo(1.5, 6);
    expect(sampleMotionStrengthTrack(track, 99)).toBe(2);
    expect(sampleMotionStrengthTrack(createMotionStrengthTrack("empty"), 1)).toBeNull();
  });

  it("creates a bounded Morph progress track and samples it in timeline seconds", () => {
    const track = createMorphProgressTrack("morph-main", [
      createNumericKeyframe(0, -1),
      createNumericKeyframe(4, 2),
    ]);
    expect(track.kind).toBe("morph-progress");
    expect(track.keyframes.map(({ value }) => value)).toEqual([0, 1]);
    expect(sampleMorphProgressTrack(track, 0)).toBe(0);
    expect(sampleMorphProgressTrack(track, 2)).toBe(0.5);
    expect(sampleMorphProgressTrack(track, 4)).toBe(1);
    expect(sampleMorphProgressTrack(createMorphProgressTrack("empty"), 2)).toBeNull();
  });

  it("creates bounded Camera tracks and samples all channels on one playhead", () => {
    const track = createCameraTrack("camera-main", {
      panX: [createNumericKeyframe(0, -2), createNumericKeyframe(4, 2)],
      panY: [createNumericKeyframe(0, 0), createNumericKeyframe(4, -0.5)],
      zoom: [createNumericKeyframe(0, 0), createNumericKeyframe(4, 4)],
      rotation: [createNumericKeyframe(0, -360), createNumericKeyframe(4, 360)],
    });

    expect(track.kind).toBe("camera");
    expect(track.panX[0]?.value).toBe(-1);
    expect(track.panX[1]?.value).toBe(1);
    expect(track.zoom[0]?.value).toBe(0.25);
    expect(track.zoom[1]?.value).toBe(3);
    expect(track.rotation[0]?.value).toBe(-180);
    expect(track.rotation[1]?.value).toBe(180);
    expect(sampleCameraTrack(track, 2)).toEqual({ panX: 0, panY: -0.25, zoom: 1.625, rotation: 0 });
    expect(sampleCameraTrack(createCameraTrack("empty"), 1)).toBeNull();
  });

  it("normalizes timeline duration and bounds the playhead without sharing track arrays", () => {
    const track = createLayerOpacityTrack("opacity-a", "layer-a", [createNumericKeyframe(0, 1)]);
    const tracks = [track];
    const timeline = createStudioTimeline(4, tracks, 9);

    expect(timeline.duration).toBe(4);
    expect(timeline.playhead).toBe(4);
    expect(timeline.tracks).toEqual(tracks);
    expect(timeline.tracks).not.toBe(tracks);

    const fallback = createStudioTimeline(Number.NaN, [], -3);
    expect(fallback.duration).toBe(1);
    expect(fallback.playhead).toBe(0);
  });

  it("updates the playhead immutably only when the bounded value changes", () => {
    const timeline = createStudioTimeline(5, [], 2);

    expect(setTimelinePlayhead(timeline, 2)).toBe(timeline);
    expect(setTimelinePlayhead(timeline, -5).playhead).toBe(0);
    expect(setTimelinePlayhead(timeline, 99).playhead).toBe(5);
  });
});
