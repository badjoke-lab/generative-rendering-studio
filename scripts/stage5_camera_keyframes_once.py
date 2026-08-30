from pathlib import Path
import re


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str):
    p = Path(path)
    text = p.read_text()
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"regex pattern count {count} in {path}: {pattern[:180]!r}")
    p.write_text(next_text)


# Core: Camera becomes a first-class TimelineTrack with four numeric channels.
timeline = "packages/core/src/timeline.ts"
replace_once(
    timeline,
    '''export interface MotionStrengthTrack {\n  readonly id: string;\n  readonly kind: "motion-strength";\n  readonly keyframes: readonly NumericKeyframe[];\n}\n\nexport type TimelineTrack = LayerOpacityTrack | MotionStrengthTrack;''',
    '''export interface MotionStrengthTrack {\n  readonly id: string;\n  readonly kind: "motion-strength";\n  readonly keyframes: readonly NumericKeyframe[];\n}\n\nexport interface CameraTrack {\n  readonly id: string;\n  readonly kind: "camera";\n  readonly panX: readonly NumericKeyframe[];\n  readonly panY: readonly NumericKeyframe[];\n  readonly zoom: readonly NumericKeyframe[];\n  readonly rotation: readonly NumericKeyframe[];\n}\n\nexport interface CameraSample {\n  readonly panX: number;\n  readonly panY: number;\n  readonly zoom: number;\n  readonly rotation: number;\n}\n\nexport type TimelineTrack = LayerOpacityTrack | MotionStrengthTrack | CameraTrack;''',
)
replace_once(
    timeline,
    '''function clampMotionStrength(value: number): number {\n  if (!Number.isFinite(value)) return 0;\n  return Math.min(2, Math.max(0, value));\n}\n''',
    '''function clampMotionStrength(value: number): number {\n  if (!Number.isFinite(value)) return 0;\n  return Math.min(2, Math.max(0, value));\n}\n\nfunction clampCameraPan(value: number): number {\n  if (!Number.isFinite(value)) return 0;\n  return Math.min(1, Math.max(-1, value));\n}\n\nfunction clampCameraZoom(value: number): number {\n  if (!Number.isFinite(value)) return 1;\n  return Math.min(3, Math.max(0.25, value));\n}\n\nfunction clampCameraRotation(value: number): number {\n  if (!Number.isFinite(value)) return 0;\n  return Math.min(180, Math.max(-180, value));\n}\n''',
)
replace_once(
    timeline,
    '''export function sampleMotionStrengthTrack(track: MotionStrengthTrack, time: number): number | null {\n  const sampled = sampleNumericKeyframes(track.keyframes, time);\n  return sampled === null ? null : clampMotionStrength(sampled);\n}\n\nexport function createStudioTimeline(''',
    '''export function sampleMotionStrengthTrack(track: MotionStrengthTrack, time: number): number | null {\n  const sampled = sampleNumericKeyframes(track.keyframes, time);\n  return sampled === null ? null : clampMotionStrength(sampled);\n}\n\nexport function createCameraTrack(\n  id: string,\n  channels: {\n    readonly panX?: readonly NumericKeyframe[];\n    readonly panY?: readonly NumericKeyframe[];\n    readonly zoom?: readonly NumericKeyframe[];\n    readonly rotation?: readonly NumericKeyframe[];\n  } = {},\n): CameraTrack {\n  const normalize = (keyframes: readonly NumericKeyframe[] | undefined, clamp: (value: number) => number) =>\n    normalizeNumericKeyframes((keyframes ?? []).map((keyframe) => ({ ...keyframe, value: clamp(keyframe.value) })));\n  return {\n    id,\n    kind: "camera",\n    panX: normalize(channels.panX, clampCameraPan),\n    panY: normalize(channels.panY, clampCameraPan),\n    zoom: normalize(channels.zoom, clampCameraZoom),\n    rotation: normalize(channels.rotation, clampCameraRotation),\n  };\n}\n\nexport function sampleCameraTrack(track: CameraTrack, time: number): CameraSample | null {\n  if (track.panX.length + track.panY.length + track.zoom.length + track.rotation.length === 0) return null;\n  return {\n    panX: clampCameraPan(sampleNumericKeyframes(track.panX, time) ?? 0),\n    panY: clampCameraPan(sampleNumericKeyframes(track.panY, time) ?? 0),\n    zoom: clampCameraZoom(sampleNumericKeyframes(track.zoom, time) ?? 1),\n    rotation: clampCameraRotation(sampleNumericKeyframes(track.rotation, time) ?? 0),\n  };\n}\n\nexport function createStudioTimeline(''',
)

# Core tests.
timeline_test = "packages/core/src/timeline.test.ts"
replace_once(timeline_test, "  createLayerOpacityTrack,\n", "  createCameraTrack,\n  createLayerOpacityTrack,\n")
replace_once(timeline_test, "  sampleLayerOpacityTrack,\n", "  sampleCameraTrack,\n  sampleLayerOpacityTrack,\n")
replace_once(
    timeline_test,
    '''  it("normalizes timeline duration and bounds the playhead without sharing track arrays", () => {''',
    '''  it("creates bounded Camera tracks and samples all channels on one playhead", () => {\n    const track = createCameraTrack("camera-main", {\n      panX: [createNumericKeyframe(0, -2), createNumericKeyframe(4, 2)],\n      panY: [createNumericKeyframe(0, 0), createNumericKeyframe(4, -0.5)],\n      zoom: [createNumericKeyframe(0, 0), createNumericKeyframe(4, 4)],\n      rotation: [createNumericKeyframe(0, -360), createNumericKeyframe(4, 360)],\n    });\n\n    expect(track.kind).toBe("camera");\n    expect(track.panX[0]?.value).toBe(-1);\n    expect(track.panX[1]?.value).toBe(1);\n    expect(track.zoom[0]?.value).toBe(0.25);\n    expect(track.zoom[1]?.value).toBe(3);\n    expect(track.rotation[0]?.value).toBe(-180);\n    expect(track.rotation[1]?.value).toBe(180);\n    expect(sampleCameraTrack(track, 2)).toEqual({ panX: 0, panY: -0.25, zoom: 1.625, rotation: 0 });\n    expect(sampleCameraTrack(createCameraTrack("empty"), 1)).toBeNull();\n  });\n\n  it("normalizes timeline duration and bounds the playhead without sharing track arrays", () => {''',
)

# App imports and state.
main = "apps/web/src/main.tsx"
replace_once(main, "  createLayerOpacityTrack,\n", "  createCameraTrack,\n  createLayerOpacityTrack,\n")
replace_once(main, "  sampleLayerOpacityTrack,\n", "  sampleCameraTrack,\n  sampleLayerOpacityTrack,\n")
replace_once(
    main,
    '''  const [cameraRotation, setCameraRotation] = useState(0);''',
    '''  const [cameraRotation, setCameraRotation] = useState(0);\n  const [cameraKeyframesEnabled, setCameraKeyframesEnabled] = useState(false);\n  const [cameraDuration, setCameraDuration] = useState(3);\n  const [cameraPanXStart, setCameraPanXStart] = useState(0);\n  const [cameraPanXEnd, setCameraPanXEnd] = useState(0.35);\n  const [cameraPanYStart, setCameraPanYStart] = useState(0);\n  const [cameraPanYEnd, setCameraPanYEnd] = useState(-0.15);\n  const [cameraZoomStart, setCameraZoomStart] = useState(1);\n  const [cameraZoomEnd, setCameraZoomEnd] = useState(1.4);\n  const [cameraRotationStart, setCameraRotationStart] = useState(0);\n  const [cameraRotationEnd, setCameraRotationEnd] = useState(25);\n  const [cameraKeyframeEasing, setCameraKeyframeEasing] = useState<KeyframeEasing>("ease-in-out");''',
)

replace_once(
    main,
    '''  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;\n  const effectiveMotionStrength = motionTimelineActive\n    ? sampleMotionStrengthTrack(motionStrengthTrack, motionTimelineTime) ?? motionStrength\n    : motionStrength;''',
    '''  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;\n  const cameraTrack = useMemo(\n    () => createCameraTrack("camera-main", {\n      panX: [createNumericKeyframe(0, cameraPanXStart, cameraKeyframeEasing), createNumericKeyframe(cameraDuration, cameraPanXEnd)],\n      panY: [createNumericKeyframe(0, cameraPanYStart, cameraKeyframeEasing), createNumericKeyframe(cameraDuration, cameraPanYEnd)],\n      zoom: [createNumericKeyframe(0, cameraZoomStart, cameraKeyframeEasing), createNumericKeyframe(cameraDuration, cameraZoomEnd)],\n      rotation: [createNumericKeyframe(0, cameraRotationStart, cameraKeyframeEasing), createNumericKeyframe(cameraDuration, cameraRotationEnd)],\n    }),\n    [cameraDuration, cameraKeyframeEasing, cameraPanXEnd, cameraPanXStart, cameraPanYEnd, cameraPanYStart, cameraRotationEnd, cameraRotationStart, cameraZoomEnd, cameraZoomStart],\n  );\n  const cameraTimelineActive = cameraKeyframesEnabled && !isVideoSource && !morphEnabled;\n  const parameterTimelineActive = motionTimelineActive || cameraTimelineActive;\n  const parameterTimelineDuration = Math.max(0.001, motionTimelineActive ? motionDuration : 0, cameraTimelineActive ? cameraDuration : 0);\n  const effectiveMotionStrength = motionTimelineActive\n    ? sampleMotionStrengthTrack(motionStrengthTrack, motionTimelineTime) ?? motionStrength\n    : motionStrength;\n  const sampledCamera = cameraTimelineActive ? sampleCameraTrack(cameraTrack, motionTimelineTime) : null;\n  const effectiveCameraPanX = sampledCamera?.panX ?? cameraPanX;\n  const effectiveCameraPanY = sampledCamera?.panY ?? cameraPanY;\n  const effectiveCameraZoom = sampledCamera?.zoom ?? cameraZoom;\n  const effectiveCameraRotation = sampledCamera?.rotation ?? cameraRotation;''',
)
replace_once(main, "    if (!motionTimelinePlaying || !motionTimelineActive) return;", "    if (!motionTimelinePlaying || !parameterTimelineActive) return;")
replace_once(main, "      const next = Math.min(motionDuration, (now - start) / 1000);", "      const next = Math.min(parameterTimelineDuration, (now - start) / 1000);")
replace_once(main, "      if (next >= motionDuration) setMotionTimelinePlaying(false);", "      if (next >= parameterTimelineDuration) setMotionTimelinePlaying(false);")
replace_once(main, "  }, [motionDuration, motionTimelineActive, motionTimelinePlaying]);", "  }, [motionTimelinePlaying, parameterTimelineActive, parameterTimelineDuration]);")

# Use sampled camera everywhere in the live preview/composite.
for old, new in [
    ("cameraPanX={cameraPanX}", "cameraPanX={effectiveCameraPanX}"),
    ("cameraPanY={cameraPanY}", "cameraPanY={effectiveCameraPanY}"),
    ("cameraZoom={cameraZoom}", "cameraZoom={effectiveCameraZoom}"),
    ("cameraRotation={cameraRotation}", "cameraRotation={effectiveCameraRotation}"),
]:
    p = Path(main)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing camera preview pattern: {old}")
    p.write_text(text.replace(old, new))

# Animation export: support Camera-only and Camera+Motion, including Original Canvas 2D.
regex_once(
    main,
    r'''  const exportShortAnimation = async \(\) => \{.*?\n  \};\n\n  const rendererLabel''',
    '''  const exportShortAnimation = async () => {\n    const canvas = previewCanvas.current;\n    if (!canvas || isVideoSource) return;\n    const hasMorphTarget = Boolean(field && morphField);\n    const cameraRequested = cameraKeyframesEnabled && !morphEnabled;\n    const animateMorph = hasMorphTarget && (morphEnabled || (motionMode === "static" && !cameraRequested));\n    const animateMotion = motionMode !== "static" && rendererMode !== "original";\n    const animateCamera = cameraRequested;\n    if (!animateMorph && !animateMotion && !animateCamera) return;\n    if (rendererMode === "original" && !animateCamera) return;\n    const capability = getCanvasRecordingCapability(canvas);\n    setAnimationCapability(capability);\n    if (!capability.supported) {\n      setAnimationExportError(t("export.animationUnsupported"));\n      setAnimationExportSucceeded(false);\n      return;\n    }\n    setAnimationExportError(null);\n    setAnimationExportSucceeded(false);\n    setAnimationExporting(true);\n    setMorphPlaying(false);\n    setMotionTimelinePlaying(false);\n    const animateParameterTimeline = !animateMorph && (animateCamera || (animateMotion && motionKeyframesEnabled));\n    if (animateParameterTimeline) setMotionTimelineTime(0);\n    if (animateMorph) {\n      setMorphEnabled(true);\n      setMorphProgress(0);\n    }\n    try {\n      const durationSeconds = animateMorph ? morphDuration : animateParameterTimeline ? parameterTimelineDuration : motionDuration;\n      const result = await recordCanvasAnimation({\n        canvas,\n        durationSeconds,\n        frameRate: 60,\n        onProgress: animateMorph\n          ? setMorphProgress\n          : animateParameterTimeline\n            ? (progress) => setMotionTimelineTime(progress * parameterTimelineDuration)\n            : () => {},\n      });\n      const animationKind = animateCamera\n        ? animateMotion ? `${motionMode}-camera-motion` : "camera-motion"\n        : `${motionMode}-motion`;\n      const fileName = animateMorph\n        ? `${safeFileStem(sourceLabel)}-to-${safeFileStem(morphLabel || "morph")}-${rendererMode}.${result.extension}`\n        : `${safeFileStem(sourceLabel)}-${rendererMode}-${animationKind}.${result.extension}`;\n      downloadBlob(result.blob, fileName);\n      setAnimationExportSucceeded(true);\n    } catch (error) {\n      setAnimationExportSucceeded(false);\n      setAnimationExportError(error instanceof Error && error.message === "animation-export-unsupported" ? t("export.animationUnsupported") : t("export.animationFailed"));\n    } finally {\n      if (animateMorph) setMorphProgress(1);\n      if (animateParameterTimeline) setMotionTimelineTime(parameterTimelineDuration);\n      setAnimationExporting(false);\n    }\n  };\n\n  const rendererLabel''',
)

# Unified transport for Camera and Motion parameter tracks.
regex_once(
    main,
    r'''  const canMorph = Boolean\(field && morphField\) && !isVideoSource;.*?\n  const previewDetail =''',
    '''  const canMorph = Boolean(field && morphField) && !isVideoSource;\n  const hasMotionAnimation = motionMode !== "static" && !isVideoSource;\n  const hasCameraAnimation = cameraKeyframesEnabled && !isVideoSource && !morphEnabled;\n  const canExportAnimation = (canMorph || hasMotionAnimation || hasCameraAnimation)\n    && !isVideoSource\n    && (rendererMode !== "original" || hasCameraAnimation)\n    && animationCapability.supported\n    && !animationExporting;\n  const cameraAnimationExport = hasCameraAnimation && !(canMorph && morphEnabled);\n  const motionOnlyExport = hasMotionAnimation && !hasCameraAnimation && !(canMorph && morphEnabled);\n  const animationFormatLabel = animationCapability.supported\n    ? animationCapability.preferredExtension\n      ? `${animationCapability.preferredExtension.toUpperCase()} · ${animationCapability.preferredMimeType ?? "MediaRecorder"}`\n      : t("export.animationBrowserDefault")\n    : t("export.animationUnsupported");\n  const transportProgress = isVideoSource && videoDuration > 0\n    ? (videoTime / videoDuration) * 100\n    : parameterTimelineActive\n      ? (motionTimelineTime / parameterTimelineDuration) * 100\n      : morphProgress * 100;\n  const transportPlaying = isVideoSource ? videoPlaying : parameterTimelineActive ? motionTimelinePlaying : morphPlaying;\n  const transportCanUse = isVideoSource\n    ? hasSource && videoDuration > 0\n    : parameterTimelineActive\n      ? hasSource && (cameraTimelineActive || rendererMode !== "original")\n      : canMorph;\n  const playTransport = () => {\n    if (isVideoSource) { void playVideo(); return; }\n    if (parameterTimelineActive) {\n      if (motionTimelineTime >= parameterTimelineDuration) setMotionTimelineTime(0);\n      setMotionTimelinePlaying(true);\n      return;\n    }\n    setMorphEnabled(true);\n    if (morphProgress >= 1) setMorphProgress(0);\n    setMorphPlaying(true);\n  };\n  const stopTransport = () => {\n    if (isVideoSource) stopVideo();\n    else if (parameterTimelineActive) setMotionTimelinePlaying(false);\n    else setMorphPlaying(false);\n  };\n  const seekTransport = (progress: number) => {\n    if (isVideoSource) { seekVideo(progress); return; }\n    if (parameterTimelineActive) {\n      setMotionTimelinePlaying(false);\n      setMotionTimelineTime(progress * parameterTimelineDuration);\n      return;\n    }\n    setMorphPlaying(false);\n    setMorphProgress(progress);\n  };\n  const previewDetail =''',
)

replace_once(main, 'motionTimelineActive ? formatTime(motionTimelineTime)', 'parameterTimelineActive ? formatTime(motionTimelineTime)')
replace_once(
    main,
    'data-timeline-mode={motionTimelineActive ? "motion-strength" : isVideoSource ? "video" : morphEnabled ? "morph" : "idle"}',
    'data-timeline-mode={parameterTimelineActive ? cameraTimelineActive ? motionTimelineActive ? "camera+motion" : "camera" : "motion-strength" : isVideoSource ? "video" : morphEnabled ? "morph" : "idle"}',
)
for old, new in [
    ('aria-label={motionTimelineActive ? t("timeline.play")', 'aria-label={parameterTimelineActive ? t("timeline.play")'),
    ('aria-label={motionTimelineActive ? t("timeline.stop")', 'aria-label={parameterTimelineActive ? t("timeline.stop")'),
    ('aria-label={motionTimelineActive ? t("timeline.start")', 'aria-label={parameterTimelineActive ? t("timeline.start")'),
    ('aria-label={motionTimelineActive ? t("timeline.end")', 'aria-label={parameterTimelineActive ? t("timeline.end")'),
    ('{motionTimelineActive ? t("timeline.motionStrength") : isVideoComposite', '{parameterTimelineActive ? cameraTimelineActive ? motionTimelineActive ? t("timeline.cameraAndMotion") : t("timeline.camera") : t("timeline.motionStrength") : isVideoComposite'),
    ('aria-label={motionTimelineActive ? t("timeline.position")', 'aria-label={parameterTimelineActive ? cameraTimelineActive ? t("timeline.cameraPosition") : t("timeline.position")'),
]:
    replace_once(main, old, new)

# Camera inspector: manual camera remains simple until automation is explicitly enabled.
regex_once(
    main,
    r'''        <section className="inspector-section" data-stage5-camera="true">.*?\n        </section>\n        <section className="inspector-section guided-section">''',
    '''        <section className="inspector-section" data-stage5-camera="true" data-stage5-camera-keyframes={cameraKeyframesEnabled ? "on" : "off"}>\n          <h2>{t("camera.title")}</h2>\n          <p>{t("camera.hint")}</p>\n          <label>{t("camera.panX")}<div className="range-row"><input aria-label={t("camera.panX")} type="range" min="-100" max="100" value={Math.round(effectiveCameraPanX * 100)} disabled={animationExporting || cameraKeyframesEnabled} onChange={(event) => setCameraPanX(Number(event.target.value) / 100)} /><output>{Math.round(effectiveCameraPanX * 100)}%</output></div></label>\n          <label>{t("camera.panY")}<div className="range-row"><input aria-label={t("camera.panY")} type="range" min="-100" max="100" value={Math.round(effectiveCameraPanY * 100)} disabled={animationExporting || cameraKeyframesEnabled} onChange={(event) => setCameraPanY(Number(event.target.value) / 100)} /><output>{Math.round(effectiveCameraPanY * 100)}%</output></div></label>\n          <label>{t("camera.zoom")}<div className="range-row"><input aria-label={t("camera.zoom")} type="range" min="25" max="300" value={Math.round(effectiveCameraZoom * 100)} disabled={animationExporting || cameraKeyframesEnabled} onChange={(event) => setCameraZoom(Number(event.target.value) / 100)} /><output>{Math.round(effectiveCameraZoom * 100)}%</output></div></label>\n          <label>{t("camera.rotation")}<div className="range-row"><input aria-label={t("camera.rotation")} type="range" min="-180" max="180" value={Math.round(effectiveCameraRotation)} disabled={animationExporting || cameraKeyframesEnabled} onChange={(event) => setCameraRotation(Number(event.target.value))} /><output>{Math.round(effectiveCameraRotation)}°</output></div></label>\n          <button type="button" className="source-secondary" disabled={animationExporting} onClick={() => { setCameraPanX(0); setCameraPanY(0); setCameraZoom(1); setCameraRotation(0); setCameraPanXStart(0); setCameraPanXEnd(0); setCameraPanYStart(0); setCameraPanYEnd(0); setCameraZoomStart(1); setCameraZoomEnd(1); setCameraRotationStart(0); setCameraRotationEnd(0); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }}>{t("camera.reset")}</button>\n          <div className="toggle-row"><span>{t("camera.keyframes")}</span><button aria-label={t("camera.keyframesToggle")} disabled={animationExporting || isVideoSource || morphEnabled} className={`toggle ${cameraKeyframesEnabled ? "on" : ""}`} aria-pressed={cameraKeyframesEnabled} onClick={() => { const next = !cameraKeyframesEnabled; setCameraKeyframesEnabled(next); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /></div>\n          {cameraKeyframesEnabled && !isVideoSource && !morphEnabled && <>\n            <p>{t("camera.keyframesHint")}</p>\n            <label>{t("camera.duration")}<div className="range-row"><input aria-label={t("camera.duration")} type="range" min="1" max="12" step="0.5" value={cameraDuration} disabled={animationExporting} onChange={(event) => { setCameraDuration(Number(event.target.value)); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} /><output>{cameraDuration} {t("morph.seconds")}</output></div></label>\n            <label>{t("camera.startPanX")}<div className="range-row"><input aria-label={t("camera.startPanX")} type="range" min="-100" max="100" value={Math.round(cameraPanXStart * 100)} disabled={animationExporting} onChange={(event) => setCameraPanXStart(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanXStart * 100)}%</output></div></label>\n            <label>{t("camera.endPanX")}<div className="range-row"><input aria-label={t("camera.endPanX")} type="range" min="-100" max="100" value={Math.round(cameraPanXEnd * 100)} disabled={animationExporting} onChange={(event) => setCameraPanXEnd(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanXEnd * 100)}%</output></div></label>\n            <label>{t("camera.startPanY")}<div className="range-row"><input aria-label={t("camera.startPanY")} type="range" min="-100" max="100" value={Math.round(cameraPanYStart * 100)} disabled={animationExporting} onChange={(event) => setCameraPanYStart(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanYStart * 100)}%</output></div></label>\n            <label>{t("camera.endPanY")}<div className="range-row"><input aria-label={t("camera.endPanY")} type="range" min="-100" max="100" value={Math.round(cameraPanYEnd * 100)} disabled={animationExporting} onChange={(event) => setCameraPanYEnd(Number(event.target.value) / 100)} /><output>{Math.round(cameraPanYEnd * 100)}%</output></div></label>\n            <label>{t("camera.startZoom")}<div className="range-row"><input aria-label={t("camera.startZoom")} type="range" min="25" max="300" value={Math.round(cameraZoomStart * 100)} disabled={animationExporting} onChange={(event) => setCameraZoomStart(Number(event.target.value) / 100)} /><output>{Math.round(cameraZoomStart * 100)}%</output></div></label>\n            <label>{t("camera.endZoom")}<div className="range-row"><input aria-label={t("camera.endZoom")} type="range" min="25" max="300" value={Math.round(cameraZoomEnd * 100)} disabled={animationExporting} onChange={(event) => setCameraZoomEnd(Number(event.target.value) / 100)} /><output>{Math.round(cameraZoomEnd * 100)}%</output></div></label>\n            <label>{t("camera.startRotation")}<div className="range-row"><input aria-label={t("camera.startRotation")} type="range" min="-180" max="180" value={Math.round(cameraRotationStart)} disabled={animationExporting} onChange={(event) => setCameraRotationStart(Number(event.target.value))} /><output>{Math.round(cameraRotationStart)}°</output></div></label>\n            <label>{t("camera.endRotation")}<div className="range-row"><input aria-label={t("camera.endRotation")} type="range" min="-180" max="180" value={Math.round(cameraRotationEnd)} disabled={animationExporting} onChange={(event) => setCameraRotationEnd(Number(event.target.value))} /><output>{Math.round(cameraRotationEnd)}°</output></div></label>\n            <label>{t("camera.keyframeEasing")}<select aria-label={t("camera.keyframeEasing")} value={cameraKeyframeEasing} disabled={animationExporting} onChange={(event) => setCameraKeyframeEasing(event.target.value as KeyframeEasing)}><option value="linear">{t("morph.linear")}</option><option value="ease-in">{t("timeline.easeIn")}</option><option value="ease-out">{t("timeline.easeOut")}</option><option value="ease-in-out">{t("morph.easeInOut")}</option><option value="step">{t("timeline.step")}</option></select></label>\n            <label>{t("camera.current")}<code>{Math.round(effectiveCameraPanX * 100)}% · {Math.round(effectiveCameraPanY * 100)}% · {Math.round(effectiveCameraZoom * 100)}% · {Math.round(effectiveCameraRotation)}°</code></label>\n          </>}\n        </section>\n        <section className="inspector-section guided-section">''',
)

# Camera-aware animation labels.
replace_once(
    main,
    '''<section className="inspector-section"><h2>{t("export.animation")}</h2><p>{isVideoSource ? t("export.videoLongExportLater") : animationExportError ?? (animationExportSucceeded ? (motionOnlyExport ? t("export.motionAnimationSaved") : t("export.animationSaved")) : (motionOnlyExport ? t("export.motionAnimationHint") : t("export.animationHint")))}</p><label>{t("export.animationSupportedFormat")}<code>{animationFormatLabel}</code></label><button className="source-add" disabled={!canExportAnimation} onClick={() => void exportShortAnimation()}>{animationExporting ? t("export.animationRecording") : motionOnlyExport ? t("export.motionAnimationButton") : t("export.animationButton")}</button></section>''',
    '''<section className="inspector-section"><h2>{t("export.animation")}</h2><p>{isVideoSource ? t("export.videoLongExportLater") : animationExportError ?? (animationExportSucceeded ? (cameraAnimationExport ? t("export.cameraAnimationSaved") : motionOnlyExport ? t("export.motionAnimationSaved") : t("export.animationSaved")) : (cameraAnimationExport ? t("export.cameraAnimationHint") : motionOnlyExport ? t("export.motionAnimationHint") : t("export.animationHint")))}</p><label>{t("export.animationSupportedFormat")}<code>{animationFormatLabel}</code></label><button className="source-add" disabled={!canExportAnimation} onClick={() => void exportShortAnimation()}>{animationExporting ? t("export.animationRecording") : cameraAnimationExport ? t("export.cameraAnimationButton") : motionOnlyExport ? t("export.motionAnimationButton") : t("export.animationButton")}</button></section>''',
)

# Locales.
en = "apps/web/src/i18n/locales/en.ts"
replace_once(
    en,
    '  "camera.reset": "Reset camera",',
    '  "camera.reset": "Reset camera",\n  "camera.keyframes": "Animate camera",\n  "camera.keyframesToggle": "Toggle Camera keyframes",\n  "camera.keyframesHint": "Camera uses its own start/end keyframes. When Motion keyframes are also enabled, one shared transport previews both tracks together.",\n  "camera.duration": "Camera duration",\n  "camera.startPanX": "Start Pan X",\n  "camera.endPanX": "End Pan X",\n  "camera.startPanY": "Start Pan Y",\n  "camera.endPanY": "End Pan Y",\n  "camera.startZoom": "Start Zoom",\n  "camera.endZoom": "End Zoom",\n  "camera.startRotation": "Start Rotation",\n  "camera.endRotation": "End Rotation",\n  "camera.keyframeEasing": "Camera easing",\n  "camera.current": "Current camera",\n  "timeline.camera": "Camera",\n  "timeline.cameraAndMotion": "Camera + Motion",\n  "timeline.cameraPosition": "Camera timeline position",',
)
replace_once(
    en,
    '  "export.motionAnimationSaved": "Motion animation file created.",',
    '  "export.motionAnimationSaved": "Motion animation file created.",\n  "export.cameraAnimationHint": "Records Camera keyframes locally, together with the selected Motion when one is active.",\n  "export.cameraAnimationButton": "Export Camera animation",\n  "export.cameraAnimationSaved": "Camera animation file created.",',
)
ja = "apps/web/src/i18n/locales/ja.ts"
replace_once(
    ja,
    '  "camera.reset": "カメラをリセット",',
    '  "camera.reset": "カメラをリセット",\n  "camera.keyframes": "カメラをキーフレーム化",\n  "camera.keyframesToggle": "カメラキーフレーム切替",\n  "camera.keyframesHint": "カメラは開始・終了のキーフレームを持ちます。Motionのキーフレームも有効な場合は、1本の共通タイムラインで両方を確認できます。",\n  "camera.duration": "カメラの時間",\n  "camera.startPanX": "開始時の横移動",\n  "camera.endPanX": "終了時の横移動",\n  "camera.startPanY": "開始時の縦移動",\n  "camera.endPanY": "終了時の縦移動",\n  "camera.startZoom": "開始時のズーム",\n  "camera.endZoom": "終了時のズーム",\n  "camera.startRotation": "開始時の回転",\n  "camera.endRotation": "終了時の回転",\n  "camera.keyframeEasing": "カメラのイージング",\n  "camera.current": "現在のカメラ",\n  "timeline.camera": "カメラ",\n  "timeline.cameraAndMotion": "カメラ＋Motion",\n  "timeline.cameraPosition": "カメラタイムライン位置",',
)
replace_once(
    ja,
    '  "export.motionAnimationSaved": "動きの動画ファイルを作成しました。",',
    '  "export.motionAnimationSaved": "動きの動画ファイルを作成しました。",\n  "export.cameraAnimationHint": "カメラのキーフレームを端末内で録画します。Motionが選ばれている場合は同じ動画へ反映します。",\n  "export.cameraAnimationButton": "カメラアニメーションを保存",\n  "export.cameraAnimationSaved": "カメラアニメーションの動画ファイルを作成しました。",',
)

# Browser regression: actual playhead sampling, shared Motion+Camera transport, locale and mobile layout.
Path("tests/browser/stage5-camera-keyframes.spec.ts").write_text(r'''import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

async function createRibbon(page: import("@playwright/test").Page) {
  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name: "Ribbon" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Ribbon");
}

test("Stage 5 Camera keyframes sample through the shared transport and can combine with Motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await createRibbon(page);

  const camera = page.locator('[data-stage5-camera="true"]');
  await camera.getByRole("button", { name: "Toggle Camera keyframes" }).click();
  await expect(camera).toHaveAttribute("data-stage5-camera-keyframes", "on");
  await camera.getByLabel("Camera duration").fill("2");
  await camera.getByLabel("End Pan X").fill("35");
  await camera.getByLabel("End Pan Y").fill("-15");
  await camera.getByLabel("End Zoom").fill("140");
  await camera.getByLabel("End Rotation").fill("25");

  const canvas = page.locator(".preview-frame .preview-canvas");
  const timeline = page.locator('.transport-bar input[type="range"]');
  await timeline.fill("0");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.000");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "0.000");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.000");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "0.0");

  await timeline.fill("50");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.175");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "-0.075");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.200");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "12.5");

  await timeline.fill("100");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.350");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "-0.150");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.400");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "25.0");

  const motion = page.locator('[data-stage5-motion="true"]');
  await motion.getByLabel("Motion type").selectOption("pulse");
  await motion.getByRole("button", { name: "Toggle keyframes" }).click();
  await expect(page.locator(".transport-bar")).toHaveAttribute("data-timeline-mode", "camera+motion");
  await timeline.fill("0");
  await page.getByRole("button", { name: "Play keyframes" }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-camera-pan-x"))).toBeGreaterThan(0.01);
  await page.getByRole("button", { name: "Stop keyframes" }).click();

  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(camera).toContainText("カメラをキーフレーム化");
  await expect(page.locator(".transport-time")).toContainText("カメラ＋Motion");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-1440x700-ja.png`, fullPage: true });
});

test("Camera keyframe controls stay usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createRibbon(page);
  const camera = page.locator('[data-stage5-camera="true"]');
  await camera.getByRole("button", { name: "Toggle Camera keyframes" }).click();
  await expect(camera.getByLabel("End Zoom")).toBeVisible();
  const metrics = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-390x844-en.png`, fullPage: true });
});
''')
