import { describe, expect, it } from "vitest";
import { canvasBlendOperation, normalizeCanvasStackLayer } from "./composeCanvasLayers";

const fakeCanvas = { width: 64, height: 48 } as HTMLCanvasElement;

describe("canvas layer compositor contract", () => {
  it("maps Studio blend modes to Canvas 2D composite operations", () => {
    expect(canvasBlendOperation("normal")).toBe("source-over");
    expect(canvasBlendOperation("add")).toBe("lighter");
    expect(canvasBlendOperation("multiply")).toBe("multiply");
    expect(canvasBlendOperation("screen")).toBe("screen");
  });

  it("normalizes defaults without changing the layer canvas identity", () => {
    const normalized = normalizeCanvasStackLayer({ canvas: fakeCanvas });

    expect(normalized).toEqual({
      canvas: fakeCanvas,
      visible: true,
      opacity: 1,
      blendMode: "normal",
    });
    expect(normalized.canvas).toBe(fakeCanvas);
  });

  it("clamps opacity and preserves explicit visibility and blend mode", () => {
    expect(normalizeCanvasStackLayer({ canvas: fakeCanvas, visible: false, opacity: -3, blendMode: "multiply" })).toEqual({
      canvas: fakeCanvas,
      visible: false,
      opacity: 0,
      blendMode: "multiply",
    });
    expect(normalizeCanvasStackLayer({ canvas: fakeCanvas, opacity: 4, blendMode: "screen" }).opacity).toBe(1);
    expect(normalizeCanvasStackLayer({ canvas: fakeCanvas, opacity: Number.NaN }).opacity).toBe(1);
  });
});
