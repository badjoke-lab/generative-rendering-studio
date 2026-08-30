from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))

main = "apps/web/src/main.tsx"
replace_once(
    main,
    '  const [videoBlendMode, setVideoBlendMode] = useState<VideoLayerBlendMode>("normal");',
    '  const [videoBlendMode, setVideoBlendMode] = useState<VideoLayerBlendMode>("normal");\n  const [videoOriginalOnTop, setVideoOriginalOnTop] = useState(false);',
)
replace_once(
    main,
    '    setVideoOriginalOpacityKeyframesEnabled(false);\n    setVideoBlendMode("normal");',
    '    setVideoOriginalOpacityKeyframesEnabled(false);\n    setVideoBlendMode("normal");\n    setVideoOriginalOnTop(false);',
)
replace_once(
    main,
    '''    const exportCanvas = isVideoComposite && originalUnderlayCanvas.current
      ? composeCanvasStack([
          { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },
          { canvas, blendMode: videoBlendMode },
        ])
      : canvas;''',
    '''    const exportCanvas = isVideoComposite && originalUnderlayCanvas.current
      ? composeCanvasStack(videoOriginalOnTop
        ? [
            { canvas, blendMode: videoBlendMode },
            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },
          ]
        : [
            { canvas: originalUnderlayCanvas.current, opacity: effectiveVideoOriginalOpacity, blendMode: "normal" },
            { canvas, blendMode: videoBlendMode },
          ])
      : canvas;''',
)
replace_once(
    main,
    'originalOpacity={effectiveVideoOriginalOpacity} transformedBlendMode={videoBlendMode}',
    'originalOpacity={effectiveVideoOriginalOpacity} originalOnTop={videoOriginalOnTop} transformedBlendMode={videoBlendMode}',
)
replace_once(
    main,
    '''          originalOpacity={effectiveVideoOriginalOpacity}
          originalOpacityDisabled={videoOriginalOpacityKeyframesEnabled}
          transformedBlendMode={videoBlendMode}''',
    '''          originalOpacity={effectiveVideoOriginalOpacity}
          originalOpacityDisabled={videoOriginalOpacityKeyframesEnabled}
          originalOnTop={videoOriginalOnTop}
          transformedBlendMode={videoBlendMode}''',
)
replace_once(
    main,
    '''            opacity: t("layer.opacity"),
            blend: t("layer.blend"),
            normal: t("layer.normal"),''',
    '''            opacity: t("layer.opacity"),
            blend: t("layer.blend"),
            order: t("layer.order"),
            originalOnTop: t("layer.originalOnTop"),
            transformedOnTop: t("layer.transformedOnTop"),
            normal: t("layer.normal"),''',
)
replace_once(
    main,
    '''          onOriginalVisibleChange={setVideoCompositeOriginal}
          onOriginalOpacityChange={setVideoOriginalOpacity}
          onTransformedBlendModeChange={setVideoBlendMode}''',
    '''          onOriginalVisibleChange={setVideoCompositeOriginal}
          onOriginalOpacityChange={setVideoOriginalOpacity}
          onOriginalOnTopChange={setVideoOriginalOnTop}
          onTransformedBlendModeChange={setVideoBlendMode}''',
)

replace_once(
    "apps/web/src/i18n/locales/en.ts",
    '  "layer.blend": "Blend mode",',
    '  "layer.blend": "Blend mode",\n  "layer.order": "Stack order",\n  "layer.originalOnTop": "Original on top",\n  "layer.transformedOnTop": "Transformed on top",',
)
replace_once(
    "apps/web/src/i18n/locales/ja.ts",
    '  "layer.blend": "合成モード",',
    '  "layer.blend": "合成モード",\n  "layer.order": "重なり順",\n  "layer.originalOnTop": "元動画を上",\n  "layer.transformedOnTop": "変換レイヤーを上",',
)

test_path = Path("tests/browser/stage5-video-layers.spec.ts")
test_text = test_path.read_text()
addition = r'''

test("webkit second-browser critical: Stage 5 video Layer order controls preview and still export order", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await loadVideoLayerScene(page);
  await page.getByRole("button", { name: "Show original under transform" }).click();
  await page.getByLabel("Original opacity").fill("45");

  const order = page.getByLabel("Stack order");
  await expect(order).toHaveValue("transformed-top");
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-layer-order", "transformed-top");
  await order.selectOption("original-top");
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-layer-order", "original-top");
  await expect(page.locator('[data-video-layer="original"]')).toHaveCSS("z-index", "2");
  await expect(page.locator('[data-video-layer="transformed"]')).toHaveCSS("z-index", "1");

  const rows = page.locator('[data-stage5-layer-stack="video"] .stage5-layer-row');
  await expect(rows.nth(0)).toHaveAttribute("data-layer-id", "video-transformed");
  await expect(rows.nth(1)).toHaveAttribute("data-layer-id", "video-original");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stage5-layer-source-webm-point-composite.png");
  const outputPath = `${outputDir}/stage5-layer-order-${download.suggestedFilename()}`;
  await download.saveAs(outputPath);
  const bytes = readFileSync(outputPath);
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.screenshot({ path: `${evidenceDir}/stage5-video-layer-order-original-top-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByLabel("重なり順")).toHaveValue("original-top");
  await page.screenshot({ path: `${evidenceDir}/stage5-video-layer-order-original-top-1440x700-ja.png`, fullPage: true });
});

test("Stage 5 video Layer order control remains usable on mobile", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile layout evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await loadVideoLayerScene(page);
  await page.getByRole("button", { name: "Show original under transform" }).click();
  await page.getByLabel("Stack order").selectOption("original-top");
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-layer-order", "original-top");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${evidenceDir}/stage5-video-layer-order-original-top-390x844-en.png`, fullPage: true });
});
'''
if "Stage 5 video Layer order controls preview and still export order" in test_text:
    raise SystemExit("video layer order tests already present")
test_path.write_text(test_text + addition)
