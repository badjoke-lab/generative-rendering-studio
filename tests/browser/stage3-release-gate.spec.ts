import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

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
    return { count, x: count ? sumX / count : -1, width: copy.width };
  }, threshold);
}

async function loadMovingSquare(page: Page) {
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({
    name: "stage3-moving-square.webm",
    mimeType: "video/webm",
    buffer: movingSquareWebm,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".asset-meta strong").filter({ hasText: "stage3-moving-square.webm" })).toBeVisible();
  await page.getByRole("button", { name: "Point", exact: true }).click();
  await expect(page.locator(".canvas-status")).toContainText("Point Mode");
}

test("Stage 3 release coherence keeps a moving subject stable across normalized seeks", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "The retained multi-position release evidence is captured in Chromium");
  await loadMovingSquare(page);

  const timeline = page.getByLabel("Video position");
  const positions = [5, 25, 50, 75, 95];
  const samples: Array<{ progress: number; count: number; x: number; width: number }> = [];

  for (const progress of positions) {
    await timeline.fill(String(progress));
    await expect.poll(async () => Math.abs(Number(await timeline.inputValue()) - progress)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(140);
    const sample = await brightCentroid(page, 80);
    expect(sample.count).toBeGreaterThan(25);
    samples.push({ progress, ...sample });
    await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/stage3-release-coherence-${progress}.png` });
  }

  for (let index = 1; index < samples.length; index += 1) {
    expect(samples[index].x).toBeGreaterThan(samples[index - 1].x + samples[index].width * 0.04);
  }

  const counts = samples.map((sample) => sample.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  expect(maxCount / minCount).toBeLessThan(1.35);

  await page.screenshot({ path: `${evidenceDir}/stage3-release-coherence-ui.png`, fullPage: true });
});

test("webkit second-browser critical Stage 3 video import seek and still-export path", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "This Stage 3 second-browser gate is reserved for the WebKit project");
  await loadMovingSquare(page);

  const timeline = page.getByLabel("Video position");
  await timeline.fill("80");
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThanOrEqual(79);
  await page.waitForTimeout(180);

  const transformed = await brightCentroid(page, 70);
  expect(transformed.count).toBeGreaterThan(20);
  expect(transformed.x).toBeGreaterThan(transformed.width * 0.55);
  await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/webkit-stage3-video-critical.png` });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  const outputPath = `${outputDir}/webkit-stage3-${download.suggestedFilename()}`;
  await download.saveAs(outputPath);
  const bytes = readFileSync(outputPath);
  expect(bytes.byteLength).toBeGreaterThan(500);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
});
