import { composeCanvasStack } from "./composeCanvasLayers";
import type { IndependentSourceBlendMode } from "../studio/IndependentSourceLayerPanel";

export function composeIndependentSourceLayers({
  mainCanvas,
  secondaryCanvas,
  secondaryVisible,
  secondaryOpacity,
  secondaryOnTop,
  secondaryBlendMode,
}: {
  mainCanvas: HTMLCanvasElement;
  secondaryCanvas: HTMLCanvasElement;
  secondaryVisible: boolean;
  secondaryOpacity: number;
  secondaryOnTop: boolean;
  secondaryBlendMode: IndependentSourceBlendMode;
}) {
  if (!secondaryVisible) return mainCanvas;

  const mainLayer = { canvas: mainCanvas, blendMode: "normal" as const };
  const secondaryLayer = {
    canvas: secondaryCanvas,
    opacity: Math.min(1, Math.max(0, secondaryOpacity)),
    blendMode: secondaryBlendMode,
  };

  return composeCanvasStack(
    secondaryOnTop
      ? [mainLayer, secondaryLayer]
      : [secondaryLayer, mainLayer],
  );
}
