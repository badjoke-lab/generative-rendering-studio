import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { brand } from "@grs/brand";
import {
  analysisValueToSizeScale,
  analyzeRasterLuminance,
  applyMorphEasing,
  applyRasterMaskToPointField,
  applyRasterTextureToPointField,
  createLayerOpacityTrack,
  createMorphMapping,
  createMotionStrengthTrack,
  createNumericKeyframe,
  morphMappingToFloat32,
  pointFieldToFloat32,
  sampleLayerOpacityTrack,
  sampleMotionStrengthTrack,
  sampleRasterToPointField,
  type KeyframeEasing,
  type MorphEasing,
  type PointField,
  type ProceduralGeneratorKind,
  type RasterPixels,
} from "@grs/core";
import { OriginalPreview } from "./canvas/OriginalPreview";
import { ProceduralSourcePanel } from "./procedural/ProceduralSourcePanel";
import { VideoCompositePreview } from "./canvas/VideoCompositePreview";
import { composeCanvasStack } from "./export/composeCanvasLayers";
import { VideoLayerStackPanel, type VideoLayerBlendMode } from "./studio/VideoLayerStackPanel";
import { getCanvasRecordingCapability, recordCanvasAnimation } from "./export/recordCanvasAnimation";
import { useLocale, type Locale } from "./i18n";
import { WebGLPreview, type GlyphPreset, type PreviewMotionMode, type PreviewRendererMode } from "./webgl/WebGLPreview";
import "./styles.css";
import "./mobile-ux.css";

const rendererModes = ["original", "glyph", "point", "particle"] as const;
type StudioRendererMode = "original" | PreviewRendererMode;
type SourceKind = "still" | "text" | "video" | "procedural";

type VideoFrameCallbackElement = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime?: number }) => void) => number;
};

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

function waitForVideoFramePresentation(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    const frameVideo = video as VideoFrameCallbackElement;
    const requestVideoFrame = frameVideo.requestVideoFrameCallback;
    if (typeof requestVideoFrame === "function") {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      requestVideoFrame.call(frameVideo, done);
      // Some browser runners expose the callback API but may suppress callbacks for a fully
      // off-screen paused element. Keep a presentation-turn fallback rather than hanging import.
      setTimeout(done, 350);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
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
  const morphInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const maskVideoInput = useRef<HTMLInputElement>(null);
  const textureVideoInput = useRef<HTMLInputElement>(null);
  const analysisVideoInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const originalUnderlayCanvas = useRef<HTMLCanvasElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const maskVideoElement = useRef<HTMLVideoElement>(null);
  const textureVideoElement = useRef<HTMLVideoElement>(null);
  const analysisVideoElement = useRef<HTMLVideoElement>(null);
  const videoUrl = useRef<string | null>(null);
  const maskVideoUrl = useRef<string | null>(null);
  const textureVideoUrl = useRef<string | null>(null);
  const analysisVideoUrl = useRef<string | null>(null);
  const maskDesiredProgress = useRef(0);
  const textureDesiredProgress = useRef(0);
  const analysisDesiredProgress = useRef(0);

  const [raster, setRaster] = useState<RasterPixels>();
  const [morphRaster, setMorphRaster] = useState<RasterPixels>();
  const [maskRaster, setMaskRaster] = useState<RasterPixels>();
  const [textureRaster, setTextureRaster] = useState<RasterPixels>();
  const [field, setField] = useState<PointField>();
  const [morphField, setMorphField] = useState<PointField>();
  const [sourceKind, setSourceKind] = useState<SourceKind>("still");
  const [proceduralSourceKind, setProceduralSourceKind] = useState<ProceduralGeneratorKind>();
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCompositeOriginal, setVideoCompositeOriginal] = useState(false);
  const [videoOriginalOpacity, setVideoOriginalOpacity] = useState(0.55);
  const [videoOriginalOpacityKeyframesEnabled, setVideoOriginalOpacityKeyframesEnabled] = useState(false);
  const [videoOriginalOpacityStart, setVideoOriginalOpacityStart] = useState(0.15);
  const [videoOriginalOpacityEnd, setVideoOriginalOpacityEnd] = useState(0.85);
  const [videoOriginalOpacityEasing, setVideoOriginalOpacityEasing] = useState<KeyframeEasing>("ease-in-out");
  const [videoBlendMode, setVideoBlendMode] = useState<VideoLayerBlendMode>("normal");
  const [videoOriginalOnTop, setVideoOriginalOnTop] = useState(false);
  const [cameraPanX, setCameraPanX] = useState(0);
  const [cameraPanY, setCameraPanY] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraRotation, setCameraRotation] = useState(0);
  const [maskVideoLabel, setMaskVideoLabel] = useState("");
  const [maskVideoDuration, setMaskVideoDuration] = useState(0);
  const [maskStrength, setMaskStrength] = useState(1);
  const [maskInvert, setMaskInvert] = useState(false);
  const [maskError, setMaskError] = useState<string | null>(null);
  const [textureVideoLabel, setTextureVideoLabel] = useState("");
  const [textureVideoDuration, setTextureVideoDuration] = useState(0);
  const [textureError, setTextureError] = useState<string | null>(null);
  const [analysisVideoLabel, setAnalysisVideoLabel] = useState("");
  const [analysisVideoDuration, setAnalysisVideoDuration] = useState(0);
  const [analysisValue, setAnalysisValue] = useState<number | null>(null);
  const [analysisStrength, setAnalysisStrength] = useState(1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [rendererMode, setRendererMode] = useState<StudioRendererMode>("point");
  const [motionMode, setMotionMode] = useState<PreviewMotionMode>("static");
  const [motionStrength, setMotionStrength] = useState(1);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [motionDuration, setMotionDuration] = useState(3);
  const [motionKeyframesEnabled, setMotionKeyframesEnabled] = useState(false);
  const [motionStrengthStart, setMotionStrengthStart] = useState(0.35);
  const [motionStrengthEnd, setMotionStrengthEnd] = useState(1.65);
  const [motionKeyframeEasing, setMotionKeyframeEasing] = useState<KeyframeEasing>("ease-in-out");
  const [motionTimelineTime, setMotionTimelineTime] = useState(0);
  const [motionTimelinePlaying, setMotionTimelinePlaying] = useState(false);
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

  const clearMaskVideo = () => {
    const maskVideo = maskVideoElement.current;
    if (maskVideo) {
      maskVideo.pause();
      maskVideo.removeAttribute("src");
      maskVideo.load();
    }
    if (maskVideoUrl.current) URL.revokeObjectURL(maskVideoUrl.current);
    maskVideoUrl.current = null;
    maskDesiredProgress.current = 0;
    setMaskRaster(undefined);
    setMaskVideoLabel("");
    setMaskVideoDuration(0);
    setMaskStrength(1);
    setMaskInvert(false);
    setMaskError(null);
  };

  const clearTextureVideo = () => {
    const textureVideo = textureVideoElement.current;
    if (textureVideo) {
      textureVideo.pause();
      textureVideo.removeAttribute("src");
      textureVideo.load();
    }
    if (textureVideoUrl.current) URL.revokeObjectURL(textureVideoUrl.current);
    textureVideoUrl.current = null;
    textureDesiredProgress.current = 0;
    setTextureRaster(undefined);
    setTextureVideoLabel("");
    setTextureVideoDuration(0);
    setTextureError(null);
  };

  const clearAnalysisVideo = () => {
    const analysisVideo = analysisVideoElement.current;
    if (analysisVideo) {
      analysisVideo.pause();
      analysisVideo.removeAttribute("src");
      analysisVideo.load();
    }
    if (analysisVideoUrl.current) URL.revokeObjectURL(analysisVideoUrl.current);
    analysisVideoUrl.current = null;
    analysisDesiredProgress.current = 0;
    setAnalysisVideoLabel("");
    setAnalysisVideoDuration(0);
    setAnalysisValue(null);
    setAnalysisStrength(1);
    setAnalysisError(null);
  };

  const clearVideoSource = () => {
    clearMaskVideo();
    clearTextureVideo();
    clearAnalysisVideo();
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
    setVideoCompositeOriginal(false);
    setVideoOriginalOpacityKeyframesEnabled(false);
    setVideoBlendMode("normal");
    setVideoOriginalOnTop(false);
  };

  const captureMaskFrame = () => {
    const maskVideo = maskVideoElement.current;
    if (!maskVideo || !maskVideoUrl.current) return;
    try { setMaskRaster(rasterizeVideoElement(maskVideo)); } catch { /* keep last good mask frame */ }
  };

  const captureTextureFrame = () => {
    const textureVideo = textureVideoElement.current;
    if (!textureVideo || !textureVideoUrl.current) return;
    try { setTextureRaster(rasterizeVideoElement(textureVideo)); } catch { /* keep last good texture frame */ }
  };

  const captureAnalysisFrame = () => {
    const analysisVideo = analysisVideoElement.current;
    if (!analysisVideo || !analysisVideoUrl.current) return;
    try { setAnalysisValue(analyzeRasterLuminance(rasterizeVideoElement(analysisVideo))); } catch { /* keep last good analysis value */ }
  };

  const syncMaskToProgress = (progress: number) => {
    const maskVideo = maskVideoElement.current;
    if (!maskVideo || !maskVideoUrl.current || !Number.isFinite(maskVideo.duration) || maskVideo.duration <= 0) return;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    maskDesiredProgress.current = clampedProgress;
    if (maskVideo.seeking) return;
    const targetTime = Math.min(maskVideo.duration, clampedProgress * maskVideo.duration);
    if (Math.abs(maskVideo.currentTime - targetTime) < 0.025) {
      captureMaskFrame();
      return;
    }
    const onSeeked = () => {
      void waitForVideoFramePresentation(maskVideo).then(() => {
        captureMaskFrame();
        const latestTarget = Math.min(maskVideo.duration, maskDesiredProgress.current * maskVideo.duration);
        if (Math.abs(maskVideo.currentTime - latestTarget) >= 0.05) syncMaskToProgress(maskDesiredProgress.current);
      });
    };
    maskVideo.addEventListener("seeked", onSeeked, { once: true });
    maskVideo.currentTime = targetTime;
  };

  const syncTextureToProgress = (progress: number) => {
    const textureVideo = textureVideoElement.current;
    if (!textureVideo || !textureVideoUrl.current || !Number.isFinite(textureVideo.duration) || textureVideo.duration <= 0) return;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    textureDesiredProgress.current = clampedProgress;
    if (textureVideo.seeking) return;
    const targetTime = Math.min(textureVideo.duration, clampedProgress * textureVideo.duration);
    if (Math.abs(textureVideo.currentTime - targetTime) < 0.025) {
      captureTextureFrame();
      return;
    }
    const onSeeked = () => {
      void waitForVideoFramePresentation(textureVideo).then(() => {
        captureTextureFrame();
        const latestTarget = Math.min(textureVideo.duration, textureDesiredProgress.current * textureVideo.duration);
        if (Math.abs(textureVideo.currentTime - latestTarget) >= 0.05) syncTextureToProgress(textureDesiredProgress.current);
      });
    };
    textureVideo.addEventListener("seeked", onSeeked, { once: true });
    textureVideo.currentTime = targetTime;
  };

  const syncAnalysisToProgress = (progress: number) => {
    const analysisVideo = analysisVideoElement.current;
    if (!analysisVideo || !analysisVideoUrl.current || !Number.isFinite(analysisVideo.duration) || analysisVideo.duration <= 0) return;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    analysisDesiredProgress.current = clampedProgress;
    if (analysisVideo.seeking) return;
    const targetTime = Math.min(analysisVideo.duration, clampedProgress * analysisVideo.duration);
    if (Math.abs(analysisVideo.currentTime - targetTime) < 0.025) {
      captureAnalysisFrame();
      return;
    }
    const onSeeked = () => {
      void waitForVideoFramePresentation(analysisVideo).then(() => {
        captureAnalysisFrame();
        const latestTarget = Math.min(analysisVideo.duration, analysisDesiredProgress.current * analysisVideo.duration);
        if (Math.abs(analysisVideo.currentTime - latestTarget) >= 0.05) syncAnalysisToProgress(analysisDesiredProgress.current);
      });
    };
    analysisVideo.addEventListener("seeked", onSeeked, { once: true });
    analysisVideo.currentTime = targetTime;
  };

  const syncAuxiliaryVideos = (progress: number) => {
    syncMaskToProgress(progress);
    syncTextureToProgress(progress);
    syncAnalysisToProgress(progress);
  };

  useEffect(() => () => {
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    if (maskVideoUrl.current) URL.revokeObjectURL(maskVideoUrl.current);
    if (textureVideoUrl.current) URL.revokeObjectURL(textureVideoUrl.current);
    if (analysisVideoUrl.current) URL.revokeObjectURL(analysisVideoUrl.current);
  }, []);

  useEffect(() => {
    if (!raster && sourceKind !== "procedural") setSourceDetail(t("source.fallbackDetail"));
    if (sourceKind === "procedural" && proceduralSourceKind) {
      setSourceDetail(t("procedural.detail"));
      switch (proceduralSourceKind) {
        case "sphere": setSourceLabel(t("procedural.sphere")); break;
        case "torus": setSourceLabel(t("procedural.torus")); break;
        case "grid": setSourceLabel(t("procedural.grid")); break;
        case "spiral": setSourceLabel(t("procedural.spiral")); break;
        case "wave": setSourceLabel(t("procedural.wave")); break;
        case "ribbon": setSourceLabel(t("procedural.ribbon")); break;
        case "vortex": setSourceLabel(t("procedural.vortex")); break;
        case "noise": setSourceLabel(t("procedural.noise")); break;
        case "bloom": setSourceLabel(t("procedural.bloom")); break;
        case "filament": setSourceLabel(t("procedural.filament")); break;
        case "cluster": setSourceLabel(t("procedural.cluster")); break;
      }
    }
  }, [locale, proceduralSourceKind, raster, sourceKind, t]);

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
  }, [field, rendererMode, raster, sourceKind]);

  useEffect(() => {
    if (sourceKind !== "video" || !videoPlaying) return;
    const video = videoElement.current;
    if (!video) return;
    let frame = 0;
    let lastCapture = 0;
    const captureCurrentVideoFrame = () => {
      setVideoTime(video.currentTime);
      try { setRaster(rasterizeVideoElement(video)); } catch { /* keep last good frame */ }
      if (Number.isFinite(video.duration) && video.duration > 0) syncAuxiliaryVideos(video.currentTime / video.duration);
    };
    const tick = (now: number) => {
      if (video.paused || video.ended) {
        setVideoPlaying(false);
        captureCurrentVideoFrame();
        return;
      }
      if (now - lastCapture >= 70) {
        lastCapture = now;
        captureCurrentVideoFrame();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sourceKind, videoPlaying]);

  const isProceduralSource = sourceKind === "procedural";
  const hasSource = Boolean(raster || (isProceduralSource && field));
  const isVideoSource = sourceKind === "video";
  const densityAdjustedField = useMemo(() => {
    if (!field || !isProceduralSource) return field;
    const visibleCount = Math.max(16, Math.min(field.samples.length, Math.round(field.samples.length * density / 100)));
    if (visibleCount >= field.samples.length) return field;
    const samples = Array.from({ length: visibleCount }, (_, index) =>
      field.samples[Math.min(field.samples.length - 1, Math.floor(index * field.samples.length / visibleCount))]!,
    );
    return { ...field, samples };
  }, [density, field, isProceduralSource]);
  const texturedField = useMemo(() => {
    if (!densityAdjustedField || !isVideoSource || !textureRaster) return densityAdjustedField;
    return applyRasterTextureToPointField(densityAdjustedField, textureRaster);
  }, [densityAdjustedField, isVideoSource, textureRaster]);
  const maskedField = useMemo(() => {
    if (!texturedField || !isVideoSource || !maskRaster) return texturedField;
    return applyRasterMaskToPointField(texturedField, maskRaster, { strength: maskStrength, invert: maskInvert });
  }, [isVideoSource, maskInvert, maskRaster, maskStrength, texturedField]);
  const basePacked = useMemo(() => maskedField ? pointFieldToFloat32(maskedField) : undefined, [maskedField]);
  const morphPacked = useMemo(() => {
    if (!densityAdjustedField || !morphField) return undefined;
    return morphMappingToFloat32(createMorphMapping(densityAdjustedField, morphField));
  }, [densityAdjustedField, morphField]);

  const easedProgress = applyMorphEasing(morphProgress, morphEasing);
  const activeMorph = morphEnabled && morphPacked ? morphPacked : undefined;
  const previewPositions = activeMorph?.fromPositions ?? basePacked?.positions;
  const previewColors = activeMorph?.fromColors ?? basePacked?.colors;
  const pointCount = previewPositions ? previewPositions.length / 2 : 0;
  const isVideoComposite = isVideoSource && rendererMode !== "original" && videoCompositeOriginal;
  const hasVideoMask = isVideoSource && Boolean(maskRaster && maskVideoLabel);
  const hasVideoTexture = isVideoSource && Boolean(textureRaster && textureVideoLabel);
  const hasVideoAnalysis = isVideoSource && Boolean(analysisVideoLabel) && analysisValue !== null;
  const effectiveElementSize = elementSize * (hasVideoAnalysis ? analysisValueToSizeScale(analysisValue ?? 0.5, analysisStrength) : 1);
  const videoRoleSuffix = `${hasVideoTexture ? ` · ${t("preview.videoTextured")}` : ""}${hasVideoMask ? ` · ${t("preview.videoMasked")}` : ""}${hasVideoAnalysis ? ` · ${t("preview.videoAnalyzed")}` : ""}`;
  const videoOriginalOpacityTrack = useMemo(
    () => createLayerOpacityTrack("video-original-opacity", "video-original", [
      createNumericKeyframe(0, videoOriginalOpacityStart, videoOriginalOpacityEasing),
      createNumericKeyframe(Math.max(0.001, videoDuration), videoOriginalOpacityEnd),
    ]),
    [videoDuration, videoOriginalOpacityEasing, videoOriginalOpacityEnd, videoOriginalOpacityStart],
  );
  const videoOriginalOpacityAutomationActive =
    isVideoComposite && videoOriginalOpacityKeyframesEnabled && videoDuration > 0;
  const effectiveVideoOriginalOpacity = videoOriginalOpacityAutomationActive
    ? sampleLayerOpacityTrack(videoOriginalOpacityTrack, videoTime) ?? videoOriginalOpacity
    : videoOriginalOpacity;
  const motionStrengthTrack = useMemo(
    () => createMotionStrengthTrack("motion-strength", [
      createNumericKeyframe(0, motionStrengthStart, motionKeyframeEasing),
      createNumericKeyframe(motionDuration, motionStrengthEnd),
    ]),
    [motionDuration, motionKeyframeEasing, motionStrengthEnd, motionStrengthStart],
  );
  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;
  const effectiveMotionStrength = motionTimelineActive
    ? sampleMotionStrengthTrack(motionStrengthTrack, motionTimelineTime) ?? motionStrength
    : motionStrength;

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

  useEffect(() => {
    if (!motionTimelinePlaying || !motionTimelineActive) return;
    const start = performance.now() - motionTimelineTime * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(motionDuration, (now - start) / 1000);
      setMotionTimelineTime(next);
      if (next >= motionDuration) setMotionTimelinePlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motionDuration, motionTimelineActive, motionTimelinePlaying]);

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
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("video-decode-failed")); };
        const cleanup = () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
        video.src = url;
        video.load();
      });
      await waitForVideoFramePresentation(video);
      const pixels = rasterizeVideoElement(video);
      setSourceKind("video");
      setRaster(pixels);
      setSourceLabel(file.name);
      setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setVideoTime(video.currentTime);
      setSourceDetail(`${t("source.video")} · ${video.videoWidth} × ${video.videoHeight}${Number.isFinite(video.duration) ? ` · ${video.duration.toFixed(2)} ${t("morph.seconds")}` : ""}`);
    } catch {
      clearVideoSource();
      setSourceError(t("source.videoImportFailed"));
    }
  };

  const loadMaskVideo = async (file: File) => {
    if (animationExporting || !isVideoSource) return;
    const maskVideo = maskVideoElement.current;
    if (!maskVideo) return;
    clearMaskVideo();
    setMaskError(null);
    const url = URL.createObjectURL(file);
    maskVideoUrl.current = url;
    try {
      maskVideo.muted = true;
      maskVideo.playsInline = true;
      maskVideo.preload = "auto";
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("mask-video-decode-failed")); };
        const cleanup = () => {
          maskVideo.removeEventListener("loadeddata", onLoaded);
          maskVideo.removeEventListener("error", onError);
        };
        maskVideo.addEventListener("loadeddata", onLoaded, { once: true });
        maskVideo.addEventListener("error", onError, { once: true });
        maskVideo.src = url;
        maskVideo.load();
      });
      await waitForVideoFramePresentation(maskVideo);
      setMaskVideoLabel(file.name);
      setMaskVideoDuration(Number.isFinite(maskVideo.duration) ? maskVideo.duration : 0);
      captureMaskFrame();
      const mainVideo = videoElement.current;
      const progress = mainVideo && Number.isFinite(mainVideo.duration) && mainVideo.duration > 0
        ? mainVideo.currentTime / mainVideo.duration
        : 0;
      syncMaskToProgress(progress);
    } catch {
      clearMaskVideo();
      setMaskError(t("source.maskVideoImportFailed"));
    }
  };

  const loadTextureVideo = async (file: File) => {
    if (animationExporting || !isVideoSource) return;
    const textureVideo = textureVideoElement.current;
    if (!textureVideo) return;
    clearTextureVideo();
    setTextureError(null);
    const url = URL.createObjectURL(file);
    textureVideoUrl.current = url;
    try {
      textureVideo.muted = true;
      textureVideo.playsInline = true;
      textureVideo.preload = "auto";
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("texture-video-decode-failed")); };
        const cleanup = () => {
          textureVideo.removeEventListener("loadeddata", onLoaded);
          textureVideo.removeEventListener("error", onError);
        };
        textureVideo.addEventListener("loadeddata", onLoaded, { once: true });
        textureVideo.addEventListener("error", onError, { once: true });
        textureVideo.src = url;
        textureVideo.load();
      });
      await waitForVideoFramePresentation(textureVideo);
      setTextureVideoLabel(file.name);
      setTextureVideoDuration(Number.isFinite(textureVideo.duration) ? textureVideo.duration : 0);
      setUseSourceColor(true);
      captureTextureFrame();
      const mainVideo = videoElement.current;
      const progress = mainVideo && Number.isFinite(mainVideo.duration) && mainVideo.duration > 0
        ? mainVideo.currentTime / mainVideo.duration
        : 0;
      syncTextureToProgress(progress);
    } catch {
      clearTextureVideo();
      setTextureError(t("source.textureVideoImportFailed"));
    }
  };

  const loadAnalysisVideo = async (file: File) => {
    if (animationExporting || !isVideoSource) return;
    const analysisVideo = analysisVideoElement.current;
    if (!analysisVideo) return;
    clearAnalysisVideo();
    setAnalysisError(null);
    const url = URL.createObjectURL(file);
    analysisVideoUrl.current = url;
    try {
      analysisVideo.muted = true;
      analysisVideo.playsInline = true;
      analysisVideo.preload = "auto";
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("analysis-video-decode-failed")); };
        const cleanup = () => {
          analysisVideo.removeEventListener("loadeddata", onLoaded);
          analysisVideo.removeEventListener("error", onError);
        };
        analysisVideo.addEventListener("loadeddata", onLoaded, { once: true });
        analysisVideo.addEventListener("error", onError, { once: true });
        analysisVideo.src = url;
        analysisVideo.load();
      });
      await waitForVideoFramePresentation(analysisVideo);
      setAnalysisVideoLabel(file.name);
      setAnalysisVideoDuration(Number.isFinite(analysisVideo.duration) ? analysisVideo.duration : 0);
      captureAnalysisFrame();
      const mainVideo = videoElement.current;
      const progress = mainVideo && Number.isFinite(mainVideo.duration) && mainVideo.duration > 0
        ? mainVideo.currentTime / mainVideo.duration
        : 0;
      syncAnalysisToProgress(progress);
    } catch {
      clearAnalysisVideo();
      setAnalysisError(t("source.analysisVideoImportFailed"));
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

  const proceduralLabel = (kind: ProceduralGeneratorKind) => {
    switch (kind) {
      case "sphere": return t("procedural.sphere");
      case "torus": return t("procedural.torus");
      case "grid": return t("procedural.grid");
      case "spiral": return t("procedural.spiral");
      case "wave": return t("procedural.wave");
      case "ribbon": return t("procedural.ribbon");
      case "vortex": return t("procedural.vortex");
      case "noise": return t("procedural.noise");
      case "bloom": return t("procedural.bloom");
      case "filament": return t("procedural.filament");
      case "cluster": return t("procedural.cluster");
    }
  };

  const useProceduralSource = (kind: ProceduralGeneratorKind, generatedField: PointField) => {
    if (animationExporting) return;
    clearVideoSource();
    setSourceKind("procedural");
    setProceduralSourceKind(kind);
    setRaster(undefined);
    setField(generatedField);
    setMorphRaster(undefined);
    setMorphField(undefined);
    setMorphLabel("");
    setMorphEnabled(false);
    setMorphPlaying(false);
    setMorphProgress(0);
    setSourceLabel(proceduralLabel(kind));
    setSourceDetail(t("procedural.detail"));
    setSourceError(null);
    setAnimationExportSucceeded(false);
    if (rendererMode === "original") setRendererMode("point");
  };

  const seekVideo = (progress: number) => {
    const video = videoElement.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.pause();
    setVideoPlaying(false);
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const nextTime = clampedProgress * video.duration;
    setVideoTime(nextTime);
    syncAuxiliaryVideos(clampedProgress);
    if (Math.abs(video.currentTime - nextTime) < 0.001) {
      try { setRaster(rasterizeVideoElement(video)); } catch { /* keep last good frame */ }
      return;
    }
    const onSeeked = () => {
      void waitForVideoFramePresentation(video).then(() => {
        try { setRaster(rasterizeVideoElement(video)); } catch { /* keep last good frame */ }
        if (Number.isFinite(video.duration) && video.duration > 0) syncAuxiliaryVideos(video.currentTime / video.duration);
      });
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = nextTime;
  };

  const playVideo = async () => {
    const video = videoElement.current;
    if (!video) return;
    if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.02)) video.currentTime = 0;
    if (Number.isFinite(video.duration) && video.duration > 0) syncAuxiliaryVideos(video.currentTime / video.duration);
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
    if (Number.isFinite(video.duration) && video.duration > 0) syncAuxiliaryVideos(video.currentTime / video.duration);
  };

  const exportStill = () => {
    if (animationExporting || !hasSource) return;
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const exportCanvas = isVideoComposite && originalUnderlayCanvas.current
      ? composeCanvasStack(videoOriginalOnTop
        ? [
            { canvas, blendMode: videoBlendMode },
            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },
          ]
        : [
            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },
            { canvas, blendMode: videoBlendMode },
          ])
      : canvas;
    const ext = exportFormat === "webp" ? "webp" : "png";
    const compositeSuffix = isVideoComposite ? "-composite" : "";
    downloadCanvas(exportCanvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeFileStem(sourceLabel)}-${rendererMode}${compositeSuffix}.${ext}`);
  };

  const exportShortAnimation = async () => {
    const canvas = previewCanvas.current;
    if (!canvas || rendererMode === "original" || isVideoSource) return;
    const hasMorphTarget = Boolean(field && morphField);
    const animateMorph = hasMorphTarget && (morphEnabled || motionMode === "static");
    const animateMotion = motionMode !== "static";
    if (!animateMorph && !animateMotion) return;
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
    setMotionTimelinePlaying(false);
    const animateMotionKeyframes = animateMotion && motionKeyframesEnabled && !animateMorph;
    if (animateMotionKeyframes) setMotionTimelineTime(0);
    if (animateMorph) {
      setMorphEnabled(true);
      setMorphProgress(0);
    }
    try {
      const result = await recordCanvasAnimation({
        canvas,
        durationSeconds: animateMorph ? morphDuration : motionDuration,
        frameRate: 60,
        onProgress: animateMorph
          ? setMorphProgress
          : animateMotionKeyframes
            ? (progress) => setMotionTimelineTime(progress * motionDuration)
            : () => {},
      });
      const fileName = animateMorph
        ? `${safeFileStem(sourceLabel)}-to-${safeFileStem(morphLabel || "morph")}-${rendererMode}.${result.extension}`
        : `${safeFileStem(sourceLabel)}-${rendererMode}-${motionMode}-motion.${result.extension}`;
      downloadBlob(result.blob, fileName);
      setAnimationExportSucceeded(true);
    } catch (error) {
      setAnimationExportSucceeded(false);
      setAnimationExportError(error instanceof Error && error.message === "animation-export-unsupported" ? t("export.animationUnsupported") : t("export.animationFailed"));
    } finally {
      if (animateMorph) setMorphProgress(1);
      if (animateMotionKeyframes) setMotionTimelineTime(motionDuration);
      setAnimationExporting(false);
    }
  };

  const rendererLabel = (mode: StudioRendererMode) => t(`renderer.${mode}` as const);
  const activeModeLabel = rendererLabel(rendererMode);
  const canMorph = Boolean(field && morphField) && !isVideoSource;
  const hasMotionAnimation = motionMode !== "static" && !isVideoSource;
  const canExportAnimation = (canMorph || hasMotionAnimation) && rendererMode !== "original" && !isVideoSource && animationCapability.supported && !animationExporting;
  const motionOnlyExport = hasMotionAnimation && !(canMorph && morphEnabled);
  const animationFormatLabel = animationCapability.supported
    ? animationCapability.preferredExtension
      ? `${animationCapability.preferredExtension.toUpperCase()} · ${animationCapability.preferredMimeType ?? "MediaRecorder"}`
      : t("export.animationBrowserDefault")
    : t("export.animationUnsupported");
  const transportProgress = isVideoSource && videoDuration > 0
    ? (videoTime / videoDuration) * 100
    : motionTimelineActive
      ? (motionTimelineTime / Math.max(0.001, motionDuration)) * 100
      : morphProgress * 100;
  const transportPlaying = isVideoSource ? videoPlaying : motionTimelineActive ? motionTimelinePlaying : morphPlaying;
  const transportCanUse = isVideoSource
    ? hasSource && videoDuration > 0
    : motionTimelineActive
      ? hasSource && rendererMode !== "original"
      : canMorph;
  const playTransport = () => {
    if (isVideoSource) { void playVideo(); return; }
    if (motionTimelineActive) {
      if (motionTimelineTime >= motionDuration) setMotionTimelineTime(0);
      setMotionTimelinePlaying(true);
      return;
    }
    setMorphEnabled(true);
    if (morphProgress >= 1) setMorphProgress(0);
    setMorphPlaying(true);
  };
  const stopTransport = () => {
    if (isVideoSource) stopVideo();
    else if (motionTimelineActive) setMotionTimelinePlaying(false);
    else setMorphPlaying(false);
  };
  const seekTransport = (progress: number) => {
    if (isVideoSource) { seekVideo(progress); return; }
    if (motionTimelineActive) {
      setMotionTimelinePlaying(false);
      setMotionTimelineTime(progress * motionDuration);
      return;
    }
    setMorphPlaying(false);
    setMorphProgress(progress);
  };
  const previewDetail = isVideoComposite
    ? `${t("preview.videoComposite")}${videoRoleSuffix}`
    : rendererMode === "original"
      ? t("preview.originalSource")
      : pointCount
        ? `${pointCount.toLocaleString(locale)} ${t("preview.elements")}${videoRoleSuffix}`
        : t("preview.fallback");

  return (
    <main className="studio-shell">
      <video ref={videoElement} className="source-video-element" muted playsInline preload="auto" aria-hidden="true" />
      <video ref={maskVideoElement} className="source-video-element" muted playsInline preload="auto" aria-hidden="true" />
      <video ref={textureVideoElement} className="source-video-element" muted playsInline preload="auto" aria-hidden="true" />
      <video ref={analysisVideoElement} className="source-video-element" muted playsInline preload="auto" aria-hidden="true" />
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
        <input ref={morphInput} data-source-kind="morph" hidden disabled={animationExporting || isVideoSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "morph"); event.currentTarget.value = ""; }} />
        <input ref={videoInput} data-source-kind="video" hidden disabled={animationExporting} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadVideo(file); event.currentTarget.value = ""; }} />
        <input ref={maskVideoInput} data-source-kind="video-mask" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadMaskVideo(file); event.currentTarget.value = ""; }} />
        <input ref={textureVideoInput} data-source-kind="video-texture" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadTextureVideo(file); event.currentTarget.value = ""; }} />
        <input ref={analysisVideoInput} data-source-kind="video-analysis" hidden disabled={animationExporting || !isVideoSource} type="file" accept="video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadAnalysisVideo(file); event.currentTarget.value = ""; }} />

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
        <ProceduralSourcePanel
          disabled={animationExporting}
          labels={{
            title: t("procedural.title"),
            description: t("procedural.description"),
            create: t("procedural.create"),
            count: t("procedural.count"),
            scale: t("procedural.scale"),
            sphere: t("procedural.sphere"),
            torus: t("procedural.torus"),
            grid: t("procedural.grid"),
            spiral: t("procedural.spiral"),
            wave: t("procedural.wave"),
            ribbon: t("procedural.ribbon"),
            vortex: t("procedural.vortex"),
            noise: t("procedural.noise"),
            bloom: t("procedural.bloom"),
            filament: t("procedural.filament"),
            cluster: t("procedural.cluster"),
          }}
          onCreate={({ kind, field: generatedField }) => useProceduralSource(kind, generatedField)}
        />
        <p className="supported-note">{t("source.supportedMedia")}</p>
        {sourceError && <p className="supported-note stage3-note" role="alert">{sourceError}</p>}

        <div className="section-title-row source-heading"><strong>{t("source.primary")}</strong></div>
        {hasSource ? <section className="asset-card selected"><div className="asset-thumb" /><div className="asset-meta"><strong>{sourceLabel}</strong><span>{sourceError ?? `${sourceDetail}${pointCount ? ` · ${pointCount.toLocaleString(locale)} ${t("preview.elements")}` : ""}`}</span></div><button className="asset-menu" disabled={animationExporting}>⋮</button></section> : <button className="empty-source-card" disabled={animationExporting} onClick={() => fileInput.current?.click()}><span className="empty-source-plus">＋</span><span><strong>{t("source.emptyTitle")}</strong><small>{t("source.emptyDetail")}</small></span></button>}

        <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.morphTarget")}</strong><span className="optional-label">{t("source.optional")}</span></div>
        {isVideoSource ? <p className="supported-note stage3-note">{t("source.videoMorphLater")}</p> : morphLabel ? <section className="asset-card"><div className="asset-thumb" /><div className="asset-meta"><strong>{morphLabel}</strong><span>{morphField ? `${morphField.samples.length.toLocaleString(locale)} ${t("preview.elements")}` : "…"}</span></div></section> : <button className="asset-add-row" disabled={animationExporting} onClick={() => morphInput.current?.click()}>＋ {t("action.addMorphTarget")}</button>}

        {isVideoSource && <>
          <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.textureVideo")}</strong><span className="optional-label">{t("source.optional")}</span></div>
          {textureVideoLabel ? <section className="asset-card" data-source-role="texture"><div className="asset-thumb" /><div className="asset-meta"><strong>{textureVideoLabel}</strong><span>{t("source.textureVideoDetail")}{textureVideoDuration > 0 ? ` · ${textureVideoDuration.toFixed(2)} ${t("morph.seconds")}` : ""}</span></div><button className="asset-menu" aria-label={t("action.removeTextureVideo")} disabled={animationExporting} onClick={clearTextureVideo}>×</button></section> : <button className="asset-add-row" disabled={animationExporting} onClick={() => textureVideoInput.current?.click()}>＋ {t("action.addTextureVideo")}</button>}
          {textureError && <p className="supported-note stage3-note" role="alert">{textureError}</p>}

          <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.maskVideo")}</strong><span className="optional-label">{t("source.optional")}</span></div>
          {maskVideoLabel ? <section className="asset-card" data-source-role="mask"><div className="asset-thumb" /><div className="asset-meta"><strong>{maskVideoLabel}</strong><span>{t("source.maskVideoDetail")}{maskVideoDuration > 0 ? ` · ${maskVideoDuration.toFixed(2)} ${t("morph.seconds")}` : ""}</span></div><button className="asset-menu" aria-label={t("action.removeMaskVideo")} disabled={animationExporting} onClick={clearMaskVideo}>×</button></section> : <button className="asset-add-row" disabled={animationExporting} onClick={() => maskVideoInput.current?.click()}>＋ {t("action.addMaskVideo")}</button>}
          {maskError && <p className="supported-note stage3-note" role="alert">{maskError}</p>}

          <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.analysisVideo")}</strong><span className="optional-label">{t("source.optional")}</span></div>
          {analysisVideoLabel ? <section className="asset-card" data-source-role="analysis"><div className="asset-thumb" /><div className="asset-meta"><strong>{analysisVideoLabel}</strong><span>{t("source.analysisVideoDetail")}{analysisVideoDuration > 0 ? ` · ${analysisVideoDuration.toFixed(2)} ${t("morph.seconds")}` : ""}</span></div><button className="asset-menu" aria-label={t("action.removeAnalysisVideo")} disabled={animationExporting} onClick={clearAnalysisVideo}>×</button></section> : <button className="asset-add-row" disabled={animationExporting} onClick={() => analysisVideoInput.current?.click()}>＋ {t("action.addAnalysisVideo")}</button>}
          {analysisError && <p className="supported-note stage3-note" role="alert">{analysisError}</p>}
        </>}
      </aside>

      <section className="canvas-column">
        <div className="canvas-toolbar"><div className="canvas-heading"><strong>{t("preview.title")}</strong><span>{isVideoSource ? t("guide.videoPreviewHint") : t("guide.previewHint")}</span></div><span className="mode-pill">{activeModeLabel}</span></div>
        <section className="preview-frame"><div className="canvas-meta"><span>{t("preview.title")}</span><span>{previewDetail}</span><span className="timecode">{isVideoSource ? formatTime(videoTime) : motionTimelineActive ? formatTime(motionTimelineTime) : morphEnabled ? `${Math.round(morphProgress * 100)}%` : "00:00:00.00"}</span></div>
          {rendererMode === "original" ? (
            <OriginalPreview canvasRef={previewCanvas} raster={raster} background={background} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />
          ) : isVideoComposite ? (
            <VideoCompositePreview originalCanvasRef={originalUnderlayCanvas} transformedCanvasRef={previewCanvas} raster={raster} originalOpacity={effectiveVideoOriginalOpacity} originalOnTop={videoOriginalOnTop} transformedBlendMode={videoBlendMode} positions={previewPositions} colors={previewColors} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />
          ) : (
            <WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={cameraPanX} cameraPanY={cameraPanY} cameraZoom={cameraZoom} cameraRotation={cameraRotation} />
          )}
          <div className="canvas-status"><span>● {activeModeLabel} {t("preview.modeSuffix")}</span><span>{isVideoComposite ? "Canvas 2D + WebGL2" : rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</span></div></section>
        <div className="transport-bar" data-timeline-mode={motionTimelineActive ? "motion-strength" : isVideoSource ? "video" : morphEnabled ? "morph" : "idle"}>
          <button aria-label={motionTimelineActive ? t("timeline.play") : isVideoSource ? t("video.play") : t("morph.play")} disabled={!transportCanUse || transportPlaying || animationExporting} onClick={playTransport}>▶</button>
          <button aria-label={motionTimelineActive ? t("timeline.stop") : isVideoSource ? t("video.stop") : t("morph.stop")} disabled={!transportPlaying || animationExporting} onClick={stopTransport}>■</button>
          <button aria-label={motionTimelineActive ? t("timeline.start") : isVideoSource ? t("video.start") : "Start"} disabled={!transportCanUse || animationExporting} onClick={() => seekTransport(0)}>|◀</button>
          <button aria-label={motionTimelineActive ? t("timeline.end") : isVideoSource ? t("video.end") : "End"} disabled={!transportCanUse || animationExporting} onClick={() => seekTransport(1)}>▶|</button>
          <div className="transport-time">{motionTimelineActive ? t("timeline.motionStrength") : isVideoComposite ? t("preview.videoComposite") : isVideoSource ? t("preview.video") : morphEnabled ? t("preview.morph") : t("preview.stage1")}</div>
          <input aria-label={motionTimelineActive ? t("timeline.position") : isVideoSource ? t("video.timelinePosition") : t("preview.timelinePosition")} type="range" min="0" max="100" value={Math.round(transportProgress)} disabled={!transportCanUse || animationExporting} onChange={(e) => seekTransport(Number(e.target.value) / 100)} />
        </div>
      </section>

      <aside className="inspector-panel">
        {isVideoSource && rendererMode !== "original" && <VideoLayerStackPanel
          disabled={animationExporting}
          originalVisible={videoCompositeOriginal}
          originalOpacity={effectiveVideoOriginalOpacity}
          originalOpacityDisabled={videoOriginalOpacityKeyframesEnabled}
          originalOnTop={videoOriginalOnTop}
          transformedBlendMode={videoBlendMode}
          labels={{
            title: t("layer.title"),
            summary: t("layer.videoComposition"),
            original: t("layer.original"),
            transformed: t("layer.transformed"),
            originalToggle: t("video.compositeOriginal"),
            originalOpacity: t("video.originalOpacity"),
            opacity: t("layer.opacity"),
            blend: t("layer.blend"),
            order: t("layer.order"),
            originalOnTop: t("layer.originalOnTop"),
            transformedOnTop: t("layer.transformedOnTop"),
            normal: t("layer.normal"),
            multiply: t("layer.multiply"),
            screen: t("layer.screen"),
          }}
          onOriginalVisibleChange={setVideoCompositeOriginal}
          onOriginalOpacityChange={setVideoOriginalOpacity}
          onOriginalOnTopChange={setVideoOriginalOnTop}
          onTransformedBlendModeChange={setVideoBlendMode}
        />}
        {isVideoSource && rendererMode !== "original" && videoCompositeOriginal && <section className="inspector-section" data-stage5-layer-opacity-keyframes="true">
          <h2>{t("timeline.layerOpacity")}</h2>
          <p>{t("timeline.layerOpacityHint")}</p>
          <div className="toggle-row"><span>{t("timeline.layerOpacityAnimate")}</span><button aria-label={t("timeline.layerOpacityToggle")} disabled={animationExporting || videoDuration <= 0} className={`toggle ${videoOriginalOpacityKeyframesEnabled ? "on" : ""}`} aria-pressed={videoOriginalOpacityKeyframesEnabled} onClick={() => setVideoOriginalOpacityKeyframesEnabled((value) => !value)} /></div>
          {videoOriginalOpacityKeyframesEnabled && <>
            <label>{t("timeline.startOpacity")}<div className="range-row"><input aria-label={t("timeline.startOpacity")} type="range" min="0" max="100" value={Math.round(videoOriginalOpacityStart * 100)} disabled={animationExporting} onChange={(event) => setVideoOriginalOpacityStart(Number(event.target.value) / 100)} /><output>{Math.round(videoOriginalOpacityStart * 100)}%</output></div></label>
            <label>{t("timeline.endOpacity")}<div className="range-row"><input aria-label={t("timeline.endOpacity")} type="range" min="0" max="100" value={Math.round(videoOriginalOpacityEnd * 100)} disabled={animationExporting} onChange={(event) => setVideoOriginalOpacityEnd(Number(event.target.value) / 100)} /><output>{Math.round(videoOriginalOpacityEnd * 100)}%</output></div></label>
            <label>{t("timeline.layerOpacityEasing")}<select aria-label={t("timeline.layerOpacityEasing")} value={videoOriginalOpacityEasing} disabled={animationExporting} onChange={(event) => setVideoOriginalOpacityEasing(event.target.value as KeyframeEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in">{t("timeline.easeIn")}</option><option value="ease-out">{t("timeline.easeOut")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="step">{t("timeline.step")}</option></select></label>
            <label>{t("timeline.currentOpacity")}<code>{Math.round(effectiveVideoOriginalOpacity * 100)}%</code></label>
          </>}
        </section>}
        <section className="inspector-section" data-stage5-camera="true">
          <h2>{t("camera.title")}</h2>
          <p>{t("camera.hint")}</p>
          <label>{t("camera.panX")}<div className="range-row"><input aria-label={t("camera.panX")} type="range" min="-100" max="100" value={Math.round(cameraPanX * 100)} disabled={animationExporting} onChange={(event) => setCameraPanX(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanX * 100)}%</output></div></label>
          <label>{t("camera.panY")}<div className="range-row"><input aria-label={t("camera.panY")} type="range" min="-100" max="100" value={Math.round(cameraPanY * 100)} disabled={animationExporting} onChange={(event) => setCameraPanY(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanY * 100)}%</output></div></label>
          <label>{t("camera.zoom")}<div className="range-row"><input aria-label={t("camera.zoom")} type="range" min="25" max="300" value={Math.round(cameraZoom * 100)} disabled={animationExporting} onChange={(event) => setCameraZoom(Number(event.target.value) / 100)} /><output>{Math.round(cameraZoom * 100)}%</output></div></label>
          <label>{t("camera.rotation")}<div className="range-row"><input aria-label={t("camera.rotation")} type="range" min="-180" max="180" value={Math.round(cameraRotation)} disabled={animationExporting} onChange={(event) => setCameraRotation(Number(event.target.value))} /><output>{Math.round(cameraRotation)}°</output></div></label>
          <button type="button" className="source-secondary" disabled={animationExporting} onClick={() => { setCameraPanX(0); setCameraPanY(0); setCameraZoom(1); setCameraRotation(0); }}>{t("camera.reset")}</button>
        </section>
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">2</span><div><h2>{t("inspector.rendererMode")}</h2><p>{t("guide.renderHint")}</p></div></div><div className="renderer-segmented">{rendererModes.map((mode) => <button disabled={(morphEnabled && mode === "original") || (isProceduralSource && mode === "original") || animationExporting} className={rendererMode === mode ? "active" : ""} key={mode} onClick={() => setRendererMode(mode)}>{rendererLabel(mode)}</button>)}</div></section>
        <section className="inspector-section"><h2>{activeModeLabel} {t("inspector.settingsSuffix")}</h2><label>{t("inspector.input")}<code>{hasSource ? sourceLabel : t("source.notSelected")}</code></label>
          {rendererMode === "glyph" && <label>{t("inspector.characterSet")}<select value={glyphPreset} disabled={animationExporting} onChange={(e) => setGlyphPreset(e.target.value as GlyphPreset)}><option value="binary">01 (Binary)</option><option value="density">Density 8</option><option value="symbols">Symbols 6</option></select></label>}
          {rendererMode !== "original" && <><label>{t("inspector.density")}<div className="range-row"><input type="range" min="5" max="100" value={density} disabled={animationExporting} onChange={(e) => setDensity(Number(e.target.value))} /><output>{density}%</output></div></label><label>{t("inspector.size")}<div className="range-row"><input type="range" min="40" max="240" value={Math.round(elementSize * 100)} disabled={animationExporting} onChange={(e) => setElementSize(Number(e.target.value) / 100)} /><output>{Math.round(elementSize * 100)}%</output></div></label><label>{t("inspector.edgeEmphasis")}<div className="range-row"><input type="range" min="0" max="100" value={edgeWeight} disabled={animationExporting || isProceduralSource} onChange={(e) => setEdgeWeight(Number(e.target.value))} /><output>{edgeWeight}%</output></div></label><label>{t("inspector.dither")}<div className="range-row"><input type="range" min="0" max="100" value={ditherStrength} disabled={animationExporting || isProceduralSource} onChange={(e) => setDitherStrength(Number(e.target.value))} /><output>{ditherStrength}%</output></div></label><label>{t("inspector.renderColor")}<div className="color-row"><input type="color" value={tint} disabled={animationExporting} onChange={(e) => setTint(e.target.value)} /><code>{tint}</code></div></label><div className="toggle-row"><span>{t("inspector.sourceColor")}</span><button disabled={animationExporting} className={`toggle ${useSourceColor ? "on" : ""}`} aria-pressed={useSourceColor} onClick={() => setUseSourceColor((v) => !v)} /></div></>}
          {isVideoSource && rendererMode !== "original" && <>{hasVideoMask && <><label>{t("video.maskStrength")}<div className="range-row"><input aria-label={t("video.maskStrength")} type="range" min="0" max="100" value={Math.round(maskStrength * 100)} disabled={animationExporting} onChange={(e) => setMaskStrength(Number(e.target.value) / 100)} /><output>{Math.round(maskStrength * 100)}%</output></div></label><div className="toggle-row"><span>{t("video.maskInvert")}</span><button aria-label={t("video.maskInvert")} disabled={animationExporting} className={`toggle ${maskInvert ? "on" : ""}`} aria-pressed={maskInvert} onClick={() => setMaskInvert((value) => !value)} /></div></>}{hasVideoAnalysis && <><label>{t("video.analysisStrength")}<div className="range-row"><input aria-label={t("video.analysisStrength")} type="range" min="0" max="100" value={Math.round(analysisStrength * 100)} disabled={animationExporting} onChange={(e) => setAnalysisStrength(Number(e.target.value) / 100)} /><output>{Math.round(analysisStrength * 100)}%</output></div></label><label>{t("video.analysisValue")}<code>{Math.round((analysisValue ?? 0) * 100)}%</code></label></>}</>}
          <label>{t("inspector.background")}<div className="color-row"><input type="color" value={background} disabled={animationExporting} onChange={(e) => setBackground(e.target.value)} /><code>{background}</code></div></label>
        </section>
        {rendererMode !== "original" && <section className="inspector-section" data-stage5-motion="true" data-motion-strength={effectiveMotionStrength.toFixed(3)}><h2>{t("motion.title")}</h2><p>{t("motion.hint")}</p><label>{t("motion.type")}<select aria-label={t("motion.type")} value={motionMode} disabled={animationExporting} onChange={(e) => { const next = e.target.value as PreviewMotionMode; setMotionMode(next); if (next === "static") { setMotionTimelinePlaying(false); setMotionTimelineTime(0); } }}><option value="static">{t("motion.static")}</option><option value="pulse">{t("motion.pulse")}</option><option value="drift">{t("motion.drift")}</option></select></label>{motionMode !== "static" && <><label>{t("motion.strength")}<div className="range-row"><input aria-label={t("motion.strength")} type="range" min="0" max="200" value={Math.round(effectiveMotionStrength * 100)} disabled={animationExporting || motionKeyframesEnabled} onChange={(e) => setMotionStrength(Number(e.target.value) / 100)} /><output>{Math.round(effectiveMotionStrength * 100)}%</output></div></label><label>{t("motion.speed")}<div className="range-row"><input aria-label={t("motion.speed")} type="range" min="25" max="300" value={Math.round(motionSpeed * 100)} disabled={animationExporting} onChange={(e) => setMotionSpeed(Number(e.target.value) / 100)} /><output>{motionSpeed.toFixed(2)}×</output></div></label><label>{t("motion.duration")}<div className="range-row"><input aria-label={t("motion.duration")} type="range" min="1" max="12" step="0.5" value={motionDuration} disabled={animationExporting} onChange={(e) => { setMotionDuration(Number(e.target.value)); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /><output>{motionDuration} {t("morph.seconds")}</output></div></label><div className="toggle-row"><span>{t("motion.keyframes")}</span><button aria-label={t("motion.keyframesToggle")} disabled={animationExporting || morphEnabled} className={`toggle ${motionKeyframesEnabled ? "on" : ""}`} aria-pressed={motionKeyframesEnabled} onClick={() => { const next = !motionKeyframesEnabled; setMotionKeyframesEnabled(next); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /></div>{motionKeyframesEnabled && !morphEnabled && <><p>{t("motion.keyframesHint")}</p><label>{t("motion.startStrength")}<div className="range-row"><input aria-label={t("motion.startStrength")} type="range" min="0" max="200" value={Math.round(motionStrengthStart * 100)} disabled={animationExporting} onChange={(e) => { setMotionStrengthStart(Number(e.target.value) / 100); setMotionTimelinePlaying(false); }} /><output>{Math.round(motionStrengthStart * 100)}%</output></div></label><label>{t("motion.endStrength")}<div className="range-row"><input aria-label={t("motion.endStrength")} type="range" min="0" max="200" value={Math.round(motionStrengthEnd * 100)} disabled={animationExporting} onChange={(e) => { setMotionStrengthEnd(Number(e.target.value) / 100); setMotionTimelinePlaying(false); }} /><output>{Math.round(motionStrengthEnd * 100)}%</output></div></label><label>{t("motion.keyframeEasing")}<select aria-label={t("motion.keyframeEasing")} value={motionKeyframeEasing} disabled={animationExporting} onChange={(e) => setMotionKeyframeEasing(e.target.value as KeyframeEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in">{t("timeline.easeIn")}</option><option value="ease-out">{t("timeline.easeOut")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="step">{t("timeline.step")}</option></select></label></>}</>}</section>}
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">3</span><div><h2>{t("morph.title")}</h2><p>{t("guide.morphHint")}</p></div></div>{isVideoSource ? <p>{t("source.videoMorphLater")}</p> : !canMorph ? <p>{t("morph.needsTarget")}</p> : <><div className="toggle-row"><span>{t("morph.enabled")}</span><button disabled={animationExporting} className={`toggle ${morphEnabled ? "on" : ""}`} aria-pressed={morphEnabled} onClick={() => { const next = !morphEnabled; setMorphEnabled(next); if (next && rendererMode === "original") setRendererMode("point"); }} /></div><label>{t("morph.progress")}<div className="range-row"><input type="range" min="0" max="100" value={Math.round(morphProgress * 100)} disabled={animationExporting} onChange={(e) => { setMorphPlaying(false); setMorphProgress(Number(e.target.value) / 100); }} /><output>{Math.round(morphProgress * 100)}%</output></div></label><label>{t("morph.easing")}<select value={morphEasing} disabled={animationExporting} onChange={(e) => setMorphEasing(e.target.value as MorphEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="smoothstep">{t("morph.smoothstep")}</option></select></label><label>{t("morph.duration")}<div className="range-row"><input type="range" min="1" max="12" step="0.5" value={morphDuration} disabled={animationExporting} onChange={(e) => setMorphDuration(Number(e.target.value))} /><output>{morphDuration} {t("morph.seconds")}</output></div></label><button className="source-add" disabled={animationExporting} onClick={() => { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying((v) => !v); }}>{morphPlaying ? t("morph.stop") : t("morph.play")}</button></>}</section>
        <section className="inspector-section guided-section"><div className="section-guide"><span className="step-badge">4</span><div><h2>{t("export.still")}</h2><p>{isVideoSource ? t("guide.videoStillExportHint") : t("guide.exportHint")}</p></div></div><label>{t("export.format")}<select value={exportFormat} disabled={animationExporting} onChange={(e) => setExportFormat(e.target.value as "png" | "webp")}><option value="png">PNG</option><option value="webp">WebP</option></select></label><button className="source-add" disabled={!hasSource || animationExporting} onClick={exportStill}>{t("export.currentFrame")}</button></section>
        <section className="inspector-section"><h2>{t("export.animation")}</h2><p>{isVideoSource ? t("export.videoLongExportLater") : animationExportError ?? (animationExportSucceeded ? (motionOnlyExport ? t("export.motionAnimationSaved") : t("export.animationSaved")) : (motionOnlyExport ? t("export.motionAnimationHint") : t("export.animationHint")))}</p><label>{t("export.animationSupportedFormat")}<code>{animationFormatLabel}</code></label><button className="source-add" disabled={!canExportAnimation} onClick={() => void exportShortAnimation()}>{animationExporting ? t("export.animationRecording") : motionOnlyExport ? t("export.motionAnimationButton") : t("export.animationButton")}</button></section>
        <section className="inspector-section local-processing-note"><strong>{t("status.localProcessing")}</strong><p>{t("status.localProcessingDetail")}</p><code>{isVideoComposite ? "Canvas 2D + WebGL2" : rendererMode === "original" ? "Canvas 2D" : "WebGL2"}</code></section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
