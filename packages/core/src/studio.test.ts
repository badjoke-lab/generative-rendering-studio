import { describe, expect, it } from "vitest";
import {
  createSceneLayer,
  createStudioScene,
  insertSceneLayer,
  moveSceneLayer,
  removeSceneLayer,
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

  it("creates scenes with an isolated layer array", () => {
    const layers = [layer("a")];
    const scene = createStudioScene("scene-1", layers);

    expect(scene.id).toBe("scene-1");
    expect(scene.layers).toEqual(layers);
    expect(scene.layers).not.toBe(layers);
  });
});
