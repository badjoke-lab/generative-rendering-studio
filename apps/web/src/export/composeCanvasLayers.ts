export function composeCanvasLayers(
  underlay: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  underlayOpacity = 1,
) {
  const width = Math.max(1, overlay.width || underlay.width);
  const height = Math.max(1, overlay.height || underlay.height);
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("canvas-2d-unavailable");

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = Math.min(1, Math.max(0, underlayOpacity));
  ctx.drawImage(underlay, 0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.drawImage(overlay, 0, 0, width, height);
  ctx.restore();
  return output;
}
