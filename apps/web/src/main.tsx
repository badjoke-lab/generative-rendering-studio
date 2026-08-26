import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import { createEmptyProject, pointFieldToFloat32, sampleRasterToPointField } from "@grs/core";
import { WebGLPreview, type PreviewRendererMode } from "./webgl/WebGLPreview";
import "./styles.css";

const project = createEmptyProject(1);
const rendererModes = ["Original", "Glyph", "Point", "Particle"] as const;

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

function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [positions, setPositions] = useState<Float32Array>();
  const [rendererMode, setRendererMode] = useState<PreviewRendererMode>("point");
  const [sourceLabel, setSourceLabel] = useState("sample_source");
  const [sourceDetail, setSourceDetail] = useState("Built-in fallback field");
  const [sourceError, setSourceError] = useState<string | null>(null);

  const loadRaster = async (file: File) => {
    setSourceError(null);
    try {
      const pixels = await rasterizeImageFile(file);
      const field = sampleRasterToPointField(pixels, { maxPoints: 18000 });
      setPositions(pointFieldToFloat32(field).positions);
      setSourceLabel(file.name);
      setSourceDetail(`${pixels.width} × ${pixels.height} · ${field.samples.length.toLocaleString()} points`);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Source import failed");
    }
  };

  const addText = () => {
    const text = window.prompt("レンダリングするテキストを入力", "GRS");
    if (!text) return;
    const pixels = rasterizeText(text);
    const field = sampleRasterToPointField(pixels, { maxPoints: 18000, luminanceThreshold: 0.1 });
    setPositions(pointFieldToFloat32(field).positions);
    setSourceLabel(text);
    setSourceDetail(`Text · ${field.samples.length.toLocaleString()} points`);
    setSourceError(null);
  };

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup"><strong>{brand.shortName}</strong><span>{brand.displayName}</span></div>
        <nav className="workspace-tabs" aria-label="Workspace">
          <button className="tab active" type="button">Compose</button><button className="tab" type="button">Timeline</button><button className="tab" type="button">Export</button>
        </nav>
        <div className="top-actions"><button className="icon-button" type="button">↶</button><button className="icon-button" type="button">↷</button><span className="zoom-label">100%</span><button className="render-button" type="button">▶ Render</button></div>
      </header>

      <aside className="source-panel">
        <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file); event.currentTarget.value = ""; }} />
        <button className="source-add" type="button" onClick={() => fileInput.current?.click()}>＋ Source を追加</button>
        <div className="source-tabs" role="tablist" aria-label="Source types">
          <button className="source-tab active" type="button" onClick={() => fileInput.current?.click()}>画像</button>
          <button className="source-tab" type="button" disabled>動画</button>
          <button className="source-tab" type="button" onClick={addText}>テキスト</button>
          <button className="source-tab" type="button" onClick={() => fileInput.current?.click()}>SVG</button>
          <button className="source-tab" type="button" disabled>3D</button>
        </div>
        <section className="asset-card selected" aria-label="Selected source"><div className="asset-thumb" aria-hidden="true" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? sourceDetail}</span></div><button className="asset-menu" type="button">⋮</button></section>
        <button className="asset-add-row" type="button" onClick={() => fileInput.current?.click()}>＋</button>
        <div className="panel-divider" /><div className="section-title-row"><strong>レイヤー</strong><span>⌄</span></div>
        <section className="layer-row selected"><span className="visibility">◉</span><span className="layer-chip" /><div><strong>メインレンダー</strong><small>100%</small></div></section>
        <div className="panel-footer"><span>Schema v{project.schemaVersion}</span><span>Seed {project.seed}</span></div>
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar"><div className="tool-group"><button type="button">✋</button><button type="button">⌖</button><button type="button">△</button><button type="button">↻</button></div><div className="tool-group compact"><button type="button">3D</button><button type="button">▦</button></div><div className="view-actions"><button type="button">Fit</button><button type="button">1:1</button><button type="button">Full</button></div></div>
        <section className="preview-frame" aria-label="Preview"><div className="canvas-meta"><span>1920 × 1080</span><span>60fps</span><span className="timecode">00:00:00.00</span></div><WebGLPreview positions={positions} mode={rendererMode} /><div className="canvas-status"><span>▲ Camera: Main</span><span>● {rendererMode === "glyph" ? "Glyph" : "Point"} Mode</span><span>○ WebGL2</span></div></section>
        <div className="transport-bar"><button type="button">▶</button><button type="button">■</button><button type="button">|◀</button><button type="button">▶|</button><div className="transport-time">Stage 1 source preview</div><input aria-label="Timeline position" type="range" min="0" max="100" defaultValue="0" disabled /><button type="button">🔊</button><button type="button">⛶</button></div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs"><button type="button">ソース</button><button className="active" type="button">レンダー</button><button type="button">モーション</button><button type="button">エフェクト</button></div>
        <section className="inspector-section"><h2>レンダラーモード</h2><div className="renderer-segmented">{rendererModes.map((mode) => {
          const implemented = mode === "Point" || mode === "Glyph";
          const active = (mode === "Point" && rendererMode === "point") || (mode === "Glyph" && rendererMode === "glyph");
          return <button className={active ? "active" : ""} disabled={!implemented} title={implemented ? "Implemented" : "Stage 1 planned"} type="button" key={mode} onClick={() => { if (mode === "Point") setRendererMode("point"); if (mode === "Glyph") setRendererMode("glyph"); }}>{mode}</button>;
        })}</div></section>
        <section className="inspector-section"><h2>{rendererMode === "glyph" ? "Glyph" : "Point"} 設定</h2><label>入力<code>{sourceLabel}</code></label><label>最大サンプル数<code>18,000</code></label>{rendererMode === "glyph" ? <label>文字セット<code>01 (Basic)</code></label> : null}<p className="muted">画像・SVG・テキストを共通 Point Field に変換し、同じFieldをPointまたはGlyph rendererで描画しています。</p></section>
        <section className="inspector-section compact-section"><div className="toggle-row"><span>Local processing</span><span className="toggle on" /></div><div className="toggle-row"><span>WebGL2</span><span className="toggle on" /></div></section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
