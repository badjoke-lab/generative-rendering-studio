import { useEffect, type RefObject } from "react";
import type { RasterPixels } from "@grs/core";

export function OriginalPreview({
  canvasRef,
  raster,
  background,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  raster?: RasterPixels;
  background: string;
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
        sourceCtx.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
        const scale = Math.min(width / raster.width, height / raster.height);
        const drawWidth = raster.width * scale;
        const drawHeight = raster.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, x, y, drawWidth, drawHeight);
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `${Math.max(16, 18 * dpr)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add an image, SVG, or text source", width / 2, height / 2);
    }
    ctx.restore();
  }, [background, canvasRef, raster]);

  return <canvas ref={canvasRef} className="preview-canvas" />;
}
