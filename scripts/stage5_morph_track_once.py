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

# Core: formal Morph progress track.
timeline = "packages/core/src/timeline.ts"
replace_once(timeline,
'''export interface MotionStrengthTrack {\n  readonly id: string;\n  readonly kind: "motion-strength";\n  readonly keyframes: readonly NumericKeyframe[];\n}\n\nexport interface CameraTrack {''',
'''export interface MotionStrengthTrack {\n  readonly id: string;\n  readonly kind: "motion-strength";\n  readonly keyframes: readonly NumericKeyframe[];\n}\n\nexport interface MorphProgressTrack {\n  readonly id: string;\n  readonly kind: "morph-progress";\n  readonly keyframes: readonly NumericKeyframe[];\n}\n\nexport interface CameraTrack {''')
replace_once(timeline,
'export type TimelineTrack = LayerOpacityTrack | MotionStrengthTrack | CameraTrack;',
'export type TimelineTrack = LayerOpacityTrack | MotionStrengthTrack | MorphProgressTrack | CameraTrack;')
replace_once(timeline,
'''export function sampleMotionStrengthTrack(track: MotionStrengthTrack, time: number): number | null {\n  const sampled = sampleNumericKeyframes(track.keyframes, time);\n  return sampled === null ? null : clampMotionStrength(sampled);\n}\n\nexport function createCameraTrack(''',
'''export function sampleMotionStrengthTrack(track: MotionStrengthTrack, time: number): number | null {\n  const sampled = sampleNumericKeyframes(track.keyframes, time);\n  return sampled === null ? null : clampMotionStrength(sampled);\n}\n\nexport function createMorphProgressTrack(\n  id: string,\n  keyframes: readonly NumericKeyframe[] = [],\n): MorphProgressTrack {\n  return {\n    id,\n    kind: "morph-progress",\n    keyframes: normalizeNumericKeyframes(\n      keyframes.map((keyframe) => ({ ...keyframe, value: clampUnit(keyframe.value) })),\n    ),\n  };\n}\n\nexport function sampleMorphProgressTrack(track: MorphProgressTrack, time: number): number | null {\n  const sampled = sampleNumericKeyframes(track.keyframes, time);\n  return sampled === null ? null : clampUnit(sampled);\n}\n\nexport function createCameraTrack(''')

# Core tests.
test = "packages/core/src/timeline.test.ts"
replace_once(test, "  createMotionStrengthTrack,\n", "  createMorphProgressTrack,\n  createMotionStrengthTrack,\n")
replace_once(test, "  sampleMotionStrengthTrack,\n", "  sampleMorphProgressTrack,\n  sampleMotionStrengthTrack,\n")
replace_once(test,
'''  it("creates bounded Camera tracks and samples all channels on one playhead", () => {''',
'''  it("creates a bounded Morph progress track and samples it in timeline seconds", () => {\n    const track = createMorphProgressTrack("morph-main", [\n      createNumericKeyframe(0, -1),\n      createNumericKeyframe(4, 2),\n    ]);\n    expect(track.kind).toBe("morph-progress");\n    expect(track.keyframes.map(({ value }) => value)).toEqual([0, 1]);\n    expect(sampleMorphProgressTrack(track, 0)).toBe(0);\n    expect(sampleMorphProgressTrack(track, 2)).toBe(0.5);\n    expect(sampleMorphProgressTrack(track, 4)).toBe(1);\n    expect(sampleMorphProgressTrack(createMorphProgressTrack("empty"), 2)).toBeNull();\n  });\n\n  it("creates bounded Camera tracks and samples all channels on one playhead", () => {''')

# WebGL exposes actual applied morph progress for regression evidence.
webgl = "apps/web/src/webgl/WebGLPreview.tsx"
replace_once(webgl,
'  return <canvas ref={canvasRef} className="preview-canvas" data-camera-pan-x={cameraPanX.toFixed(3)} data-camera-pan-y={cameraPanY.toFixed(3)} data-camera-zoom={cameraZoom.toFixed(3)} data-camera-rotation={cameraRotation.toFixed(1)} />;',
'  return <canvas ref={canvasRef} className="preview-canvas" data-morph-progress={morphProgress.toFixed(3)} data-camera-pan-x={cameraPanX.toFixed(3)} data-camera-pan-y={cameraPanY.toFixed(3)} data-camera-zoom={cameraZoom.toFixed(3)} data-camera-rotation={cameraRotation.toFixed(1)} />;')

# App: Morph gets a formal track and shares the existing seconds-based timeline engine.
main = "apps/web/src/main.tsx"
replace_once(main, "  createMorphMapping,\n", "  createMorphMapping,\n  createMorphProgressTrack,\n")
replace_once(main, "  sampleMotionStrengthTrack,\n", "  sampleMorphProgressTrack,\n  sampleMotionStrengthTrack,\n")

replace_once(main,
'''  const easedProgress = applyMorphEasing(morphProgress, morphEasing);\n  const activeMorph = morphEnabled && morphPacked ? morphPacked : undefined;''',
'''  const activeMorph = morphEnabled && morphPacked ? morphPacked : undefined;''')

replace_once(main,
'''  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;\n  const cameraTrack = useMemo(''',
'''  const motionTimelineActive = motionKeyframesEnabled && motionMode !== "static" && !isVideoSource && !morphEnabled;\n  const morphProgressTrack = useMemo(\n    () => createMorphProgressTrack("morph-main", [\n      createNumericKeyframe(0, 0),\n      createNumericKeyframe(Math.max(0.001, morphDuration), 1),\n    ]),\n    [morphDuration],\n  );\n  const morphTimelineActive = Boolean(activeMorph) && !isVideoSource;\n  const cameraTrack = useMemo(''')
replace_once(main,
'''  const parameterTimelineActive = motionTimelineActive || cameraTimelineActive;\n  const parameterTimelineDuration = Math.max(0.001, motionTimelineActive ? motionDuration : 0, cameraTimelineActive ? cameraDuration : 0);\n  const effectiveMotionStrength = motionTimelineActive''',
'''  const parameterTimelineActive = motionTimelineActive || cameraTimelineActive || morphTimelineActive;\n  const parameterTimelineDuration = Math.max(\n    0.001,\n    motionTimelineActive ? motionDuration : 0,\n    cameraTimelineActive ? cameraDuration : 0,\n    morphTimelineActive ? morphDuration : 0,\n  );\n  const timelineMorphProgress = morphTimelineActive\n    ? sampleMorphProgressTrack(morphProgressTrack, motionTimelineTime) ?? morphProgress\n    : morphProgress;\n  const easedProgress = applyMorphEasing(timelineMorphProgress, morphEasing);\n  const effectiveMotionStrength = motionTimelineActive''')

# Remove Morph's separate RAF; common parameter RAF owns playback now.
regex_once(main,
r'''\n  useEffect\(\(\) => \{\n    if \(!morphPlaying \|\| !morphEnabled \|\| !morphPacked \|\| isVideoSource\) return;.*?\n  \}, \[isVideoSource, morphDuration, morphEnabled, morphPacked, morphPlaying\]\);\n''',
'\n')

# Export Morph via common timeline rather than raw progress animation.
replace_once(main,
'''    setMorphPlaying(false);\n    setMotionTimelinePlaying(false);\n    const animateParameterTimeline = !animateMorph && (animateCamera || (animateMotion && motionKeyframesEnabled));\n    if (animateParameterTimeline) setMotionTimelineTime(0);\n    if (animateMorph) {\n      setMorphEnabled(true);\n      setMorphProgress(0);\n    }''',
'''    setMorphPlaying(false);\n    setMotionTimelinePlaying(false);\n    const animateParameterTimeline = animateMorph || animateCamera || (animateMotion && motionKeyframesEnabled);\n    if (animateParameterTimeline) setMotionTimelineTime(0);\n    if (animateMorph) {\n      setMorphEnabled(true);\n      setMorphProgress(0);\n      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));\n    }''')
replace_once(main,
'''      const durationSeconds = animateMorph ? morphDuration : animateParameterTimeline ? parameterTimelineDuration : motionDuration;''',
'''      const durationSeconds = animateParameterTimeline\n        ? Math.max(0.001, animateMorph ? morphDuration : 0, animateCamera ? cameraDuration : 0, animateMotion && motionKeyframesEnabled ? motionDuration : 0)\n        : motionDuration;''')
replace_once(main,
'''        onProgress: animateMorph\n          ? setMorphProgress\n          : animateParameterTimeline\n            ? (progress) => setMotionTimelineTime(progress * parameterTimelineDuration)\n            : () => {},''',
'''        onProgress: animateParameterTimeline\n          ? (progress) => setMotionTimelineTime(progress * durationSeconds)\n          : () => {},''')
replace_once(main,
'''      if (animateMorph) setMorphProgress(1);\n      if (animateParameterTimeline) setMotionTimelineTime(parameterTimelineDuration);''',
'''      if (animateMorph) setMorphProgress(1);\n      if (animateParameterTimeline) setMotionTimelineTime(durationSeconds);''')

# Common transport now owns Morph playback too.
replace_once(main,
'''  const transportProgress = isVideoSource && videoDuration > 0\n    ? (videoTime / videoDuration) * 100\n    : parameterTimelineActive\n      ? (motionTimelineTime / parameterTimelineDuration) * 100\n      : morphProgress * 100;\n  const transportPlaying = isVideoSource ? videoPlaying : parameterTimelineActive ? motionTimelinePlaying : morphPlaying;''',
'''  const transportProgress = isVideoSource && videoDuration > 0\n    ? (videoTime / videoDuration) * 100\n    : parameterTimelineActive\n      ? (motionTimelineTime / parameterTimelineDuration) * 100\n      : morphProgress * 100;\n  const transportPlaying = isVideoSource ? videoPlaying : parameterTimelineActive ? motionTimelinePlaying : morphPlaying;''')
# play/stop/seek fallback remains for disabled Morph; active Morph now enters parameter branch automatically.

# Timeline metadata/labels explicitly identify Morph Track.
replace_once(main,
'data-timeline-mode={parameterTimelineActive ? cameraTimelineActive ? motionTimelineActive ? "camera+motion" : "camera" : "motion-strength" : isVideoSource ? "video" : morphEnabled ? "morph" : "idle"}',
'data-timeline-mode={parameterTimelineActive ? morphTimelineActive ? "morph-track" : cameraTimelineActive ? motionTimelineActive ? "camera+motion" : "camera" : "motion-strength" : isVideoSource ? "video" : "idle"}')
replace_once(main,
'{parameterTimelineActive ? cameraTimelineActive ? motionTimelineActive ? t("timeline.cameraAndMotion") : t("timeline.camera") : t("timeline.motionStrength") : isVideoComposite',
'{parameterTimelineActive ? morphTimelineActive ? t("timeline.morphTrack") : cameraTimelineActive ? motionTimelineActive ? t("timeline.cameraAndMotion") : t("timeline.camera") : t("timeline.motionStrength") : isVideoComposite')

# Morph panel: slider and local Play button drive the same common seconds playhead.
replace_once(main,
'''<label>{t("morph.progress")}<div className="range-row"><input type="range" min="0" max="100" value={Math.round(morphProgress * 100)} disabled={animationExporting} onChange={(e) => { setMorphPlaying(false); setMorphProgress(Number(e.target.value) / 100); }} /><output>{Math.round(morphProgress * 100)}%</output></div></label>''',
'''<label>{t("morph.progress")}<div className="range-row"><input aria-label={t("morph.progress")} type="range" min="0" max="100" value={Math.round(timelineMorphProgress * 100)} disabled={animationExporting} onChange={(e) => { const progress = Number(e.target.value) / 100; setMorphPlaying(false); setMotionTimelinePlaying(false); setMorphProgress(progress); if (morphTimelineActive) setMotionTimelineTime(progress * morphDuration); }} /><output>{Math.round(timelineMorphProgress * 100)}%</output></div></label>''')
replace_once(main,
'''<button className="source-add" disabled={animationExporting} onClick={() => { setMorphEnabled(true); if (morphProgress >= 1) setMorphProgress(0); setMorphPlaying((v) => !v); }}>{morphPlaying ? t("morph.stop") : t("morph.play")}</button>''',
'''<button className="source-add" disabled={animationExporting} onClick={() => { setMorphEnabled(true); setMorphPlaying(false); if (timelineMorphProgress >= 1) { setMorphProgress(0); setMotionTimelineTime(0); } setMotionTimelinePlaying((value) => !value); }}>{morphTimelineActive && motionTimelinePlaying ? t("morph.stop") : t("morph.play")}</button>''')

# Morph enable/disable resets common playhead deterministically.
replace_once(main,
'''onClick={() => { const next = !morphEnabled; setMorphEnabled(next); if (next && rendererMode === "original") setRendererMode("point"); }}''',
'''onClick={() => { const next = !morphEnabled; setMorphEnabled(next); setMotionTimelinePlaying(false); if (next) setMotionTimelineTime(morphProgress * morphDuration); else setMorphProgress(timelineMorphProgress); if (next && rendererMode === "original") setRendererMode("point"); }}''')

# Preview timecode already uses common timeline; expose Morph track label in locale.
en = "apps/web/src/i18n/locales/en.ts"
replace_once(en, '  "timeline.motionStrength": "Motion strength",', '  "timeline.motionStrength": "Motion strength",\n  "timeline.morphTrack": "Morph progress",')
ja = "apps/web/src/i18n/locales/ja.ts"
replace_once(ja, '  "timeline.motionStrength": "Motionの強さ",', '  "timeline.motionStrength": "Motionの強さ",\n  "timeline.morphTrack": "モーフ進行",')

# Browser regression and visual evidence.
Path("tests/browser/stage5-morph-track.spec.ts").write_text(r'''import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const sourceSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="45" cy="50" r="30" fill="white"/></svg>`);
const targetSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="100" y="20" width="40" height="60" fill="white"/></svg>`);

async function loadMorphPair(page: import("@playwright/test").Page) {
  await page.locator('input[data-source-kind="still"]').setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await page.locator('input[data-source-kind="morph"]').setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });
  await expect(page.locator(".asset-card")).toContainText(["source.svg", "target.svg"]);
}

test("Stage 5 Morph is a seconds-based Timeline track rather than a separate playback clock", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await loadMorphPair(page);

  const morph = page.locator("section.inspector-section").filter({ has: page.getByRole("heading", { name: "Morph", exact: true }) });
  await morph.locator("button.toggle").click();
  await morph.getByLabel("Easing").selectOption("linear");
  await morph.getByLabel("Duration").fill("2");

  const transport = page.locator(".transport-bar");
  const timeline = transport.locator('input[type="range"]');
  const canvas = page.locator(".preview-frame .preview-canvas");
  await expect(transport).toHaveAttribute("data-timeline-mode", "morph-track");

  await timeline.fill("0");
  await expect(canvas).toHaveAttribute("data-morph-progress", "0.000");
  await timeline.fill("50");
  await expect(canvas).toHaveAttribute("data-morph-progress", "0.500");
  await timeline.fill("100");
  await expect(canvas).toHaveAttribute("data-morph-progress", "1.000");

  await timeline.fill("0");
  await page.getByRole("button", { name: "Play keyframes" }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-morph-progress"))).toBeGreaterThan(0.02);
  await page.getByRole("button", { name: "Stop keyframes" }).click();

  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(transport).toContainText("モーフ進行");
  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-1440x700-ja.png`, fullPage: true });
});

test("Morph Track stays usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await loadMorphPair(page);
  const morph = page.locator("section.inspector-section").filter({ has: page.getByRole("heading", { name: "Morph", exact: true }) });
  await morph.locator("button.toggle").click();
  await expect(page.locator(".transport-bar")).toHaveAttribute("data-timeline-mode", "morph-track");
  const metrics = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-390x844-en.png`, fullPage: true });
});
''')
