import type { CSSProperties, RefObject } from "react";
import type { RasterPixels } from "@grs/core";
import { OriginalPreview } from "./OriginalPreview";
import { WebGLPreview, type GlyphPreset, type PreviewMotionMode, type PreviewRendererMode } from "../webgl/WebGLPreview";

const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  minWidth: 0,
  minHeight: 0,
};

export function VideoCompositePreview({
  originalCanvasRef,
  transformedCanvasRef,
  raster,
  originalOpacity,
  originalOnTop = false,
  transformedBlendMode = "normal",
  positions,
  colors,
  mode,
  motionMode,
  motionStrength,
  motionSpeed,
  elementSize,
  tint,
  background,
  useSourceColor,
  glyphPreset,
}: {
  originalCanvasRef: RefObject<HTMLCanvasElement | null>;
  transformedCanvasRef: RefObject<HTMLCanvasElement | null>;
  raster?: RasterPixels;
  originalOpacity: number;
  originalOnTop?: boolean;
  transformedBlendMode?: "normal" | "multiply" | "screen";
  positions?: Float32Array;
  colors?: Float32Array;
  mode: PreviewRendererMode;
  motionMode: PreviewMotionMode;
  motionStrength: number;
  motionSpeed: number;
  elementSize: number;
  tint: string;
  background: string;
  useSourceColor: boolean;
  glyphPreset: GlyphPreset;
}) {
  return (
    <div
      className="video-composite-preview"
      data-video-composite="true"
      data-video-blend-mode={transformedBlendMode}
      data-video-layer-order={originalOnTop ? "original-top" : "transformed-top"}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <div
        className="video-composite-underlay"
        data-video-layer="original"
        style={{
          ...layerStyle,
          opacity: Math.min(1, Math.max(0, originalOpacity)),
          zIndex: originalOnTop ? 2 : 1,
        }}
      >
        <OriginalPreview canvasRef={originalCanvasRef} raster={raster} background={background} />
      </div>
      <div
        className="video-composite-overlay"
        data-video-layer="transformed"
        style={{
          ...layerStyle,
          mixBlendMode: transformedBlendMode,
          zIndex: originalOnTop ? 1 : 2,
        }}
      >
        <WebGLPreview
          canvasRef={transformedCanvasRef}
          positions={positions}
          colors={colors}
          mode={mode}
          motionMode={motionMode}
          motionStrength={motionStrength}
          motionSpeed={motionSpeed}
          elementSize={elementSize}
          tint={tint}
          background={background}
          useSourceColor={useSourceColor}
          glyphPreset={glyphPreset}
          transparentBackground
        />
      </div>
    </div>
  );
}
