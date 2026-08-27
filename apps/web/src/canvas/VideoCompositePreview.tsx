import type { RefObject } from "react";
import type { RasterPixels } from "@grs/core";
import { OriginalPreview } from "./OriginalPreview";
import { WebGLPreview, type GlyphPreset, type PreviewRendererMode } from "../webgl/WebGLPreview";

export function VideoCompositePreview({
  originalCanvasRef,
  transformedCanvasRef,
  raster,
  originalOpacity,
  positions,
  colors,
  mode,
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
  positions?: Float32Array;
  colors?: Float32Array;
  mode: PreviewRendererMode;
  elementSize: number;
  tint: string;
  background: string;
  useSourceColor: boolean;
  glyphPreset: GlyphPreset;
}) {
  return (
    <div className="video-composite-preview" data-video-composite="true">
      <div className="video-composite-underlay" style={{ opacity: Math.min(1, Math.max(0, originalOpacity)) }}>
        <OriginalPreview canvasRef={originalCanvasRef} raster={raster} background={background} />
      </div>
      <div className="video-composite-overlay">
        <WebGLPreview
          canvasRef={transformedCanvasRef}
          positions={positions}
          colors={colors}
          mode={mode}
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
