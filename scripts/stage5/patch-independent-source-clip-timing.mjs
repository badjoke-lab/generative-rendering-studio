import { readFileSync, writeFileSync } from "node:fs";

function patchFile(path, replacements) {
  let source = readFileSync(path, "utf8");
  for (const { label, before, after } of replacements) {
    const first = source.indexOf(before);
    const last = source.lastIndexOf(before);
    if (first < 0 || first !== last) throw new Error(`${path}:${label}: expected exactly one match`);
    source = source.slice(0, first) + after + source.slice(first + before.length);
  }
  writeFileSync(path, source);
}

patchFile("apps/web/src/main.tsx", [
  {
    label: "secondary timing state",
    before: `  const [secondaryOnTop, setSecondaryOnTop] = useState(true);\n  const [secondaryBlendMode, setSecondaryBlendMode] = useState<IndependentSourceBlendMode>("normal");\n  const [secondarySourceError, setSecondarySourceError] = useState<string | null>(null);`,
    after: `  const [secondaryOnTop, setSecondaryOnTop] = useState(true);\n  const [secondaryBlendMode, setSecondaryBlendMode] = useState<IndependentSourceBlendMode>("normal");\n  const [secondaryTimingEnabled, setSecondaryTimingEnabled] = useState(false);\n  const [secondaryTimelineStart, setSecondaryTimelineStart] = useState(0);\n  const [secondaryDuration, setSecondaryDuration] = useState(3);\n  const [secondarySourceError, setSecondarySourceError] = useState<string | null>(null);`,
  },
  {
    label: "secondary scene clip",
    before: `      visible: secondaryVisible,\n      opacity: secondaryOpacity,\n      blendMode: secondaryBlendMode,\n    });`,
    after: `      visible: secondaryVisible,\n      opacity: secondaryOpacity,\n      blendMode: secondaryBlendMode,\n      ...(secondaryTimingEnabled ? { clip: { timelineStart: secondaryTimelineStart, duration: secondaryDuration } } : {}),\n    });`,
  },
  {
    label: "secondary scene dependencies",
    before: `    secondaryBlendMode,\n    secondaryOnTop,\n    secondaryOpacity,\n    secondaryRaster,\n    secondarySourceLabel,\n    secondaryVisible,`,
    after: `    secondaryBlendMode,\n    secondaryDuration,\n    secondaryOnTop,\n    secondaryOpacity,\n    secondaryRaster,\n    secondarySourceLabel,\n    secondaryTimelineStart,\n    secondaryTimingEnabled,\n    secondaryVisible,`,
  },
  {
    label: "independent scene timeline sample",
    before: `  const independentSecondaryLayer = independentSourceComposition?.bindings.find(({ layer }) => layer.id === "source-secondary")?.layer;\n  const independentSceneLayers = independentSourceComposition?.scene.layers ?? [];\n  const independentSecondaryOnTop = independentSceneLayers[independentSceneLayers.length - 1]?.id === "source-secondary";`,
    after: `  const independentSecondaryLayer = independentSourceComposition?.bindings.find(({ layer }) => layer.id === "source-secondary")?.layer;\n  const independentSceneLayers = independentSourceComposition?.scene.layers ?? [];\n  const independentSecondaryOnTop = independentSceneLayers[independentSceneLayers.length - 1]?.id === "source-secondary";\n  const independentSourceTimelineDuration = independentSourceComposition ? getStudioSceneTimelineDuration(independentSourceComposition.scene) : 0;\n  const independentLayerTimelineActive = Boolean(!isVideoSource && secondaryTimingEnabled && independentSecondaryLayer?.clip && independentSourceTimelineDuration > 0);\n  const independentSourceTimelineSample = useMemo(\n    () => independentSourceComposition && independentLayerTimelineActive\n      ? sampleStudioSceneTimeline(independentSourceComposition.scene, motionTimelineTime)\n      : undefined,\n    [independentLayerTimelineActive, independentSourceComposition, motionTimelineTime],\n  );\n  const independentSecondaryTimelineSample = independentSourceTimelineSample?.layers.find(({ layer }) => layer.id === "source-secondary");\n  const effectiveIndependentSecondaryVisible = Boolean(\n    independentSecondaryLayer?.visible && (!independentLayerTimelineActive || independentSecondaryTimelineSample?.active),\n  );`,
  },
  {
    label: "parameter timeline activation",
    before: `  const parameterTimelineActive = motionTimelineActive || cameraTimelineActive || morphTimelineActive;`,
    after: `  const parameterTimelineActive = motionTimelineActive || cameraTimelineActive || morphTimelineActive || independentLayerTimelineActive;`,
  },
  {
    label: "parameter timeline duration",
    before: `    cameraTimelineActive ? cameraDuration : 0,\n    morphTimelineActive ? morphDuration : 0,\n  );`,
    after: `    cameraTimelineActive ? cameraDuration : 0,\n    morphTimelineActive ? morphDuration : 0,\n    independentLayerTimelineActive ? independentSourceTimelineDuration : 0,\n  );`,
  },
  {
    label: "active parameter tracks",
    before: `    motionTimelineActive ? "motion-strength" : null,\n  ].filter((track): track is string => Boolean(track));`,
    after: `    motionTimelineActive ? "motion-strength" : null,\n    independentLayerTimelineActive ? "layer-timing" : null,\n  ].filter((track): track is string => Boolean(track));`,
  },
  {
    label: "parameter timeline mode",
    before: `  const parameterTimelineMode = multipleParameterTracksActive ? "multi-track" : morphTimelineActive ? "morph-track" : cameraTimelineActive ? "camera" : "motion-strength";\n  const parameterTimelineLabel = multipleParameterTracksActive ? t("timeline.multitrack") : morphTimelineActive ? t("timeline.morphTrack") : cameraTimelineActive ? t("timeline.camera") : t("timeline.motionStrength");\n  const parameterTimelinePositionLabel = multipleParameterTracksActive ? t("timeline.multitrackPosition") : cameraTimelineActive ? t("timeline.cameraPosition") : t("timeline.position");`,
    after: `  const parameterTimelineMode = multipleParameterTracksActive ? "multi-track" : morphTimelineActive ? "morph-track" : cameraTimelineActive ? "camera" : independentLayerTimelineActive ? "layer-timing" : "motion-strength";\n  const parameterTimelineLabel = multipleParameterTracksActive ? t("timeline.multitrack") : morphTimelineActive ? t("timeline.morphTrack") : cameraTimelineActive ? t("timeline.camera") : independentLayerTimelineActive ? t("timeline.layerTiming") : t("timeline.motionStrength");\n  const parameterTimelinePositionLabel = multipleParameterTracksActive ? t("timeline.multitrackPosition") : cameraTimelineActive ? t("timeline.cameraPosition") : independentLayerTimelineActive ? t("timeline.layerTimingPosition") : t("timeline.position");`,
  },
  {
    label: "clear secondary timing",
    before: `    setSecondaryOnTop(true);\n    setSecondaryBlendMode("normal");\n    setSecondarySourceError(null);`,
    after: `    setSecondaryOnTop(true);\n    setSecondaryBlendMode("normal");\n    setSecondaryTimingEnabled(false);\n    setSecondaryTimelineStart(0);\n    setSecondaryDuration(3);\n    setSecondarySourceError(null);`,
  },
  {
    label: "load secondary timing defaults",
    before: `      setSecondaryOnTop(true);\n      setSecondaryBlendMode("normal");\n    } catch {`,
    after: `      setSecondaryOnTop(true);\n      setSecondaryBlendMode("normal");\n      setSecondaryTimingEnabled(false);\n      setSecondaryTimelineStart(0);\n      setSecondaryDuration(3);\n    } catch {`,
  },
  {
    label: "still export timed visibility",
    before: `                visible: layer.visible,\n                opacity: layer.opacity,\n                blendMode: layer.blendMode,`,
    after: `                visible: effectiveIndependentSecondaryVisible,\n                opacity: layer.opacity,\n                blendMode: layer.blendMode,`,
  },
  {
    label: "animation timing activation",
    before: `    const animateMotion = motionMode !== "static" && rendererMode !== "original";\n    const animateCamera = cameraRequested;\n    if (!animateMorph && !animateMotion && !animateCamera) return;\n    if (rendererMode === "original" && !animateCamera) return;`,
    after: `    const animateMotion = motionMode !== "static" && rendererMode !== "original";\n    const animateCamera = cameraRequested;\n    const animateLayerTiming = independentLayerTimelineActive;\n    if (!animateMorph && !animateMotion && !animateCamera && !animateLayerTiming) return;\n    if (rendererMode === "original" && !animateCamera && !animateLayerTiming) return;`,
  },
  {
    label: "animation composite sampling",
    before: `    const secondaryCanvas = secondaryLayerCanvas.current;\n    const compositeRecordingCanvas = independentSourceComposition && secondaryCanvas\n      ? document.createElement("canvas")\n      : null;\n    const repaintAnimationComposite = compositeRecordingCanvas && independentSourceComposition && secondaryCanvas\n      ? () => paintCanvasStack(compositeRecordingCanvas, independentSourceComposition.scene.layers.map((layer) =>\n          layer.id === "source-secondary"\n            ? {\n                canvas: secondaryCanvas,\n                visible: layer.visible,\n                opacity: layer.opacity,\n                blendMode: layer.blendMode,\n              }\n            : { canvas, visible: layer.visible, opacity: layer.opacity, blendMode: layer.blendMode },\n        ))\n      : undefined;\n    repaintAnimationComposite?.();`,
    after: `    const secondaryCanvas = secondaryLayerCanvas.current;\n    const compositeRecordingCanvas = independentSourceComposition && secondaryCanvas\n      ? document.createElement("canvas")\n      : null;\n    const repaintAnimationComposite = compositeRecordingCanvas && independentSourceComposition && secondaryCanvas\n      ? (timelineTime: number) => {\n          const sceneSample = sampleStudioSceneTimeline(independentSourceComposition.scene, timelineTime);\n          const secondarySample = sceneSample.layers.find(({ layer }) => layer.id === "source-secondary");\n          return paintCanvasStack(compositeRecordingCanvas, independentSourceComposition.scene.layers.map((layer) =>\n            layer.id === "source-secondary"\n              ? {\n                  canvas: secondaryCanvas,\n                  visible: secondarySample?.active ?? layer.visible,\n                  opacity: layer.opacity,\n                  blendMode: layer.blendMode,\n                }\n              : { canvas, visible: layer.visible, opacity: layer.opacity, blendMode: layer.blendMode },\n          ));\n        }\n      : undefined;\n    repaintAnimationComposite?.(0);`,
  },
  {
    label: "animation parameter timeline",
    before: `    const animateParameterTimeline = animateMorph || animateCamera || (animateMotion && motionKeyframesEnabled);`,
    after: `    const animateParameterTimeline = animateMorph || animateCamera || (animateMotion && motionKeyframesEnabled) || animateLayerTiming;`,
  },
  {
    label: "animation duration includes layer timing",
    before: `      ? Math.max(0.001, animateMorph ? morphDuration : 0, animateCamera ? cameraDuration : 0, animateMotion && motionKeyframesEnabled ? motionDuration : 0)`,
    after: `      ? Math.max(0.001, animateMorph ? morphDuration : 0, animateCamera ? cameraDuration : 0, animateMotion && motionKeyframesEnabled ? motionDuration : 0, animateLayerTiming ? independentSourceTimelineDuration : 0)`,
  },
  {
    label: "animation composite frame time",
    before: `        onFrame: repaintAnimationComposite ? () => repaintAnimationComposite() : undefined,`,
    after: `        onFrame: repaintAnimationComposite ? (progress) => repaintAnimationComposite(progress * durationSeconds) : undefined,`,
  },
  {
    label: "animation kind",
    before: '      const animationKind = animateCamera ? animateMotion ? `${motionMode}-camera-motion` : "camera-motion" : `${motionMode}-motion`;',
    after: '      const animationKind = animateCamera ? animateMotion ? `${motionMode}-camera-motion` : "camera-motion" : animateMotion ? `${motionMode}-motion` : animateLayerTiming ? "layer-timing" : "animation";',
  },
  {
    label: "animation availability",
    before: `  const hasMotionAnimation = motionMode !== "static" && !isVideoSource;\n  const hasCameraAnimation = cameraKeyframesEnabled && !isVideoSource;\n  const canExportAnimation = (canMorph || hasMotionAnimation || hasCameraAnimation)\n    && !isVideoSource\n    && (rendererMode !== "original" || hasCameraAnimation)\n    && animationCapability.supported\n    && !animationExporting;\n  const cameraAnimationExport = hasCameraAnimation && !(canMorph && morphEnabled);\n  const motionOnlyExport = hasMotionAnimation && !hasCameraAnimation && !(canMorph && morphEnabled);`,
    after: `  const hasMotionAnimation = motionMode !== "static" && !isVideoSource;\n  const hasCameraAnimation = cameraKeyframesEnabled && !isVideoSource;\n  const hasLayerTimingAnimation = independentLayerTimelineActive && !isVideoSource;\n  const canExportAnimation = (canMorph || hasMotionAnimation || hasCameraAnimation || hasLayerTimingAnimation)\n    && !isVideoSource\n    && (rendererMode !== "original" || hasCameraAnimation || hasLayerTimingAnimation)\n    && animationCapability.supported\n    && !animationExporting;\n  const cameraAnimationExport = hasCameraAnimation && !(canMorph && morphEnabled);\n  const motionOnlyExport = hasMotionAnimation && !hasCameraAnimation && !(canMorph && morphEnabled);\n  const layerTimingOnlyExport = hasLayerTimingAnimation && !hasMotionAnimation && !hasCameraAnimation && !(canMorph && morphEnabled);`,
  },
  {
    label: "transport original renderer layer timing",
    before: `      ? hasSource && (cameraTimelineActive || rendererMode !== "original")`,
    after: `      ? hasSource && (cameraTimelineActive || independentLayerTimelineActive || rendererMode !== "original")`,
  },
  {
    label: "preview timed secondary visibility",
    before: `            secondaryVisible={independentSecondaryLayer?.visible ?? false}`,
    after: `            secondaryVisible={effectiveIndependentSecondaryVisible}`,
  },
  {
    label: "layer panel timing props",
    before: `secondaryOnTop={independentSecondaryOnTop} secondaryBlendMode={secondaryBlendMode} labels={{`,
    after: `secondaryOnTop={independentSecondaryOnTop} secondaryBlendMode={secondaryBlendMode} timingDisabled={isVideoSource} secondaryTimingEnabled={secondaryTimingEnabled} secondaryTimelineStart={secondaryTimelineStart} secondaryDuration={secondaryDuration} labels={{`,
  },
  {
    label: "layer panel timing labels and callbacks",
    before: `normal: t("layer.normal"), multiply: t("layer.multiply"), screen: t("layer.screen") }} onSecondaryVisibleChange={setSecondaryVisible} onSecondaryOpacityChange={setSecondaryOpacity} onSecondaryOnTopChange={setSecondaryOnTop} onSecondaryBlendModeChange={setSecondaryBlendMode} />}`,
    after: `normal: t("layer.normal"), multiply: t("layer.multiply"), screen: t("layer.screen"), timing: t("layer.secondaryTiming"), timingToggle: t("layer.secondaryTimingToggle"), timingHint: t("layer.secondaryTimingHint"), timelineStart: t("layer.timelineStart"), timelineDuration: t("layer.timelineDuration"), seconds: t("morph.seconds") }} onSecondaryVisibleChange={setSecondaryVisible} onSecondaryOpacityChange={setSecondaryOpacity} onSecondaryOnTopChange={setSecondaryOnTop} onSecondaryBlendModeChange={setSecondaryBlendMode} onSecondaryTimingEnabledChange={(enabled) => { setSecondaryTimingEnabled(enabled); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} onSecondaryTimelineStartChange={(seconds) => { setSecondaryTimelineStart(seconds); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} onSecondaryDurationChange={(seconds) => { setSecondaryDuration(seconds); setMotionTimelinePlaying(false); setMotionTimelineTime(0); }} />}`,
  },
  {
    label: "animation inspector timing copy",
    before: `animationExportSucceeded ? (cameraAnimationExport ? t("export.cameraAnimationSaved") : motionOnlyExport ? t("export.motionAnimationSaved") : t("export.animationSaved")) : (cameraAnimationExport ? t("export.cameraAnimationHint") : motionOnlyExport ? t("export.motionAnimationHint") : t("export.animationHint"))`,
    after: `animationExportSucceeded ? (layerTimingOnlyExport ? t("export.layerTimingAnimationSaved") : cameraAnimationExport ? t("export.cameraAnimationSaved") : motionOnlyExport ? t("export.motionAnimationSaved") : t("export.animationSaved")) : (layerTimingOnlyExport ? t("export.layerTimingAnimationHint") : cameraAnimationExport ? t("export.cameraAnimationHint") : motionOnlyExport ? t("export.motionAnimationHint") : t("export.animationHint"))`,
  },
  {
    label: "animation inspector timing button",
    before: `animationExporting ? t("export.animationRecording") : cameraAnimationExport ? t("export.cameraAnimationButton") : motionOnlyExport ? t("export.motionAnimationButton") : t("export.animationButton")`,
    after: `animationExporting ? t("export.animationRecording") : layerTimingOnlyExport ? t("export.layerTimingAnimationButton") : cameraAnimationExport ? t("export.cameraAnimationButton") : motionOnlyExport ? t("export.motionAnimationButton") : t("export.animationButton")`,
  },
]);

patchFile("apps/web/src/i18n/locales/en.ts", [
  {
    label: "layer timing labels",
    before: `  "layer.screen": "Screen",`,
    after: `  "layer.screen": "Screen",\n  "layer.secondaryTiming": "Place on timeline",\n  "layer.secondaryTimingToggle": "Toggle independent source timeline timing",\n  "layer.secondaryTimingHint": "When enabled, the independent source appears only inside this timeline clip. The primary source remains available for the whole sequence.",\n  "layer.timelineStart": "Independent source timeline start",\n  "layer.timelineDuration": "Independent source timeline duration",`,
  },
  {
    label: "timeline timing labels",
    before: `  "timeline.cameraPosition": "Camera timeline position",`,
    after: `  "timeline.cameraPosition": "Camera timeline position",\n  "timeline.layerTiming": "Layer timing",\n  "timeline.layerTimingPosition": "Layer timeline position",`,
  },
  {
    label: "layer timing export labels",
    before: `  "export.cameraAnimationSaved": "Camera animation file created.",`,
    after: `  "export.cameraAnimationSaved": "Camera animation file created.",\n  "export.layerTimingAnimationHint": "Records the independent source clip timing locally using this browser's supported video format.",\n  "export.layerTimingAnimationButton": "Export layer timing animation",\n  "export.layerTimingAnimationSaved": "Layer timing animation file created.",`,
  },
]);

patchFile("apps/web/src/i18n/locales/ja.ts", [
  {
    label: "layer timing labels",
    before: `  "layer.screen": "スクリーン",`,
    after: `  "layer.screen": "スクリーン",\n  "layer.secondaryTiming": "タイムラインに配置",\n  "layer.secondaryTimingToggle": "独立素材のタイムライン配置を切替",\n  "layer.secondaryTimingHint": "有効にすると、独立素材は指定したタイムライン区間だけ表示されます。メイン素材はシーケンス全体で利用できます。",\n  "layer.timelineStart": "独立素材のタイムライン開始",\n  "layer.timelineDuration": "独立素材のタイムライン時間",`,
  },
  {
    label: "timeline timing labels",
    before: `  "timeline.cameraPosition": "カメラタイムライン位置",`,
    after: `  "timeline.cameraPosition": "カメラタイムライン位置",\n  "timeline.layerTiming": "レイヤー配置",\n  "timeline.layerTimingPosition": "レイヤータイムライン位置",`,
  },
  {
    label: "layer timing export labels",
    before: `  "export.cameraAnimationSaved": "カメラアニメーションの動画ファイルを作成しました。",`,
    after: `  "export.cameraAnimationSaved": "カメラアニメーションの動画ファイルを作成しました。",\n  "export.layerTimingAnimationHint": "独立素材のタイムライン配置を、このブラウザが対応する動画形式で端末内に録画します。",\n  "export.layerTimingAnimationButton": "レイヤー配置の動画を保存",\n  "export.layerTimingAnimationSaved": "レイヤー配置の動画ファイルを作成しました。",`,
  },
]);

patchFile("README.md", [
  {
    label: "shipped independent clip timing",
    before: `An independent second still/SVG scene source can be layered with the primary composition, with visibility, opacity, Normal/Multiply/Screen blending and stack order shared by preview, current-frame PNG/WebP export, and supported short Motion/Morph/Camera animation export.`,
    after: `An independent second still/SVG scene source can be layered with the primary composition, with visibility, opacity, Normal/Multiply/Screen blending and stack order shared by preview, current-frame PNG/WebP export, and supported short Motion/Morph/Camera animation export. Optional layer timing can place that independent source at a chosen timeline start and duration; the shared Studio transport, current-frame export, and supported short animation export follow the same clip visibility.`,
  },
]);

patchFile("docs/ROADMAP.md", [
  {
    label: "stage5 shipped clip timing",
    before: `Status: in progress on main. Initial Studio work now includes explicit optional Motion controls with Static as the default, short Motion animation export, and a first keyframe/parameter-automation slice where Motion Strength can be driven between start/end keyframes and scrubbed or played through the existing transport. The simpler still-image path remains available without enabling the timeline. Broader Layers/Timeline/Camera/Effects composition remains ongoing Stage 5 work.`,
    after: `Status: in progress on main. Initial Studio work now includes explicit optional Motion controls with Static as the default, short Motion animation export, and a first keyframe/parameter-automation slice where Motion Strength can be driven between start/end keyframes and scrubbed or played through the existing transport. Independent second still/SVG scene sources can be composited with visibility, opacity, blend and stack order, exported in supported short animations, and optionally placed on the shared Studio timeline with a chosen start and duration. The simpler still-image path remains available without enabling the timeline. Broader Layers/Timeline/Camera/Effects composition remains ongoing Stage 5 work.`,
  },
]);
