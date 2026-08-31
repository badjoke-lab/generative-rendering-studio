import { describe, expect, it } from "vitest";
import {
  createLayerClip,
  createSceneLayer,
  createStudioScene,
  insertSceneLayer,
  moveSceneLayer,
  removeSceneLayer,
  sampleLayerClip,
  setSceneLayerClip,
  updateSceneLayer,
} from "./studio";

function layer(id: string) {
  return createSceneLayer({ id, sourceId: `source-${id}`, renderer: "point" });
}

describe("scene layer stack", () => {
  it("creates renderer-neutral layer state with safe defaults and opacity clamping", () => {
    expect(createSceneLayer({ id: "a", sourceId: "source-a", renderer: "glyph" })).toEqual({
      id: "a",
      sourceId: "source-a",
      renderer: "glyph",
      visible: true,
      opacity: 1,
      blendMode: "normal",
    });

    expect(createSceneLayer({ id: "low", sourceId: "s", renderer: "point", opacity: -4 }).opacity).toBe(0);
    expect(createSceneLayer({ id: "high", sourceId: "s", renderer: "particle", opacity: 4 }).opacity).toBe(1);
    expect(createSceneLayer({ id: "nan", sourceId: "s", renderer: "original", opacity: Number.NaN }).opacity).toBe(1);
  });

  it("keeps ordinary layers untimed while normalizing optional clip placement and trim", () => {
    expect(layer("a").clip).toBeUndefined();
    expect(createSceneLayer({
      id: "timed",
      sourceId: "source-timed",
      renderer: "point",
      clip: { timelineStart: -2, duration: 0, sourceStart: 3.5 },
    }).clip).toEqual({
      timelineStart: 0,
      duration: 0.001,
      sourceStart: 3.5,
    });
  });

  it("samples a placed clip with end-exclusive visibility and source-time trim mapping", () => {
    const clip = createLayerClip({ timelineStart: 2, duration: 3, sourceStart: 4 });

    expect(sampleLayerClip(clip, 1)).toEqual({ active: false, localTime: 0, sourceTime: 4 });
    expect(sampleLayerClip(clip, 2)).toEqual({ active: true, localTime: 0, sourceTime: 4 });
    expect(sampleLayerClip(clip, 3.5)).toEqual({ active: true, localTime: 1.5, sourceTime: 5.5 });
    expect(sampleLayerClip(clip, 5)).toEqual({ active: false, localTime: 3, sourceTime: 7 });
    expect(sampleLayerClip(undefined, 99)).toEqual({ active: true, localTime: 99, sourceTime: 99 });
  });

  it("preserves explicit layer order when inserting and rejects duplicate ids", () => {
    const a = layer("a");
    const b = layer("b");
    const c = layer("c");
    const inserted = insertSceneLayer([a, c], b, 1);

    expect(inserted.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(() => insertSceneLayer(inserted, layer("b"))).toThrow("duplicate-layer-id:b");
  });

  it("moves layers deterministically with bounded target indices", () => {
    const layers = [layer("a"), layer("b"), layer("c")];

    expect(moveSceneLayer(layers, "c", 0).map(({ id }) => id)).toEqual(["c", "a", "b"]);
    expect(moveSceneLayer(layers, "a", 99).map(({ id }) => id)).toEqual(["b", "c", "a"]);
    expect(moveSceneLayer(layers, "missing", 0)).toBe(layers);
  });

  it("removes and updates layer presentation state without mutating source identity", () => {
    const a = layer("a");
    const b = layer("b");
    const layers = [a, b];

    const updated = updateSceneLayer(layers, "a", {
      visible: false,
      opacity: 0.35,
      blendMode: "screen",
      renderer: "glyph",
    });

    expect(updated).not.toBe(layers);
    expect(updated[0]).toEqual({
      ...a,
      visible: false,
      opacity: 0.35,
      blendMode: "screen",
      renderer: "glyph",
    });
    expect(updated[0].sourceId).toBe(a.sourceId);
    expect(removeSceneLayer(updated, "b").map(({ id }) => id)).toEqual(["a"]);
    expect(removeSceneLayer(updated, "missing")).toBe(updated);
  });

  it("sets replaces and removes optional layer clips without mutating the input array", () => {
    const layers = [layer("a"), layer("b")];
    const timed = setSceneLayerClip(layers, "a", { timelineStart: 1, duration: 4, sourceStart: 2 });

    expect(timed).not.toBe(layers);
    expect(timed[0].clip).toEqual({ timelineStart: 1, duration: 4, sourceStart: 2 });
    expect(layers[0].clip).toBeUndefined();
    expect(setSceneLayerClip(timed, "a", { timelineStart: 1, duration: 4, sourceStart: 2 })).toBe(timed);

    const cleared = setSceneLayerClip(timed, "a", null);
    expect(cleared).not.toBe(timed);
    expect(cleared[0].clip).toBeUndefined();
    expect(setSceneLayerClip(cleared, "missing", { duration: 2 })).toBe(cleared);
  });

  it("creates scenes with an isolated layer array", () => {
    const layers = [layer("a")];
    const scene = createStudioScene("scene-1", layers);

    expect(scene.id).toBe("scene-1");
    expect(scene.layers).toEqual(layers);
    expect(scene.layers).not.toBe(layers);
  });
});
