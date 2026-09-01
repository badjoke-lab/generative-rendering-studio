import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/web/src/main.tsx";
let source = readFileSync(path, "utf8");

function replaceExact(label, before, after) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`${label}: expected exactly one match`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceExact(
  "compositor import",
  'import { composeCanvasStack } from "./export/composeCanvasLayers";',
  'import { composeCanvasStack, paintCanvasStack } from "./export/composeCanvasLayers";',
);

replaceExact(
  "recording canvas setup",
  `    if (!animateMorph && !animateMotion && !animateCamera) return;\n    if (rendererMode === "original" && !animateCamera) return;\n    const capability = getCanvasRecordingCapability(canvas);`,
  `    if (!animateMorph && !animateMotion && !animateCamera) return;\n    if (rendererMode === "original" && !animateCamera) return;\n\n    const secondaryCanvas = secondaryLayerCanvas.current;\n    const compositeRecordingCanvas = independentSourceComposition && secondaryCanvas\n      ? document.createElement("canvas")\n      : null;\n    const repaintAnimationComposite = compositeRecordingCanvas && independentSourceComposition && secondaryCanvas\n      ? () => paintCanvasStack(compositeRecordingCanvas, independentSourceComposition.scene.layers.map((layer) =>\n          layer.id === "source-secondary"\n            ? {\n                canvas: secondaryCanvas,\n                visible: layer.visible,\n                opacity: layer.opacity,\n                blendMode: layer.blendMode,\n              }\n            : { canvas, visible: layer.visible, opacity: layer.opacity, blendMode: layer.blendMode },\n        ))\n      : undefined;\n    repaintAnimationComposite?.();\n    const recordingCanvas = compositeRecordingCanvas ?? canvas;\n    const capability = getCanvasRecordingCapability(recordingCanvas);`,
);

replaceExact(
  "recording call",
  `      const result = await recordCanvasAnimation({\n        canvas,\n        durationSeconds,\n        frameRate: 60,\n        onProgress: animateParameterTimeline ? (progress) => setMotionTimelineTime(progress * durationSeconds) : () => {},\n      });`,
  `      const result = await recordCanvasAnimation({\n        canvas: recordingCanvas,\n        durationSeconds,\n        frameRate: 60,\n        onProgress: animateParameterTimeline ? (progress) => setMotionTimelineTime(progress * durationSeconds) : () => {},\n        onFrame: repaintAnimationComposite ? () => repaintAnimationComposite() : undefined,\n      });`,
);

replaceExact(
  "animation file name",
  `      const animationKind = animateCamera ? animateMotion ? \`${'${motionMode}'}-camera-motion\` : "camera-motion" : \`${'${motionMode}'}-motion\`;\n      const fileName = animateMorph\n        ? \`${'${safeFileStem(sourceLabel)}'}-to-${'${safeFileStem(morphLabel || "morph")}'}-${'${rendererMode}'}.${'${result.extension}'}\`\n        : \`${'${safeFileStem(sourceLabel)}'}-${'${rendererMode}'}-${'${animationKind}'}.${'${result.extension}'}\`;`,
  `      const animationKind = animateCamera ? animateMotion ? \`${'${motionMode}'}-camera-motion\` : "camera-motion" : \`${'${motionMode}'}-motion\`;\n      const compositeSuffix = independentSourceComposition ? "-composite" : "";\n      const fileName = animateMorph\n        ? \`${'${safeFileStem(sourceLabel)}'}-to-${'${safeFileStem(morphLabel || "morph")}'}-${'${rendererMode}'}${'${compositeSuffix}'}.${'${result.extension}'}\`\n        : \`${'${safeFileStem(sourceLabel)}'}-${'${rendererMode}'}-${'${animationKind}'}${'${compositeSuffix}'}.${'${result.extension}'}\`;`,
);

replaceExact(
  "enable layered animation export",
  `    && animationCapability.supported\n    && !secondaryRaster\n    && !animationExporting;`,
  `    && animationCapability.supported\n    && !animationExporting;`,
);

replaceExact(
  "animation inspector copy",
  `isVideoSource ? t("export.videoLongExportLater") : secondaryRaster ? t("export.layerAnimationLater") : animationExportError ??`,
  `isVideoSource ? t("export.videoLongExportLater") : animationExportError ??`,
);

writeFileSync(path, source);
