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
});
