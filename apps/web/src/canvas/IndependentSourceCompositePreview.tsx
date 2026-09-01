import type { CSSProperties, ReactNode, RefObject } from "react";
import type { RasterPixels } from "@grs/core";
import { OriginalPreview } from "./OriginalPreview";

const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  minWidth: 0,
  minHeight: 0,
};

export function IndependentSourceCompositePreview({
  mainPreview,
  secondaryCanvasRef,
  secondaryRaster,
  secondaryVisible,
  secondaryOpacity,
  secondaryOnTop,
  secondaryBlendMode,
  cameraPanX = 0,
  cameraPanY = 0,
  cameraZoom = 1,
  cameraRotation = 0,
}: {
  mainPreview: ReactNode;
  secondaryCanvasRef: RefObject<HTMLCanvasElement | null>;
  secondaryRaster?: RasterPixels;
  secondaryVisible: boolean;
  secondaryOpacity: number;
  secondaryOnTop: boolean;
  secondaryBlendMode: "normal" | "multiply" | "screen";
  cameraPanX?: number;
  cameraPanY?: number;
  cameraZoom?: number;
  cameraRotation?: number;
}) {
  return (
    <div
      className="independent-source-composite-preview"
      data-independent-source-composite="true"
      data-secondary-visible={secondaryRaster && secondaryVisible ? "true" : "false"}
      data-secondary-layer-order={secondaryOnTop ? "secondary-top" : "main-top"}
      data-secondary-blend-mode={secondaryBlendMode}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <div
        className="independent-source-main-layer"
        data-independent-layer="main"
        style={{ ...layerStyle, zIndex: secondaryRaster && secondaryOnTop ? 1 : 2 }}
      >
        {mainPreview}
      </div>
      {secondaryRaster && (
        <div
          className="independent-source-secondary-layer"
          data-independent-layer="secondary"
          style={{
            ...layerStyle,
            display: secondaryVisible ? "block" : "none",
            opacity: Math.min(1, Math.max(0, secondaryOpacity)),
            mixBlendMode: secondaryBlendMode,
            zIndex: secondaryOnTop ? 2 : 1,
            pointerEvents: "none",
          }}
        >
          <OriginalPreview
            canvasRef={secondaryCanvasRef}
            raster={secondaryRaster}
            background="transparent"
            cameraPanX={cameraPanX}
            cameraPanY={cameraPanY}
            cameraZoom={cameraZoom}
            cameraRotation={cameraRotation}
            transparentBackground
          />
        </div>
      )}
    </div>
  );
}
