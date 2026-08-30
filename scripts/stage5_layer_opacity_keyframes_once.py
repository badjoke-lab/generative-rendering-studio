from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


main = "apps/web/src/main.tsx"
replace_once(main,
    '  createMorphMapping,\n  createMotionStrengthTrack,',
    '  createLayerOpacityTrack,\n  createMorphMapping,\n  createMotionStrengthTrack,')
replace_once(main,
    '  sampleMotionStrengthTrack,\n  sampleRasterToPointField,',
    '  sampleLayerOpacityTrack,\n  sampleMotionStrengthTrack,\n  sampleRasterToPointField,')
replace_once(main,
    '  const [videoOriginalOpacity, setVideoOriginalOpacity] = useState(0.55);\n  const [videoBlendMode, setVideoBlendMode] = useState<VideoLayerBlendMode>("normal");',
    '  const [videoOriginalOpacity, setVideoOriginalOpacity] = useState(0.55);\n  const [videoOriginalOpacityKeyframesEnabled, setVideoOriginalOpacityKeyframesEnabled] = useState(false);\n  const [videoOriginalOpacityStart, setVideoOriginalOpacityStart] = useState(0.15);\n  const [videoOriginalOpacityEnd, setVideoOriginalOpacityEnd] = useState(0.85);\n  const [videoOriginalOpacityEasing, setVideoOriginalOpacityEasing] = useState<KeyframeEasing>("ease-in-out");\n  const [videoBlendMode, setVideoBlendMode] = useState<VideoLayerBlendMode>("normal");')
replace_once(main,
    '    setVideoCompositeOriginal(false);\n    setVideoBlendMode("normal");',
    '    setVideoCompositeOriginal(false);\n    setVideoOriginalOpacityKeyframesEnabled(false);\n    setVideoBlendMode("normal");')
replace_once(main,
    '  const videoRoleSuffix = `${hasVideoTexture ? ` · ${t("preview.videoTextured")}` : ""}${hasVideoMask ? ` · ${t("preview.videoMasked")}` : ""}${hasVideoAnalysis ? ` · ${t("preview.videoAnalyzed")}` : ""}`;\n  const motionStrengthTrack = useMemo(',
    '  const videoRoleSuffix = `${hasVideoTexture ? ` · ${t("preview.videoTextured")}` : ""}${hasVideoMask ? ` · ${t("preview.videoMasked")}` : ""}${hasVideoAnalysis ? ` · ${t("preview.videoAnalyzed")}` : ""}`;\n  const videoOriginalOpacityTrack = useMemo(\n    () => createLayerOpacityTrack("video-original-opacity", "video-original", [\n      createNumericKeyframe(0, videoOriginalOpacityStart, videoOriginalOpacityEasing),\n      createNumericKeyframe(Math.max(0.001, videoDuration), videoOriginalOpacityEnd),\n    ]),\n    [videoDuration, videoOriginalOpacityEasing, videoOriginalOpacityEnd, videoOriginalOpacityStart],\n  );\n  const videoOriginalOpacityAutomationActive =\n    isVideoComposite && videoOriginalOpacityKeyframesEnabled && videoDuration > 0;\n  const effectiveVideoOriginalOpacity = videoOriginalOpacityAutomationActive\n    ? sampleLayerOpacityTrack(videoOriginalOpacityTrack, videoTime) ?? videoOriginalOpacity\n    : videoOriginalOpacity;\n  const motionStrengthTrack = useMemo(')
replace_once(main,
    '{ canvas: originalUnderlayCanvas.current, opacity: videoOriginalOpacity, blendMode: "normal" },',
    '{ canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },')

p = Path(main)
text = p.read_text()
old = 'originalOpacity={videoOriginalOpacity}'
if text.count(old) != 2:
    raise SystemExit(f"expected 2 originalOpacity props, found {text.count(old)}")
text = text.replace(old, 'originalOpacity={effectiveVideoOriginalOpacity}')
p.write_text(text)

replace_once(main,
    '          originalOpacity={effectiveVideoOriginalOpacity}\n          transformedBlendMode={videoBlendMode}',
    '          originalOpacity={effectiveVideoOriginalOpacity}\n          originalOpacityDisabled={videoOriginalOpacityKeyframesEnabled}\n          transformedBlendMode={videoBlendMode}')
replace_once(main,
    '          onTransformedBlendModeChange={setVideoBlendMode}\n        />}\n        <section className="inspector-section guided-section">',
    '''          onTransformedBlendModeChange={setVideoBlendMode}
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
        <section className="inspector-section guided-section">''')

panel = "apps/web/src/studio/VideoLayerStackPanel.tsx"
replace_once(panel,
    '  originalOpacity,\n  transformedBlendMode,',
    '  originalOpacity,\n  originalOpacityDisabled = false,\n  transformedBlendMode,')
replace_once(panel,
    '  originalOpacity: number;\n  transformedBlendMode: VideoLayerBlendMode;',
    '  originalOpacity: number;\n  originalOpacityDisabled?: boolean;\n  transformedBlendMode: VideoLayerBlendMode;')
replace_once(panel,
    '          disabled={disabled || !originalVisible}',
    '          disabled={disabled || originalOpacityDisabled || !originalVisible}')

replace_once("apps/web/src/i18n/locales/en.ts",
    '  "timeline.step": "Step",',
    '  "timeline.step": "Step",\n  "timeline.layerOpacity": "Original Layer Opacity",\n  "timeline.layerOpacityHint": "Animate the original video layer opacity against the video clock. Play or scrub the video to preview it.",\n  "timeline.layerOpacityAnimate": "Animate opacity",\n  "timeline.layerOpacityToggle": "Toggle Original layer opacity keyframes",\n  "timeline.startOpacity": "Start opacity",\n  "timeline.endOpacity": "End opacity",\n  "timeline.layerOpacityEasing": "Opacity easing",\n  "timeline.currentOpacity": "Current opacity",')
replace_once("apps/web/src/i18n/locales/ja.ts",
    '  "timeline.step": "ステップ",',
    '  "timeline.step": "ステップ",\n  "timeline.layerOpacity": "元動画レイヤーの濃さ",\n  "timeline.layerOpacityHint": "元動画レイヤーの濃さを動画の時間に合わせて変化させます。動画を再生またはシークすると確認できます。",\n  "timeline.layerOpacityAnimate": "濃さをキーフレーム化",\n  "timeline.layerOpacityToggle": "元動画レイヤーの濃さキーフレーム切替",\n  "timeline.startOpacity": "開始時の濃さ",\n  "timeline.endOpacity": "終了時の濃さ",\n  "timeline.layerOpacityEasing": "濃さのイージング",\n  "timeline.currentOpacity": "現在の濃さ",')

test_path = Path("tests/browser/stage5-video-layers.spec.ts")
test_text = test_path.read_text()
addition = r'''

test("webkit second-browser critical: Stage 5 Original layer opacity keyframes follow the video clock", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await loadVideoLayerScene(page);

  await page.getByRole("button", { name: "Show original under transform" }).click();
  const manualOpacity = page.getByLabel("Original opacity");
  await expect(manualOpacity).toBeEnabled();

  const keyframeToggle = page.getByRole("button", { name: "Toggle Original layer opacity keyframes" });
  await expect(keyframeToggle).toBeVisible();
  await keyframeToggle.click();
  await expect(keyframeToggle).toHaveAttribute("aria-pressed", "true");
  await expect(manualOpacity).toBeDisabled();

  await page.getByLabel("Start opacity").fill("10");
  await page.getByLabel("End opacity").fill("90");
  await page.getByLabel("Opacity easing").selectOption("linear");

  const videoPosition = page.getByLabel("Video position");
  await videoPosition.fill("0");
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.1");
  await videoPosition.fill("100");
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.9");

  await page.screenshot({ path: `${evidenceDir}/stage5-layer-opacity-keyframes-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByRole("heading", { name: "元動画レイヤーの濃さ", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "元動画レイヤーの濃さキーフレーム切替" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${evidenceDir}/stage5-layer-opacity-keyframes-1440x700-ja.png`, fullPage: true });
});

test("Stage 5 Original layer opacity keyframes fit the mobile inspector without horizontal overflow", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile layout evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await loadVideoLayerScene(page);
  await page.getByRole("button", { name: "Show original under transform" }).click();
  await page.getByRole("button", { name: "Toggle Original layer opacity keyframes" }).click();
  await expect(page.locator('[data-stage5-layer-opacity-keyframes="true"]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${evidenceDir}/stage5-layer-opacity-keyframes-390x844-en.png`, fullPage: true });
});
'''
if "Stage 5 Original layer opacity keyframes follow the video clock" in test_text:
    raise SystemExit("layer opacity keyframe test already present")
test_path.write_text(test_text + addition)
