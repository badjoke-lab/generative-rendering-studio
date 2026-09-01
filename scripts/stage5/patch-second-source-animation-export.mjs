import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "apps/web/src/main.tsx";
const selfPath = "scripts/stage5/patch-second-source-animation-export.mjs";
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

writeFileSync(".github/workflows/ci.yml", `name: ci\n\non:\n  push:\n    branches: [main]\n  pull_request:\n  workflow_dispatch:\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: pnpm install --no-frozen-lockfile\n      - run: pnpm typecheck\n      - run: pnpm test\n      - run: pnpm build\n      - name: Install Chromium for browser smoke\n        run: pnpm exec playwright install --with-deps chromium\n      - name: Run Development Preview Chromium smoke\n        run: pnpm test:browser --project=chromium\n      - name: Install WebKit for focused second-browser check\n        run: pnpm exec playwright install --with-deps webkit\n      - name: Run focused WebKit release-candidate check\n        run: pnpm test:browser --project=webkit --grep "webkit second-browser critical"\n      - name: Upload Development Preview visual and output evidence\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: preview-evidence-\${{ github.sha }}\n          path: preview-evidence\n          if-no-files-found: warn\n          retention-days: 14\n      - name: Upload Playwright diagnostics\n        if: failure()\n        uses: actions/upload-artifact@v4\n        with:\n          name: playwright-diagnostics-\${{ github.sha }}\n          path: test-results\n          if-no-files-found: ignore\n          retention-days: 7\n      - name: Upload browser candidate\n        uses: actions/upload-artifact@v4\n        with:\n          name: browser-candidate-\${{ github.sha }}\n          path: apps/web/dist\n          if-no-files-found: error\n          retention-days: 14\n`);
unlinkSync(selfPath);
