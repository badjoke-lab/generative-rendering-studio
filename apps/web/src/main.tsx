import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import { createEmptyProject, pointFieldToFloat32, sampleRasterToPointField, type RasterPixels } from "@grs/core";
import { OriginalPreview } from "./canvas/OriginalPreview";
import { WebGLPreview, type GlyphPreset, type PreviewRendererMode } from "./webgl/WebGLPreview";
import "./styles.css";

const project = createEmptyProject(1);
const rendererModes = ["Original", "Glyph", "Point", "Particle"] as const;
type StudioRendererMode = "original" | PreviewRendererMode;

async function rasterizeImageFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D canvas is unavailable");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rasterizeText(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas is unavailable");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "700 132px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 24), canvas.width / 2, canvas.height / 2);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function downloadCanvas(canvas: HTMLCanvasElement, type: "image/png" | "image/webp", fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, type, type === "image/webp" ? 0.95 : undefined);
}

function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const [raster, setRaster] = useState<RasterPixels>();
  const [positions, setPositions] = useState<Float32Array>();
  const [colors, setColors] = useState<Float32Array>();
  const [pointCount, setPointCount] = useState(0);
  const [rendererMode, setRendererMode] = useState<StudioRendererMode>("point");
  const [glyphPreset, setGlyphPreset] = useState<GlyphPreset>("binary");
  const [elementSize, setElementSize] = useState(1);
  const [density, setDensity] = useState(62);
  const [edgeWeight, setEdgeWeight] = useState(45);
  const [ditherStrength, setDitherStrength] = useState(35);
  const [tint, setTint] = useState("#c7c2ff");
  const [background, setBackground] = useState("#090b10");
  const [useSourceColor, setUseSourceColor] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "webp">("png");
  const [sourceLabel, setSourceLabel] = useState("sample_source");
  const [sourceDetail, setSourceDetail] = useState("Built-in fallback field");
  const [sourceError, setSourceError] = useState<string | null>(null);

  useEffect(() => {
    if (!raster) return;
    const maxPoints = Math.round(2500 + density * 275);
    const field = sampleRasterToPointField(raster, {
      maxPoints,
      luminanceThreshold: 0.04,
      edgeWeight: edgeWeight / 100,
      ditherStrength: ditherStrength / 100,
    });
    const packed = pointFieldToFloat32(field);
    setPositions(packed.positions);
    setColors(packed.colors);
    setPointCount(field.samples.length);
  }, [density, ditherStrength, edgeWeight, raster]);

  const loadRaster = async (file: File) => {
    setSourceError(null);
    try {
      const pixels = await rasterizeImageFile(file);
      setRaster(pixels);
      setSourceLabel(file.name);
      setSourceDetail(`${pixels.width} × ${pixels.height}`);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Source import failed");
    }
  };

  const addText = () => {
    const text = window.prompt("レンダリングするテキストを入力", "GRS");
    if (!text) return;
    setRaster(rasterizeText(text));
    setSourceLabel(text);
    setSourceDetail("Text source");
    setSourceError(null);
  };

  const exportStill = () => {
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const safeName = sourceLabel.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "render";
    const ext = exportFormat === "webp" ? "webp" : "png";
    downloadCanvas(canvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeName}-${rendererMode}.${ext}`);
  };

  const activeModeLabel = rendererMode[0].toUpperCase() + rendererMode.slice(1);

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup"><strong>{brand.shortName}</strong><span>{brand.displayName}</span></div>
        <nav className="workspace-tabs" aria-label="Workspace"><button className="tab active">Compose</button><button className="tab">Timeline</button><button className="tab">Export</button></nav>
        <div className="top-actions"><button className="icon-button">↶</button><button className="icon-button">↷</button><span className="zoom-label">100%</span><button className="render-button" onClick={exportStill}>↓ Export still</button></div>
      </header>

      <aside className="source-panel">
        <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file); event.currentTarget.value = ""; }} />
        <button className="source-add" onClick={() => fileInput.current?.click()}>＋ Source を追加</button>
        <div className="source-tabs" role="tablist"><button className="source-tab active" onClick={() => fileInput.current?.click()}>画像</button><button className="source-tab" disabled>動画</button><button className="source-tab" onClick={addText}>テキスト</button><button className="source-tab" onClick={() => fileInput.current?.click()}>SVG</button><button className="source-tab" disabled>3D</button></div>
        <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString()} points` : ""}`}</span></div><button className="asset-menu">⋮</button></section>
        <button className="asset-add-row" onClick={() => fileInput.current?.click()}>＋</button>
        <div className="panel-divider" /><div className="section-title-row"><strong>レイヤー</strong><span>⌄</span></div>
        <section className="layer-row selected"><span className="visibility">◉</span><span className="layer-chip" /><div><strong>メインレンダー</strong><small>100%</small></div></section>
        <div className="panel-footer"><span>Schema v{project.schemaVersion}</span><span>Seed {project.seed}</span></div>
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar"><div className="tool-group"><button>✋</button><button>⌖</button><button>△</button><button>↻</button></div><div className="tool-group compact"><button>3D</button><button>▦</button></div><div className="view-actions"><button>Fit</button><button>1:1</button><button>Full</button></div></div>
        <section className="preview-frame"><div className="canvas-meta"><span>Preview</span><span>{rendererMode === "original" ? "Original source" : pointCount ? `${pointCount.toLocaleString()} elements` : "fallback"}</span><span className="timecode">00:00:00.00</span></div>
          {rendererMode === "original" ? <OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} /> : <WebGLPreview canvasRef={previewCanvas} positions={positions} colors={colors} mode={rendererMode} elementSize={elementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} />}
          <div className="canvas-status"><span>▲ Camera: Main</span><span>● {activeModeLabel} Mode</span><span>○ {rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span></div></section>
        <div className="transport-bar"><button>▶</button><button>■</button><button>|◀</button><button>▶|</button><div className="transport-time">Stage 1 source preview</div><input aria-label="Timeline position" type="range" min="0" max="100" defaultValue="0" disabled /><button>🔊</button><button>⛶</button></div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs"><button>ソース</button><button className="active">レンダー</button><button>モーション</button><button>エフェクト</button></div>
        <section className="inspector-section"><h2>レンダラーモード</h2><div className="renderer-segmented">{rendererModes.map((mode) => {
          const value: StudioRendererMode = mode.toLowerCase() as StudioRendererMode;
          return <button className={rendererMode === value ? "active" : ""} key={mode} onClick={() => setRendererMode(value)}>{mode}</button>;
        })}</div></section>
        <section className="inspector-section"><h2>{activeModeLabel} 設定</h2><label>入力<code>{sourceLabel}</code></label>
          {rendererMode === "glyph" && <label>文字セット<select value={glyphPreset} onChange={(e) => setGlyphPreset(e.target.value as GlyphPreset)}><option value="binary">01 (Binary)</option><option value="density">Density 8</option><option value="symbols">Symbols 6</option></select></label>}
          {rendererMode !== "original" && <><label>密度<div className="range-row"><input type="range" min="5" max="100" value={density} onChange={(e) => setDensity(Number(e.target.value))} /><output>{density}%</output></div></label><label>サイズ<div className="range-row"><input type="range" min="40" max="240" value={Math.round(elementSize * 100)} onChange={(e) => setElementSize(Number(e.target.value) / 100)} /><output>{Math.round(elementSize * 100)}%</output></div></label><label>エッジ強調<div className="range-row"><input type="range" min="0" max="100" value={edgeWeight} onChange={(e) => setEdgeWeight(Number(e.target.value))} /><output>{edgeWeight}%</output></div></label><label>Dither<div className="range-row"><input type="range" min="0" max="100" value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))} /><output>{ditherStrength}%</output></div></label><label>描画色<div className="color-row"><input type="color" value={tint} onChange={(e) => setTint(e.target.value)} /><code>{tint}</code></div></label><div className="toggle-row"><span>Source color</span><button className={`toggle ${useSourceColor ? "on" : ""}`} aria-pressed={useSourceColor} onClick={() => setUseSourceColor((v) => !v)} /></div></>}
          <label>背景<div className="color-row"><input type="color" value={background} onChange={(e) => setBackground(e.target.value)} /><code>{background}</code></div></label>
        </section>
        <section className="inspector-section"><h2>Still Export</h2><label>形式<select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as "png" | "webp")}><option value="png">PNG</option><option value="webp">WebP</option></select></label><button className="source-add" onClick={exportStill}>現在のフレームを書き出す</button></section>
        <section className="inspector-section compact-section"><div className="toggle-row"><span>Local processing</span><span className="toggle on" /></div><div className="toggle-row"><span>{rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span><span className="toggle on" /></div></section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
