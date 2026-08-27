import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import {
  applyMorphEasing,
  createMorphMapping,
  morphMappingToFloat32,
  pointFieldToFloat32,
  sampleRasterToPointField,
  type MorphEasing,
  type PointField,
  type RasterPixels,
} from "@grs/core";
import { OriginalPreview } from "./canvas/OriginalPreview";
import { getCanvasRecordingCapability, recordCanvasAnimation } from "./export/recordCanvasAnimation";
import { useLocale, type Locale } from "./i18n";
import { WebGLPreview, type GlyphPreset, type PreviewRendererMode } from "./webgl/WebGLPreview";
import "./styles.css";
import "./mobile-ux.css";

const rendererModes = ["original", "glyph", "point", "particle"] as const;
type StudioRendererMode = "original" | PreviewRendererMode;
type SourceKind = "still" | "text" | "video";

function rasterizeDrawable(drawable: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas-2d-unavailable");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(drawable, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

async function rasterizeImageFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return rasterizeDrawable(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rasterizeVideoElement(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error("video-frame-unavailable");
  }
  return rasterizeDrawable(video, video.videoWidth, video.videoHeight);
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

function formatTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const hundredths = Math.floor((safe - Math.floor(safe)) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function App() {
  const { locale, setLocale, t } = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const morphInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const videoUrl = useRef<string | null>(null);

  const [raster, setRaster] = useState<RasterPixels>();
  const [morphRaster, setMorphRaster] = useState<RasterPixels>();
  const [field, setField] = useState<PointField>();
  const [morphField, setMorphField] = useState<PointField>();
  const [sourceKind, setSourceKind] = useState<SourceKind>("still");
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
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
  const [sourceLabel, setSourceLabel] = useState("render");
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
  const [animationExportSucceeded, setAnimationExportSucceeded] = useState(false);
  const [animationCapability, setAnimationCapability] = useState(() => getCanvasRecordingCapability(null));

  const clearVideoSource = () => {
    const video = videoElement.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    videoUrl.current = null;
    setVideoPlaying(false);
    setVideoDuration(0);
    setVideoTime(0);
  };

  useEffect(() => () => {
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
  }, []);

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimationCapability(getCanvasRecordingCapability(previewCanvas.current)));
    return () => cancelAnimationFrame(frame);
  }, [rendererMode, raster]);

  useEffect(() => {
    if (sourceKind !== "video" || !videoPlaying) return;
    const video = videoElement.current;
    if (!video) return;
    let frame = 0;
    let lastCapture = 0;
    const tick = (now: number) => {
      if (video.paused || video.ended) {
        setVideoPlaying(false);
        setVideoTime(video.currentTime);
        try { setRaster(rasterizeVideoElement(video)); } catch { /* keep last good frame */ }
        return;
      }
      if (now - lastCapture >= 70) {
        lastCapture = now;
        setVideoTime(video.currentTime);
        try { setRaster(rasterizeVideoElement(video)); } catch { /* wait for the next decoded frame */ }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sourceKind, videoPlaying]);

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
  const hasSource = Boolean(raster);
  const isVideoSource = sourceKind === "video";

  useEffect(() => {
    if (!morphPlaying || !morphEnabled || !morphPacked || isVideoSource) return;
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
  }, [isVideoSource, morphDuration, morphEnabled, morphPacked, morphPlaying]);

  const loadRaster = async (file: File, target: "source" | "morph") => {
    if (animationExporting) return;
    setSourceError(null);
    setAnimationExportSucceeded(false);
    try {
      const pixels = await rasterizeImageFile(file);
      if (target === "morph") {
        setMorphRaster(pixels);
        setMorphLabel(file.name);
        setMorphProgress(0);
      } else {
        clearVideoSource();
        setSourceKind("still");
        setRaster(pixels);
        setSourceLabel(file.name);
        setSourceDetail(`${pixels.width} × ${pixels.height}`);
      }
    } catch {
      setSourceError(t("source.importFailed"));
    }
  };

  const loadVideo = async (file: File) => {
    if (animationExporting) return;
    const video = videoElement.current;
    if (!video) return;
    setSourceError(null);
    setAnimationExportSucceeded(false);
    clearVideoSource();
    setMorphRaster(undefined);
    setMorphField(undefined);
    setMorphLabel("");
    setMorphEnabled(false);
    setMorphPlaying(false);
    const url = URL.createObjectURL(file);
    videoUrl.current = url;
    try {
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = url;
      video.load();
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("video-decode-failed")); };
        const cleanup = () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
      });
      video.currentTime = 0;
      const pixels = rasterizeVideoElement(video);
      setSourceKind("video");
      setRaster(pixels);
      setSourceLabel(file.name);
      setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setVideoTime(0);
      setSourceDetail(`${t("source.video")} · ${video.videoWidth} × ${video.videoHeight}${Number.isFinite(video.duration) ? ` · ${video.duration.toFixed(2)} ${t("morph.seconds")}` : ""}`);
    } catch {
      clearVideoSource();
      setSourceError(t("source.videoImportFailed"));
    }
  };

  const addText = () => {
    if (animationExporting) return;
    const text = window.prompt(t("source.textPrompt"), "GRS");
    if (!text) return;
    try {
      clearVideoSource();
      setSourceKind("text");
      setRaster(rasterizeText(text));
      setSourceLabel(text);
      setSourceDetail(t("source.textDetail"));
      setSourceError(null);
      setAnimationExportSucceeded(false);
    } catch {
      setSourceError(t("source.importFailed"));
    }
  };

  const seekVideo = (progress: number) => {
    const video = videoElement.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.pause();
    setVideoPlaying(false);
    const nextTime = Math.min(video.duration, Math.max(0, progress * video.duration));
    video.currentTime = nextTime;
    setVideoTime(nextTime);
    const onSeeked = () => {
      try { setRaster(rasterizeVideoElement(video)); } catch { /* keep last good frame */ }
    };
    video.addEventListener("seeked", onSeeked, { once: true });
  };

  const playVideo = async () => {
    const video = videoElement.current;
    if (!video) return;
    if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.02)) video.currentTime = 0;
    try {
      await video.play();
      setVideoPlaying(true);
    } catch {
      setSourceError(t("source.videoPlaybackFailed"));
    }
  };

  const stopVideo = () => {
    const video = videoElement.current;
    if (!video) return;
    video.pause();
    setVideoPlaying(false);
    setVideoTime(video.currentTime);
  };

  const exportStill = () => {
    if (animationExporting || !raster) return;
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const ext = exportFormat === "webp" ? "webp" : "png";
    downloadCanvas(canvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeFileStem(sourceLabel)}-${rendererMode}.${ext}`);
  };

  const exportMorphAnimation = async () => {
    const canvas = previewCanvas.current;
    if (!canvas || !field || !morphField || rendererMode === "original" || isVideoSource) return;
    const capability = getCanvasRecordingCapability(canvas);
    setAnimationCapability(capability);
    if (!capability.supported) {
      setAnimationExportError(t("export.animationUnsupported"));
      setAnimationExportSucceeded(false);
      return;
    }
    setAnimationExportError(null);
    setAnimationExportSucceeded(false);
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
      setAnimationExportSucceeded(true);
    } catch (error) {
      setAnimationExportSucceeded(false);
      setAnimationExportError(error instanceof Error && error.message === "animation-export-unsupported" ? t("export.animationUnsupported") : t("export.animationFailed"));
    } finally {
      setMorphProgress(1);
      setAnimationExporting(false);
    }
  };

  const rendererLabel = (mode: StudioRendererMode) => t(`renderer.${mode}` as const);
  const activeModeLabel = rendererLabel(rendererMode);
  const canMorph = Boolean(field && morphField) && !isVideoSource;
  const canExportAnimation = canMorph && rendererMode !== "original" && animationCapability.supported && !animationExporting;
  const animationFormatLabel = animationCapability.supported
    ? animationCapability.preferredExtension
      ? `${animationCapability.preferredExtension.toUpperCase()} · ${animationCapability.preferredMimeType ?? "MediaRecorder"}`
      : t("export.animationBrowserDefault")
    : t("export.animationUnsupported");
  const transportProgress = isVideoSource && videoDuration > 0 ? (videoTime / videoDuration) * 100 : morphProgress * 100;
  const transportPlaying = isVideoSource ? videoPlaying : morphPlaying;

  return (
    <main className="studio-shell">
      <video ref={videoElement} className="source-video-element" muted playsInline preload="auto" aria-hidden="true" />
      <header className="studio-topbar">
        <div className="brand-lockup"><strong>{brand.shortName}</strong><span>{brand.displayName}</span></div>
        <div className="release-badge">{t("status.developmentPreview")}</div>
        <div className="top-actions">
          <label className="locale-control"><span>{t("language.label")}</span><select aria-label={t("language.label")} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">{t("language.english")}</option><option value="ja">{t("language.japanese")}</option></select></label>
          <button className="render-button" disabled={!hasSource || animationExporting} onClick={exportStill}><span aria-hidden="true">↓</span><span className="desktop-export-label">{t("action.exportStill")}</span><span className="mobile-export-label">{t("action.exportStillShort")}</span></button>
        </div>
      </header>

      <aside className="source-panel">
        <input ref={fileInput} data-source-kind="still" hidden disabled={animationExporting} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />
        <input ref={videoInput} data-source-kind="video" hidden disabled={animationExporting} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadVideo(file); event.currentTarget.value = ""; }} />
        <input ref={morphInput} data-source-kind="morph" hidden disabled={animationExporting || isVideoSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "morph"); event.currentTarget.value = ""; }} />

        <section className="quickstart-card" aria-label={t("guide.title")}>
          <strong>{t("guide.title")}</strong>
          <p>{t("guide.summary")}</p>
          <div className="workflow-steps">
            <span className={!hasSource ? "active" : "done"}><b>1</b>{t("guide.stepSource")}</span>
            <span className={hasSource ? "active" : ""}><b>2</b>{t("guide.stepRender")}</span>
            <span className={morphField ? "done" : ""}><b>3</b>{t("guide.stepMorph")}</span>
            <span><b>4</b>{t("guide.stepExport")}</span>
          </div>
        </section>

        <div className="source-choice-row">
          <button className="source-add" disabled={animationExporting} onClick={() => fileInput.current?.click()}>＋ {t("action.addSource")}</button>
          <button className="source-secondary" disabled={animationExporting} onClick={() => videoInput.current?.click()}>＋ {t("action.addVideo")}</button>
          <button className="source-secondary" disabled={animationExporting} onClick={addText}>＋ {t("source.text")}</button>
        </div>
        <p className="supported-note">{t("source.supportedMedia")}</p>

        <div className="section-title-row source-heading"><strong>{t("source.primary")}</strong></div>
        {hasSource ? <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : ""}`}</span></div><button className="asset-menu" disabled={animationExporting}>⋮</button></section> : <button className="empty-source-card" disabled={animationExporting} onClick={() => fileInput.current?.click()}><span className="empty-source-plus">＋</span><span><strong>{t("source.emptyTitle")}</strong><small>{t("source.emptyDetail")}</small></span></button>}

        <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.morphTarget")}</strong><span className="optional-label">{t("source.optional")}</span></div>
        {isVideoSource ? <p className="supported-note stage3-note">{t("source.videoMorphLater")}</p> : morphLabel ? <section className="asset-card"><div className="asset-thumb" /><div className="asset-meta"><strong>{morphLabel}</strong><span>{morphField ? `${morphField.samples.length.toLocaleString(locale)} ${t("preview.elements")}` : "…"}</span></div></section> : <button className="asset-add-row" disabled={animationExporting} onClick={() => morphInput.current?.click()}>＋ {t("action.addMorphTarget")}</button>}
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar"><div className="canvas-heading"><strong>{t("preview.title")}</strong><span>{isVideoSource ? t("guide.videoPreviewHint") : t("guide.previewHint")}</span></div><span className="mode-pill">{activeModeLabel}</span></div>
        <section className="preview-frame"><div className="canvas-meta"><span>{t("preview.title")}</span><span>{rendererMode === "original" ? t("preview.originalSource") : pointCount ? `${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : t("preview.fallback")}</span><span className="timecode">{isVideoSource ? formatTime(videoTime) : morphEnabled ? `${Math.round(morphProgress * 100)}%` : "00:00:00.00"}</span></div>
          {rendererMode === "original" ? <OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} /> : <WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} elementSize={elementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} />}
          <div className="canvas-status"><span>● {activeModeLabel} {t("preview.modeSuffix")}</span><span>{rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span></div></section>
        <div className="transport-bar">
          <button aria-label={isVideoSource ? t("video.play") : t("morph.play")} disabled={isVideoSource ? !hasSource || videoPlaying || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) void playVideo(); else { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying(true); } }}>▶</button>
          <button aria-label={isVideoSource ? t("video.stop") : t("morph.stop")} disabled={!transportPlaying || animationExporting} onClick={() => { if (isVideoSource) stopVideo(); else setMorphPlaying(false); }}>■</button>
          <button aria-label={isVideoSource ? t("video.start") : "Start"} disabled={isVideoSource ? !hasSource || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) seekVideo(0); else { setMorphPlaying(false); setMorphProgress(0); } }}>|◀</button>
          <button aria-label={isVideoSource ? t("video.end") : "End"} disabled={isVideoSource ? !hasSource || videoDuration <= 0 || animationExporting : !canMorph || animationExporting} onClick={() => { if (isVideoSource) seekVideo(1); else { setMorphPlaying(false); setMorphProgress(1); } }}>▶|</button>
          <div className="transport-time">{isVideoSource ? t("preview.video") : morphEnabled ? t("preview.morph") : t("preview.stage1")}</div>
          <input aria-label={isVideoSource ? t("video.timelinePosition") : t("preview.timelinePosition")} type="range" min="0" max="100" value={Math.round(transportProgress)} disabled={isVideoSource ? !hasSource || videoDuration <= 0 || animationExporting : !canMorph || animationExporting} onChange={(e) => { const progress = Number(e.target.value) / 100; if (isVideoSource) seekVideo(progress); else { setMorphPlaying(false); setMorphProgress(progress); } }} />
        </div>
      </section>

      <aside className="inspector-panel">
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">2</span><div><h2>{t("inspector.rendererMode")}</h2><p>{t("guide.renderHint")}</p></div></div><div className="renderer-segmented">{rendererModes.map((mode) => <button disabled={(morphEnabled && mode === "original") || animationExporting} className={rendererMode === mode ? "active" : ""} key={mode} onClick={() => setRendererMode(mode)}>{rendererLabel(mode)}</button>)}</div></section>
        <section className="inspector-section"><h2>{activeModeLabel} {t("inspector.settingsSuffix")}</h2><label>{t("inspector.input")}<code>{hasSource ? sourceLabel : t("source.notSelected")}</code></label>
          {rendererMode === "glyph" && <label>{t("inspector.characterSet")}<select value={glyphPreset} disabled={animationExporting} onChange={(e) => setGlyphPreset(e.target.value as GlyphPreset)}><option value="binary">01 (Binary)</option><option value="density">Density 8</option><option value="symbols">Symbols 6</option></select></label>}
          {rendererMode !== "original" && <><label>{t("inspector.density")}<div className="range-row"><input type="range" min="5" max="100" value={density} disabled={animationExporting} onChange={(e) => setDensity(Number(e.target.value))} /><output>{density}%</output></div></label><label>{t("inspector.size")}<div className="range-row"><input type="range" min="40" max="240" value={Math.round(elementSize * 100)} disabled={animationExporting} onChange={(e) => setElementSize(Number(e.target.value) / 100)} /><output>{Math.round(elementSize * 100)}%</output></div></label><label>{t("inspector.edgeEmphasis")}<div className="range-row"><input type="range" min="0" max="100" value={edgeWeight} disabled={animationExporting} onChange={(e) => setEdgeWeight(Number(e.target.value))} /><output>{edgeWeight}%</output></div></label><label>{t("inspector.dither")}<div className="range-row"><input type="range" min="0" max="100" value={ditherStrength} disabled={animationExporting} onChange={(e) => setDitherStrength(Number(e.target.value))} /><output>{ditherStrength}%</output></div></label><label>{t("inspector.renderColor")}<div className="color-row"><input type="color" value={tint} disabled={animationExporting} onChange={(e) => setTint(e.target.value)} /><code>{tint}</code></div></label><div className="toggle-row"><span>{t("inspector.sourceColor")}</span><button disabled={animationExporting} className={`toggle ${useSourceColor ? "on" : ""}`} aria-pressed={useSourceColor} onClick={() => setUseSourceColor((v) => !v)} /></div></>}
          <label>{t("inspector.background")}<div className="color-row"><input type="color" value={background} disabled={animationExporting} onChange={(e) => setBackground(e.target.value)} /><code>{background}</code></div></label>
        </section>
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">3</span><div><h2>{t("morph.title")}</h2><p>{t("guide.morphHint")}</p></div></div>{isVideoSource ? <p>{t("source.videoMorphLater")}</p> : !canMorph ? <p>{t("morph.needsTarget")}</p> : <><div className="toggle-row"><span>{t("morph.enabled")}</span><button disabled={animationExporting} className={`toggle ${morphEnabled ? "on" : ""}`} aria-pressed={morphEnabled} onClick={() => { const next = !morphEnabled; setMorphEnabled(next); if (next && rendererMode === "original") setRendererMode("point"); }} /></div><label>{t("morph.progress")}<div className="range-row"><input type="range" min="0" max="100" value={Math.round(morphProgress * 100)} disabled={animationExporting} onChange={(e) => { setMorphPlaying(false); setMorphProgress(Number(e.target.value) / 100); }} /><output>{Math.round(morphProgress * 100)}%</output></div></label><label>{t("morph.easing")}<select value={morphEasing} disabled={animationExporting} onChange={(e) => setMorphEasing(e.target.value as MorphEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="smoothstep">{t("morph.smoothstep")}</option></select></label><label>{t("morph.duration")}<div className="range-row"><input type="range" min="1" max="12" step="0.5" value={morphDuration} disabled={animationExporting} onChange={(e) => setMorphDuration(Number(e.target.value))} /><output>{morphDuration} {t("morph.seconds")}</output></div></label><button className="source-add" disabled={animationExporting} onClick={() => { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying((v) => !v); }}>{morphPlaying ? t("morph.stop") : t("morph.play")}</button></>}</section>
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">4</span><div><h2>{t("export.still")}</h2><p>{isVideoSource ? t("guide.videoStillExportHint") : t("guide.exportHint")}</p></div></div><label>{t("export.format")}<select value={exportFormat} disabled={animationExporting} onChange={(e) => setExportFormat(e.target.value as "png" | "webp")}><option value="png">PNG</option><option value="webp">WebP</option></select></label><button className="source-add" disabled={!hasSource || animationExporting} onClick={exportStill}>{t("export.currentFrame")}</button></section>
        <section className="inspector-section"><h2>{t("export.animation")}</h2><p>{isVideoSource ? t("export.videoLongExportLater") : animationExportError ?? (animationExportSucceeded ? t("export.animationSaved") : t("export.animationHint"))}</p><label>{t("export.animationSupportedFormat")}<code>{animationFormatLabel}</code></label><button className="source-add" disabled={!canExportAnimation} onClick={() => void exportMorphAnimation()}>{animationExporting ? t("export.animationRecording") : t("export.animationButton")}</button></section>
        <section className="inspector-section local-processing-note"><strong>{t("status.localProcessing")}</strong><p>{t("status.localProcessingDetail")}</p><code>{rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</code></section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
