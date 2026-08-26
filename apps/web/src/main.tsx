import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import {
  applyMorphEasing,
  createEmptyProject,
  createMorphMapping,
  morphMappingToFloat32,
  pointFieldToFloat32,
  sampleRasterToPointField,
  type MorphEasing,
  type PointField,
  type RasterPixels,
} from "@grs/core";
import { OriginalPreview } from "./canvas/OriginalPreview";
import { canRecordCanvasAnimation, recordCanvasAnimation } from "./export/recordCanvasAnimation";
import { useLocale, type Locale } from "./i18n";
import { WebGLPreview, type GlyphPreset, type PreviewRendererMode } from "./webgl/WebGLPreview";
import "./styles.css";

const project = createEmptyProject(1);
const rendererModes = ["original", "glyph", "point", "particle"] as const;
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
    if (!ctx) throw new Error("canvas-2d-unavailable");
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
  if (!ctx) throw new Error("canvas-2d-unavailable");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "700 132px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 24), canvas.width / 2, canvas.height / 2);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCanvas(canvas: HTMLCanvasElement, type: "image/png" | "image/webp", fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, fileName);
  }, type, type === "image/webp" ? 0.95 : undefined);
}

function safeFileStem(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "render";
}

function App() {
  const { locale, setLocale, t } = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const morphInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);

  const [raster, setRaster] = useState<RasterPixels>();
  const [morphRaster, setMorphRaster] = useState<RasterPixels>();
  const [field, setField] = useState<PointField>();
  const [morphField, setMorphField] = useState<PointField>();
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
  const [sourceDetail, setSourceDetail] = useState(() => t("source.fallbackDetail"));
  const [morphLabel, setMorphLabel] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [morphEnabled, setMorphEnabled] = useState(false);
  const [morphProgress, setMorphProgress] = useState(0);
  const [morphEasing, setMorphEasing] = useState<MorphEasing>("smoothstep");
  const [morphDuration, setMorphDuration] = useState(3);
  const [morphPlaying, setMorphPlaying] = useState(false);
  const [animationExporting, setAnimationExporting] = useState(false);
  const [animationExportError, setAnimationExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!raster) setSourceDetail(t("source.fallbackDetail"));
  }, [locale, raster, t]);

  useEffect(() => {
    if (!raster) return;
    const maxPoints = Math.round(2500 + density * 275);
    setField(sampleRasterToPointField(raster, {
      maxPoints,
      luminanceThreshold: 0.04,
      edgeWeight: edgeWeight / 100,
      ditherStrength: ditherStrength / 100,
    }));
  }, [density, ditherStrength, edgeWeight, raster]);

  useEffect(() => {
    if (!morphRaster) {
      setMorphField(undefined);
      return;
    }
    const maxPoints = Math.round(2500 + density * 275);
    setMorphField(sampleRasterToPointField(morphRaster, {
      maxPoints,
      luminanceThreshold: 0.04,
      edgeWeight: edgeWeight / 100,
      ditherStrength: ditherStrength / 100,
    }));
  }, [density, ditherStrength, edgeWeight, morphRaster]);

  const basePacked = useMemo(() => field ? pointFieldToFloat32(field) : undefined, [field]);
  const morphPacked = useMemo(() => {
    if (!field || !morphField) return undefined;
    return morphMappingToFloat32(createMorphMapping(field, morphField));
  }, [field, morphField]);

  const easedProgress = applyMorphEasing(morphProgress, morphEasing);
  const activeMorph = morphEnabled && morphPacked ? morphPacked : undefined;
  const previewPositions = activeMorph?.fromPositions ?? basePacked?.positions;
  const previewColors = activeMorph?.fromColors ?? basePacked?.colors;
  const pointCount = previewPositions ? previewPositions.length / 2 : 0;

  useEffect(() => {
    if (!morphPlaying || !morphEnabled || !morphPacked) return;
    const start = performance.now() - morphProgress * morphDuration * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / Math.max(100, morphDuration * 1000));
      setMorphProgress(next);
      if (next >= 1) setMorphPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [morphDuration, morphEnabled, morphPacked, morphPlaying]);

  const loadRaster = async (file: File, target: "source" | "morph") => {
    setSourceError(null);
    try {
      const pixels = await rasterizeImageFile(file);
      if (target === "morph") {
        setMorphRaster(pixels);
        setMorphLabel(file.name);
        setMorphProgress(0);
      } else {
        setRaster(pixels);
        setSourceLabel(file.name);
        setSourceDetail(`${pixels.width} × ${pixels.height}`);
      }
    } catch {
      setSourceError(t("source.importFailed"));
    }
  };

  const addText = () => {
    const text = window.prompt(t("source.textPrompt"), "GRS");
    if (!text) return;
    try {
      setRaster(rasterizeText(text));
      setSourceLabel(text);
      setSourceDetail(t("source.textDetail"));
      setSourceError(null);
    } catch {
      setSourceError(t("source.importFailed"));
    }
  };

  const exportStill = () => {
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const ext = exportFormat === "webp" ? "webp" : "png";
    downloadCanvas(canvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeFileStem(sourceLabel)}-${rendererMode}.${ext}`);
  };

  const exportMorphAnimation = async () => {
    const canvas = previewCanvas.current;
    if (!canvas || !field || !morphField || rendererMode === "original") return;
    if (!canRecordCanvasAnimation(canvas)) {
      setAnimationExportError(t("export.animationUnsupported"));
      return;
    }

    setAnimationExportError(null);
    setAnimationExporting(true);
    setMorphPlaying(false);
    setMorphEnabled(true);
    setMorphProgress(0);

    try {
      const result = await recordCanvasAnimation({
        canvas,
        durationSeconds: morphDuration,
        frameRate: 60,
        onProgress: setMorphProgress,
      });
      downloadBlob(result.blob, `${safeFileStem(sourceLabel)}-to-${safeFileStem(morphLabel || "morph")}-${rendererMode}.${result.extension}`);
    } catch (error) {
      setAnimationExportError(error instanceof Error && error.message === "animation-export-unsupported" ? t("export.animationUnsupported") : t("export.animationFailed"));
    } finally {
      setAnimationExporting(false);
    }
  };

  const rendererLabel = (mode: StudioRendererMode) => t(`renderer.${mode}` as const);
  const activeModeLabel = rendererLabel(rendererMode);
  const canMorph = Boolean(field && morphField);
  const canExportAnimation = canMorph && rendererMode !== "original" && !animationExporting;

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup"><strong>{brand.shortName}</strong><span>{brand.displayName}</span></div>
        <nav className="workspace-tabs" aria-label={t("workspace.label")}><button className="tab active">{t("workspace.compose")}</button><button className="tab">{t("workspace.timeline")}</button><button className="tab">{t("workspace.export")}</button></nav>
        <div className="top-actions"><button className="icon-button">↶</button><button className="icon-button">↷</button><span className="zoom-label">100%</span><label className="locale-control"><span>{t("language.label")}</span><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">{t("language.english")}</option><option value="ja">{t("language.japanese")}</option></select></label><button className="render-button" onClick={exportStill}>↓ {t("action.exportStill")}</button></div>
      </header>

      <aside className="source-panel">
        <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />
        <input ref={morphInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "morph"); event.currentTarget.value = ""; }} />
        <button className="source-add" onClick={() => fileInput.current?.click()}>＋ {t("action.addSource")}</button>
        <div className="source-tabs" role="tablist"><button className="source-tab active" onClick={() => fileInput.current?.click()}>{t("source.image")}</button><button className="source-tab" disabled>{t("source.video")}</button><button className="source-tab" onClick={addText}>{t("source.text")}</button><button className="source-tab" onClick={() => fileInput.current?.click()}>{t("source.svg")}</button><button className="source-tab" disabled>{t("source.threeD")}</button></div>
        <div className="section-title-row"><strong>{t("source.primary")}</strong></div>
        <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : ""}`}</span></div><button className="asset-menu">⋮</button></section>
        <div className="section-title-row"><strong>{t("source.morphTarget")}</strong></div>
        {morphLabel ? <section className="asset-card"><div className="asset-thumb" /><div className="asset-meta"><strong>{morphLabel}</strong><span>{morphField ? `${morphField.samples.length.toLocaleString(locale)} ${t("preview.elements")}` : "…"}</span></div></section> : <button className="asset-add-row" onClick={() => morphInput.current?.click()}>＋ {t("action.addMorphTarget")}</button>}
        <div className="panel-divider" /><div className="section-title-row"><strong>{t("layer.title")}</strong><span>⌄</span></div>
        <section className="layer-row selected"><span className="visibility">◉</span><span className="layer-chip" /><div><strong>{t("layer.mainRender")}</strong><small>100%</small></div></section>
        <div className="panel-footer"><span>Schema v{project.schemaVersion}</span><span>Seed {project.seed}</span></div>
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar"><div className="tool-group"><button>✋</button><button>⌖</button><button>△</button><button>↻</button></div><div className="tool-group compact"><button>3D</button><button>▦</button></div><div className="view-actions"><button>{t("view.fit")}</button><button>1:1</button><button>{t("view.full")}</button></div></div>
        <section className="preview-frame"><div className="canvas-meta"><span>{t("preview.title")}</span><span>{rendererMode === "original" ? t("preview.originalSource") : pointCount ? `${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : t("preview.fallback")}</span><span className="timecode">{morphEnabled ? `${Math.round(morphProgress * 100)}%` : "00:00:00.00"}</span></div>
          {rendererMode === "original" ? <OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} /> : <WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} elementSize={elementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} />}
          <div className="canvas-status"><span>▲ {t("preview.cameraMain")}</span><span>● {activeModeLabel} {t("preview.modeSuffix")}</span><span>○ {rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span></div></section>
        <div className="transport-bar"><button disabled={animationExporting} onClick={() => { if (canMorph) { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying(true); } }}>▶</button><button onClick={() => setMorphPlaying(false)}>■</button><button onClick={() => { setMorphPlaying(false); setMorphProgress(0); }}>|◀</button><button onClick={() => { setMorphPlaying(false); setMorphProgress(1); }}>▶|</button><div className="transport-time">{morphEnabled ? t("preview.morph") : t("preview.stage1")}</div><input aria-label={t("preview.timelinePosition")} type="range" min="0" max="100" value={Math.round(morphProgress * 100)} disabled={!canMorph || animationExporting} onChange={(e) => { setMorphPlaying(false); setMorphProgress(Number(e.target.value) / 100); }} /><button>🔊</button><button>⛶</button></div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs"><button>{t("inspector.source")}</button><button className="active">{t("inspector.render")}</button><button>{t("inspector.motion")}</button><button>{t("inspector.effects")}</button></div>
        <section className="inspector-section"><h2>{t("inspector.rendererMode")}</h2><div className="renderer-segmented">{rendererModes.map((mode) => <button disabled={(morphEnabled && mode === "original") || animationExporting} className={rendererMode === mode ? "active" : ""} key={mode} onClick={() => setRendererMode(mode)}>{rendererLabel(mode)}</button>)}</div></section>
        <section className="inspector-section"><h2>{activeModeLabel} {t("inspector.settingsSuffix")}</h2><label>{t("inspector.input")}<code>{sourceLabel}</code></label>
          {rendererMode === "glyph" && <label>{t("inspector.characterSet")}<select value={glyphPreset} onChange={(e) => setGlyphPreset(e.target.value as GlyphPreset)}><option value="binary">01 (Binary)</option><option value="density">Density 8</option><option value="symbols">Symbols 6</option></select></label>}
          {rendererMode !== "original" && <><label>{t("inspector.density")}<div className="range-row"><input type="range" min="5" max="100" value={density} onChange={(e) => setDensity(Number(e.target.value))} /><output>{density}%</output></div></label><label>{t("inspector.size")}<div className="range-row"><input type="range" min="40" max="240" value={Math.round(elementSize * 100)} onChange={(e) => setElementSize(Number(e.target.value) / 100)} /><output>{Math.round(elementSize * 100)}%</output></div></label><label>{t("inspector.edgeEmphasis")}<div className="range-row"><input type="range" min="0" max="100" value={edgeWeight} onChange={(e) => setEdgeWeight(Number(e.target.value))} /><output>{edgeWeight}%</output></div></label><label>{t("inspector.dither")}<div className="range-row"><input type="range" min="0" max="100" value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))} /><output>{ditherStrength}%</output></div></label><label>{t("inspector.renderColor")}<div className="color-row"><input type="color" value={tint} onChange={(e) => setTint(e.target.value)} /><code>{tint}</code></div></label><div className="toggle-row"><span>{t("inspector.sourceColor")}</span><button className={`toggle ${useSourceColor ? "on" : ""}`} aria-pressed={useSourceColor} onClick={() => setUseSourceColor((v) => !v)} /></div></>}
          <label>{t("inspector.background")}<div className="color-row"><input type="color" value={background} onChange={(e) => setBackground(e.target.value)} /><code>{background}</code></div></label>
        </section>
        <section className="inspector-section"><h2>{t("morph.title")}</h2>{!canMorph ? <p>{t("morph.needsTarget")}</p> : <><div className="toggle-row"><span>{t("morph.enabled")}</span><button disabled={animationExporting} className={`toggle ${morphEnabled ? "on" : ""}`} aria-pressed={morphEnabled} onClick={() => { const next = !morphEnabled; setMorphEnabled(next); if (next && rendererMode === "original") setRendererMode("point"); }} /></div><label>{t("morph.progress")}<div className="range-row"><input type="range" min="0" max="100" value={Math.round(morphProgress * 100)} disabled={animationExporting} onChange={(e) => { setMorphPlaying(false); setMorphProgress(Number(e.target.value) / 100); }} /><output>{Math.round(morphProgress * 100)}%</output></div></label><label>{t("morph.easing")}<select value={morphEasing} disabled={animationExporting} onChange={(e) => setMorphEasing(e.target.value as MorphEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="smoothstep">{t("morph.smoothstep")}</option></select></label><label>{t("morph.duration")}<div className="range-row"><input type="range" min="1" max="12" step="0.5" value={morphDuration} disabled={animationExporting} onChange={(e) => setMorphDuration(Number(e.target.value))} /><output>{morphDuration} {t("morph.seconds")}</output></div></label><button className="source-add" disabled={animationExporting} onClick={() => { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying((v) => !v); }}>{morphPlaying ? t("morph.stop") : t("morph.play")}</button></>}</section>
        <section className="inspector-section"><h2>{t("export.still")}</h2><label>{t("export.format")}<select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as "png" | "webp")}><option value="png">PNG</option><option value="webp">WebP</option></select></label><button className="source-add" onClick={exportStill}>{t("export.currentFrame")}</button></section>
        <section className="inspector-section"><h2>{t("export.animation")}</h2><p>{animationExportError ?? t("export.animationHint")}</p><button className="source-add" disabled={!canExportAnimation} onClick={() => void exportMorphAnimation()}>{animationExporting ? t("export.animationRecording") : t("export.animationButton")}</button></section>
        <section className="inspector-section compact-section"><div className="toggle-row"><span>{t("status.localProcessing")}</span><span className="toggle on" /></div><div className="toggle-row"><span>{rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span><span className="toggle on" /></div></section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
