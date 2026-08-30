import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

const movingSquareWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(),
  "base64",
);

async function loadVideoLayerScene(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({
    name: "stage5-layer-source.webm",
    mimeType: "video/webm",
    buffer: movingSquareWebm,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Point", exact: true }).click();
  await expect(page.locator('[data-stage5-layer-stack="video"]')).toBeVisible();
}

test("webkit second-browser critical: Stage 5 video Layers control preview blend and still export", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await loadVideoLayerScene(page);

  const layerPanel = page.locator('[data-stage5-layer-stack="video"]');
  await expect(layerPanel.getByRole("heading", { name: "Layers", exact: true })).toBeVisible();
  await expect(layerPanel).toContainText("Original");
  await expect(layerPanel).toContainText("Transformed");

  const originalToggle = page.getByRole("button", { name: "Show original under transform" });
  await expect(originalToggle).toHaveAttribute("aria-pressed", "false");
  await originalToggle.click();
  await expect(originalToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-video-composite="true"]')).toBeVisible();
  await expect(page.locator(".preview-frame canvas")).toHaveCount(2);

  await page.getByLabel("Original opacity").fill("55");
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.55");

  const blend = page.getByLabel("Blend mode: Transformed");
  await blend.selectOption("multiply");
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-blend-mode", "multiply");
  await expect(page.locator(".video-composite-overlay")).toHaveCSS("mix-blend-mode", "multiply");
  await page.screenshot({ path: `${evidenceDir}/stage5-video-layers-multiply-1440x700-en.png`, fullPage: true });

  await blend.selectOption("screen");
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-blend-mode", "screen");
  await expect(page.locator(".video-composite-overlay")).toHaveCSS("mix-blend-mode", "screen");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stage5-layer-source-webm-point-composite.png");
  const outputPath = `${outputDir}/stage5-video-layers-${download.suggestedFilename()}`;
  await download.saveAs(outputPath);
  const bytes = readFileSync(outputPath);
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  await page.getByLabel("Language").selectOption("ja");
  await expect(layerPanel.getByRole("heading", { name: "レイヤー", exact: true })).toBeVisible();
  await expect(layerPanel).toContainText("元動画");
  await expect(layerPanel).toContainText("変換レイヤー");
  await expect(page.getByLabel("合成モード: 変換レイヤー")).toHaveValue("screen");
  await page.screenshot({ path: `${evidenceDir}/stage5-video-layers-screen-1440x700-ja.png`, fullPage: true });
});

test("Stage 5 video Layers remain usable without horizontal overflow on mobile", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile layout evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await loadVideoLayerScene(page);

  const layerPanel = page.locator('[data-stage5-layer-stack="video"]');
  await expect(layerPanel).toBeVisible();
  await page.getByRole("button", { name: "Show original under transform" }).click();
  await page.getByLabel("Original opacity").fill("40");
  await page.getByLabel("Blend mode: Transformed").selectOption("multiply");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-video-composite="true"]')).toHaveAttribute("data-video-blend-mode", "multiply");
  await page.screenshot({ path: `${evidenceDir}/stage5-video-layers-390x844-en.png`, fullPage: true });
});


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
