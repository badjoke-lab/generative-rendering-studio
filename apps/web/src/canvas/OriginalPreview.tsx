import { useEffect, type RefObject } from "react";
import type { RasterPixels } from "@grs/core";

export function OriginalPreview({
  canvasRef,
  raster,
  background,
  cameraPanX = 0,
  cameraPanY = 0,
  cameraZoom = 1,
  cameraRotation = 0,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  raster?: RasterPixels;
  background: string;
  cameraPanX?: number;
  cameraPanY?: number;
  cameraZoom?: number;
  cameraRotation?: number;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    if (raster) {
      const source = document.createElement("canvas");
      source.width = raster.width;
      source.height = raster.height;
      const sourceCtx = source.getContext("2d");
      if (sourceCtx) {
        const imageData = sourceCtx.createImageData(raster.width, raster.height);
        imageData.data.set(raster.data);
        sourceCtx.putImageData(imageData, 0, 0);
        const scale = Math.min(width / raster.width, height / raster.height);
        const drawWidth = raster.width * scale;
        const drawHeight = raster.height * scale;
        const safePanX = Number.isFinite(cameraPanX) ? Math.min(1, Math.max(-1, cameraPanX)) : 0;
        const safePanY = Number.isFinite(cameraPanY) ? Math.min(1, Math.max(-1, cameraPanY)) : 0;
        const safeZoom = Number.isFinite(cameraZoom) ? Math.min(3, Math.max(0.25, cameraZoom)) : 1;
        const safeRotation = Number.isFinite(cameraRotation) ? cameraRotation : 0;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.translate(width / 2 + safePanX * width / 2, height / 2 - safePanY * height / 2);
        ctx.rotate((safeRotation * Math.PI) / 180);
        ctx.scale(safeZoom, safeZoom);
        ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `${Math.max(16, 18 * dpr)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add an image, SVG, or text source", width / 2, height / 2);
    }
    ctx.restore();
  }, [background, cameraPanX, cameraPanY, cameraRotation, cameraZoom, canvasRef, raster]);

  return <canvas ref={canvasRef} className="preview-canvas" data-camera-pan-x={cameraPanX.toFixed(3)} data-camera-pan-y={cameraPanY.toFixed(3)} data-camera-zoom={cameraZoom.toFixed(3)} data-camera-rotation={cameraRotation.toFixed(1)} />;
}
