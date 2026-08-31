from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


main_path = "apps/web/src/main.tsx"
main = read(main_path)

main = replace_once(
    main,
    '  sampleStudioSceneTimeline,\n  type KeyframeEasing,',
    '  sampleStudioSceneTimeline,\n  resolveStudioSceneSources,\n  type KeyframeEasing,',
    "import resolveStudioSceneSources",
)
main = replace_once(
    main,
    '  type RasterPixels,\n} from "@grs/core";',
    '  type RasterPixels,\n  type SourceDescriptor,\n} from "@grs/core";',
    "import SourceDescriptor",
)
main = replace_once(
    main,
    'import { OriginalPreview } from "./canvas/OriginalPreview";',
    'import { IndependentSourceCompositePreview } from "./canvas/IndependentSourceCompositePreview";\nimport { OriginalPreview } from "./canvas/OriginalPreview";',
    "import independent source composite",
)
main = replace_once(
    main,
    'import { VideoLayerStackPanel, type VideoLayerBlendMode } from "./studio/VideoLayerStackPanel";',
    'import { IndependentSourceLayerPanel, type IndependentSourceBlendMode } from "./studio/IndependentSourceLayerPanel";\nimport { VideoLayerStackPanel, type VideoLayerBlendMode } from "./studio/VideoLayerStackPanel";',
    "import independent source layer panel",
)

main = replace_once(
    main,
    '  const fileInput = useRef<HTMLInputElement>(null);\n  const morphInput = useRef<HTMLInputElement>(null);',
    '  const fileInput = useRef<HTMLInputElement>(null);\n  const secondarySourceInput = useRef<HTMLInputElement>(null);\n  const morphInput = useRef<HTMLInputElement>(null);',
    "secondary source input ref",
)
main = replace_once(
    main,
    '  const previewCanvas = useRef<HTMLCanvasElement>(null);\n  const originalUnderlayCanvas = useRef<HTMLCanvasElement>(null);',
    '  const previewCanvas = useRef<HTMLCanvasElement>(null);\n  const secondaryLayerCanvas = useRef<HTMLCanvasElement>(null);\n  const originalUnderlayCanvas = useRef<HTMLCanvasElement>(null);',
    "secondary canvas ref",
)
main = replace_once(
    main,
    '  const [raster, setRaster] = useState<RasterPixels>();\n  const [morphRaster, setMorphRaster] = useState<RasterPixels>();',
    '  const [raster, setRaster] = useState<RasterPixels>();\n  const [secondaryRaster, setSecondaryRaster] = useState<RasterPixels>();\n  const [morphRaster, setMorphRaster] = useState<RasterPixels>();',
    "secondary raster state",
)
main = replace_once(
    main,
    '  const [sourceDetail, setSourceDetail] = useState(() => t("source.fallbackDetail"));\n  const [morphLabel, setMorphLabel] = useState("");',
    '  const [sourceDetail, setSourceDetail] = useState(() => t("source.fallbackDetail"));\n  const [secondarySourceLabel, setSecondarySourceLabel] = useState("");\n  const [secondaryVisible, setSecondaryVisible] = useState(true);\n  const [secondaryOpacity, setSecondaryOpacity] = useState(0.72);\n  const [secondaryOnTop, setSecondaryOnTop] = useState(true);\n  const [secondaryBlendMode, setSecondaryBlendMode] = useState<IndependentSourceBlendMode>("normal");\n  const [secondarySourceError, setSecondarySourceError] = useState<string | null>(null);\n  const [morphLabel, setMorphLabel] = useState("");',
    "secondary layer state",
)

scene_anchor = '  const isVideoSource = sourceKind === "video";\n  const videoClip = useMemo('
scene_block = '''  const isVideoSource = sourceKind === "video";\n  const independentSourceComposition = useMemo(() => {\n    if (!hasSource || !secondaryRaster) return undefined;\n\n    const mainLayer = createSceneLayer({\n      id: "source-main",\n      sourceId: "primary-source",\n      renderer: rendererMode,\n    });\n    const secondaryLayer = createSceneLayer({\n      id: "source-secondary",\n      sourceId: "secondary-source",\n      renderer: "original",\n      visible: secondaryVisible,\n      opacity: secondaryOpacity,\n      blendMode: secondaryBlendMode,\n    });\n    const scene = createStudioScene(\n      "independent-source-scene",\n      secondaryOnTop ? [mainLayer, secondaryLayer] : [secondaryLayer, mainLayer],\n    );\n    const mainSource = {\n      id: "primary-source",\n      kind: sourceKind === "still" ? "raster" : sourceKind,\n      label: sourceLabel,\n    } satisfies SourceDescriptor;\n    const secondarySource = {\n      id: "secondary-source",\n      kind: "raster",\n      label: secondarySourceLabel,\n    } satisfies SourceDescriptor;\n\n    return {\n      scene,\n      bindings: resolveStudioSceneSources(scene, [mainSource, secondarySource]),\n    };\n  }, [\n    hasSource,\n    rendererMode,\n    secondaryBlendMode,\n    secondaryOnTop,\n    secondaryOpacity,\n    secondaryRaster,\n    secondarySourceLabel,\n    secondaryVisible,\n    sourceKind,\n    sourceLabel,\n  ]);\n  const independentSecondaryLayer = independentSourceComposition?.bindings.find(({ layer }) => layer.id === "source-secondary")?.layer;\n  const independentSceneLayers = independentSourceComposition?.scene.layers ?? [];\n  const independentSecondaryOnTop = independentSceneLayers[independentSceneLayers.length - 1]?.id === "source-secondary";\n  const videoClip = useMemo('''
main = replace_once(main, scene_anchor, scene_block, "independent source scene")

load_secondary = '''\n  const clearSecondarySource = () => {\n    setSecondaryRaster(undefined);\n    setSecondarySourceLabel("");\n    setSecondaryVisible(true);\n    setSecondaryOpacity(0.72);\n    setSecondaryOnTop(true);\n    setSecondaryBlendMode("normal");\n    setSecondarySourceError(null);\n  };\n\n  const loadSecondaryRaster = async (file: File) => {\n    if (animationExporting || !hasSource) return;\n    setSecondarySourceError(null);\n    setAnimationExportSucceeded(false);\n    try {\n      const pixels = await rasterizeImageFile(file);\n      setSecondaryRaster(pixels);\n      setSecondarySourceLabel(file.name);\n      setSecondaryVisible(true);\n      setSecondaryOpacity(0.72);\n      setSecondaryOnTop(true);\n      setSecondaryBlendMode("normal");\n    } catch {\n      setSecondarySourceError(t("source.importFailed"));\n    }\n  };\n\n'''
main = replace_once(
    main,
    '  const loadVideo = async (file: File) => {',
    load_secondary + '  const loadVideo = async (file: File) => {',
    "secondary source loader",
)

old_export = '''  const exportStill = () => {\n    if (animationExporting || !hasSource) return;\n    const canvas = previewCanvas.current;\n    if (!canvas) return;\n    const exportCanvas = isVideoComposite && originalUnderlayCanvas.current\n      ? composeCanvasStack(videoOriginalOnTop\n        ? [\n            { canvas, blendMode: videoBlendMode },\n            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },\n          ]\n        : [\n            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },\n            { canvas, blendMode: videoBlendMode },\n          ])\n      : canvas;\n    const ext = exportFormat === "webp" ? "webp" : "png";\n    const compositeSuffix = isVideoComposite ? "-composite" : "";\n    downloadCanvas(exportCanvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeFileStem(sourceLabel)}-${rendererMode}${compositeSuffix}.${ext}`);\n  };'''
new_export = '''  const exportStill = () => {\n    if (animationExporting || !hasSource) return;\n    const canvas = previewCanvas.current;\n    if (!canvas) return;\n\n    const primaryExportCanvas = isVideoComposite && originalUnderlayCanvas.current\n      ? composeCanvasStack(videoOriginalOnTop\n        ? [\n            { canvas, blendMode: videoBlendMode },\n            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },\n          ]\n        : [\n            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },\n            { canvas, blendMode: videoBlendMode },\n          ])\n      : canvas;\n    const secondaryCanvas = secondaryLayerCanvas.current;\n    const exportCanvas = independentSourceComposition && secondaryCanvas\n      ? composeCanvasStack(independentSourceComposition.scene.layers.map((layer) =>\n          layer.id === "source-secondary"\n            ? {\n                canvas: secondaryCanvas,\n                visible: layer.visible,\n                opacity: layer.opacity,\n                blendMode: layer.blendMode,\n              }\n            : { canvas: primaryExportCanvas, visible: layer.visible, opacity: layer.opacity, blendMode: layer.blendMode },\n        ))\n      : primaryExportCanvas;\n    const ext = exportFormat === "webp" ? "webp" : "png";\n    const compositeSuffix = isVideoComposite || independentSourceComposition ? "-composite" : "";\n    downloadCanvas(exportCanvas, exportFormat === "webp" ? "image/webp" : "image/png", `${safeFileStem(sourceLabel)}-${rendererMode}${compositeSuffix}.${ext}`);\n  };'''
main = replace_once(main, old_export, new_export, "still export composition")
main = replace_once(
    main,
    '    && animationCapability.supported\n    && !animationExporting;',
    '    && animationCapability.supported\n    && !secondaryRaster\n    && !animationExporting;',
    "disable animation export with independent layer",
)

preview_anchor = '''  const previewDetail = isVideoSource && !videoClipVisible\n    ? t("preview.video")\n    : isVideoComposite\n      ? `${t("preview.videoComposite")}${videoRoleSuffix}`\n      : rendererMode === "original"\n        ? t("preview.originalSource")\n        : pointCount\n          ? `${pointCount.toLocaleString(locale)} ${t("preview.elements")}${videoRoleSuffix}`\n          : t("preview.fallback");\n\n  return ('''
primary_preview = '''  const previewDetail = isVideoSource && !videoClipVisible\n    ? t("preview.video")\n    : isVideoComposite\n      ? `${t("preview.videoComposite")}${videoRoleSuffix}`\n      : rendererMode === "original"\n        ? t("preview.originalSource")\n        : pointCount\n          ? `${pointCount.toLocaleString(locale)} ${t("preview.elements")}${videoRoleSuffix}`\n          : t("preview.fallback");\n  const primaryPreview = rendererMode === "original" ? (\n    <OriginalPreview canvasRef={previewCanvas} raster={previewRaster} background={background} cameraPanX={effectiveCameraPanX} cameraPanY={effectiveCameraPanY} cameraZoom={effectiveCameraZoom} cameraRotation={effectiveCameraRotation} />\n  ) : isVideoComposite ? (\n    <VideoCompositePreview originalCanvasRef={originalUnderlayCanvas} transformedCanvasRef={previewCanvas} raster={previewRaster} originalOpacity={effectiveVideoOriginalOpacity} originalOnTop={videoOriginalOnTop} transformedBlendMode={videoBlendMode} positions={previewPositions} colors={previewColors} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={effectiveCameraPanX} cameraPanY={effectiveCameraPanY} cameraZoom={effectiveCameraZoom} cameraRotation={effectiveCameraRotation} />\n  ) : (\n    <WebGLPreview canvasRef={previewCanvas} positions={previewPositions} colors={previewColors} targetPositions={activeMorph?.toPositions} targetColors={activeMorph?.toColors} morphProgress={activeMorph ? easedProgress : 0} mode={rendererMode} motionMode={motionMode} motionStrength={effectiveMotionStrength} motionSpeed={motionSpeed} elementSize={effectiveElementSize} tint={tint} background={background} useSourceColor={useSourceColor} glyphPreset={glyphPreset} cameraPanX={effectiveCameraPanX} cameraPanY={effectiveCameraPanY} cameraZoom={effectiveCameraZoom} cameraRotation={effectiveCameraRotation} />\n  );\n\n  return ('''
main = replace_once(main, preview_anchor, primary_preview, "primary preview extraction")

main = replace_once(
    main,
    '        <input ref={fileInput} data-source-kind="still" hidden disabled={animationExporting} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />\n        <input ref={morphInput}',
    '        <input ref={fileInput} data-source-kind="still" hidden disabled={animationExporting} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRaster(file, "source"); event.currentTarget.value = ""; }} />\n        <input ref={secondarySourceInput} data-source-kind="scene-layer" hidden disabled={animationExporting || !hasSource} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadSecondaryRaster(file); event.currentTarget.value = ""; }} />\n        <input ref={morphInput}',
    "secondary source file input",
)

secondary_source_ui = '''        <div className="section-title-row source-heading morph-source-heading"><strong>{t("layer.secondSource")}</strong><span className="optional-label">{t("source.optional")}</span></div>\n        {secondaryRaster ? <section className="asset-card" data-source-role="scene-layer"><div className="asset-thumb" /><div className="asset-meta"><strong>{secondarySourceLabel}</strong><span>{secondaryRaster.width} × {secondaryRaster.height}</span></div><button className="asset-menu" aria-label={t("action.removeLayerSource")} disabled={animationExporting} onClick={clearSecondarySource}>×</button></section> : <button className="asset-add-row" disabled={animationExporting || !hasSource} onClick={() => secondarySourceInput.current?.click()}>＋ {t("action.addLayerSource")}</button>}\n        {secondarySourceError && <p className="supported-note stage3-note" role="alert">{secondarySourceError}</p>}\n'''
main = replace_once(
    main,
    '        <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.morphTarget")}</strong><span className="optional-label">{t("source.optional")}</span></div>',
    secondary_source_ui + '        <div className="section-title-row source-heading morph-source-heading"><strong>{t("source.morphTarget")}</strong><span className="optional-label">{t("source.optional")}</span></div>',
    "secondary source panel UI",
)

preview_pattern = re.compile(
    r'          \{rendererMode === "original" \? \(\n.*?\n          \)\}\n          <div className="canvas-status">',
    re.S,
)
preview_replacement = '''          <IndependentSourceCompositePreview\n            mainPreview={primaryPreview}\n            secondaryCanvasRef={secondaryLayerCanvas}\n            secondaryRaster={secondaryRaster}\n            secondaryVisible={independentSecondaryLayer?.visible ?? false}\n            secondaryOpacity={independentSecondaryLayer?.opacity ?? secondaryOpacity}\n            secondaryOnTop={independentSecondaryOnTop}\n            secondaryBlendMode={secondaryBlendMode}\n            cameraPanX={effectiveCameraPanX}\n            cameraPanY={effectiveCameraPanY}\n            cameraZoom={effectiveCameraZoom}\n            cameraRotation={effectiveCameraRotation}\n          />\n          <div className="canvas-status">'''
main, count = preview_pattern.subn(preview_replacement, main, count=1)
if count != 1:
    raise RuntimeError(f"preview composition: expected exactly one match, found {count}")

inspector_anchor = '      <aside className="inspector-panel">\n        {isVideoSource && <VideoClipPanel'
independent_panel = '''      <aside className="inspector-panel">\n        {secondaryRaster && independentSourceComposition && <IndependentSourceLayerPanel disabled={animationExporting} mainLabel={sourceLabel} secondaryLabel={secondarySourceLabel} secondaryVisible={independentSecondaryLayer?.visible ?? secondaryVisible} secondaryOpacity={independentSecondaryLayer?.opacity ?? secondaryOpacity} secondaryOnTop={independentSecondaryOnTop} secondaryBlendMode={secondaryBlendMode} labels={{ title: t("layer.title"), summary: t("layer.independentComposition"), mainSource: t("layer.mainSource"), secondarySource: t("layer.secondarySource"), secondaryToggle: t("layer.secondaryToggle"), secondaryOpacity: t("layer.secondaryOpacity"), opacity: t("layer.opacity"), blend: t("layer.blend"), order: t("layer.order"), secondaryOnTop: t("layer.secondaryOnTop"), mainOnTop: t("layer.mainOnTop"), normal: t("layer.normal"), multiply: t("layer.multiply"), screen: t("layer.screen") }} onSecondaryVisibleChange={setSecondaryVisible} onSecondaryOpacityChange={setSecondaryOpacity} onSecondaryOnTopChange={setSecondaryOnTop} onSecondaryBlendModeChange={setSecondaryBlendMode} />}\n        {isVideoSource && <VideoClipPanel'''
main = replace_once(main, inspector_anchor, independent_panel, "independent source inspector panel")
main = replace_once(
    main,
    'isVideoSource ? t("export.videoLongExportLater") : animationExportError',
    'isVideoSource ? t("export.videoLongExportLater") : secondaryRaster ? t("export.layerAnimationLater") : animationExportError',
    "animation export layer notice",
)

write(main_path, main)

locale_additions = {
    "apps/web/src/i18n/locales/en.ts": {
        '  "layer.videoComposition": "Video composition",': '''  "layer.videoComposition": "Video composition",\n  "layer.independentComposition": "Independent source composition",\n  "layer.secondSource": "Second scene source",\n  "layer.mainSource": "Primary source",\n  "layer.secondarySource": "Independent source",\n  "layer.secondaryToggle": "Toggle independent source visibility",\n  "layer.secondaryOpacity": "Independent source opacity",\n  "layer.secondaryOnTop": "Independent source on top",\n  "layer.mainOnTop": "Primary source on top",''',
        '  "action.addSource": "Add Source",': '  "action.addSource": "Add Source",\n  "action.addLayerSource": "Add second scene source",\n  "action.removeLayerSource": "Remove second scene source",',
        '  "export.videoLongExportLater": "Stage 3 currently transforms imported video in the live preview. Long transformed-video export remains a later export-hardening path.",': '  "export.videoLongExportLater": "Stage 3 currently transforms imported video in the live preview. Long transformed-video export remains a later export-hardening path.",\n  "export.layerAnimationLater": "Current-frame export includes the independent second source. Multi-source animation export remains disabled until the animation compositor uses the same scene stack.",',
    },
    "apps/web/src/i18n/locales/ja.ts": {
        '  "layer.videoComposition": "動画の2レイヤー合成",': '''  "layer.videoComposition": "動画の2レイヤー合成",\n  "layer.independentComposition": "独立ソースのレイヤー合成",\n  "layer.secondSource": "2つ目のシーン素材",\n  "layer.mainSource": "メイン素材",\n  "layer.secondarySource": "独立素材",\n  "layer.secondaryToggle": "独立素材の表示切替",\n  "layer.secondaryOpacity": "独立素材の不透明度",\n  "layer.secondaryOnTop": "独立素材を上",\n  "layer.mainOnTop": "メイン素材を上",''',
        '  "action.addSource": "素材を追加",': '  "action.addSource": "素材を追加",\n  "action.addLayerSource": "2つ目のシーン素材を追加",\n  "action.removeLayerSource": "2つ目のシーン素材を削除",',
        '  "export.videoLongExportLater": "Stage 3では読み込んだ動画をライブプレビューで変換できます。長尺の変換動画書き出しは、後続の書き出し強化で対応します。",': '  "export.videoLongExportLater": "Stage 3では読み込んだ動画をライブプレビューで変換できます。長尺の変換動画書き出しは、後続の書き出し強化で対応します。",\n  "export.layerAnimationLater": "現在フレームの書き出しには2つ目の独立素材も含まれます。複数素材の動画書き出しは、同じシーンスタックを動画コンポジタへ接続するまで無効です。",',
    },
}

for path, replacements in locale_additions.items():
    text = read(path)
    for old, new in replacements.items():
        text = replace_once(text, old, new, f"{path}: {old[:32]}")
    write(path, text)

print("stage5 second-source patch applied")
