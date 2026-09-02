import type { CSSProperties, ReactNode, RefObject } from "react";
import type { RasterPixels } from "@grs/core";
import { OriginalPreview } from "./OriginalPreview";

const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  minWidth: 0,
  minHeight: 0,
};

export interface IndependentSourcePreviewLayer {
  readonly id: string;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly raster: RasterPixels;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: "normal" | "multiply" | "screen";
}

type IndependentSourcePreviewStackEntry =
  | { readonly kind: "primary" }
  | { readonly kind: "additional"; readonly layer: IndependentSourcePreviewLayer };

export function IndependentSourceLayersCompositePreview({
  mainPreview,
  layers,
  primaryLayerIndex = 0,
  cameraPanX = 0,
  cameraPanY = 0,
  cameraZoom = 1,
  cameraRotation = 0,
}: {
  mainPreview: ReactNode;
  layers: readonly IndependentSourcePreviewLayer[];
  primaryLayerIndex?: number;
  cameraPanX?: number;
  cameraPanY?: number;
  cameraZoom?: number;
  cameraRotation?: number;
}) {
  const boundedPrimaryLayerIndex = Math.max(0, Math.min(layers.length, primaryLayerIndex));
  const stack: IndependentSourcePreviewStackEntry[] = layers.map((layer) => ({ kind: "additional", layer }));
  stack.splice(boundedPrimaryLayerIndex, 0, { kind: "primary" });

  return (
    <div
      className="independent-source-composite-preview"
      data-independent-source-composite="true"
      data-independent-layer-count={stack.length}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      {stack.map((entry, index) => entry.kind === "primary" ? (
        <div
          className="independent-source-main-layer"
          data-independent-layer="main"
          key="source-main"
          style={{ ...layerStyle, zIndex: index + 1 }}
        >
          {mainPreview}
        </div>
      ) : (
        <div
          className="independent-source-secondary-layer"
          data-independent-layer={entry.layer.id}
          key={entry.layer.id}
          style={{
            ...layerStyle,
            display: entry.layer.visible ? "block" : "none",
            opacity: Math.min(1, Math.max(0, entry.layer.opacity)),
            mixBlendMode: entry.layer.blendMode,
            zIndex: index + 1,
            pointerEvents: "none",
          }}
        >
          <OriginalPreview
            canvasRef={entry.layer.canvasRef}
            raster={entry.layer.raster}
            background="transparent"
            cameraPanX={cameraPanX}
            cameraPanY={cameraPanY}
            cameraZoom={cameraZoom}
            cameraRotation={cameraRotation}
            transparentBackground
          />
        </div>
      ))}
    </div>
  );
}

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
  const layers = secondaryRaster ? [{
    id: "source-secondary",
    canvasRef: secondaryCanvasRef,
    raster: secondaryRaster,
    visible: secondaryVisible,
    opacity: secondaryOpacity,
    blendMode: secondaryBlendMode,
  }] : [];

  return (
    <div
      data-secondary-visible={secondaryRaster && secondaryVisible ? "true" : "false"}
      data-secondary-layer-order={secondaryOnTop ? "secondary-top" : "main-top"}
      data-secondary-blend-mode={secondaryBlendMode}
      style={{ position: "absolute", inset: 0 }}
    >
      <IndependentSourceLayersCompositePreview
        mainPreview={mainPreview}
        layers={layers}
        primaryLayerIndex={secondaryOnTop ? 0 : layers.length}
        cameraPanX={cameraPanX}
        cameraPanY={cameraPanY}
        cameraZoom={cameraZoom}
        cameraRotation={cameraRotation}
      />
    </div>
  );
}
