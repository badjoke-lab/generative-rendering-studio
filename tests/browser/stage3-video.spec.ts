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
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement, lumaThreshold: number) => {
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

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stage3-moving-square-webm-original.png");
});
