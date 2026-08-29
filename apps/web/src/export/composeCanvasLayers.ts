import type { BlendMode } from "@grs/core";

export interface CanvasStackLayer {
  readonly canvas: HTMLCanvasElement;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly blendMode?: BlendMode;
}

export interface NormalizedCanvasStackLayer {
  readonly canvas: HTMLCanvasElement;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: BlendMode;
}

export function canvasBlendOperation(blendMode: BlendMode): GlobalCompositeOperation {
  switch (blendMode) {
    case "add":
      return "lighter";
    case "multiply":
      return "multiply";
    case "screen":
      return "screen";
    case "normal":
    default:
      return "source-over";
  }
}

export function normalizeCanvasStackLayer(layer: CanvasStackLayer): NormalizedCanvasStackLayer {
  const opacity = layer.opacity ?? 1;
  return {
    canvas: layer.canvas,
    visible: layer.visible ?? true,
    opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1,
    blendMode: layer.blendMode ?? "normal",
  };
}

export function composeCanvasStack(layers: readonly CanvasStackLayer[]) {
  const normalized = layers.map(normalizeCanvasStackLayer);
  const width = Math.max(1, ...normalized.map((layer) => layer.canvas.width));
  const height = Math.max(1, ...normalized.map((layer) => layer.canvas.height));
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("canvas-2d-unavailable");

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  for (const layer of normalized) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = canvasBlendOperation(layer.blendMode);
    ctx.drawImage(layer.canvas, 0, 0, width, height);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  return output;
}

export function composeCanvasLayers(
  underlay: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  underlayOpacity = 1,
) {
  return composeCanvasStack([
    { canvas: underlay, opacity: underlayOpacity, blendMode: "normal" },
    { canvas: overlay, blendMode: "normal" },
  ]);
}
