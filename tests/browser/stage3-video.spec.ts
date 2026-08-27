import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

// Generated with ffmpeg: 160×100, 10 fps, 2.0 s VP9 WebM.
// A 30×30 white square moves left-to-right over a black background.
const movingSquareWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(),
  "base64",
);

// Generated with ffmpeg: 160×100, 10 fps, 2.0 s VP9 WebM.
// One half of every frame is white and the other half is black so mask and
// inverted-mask output can be distinguished deterministically.
const leftHalfMaskWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-left-half-mask.webm.base64", "utf8").trim(),
  "base64",
);

// Generated with ffmpeg: 160×100, 10 fps, 4.0 s VP9 WebM.
// The first half is red and the second half blue. Because the main fixture is
// only 2.0 s, seeking both to 20%/80% proves normalized progress synchronization
// rather than accidental absolute-time synchronization.
const redBlueTextureWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-red-blue-texture.webm.base64", "utf8").trim(),
  "base64",
);

async function brightCentroid(page: Page, threshold = 80) {
  return page.locator(".preview-frame canvas").first().evaluate((canvas: HTMLCanvasElement, lumaThreshold: number) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("centroid-canvas-unavailable");
    ctx.drawImage(canvas, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let count = 0;
    let sumX = 0;
    for (let y = 0; y < copy.height; y += 1) {
      for (let x = 0; x < copy.width; x += 1) {
        const offset = (y * copy.width + x) * 4;
        const luma = pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
        if (pixels[offset + 3] > 0 && luma >= lumaThreshold) {
          count += 1;
          sumX += x;
        }
      }
    }
    return {
      count,
      x: count ? sumX / count : -1,
      width: copy.width,
      height: copy.height,
    };
  }, threshold);
}

async function colorDominance(page: Page) {
  return page.locator(".preview-frame canvas").first().evaluate((canvas: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("color-canvas-unavailable");
    ctx.drawImage(canvas, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let red = 0;
    let blue = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const r = pixels[offset] ?? 0;
      const g = pixels[offset + 1] ?? 0;
      const b = pixels[offset + 2] ?? 0;
      if (r > 70 && r > g * 1.35 && r > b * 1.35) red += 1;
      if (b > 70 && b > g * 1.35 && b > r * 1.35) blue += 1;
    }
    return { red, blue };
  });
}

async function auxiliaryVideoProgress(page: Page, index = 1) {
  return page.locator("video.source-video-element").nth(index).evaluate((video: HTMLVideoElement) => (
    Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0
  ));
}

test("imports a browser-decodable video and transforms changing frames", async ({ page }) => {
  await page.goto("/");
  const videoInput = page.locator('input[data-source-kind="video"]');
  await videoInput.setInputFiles({ name: "stage3-moving-square.webm", mimeType: "video/webm", buffer: movingSquareWebm });

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".asset-meta strong").filter({ hasText: "stage3-moving-square.webm" })).toBeVisible();
  await expect(page.locator(".asset-meta")).toContainText("Video");
  await expect(page.locator(".source-panel .stage3-note")).toContainText("Video-to-source Morph is not part of this Stage 3 baseline");

  const preview = page.locator(".preview-frame");

  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".canvas-status")).toContainText("Original Mode");
  const originalStart = await brightCentroid(page, 200);
  expect(originalStart.count).toBeGreaterThan(100);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-original-start.png` });

  await page.getByRole("button", { name: "Glyph", exact: true }).click();
  await page.getByLabel("Character set").selectOption("symbols");
  const glyphStart = await brightCentroid(page, 60);
  expect(glyphStart.count).toBeGreaterThan(20);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-glyph-symbols-start.png` });

  await page.getByRole("button", { name: "Point", exact: true }).click();
  const pointStart = await brightCentroid(page, 80);
  expect(pointStart.count).toBeGreaterThan(30);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-start.png` });

  await page.getByLabel("Play video").click();
  await page.waitForTimeout(850);
  await page.getByLabel("Pause video").click();
  const position = Number(await page.getByLabel("Video position").inputValue());
  expect(position).toBeGreaterThan(15);
  const pointLater = await brightCentroid(page, 80);
  expect(pointLater.count).toBeGreaterThan(30);
  expect(pointLater.x).toBeGreaterThan(pointStart.x + pointStart.width * 0.08);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-playing.png` });

  await page.getByLabel("Video position").fill("80");
  await expect.poll(async () => Number(await page.getByLabel("Video position").inputValue())).toBeGreaterThanOrEqual(79);
  await page.waitForTimeout(200);
  const pointSeeked = await brightCentroid(page, 80);
  expect(pointSeeked.count).toBeGreaterThan(30);
  expect(pointSeeked.x).toBeGreaterThan(pointLater.x + pointLater.width * 0.08);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-seek-80.png` });

  await page.getByRole("button", { name: "Glyph", exact: true }).click();
  await page.getByLabel("Character set").selectOption("symbols");
  const glyphSeeked = await brightCentroid(page, 60);
  expect(glyphSeeked.count).toBeGreaterThan(20);
  expect(glyphSeeked.x).toBeGreaterThan(glyphStart.x + glyphStart.width * 0.4);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-glyph-symbols-seek-80.png` });

  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".canvas-status")).toContainText("Original Mode");
  const originalSeeked = await brightCentroid(page, 200);
  expect(originalSeeked.count).toBeGreaterThan(100);
  expect(originalSeeked.x).toBeGreaterThan(originalStart.x + originalStart.width * 0.4);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-original-seek-80.png` });

  const originalDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const originalDownload = await originalDownloadPromise;
  expect(originalDownload.suggestedFilename()).toContain("stage3-moving-square-webm-original.png");

  await page.getByRole("button", { name: "Point", exact: true }).click();
  await page.getByRole("button", { name: "Show original under transform" }).click();
  await expect(page.locator('[data-video-composite="true"]')).toBeVisible();
  await expect(page.locator(".preview-frame canvas")).toHaveCount(2);
  await page.getByLabel("Original opacity").fill("45");
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.45");
  await expect(page.locator(".canvas-meta")).toContainText("Original + transformed");
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-composite-seek-80.png` });

  const compositeDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const compositeDownload = await compositeDownloadPromise;
  expect(compositeDownload.suggestedFilename()).toContain("stage3-moving-square-webm-point-composite.png");
  const compositePath = await compositeDownload.path();
  expect(compositePath).not.toBeNull();
  const compositeBytes = readFileSync(compositePath!);
  expect(compositeBytes.length).toBeGreaterThan(1000);
  expect(Array.from(compositeBytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  await page.getByRole("button", { name: "Show original under transform" }).click();
  await expect(page.locator('[data-video-composite="true"]')).toHaveCount(0);
  await expect(page.locator(".preview-frame canvas")).toHaveCount(1);

  const maskVideoInput = page.locator('input[data-source-kind="video-mask"]');
  await maskVideoInput.setInputFiles({ name: "stage3-left-half-mask.webm", mimeType: "video/webm", buffer: leftHalfMaskWebm });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-source-role="mask"]')).toContainText("stage3-left-half-mask.webm");
  await expect(page.locator(".canvas-meta")).toContainText("Mask video active");
  await expect(page.getByLabel("Mask strength")).toHaveValue("100");
  await expect(page.getByRole("button", { name: "Invert mask" })).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => auxiliaryVideoProgress(page, 1)).toBeGreaterThan(0.72);
  await expect.poll(() => auxiliaryVideoProgress(page, 1)).toBeLessThan(0.88);
  await page.waitForTimeout(150);

  const maskedNormal = await brightCentroid(page, 80);
  await page.getByRole("button", { name: "Invert mask" }).click();
  await expect(page.getByRole("button", { name: "Invert mask" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  const maskedInverted = await brightCentroid(page, 80);
  const strongerMaskCount = Math.max(maskedNormal.count, maskedInverted.count);
  const weakerMaskCount = Math.min(maskedNormal.count, maskedInverted.count);
  expect(strongerMaskCount).toBeGreaterThan(30);
  expect(weakerMaskCount).toBeLessThan(strongerMaskCount * 0.35);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-mask-inverted-seek-80.png` });
  await page.screenshot({ path: `${evidenceDir}/stage3-video-mask-ui-seek-80.png`, fullPage: true });

  await page.getByLabel("Mask strength").fill("0");
  await page.waitForTimeout(100);
  const zeroStrength = await brightCentroid(page, 80);
  expect(zeroStrength.count).toBeGreaterThan(30);
  expect(zeroStrength.count).toBeGreaterThan(pointSeeked.count * 0.45);

  await page.getByLabel("Mask strength").fill("100");
  await page.getByRole("button", { name: "Invert mask" }).click();
  await expect(page.getByRole("button", { name: "Invert mask" })).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Video position").fill("20");
  await expect.poll(async () => Number(await page.getByLabel("Video position").inputValue())).toBeLessThanOrEqual(21);
  await expect.poll(() => auxiliaryVideoProgress(page, 1)).toBeGreaterThan(0.12);
  await expect.poll(() => auxiliaryVideoProgress(page, 1)).toBeLessThan(0.28);
  await page.waitForTimeout(150);
  const syncedVisible = await brightCentroid(page, 80);
  expect(syncedVisible.count).toBeGreaterThan(30);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-mask-synced-seek-20.png` });

  await page.getByRole("button", { name: "Remove mask video" }).click();
  await expect(page.locator('[data-source-role="mask"]')).toHaveCount(0);
  await expect(page.getByLabel("Mask strength")).toHaveCount(0);
  await expect(page.locator(".canvas-meta")).not.toContainText("Mask video active");

  const textureVideoInput = page.locator('input[data-source-kind="video-texture"]');
  await textureVideoInput.setInputFiles({ name: "stage3-red-blue-texture.webm", mimeType: "video/webm", buffer: redBlueTextureWebm });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-source-role="texture"]')).toContainText("stage3-red-blue-texture.webm");
  await expect(page.locator(".canvas-meta")).toContainText("Texture video active");
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeGreaterThan(0.12);
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeLessThan(0.28);
  await page.waitForTimeout(150);
  const textureAt20 = await colorDominance(page);
  expect(textureAt20.red).toBeGreaterThan(20);
  expect(textureAt20.red).toBeGreaterThan(textureAt20.blue * 4);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-texture-synced-seek-20.png` });

  await page.getByLabel("Video position").fill("80");
  await expect.poll(async () => Number(await page.getByLabel("Video position").inputValue())).toBeGreaterThanOrEqual(79);
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeGreaterThan(0.72);
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeLessThan(0.88);
  await page.waitForTimeout(150);
  const textureAt80 = await colorDominance(page);
  expect(textureAt80.blue).toBeGreaterThan(20);
  expect(textureAt80.blue).toBeGreaterThan(textureAt80.red * 4);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-texture-synced-seek-80.png` });
  await page.screenshot({ path: `${evidenceDir}/stage3-video-texture-ui-seek-80.png`, fullPage: true });

  await page.getByRole("button", { name: "Remove texture video" }).click();
  await expect(page.locator('[data-source-role="texture"]')).toHaveCount(0);
  await expect(page.locator(".canvas-meta")).not.toContainText("Texture video active");
});