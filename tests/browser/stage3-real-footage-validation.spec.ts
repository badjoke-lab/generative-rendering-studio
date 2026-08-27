import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence/stage3-real-footage";
mkdirSync(evidenceDir, { recursive: true });

const sourceUrl = "https://mdn.github.io/shared-assets/videos/flower.mp4";

async function fetchRealFootage() {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`real-footage-download-failed:${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function canvasSignal(page: Page) {
  return page.locator(".preview-frame canvas").first().evaluate((canvas: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("signal-canvas-unavailable");
    ctx.drawImage(canvas, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let visible = 0;
    let bright = 0;
    let weighted = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      const luma = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
      if (luma > 10) visible += 1;
      if (luma > 70) bright += 1;
      weighted = (weighted + Math.round(luma) * ((i / 4) % 997 + 1)) % 2147483647;
    }
    return { visible, bright, weighted, width: copy.width, height: copy.height };
  });
}

async function seekAndWait(page: Page, progress: number, previousSignature?: number) {
  const timeline = page.getByLabel("Video position");
  await timeline.fill(String(progress));
  await expect.poll(async () => Math.abs(Number(await timeline.inputValue()) - progress)).toBeLessThanOrEqual(1);
  await expect.poll(async () => {
    const signal = await canvasSignal(page);
    const total = signal.width * signal.height;
    if (signal.visible < total * 0.002 || signal.bright < 100) return false;
    return previousSignature === undefined || signal.weighted !== previousSignature;
  }, { timeout: 15_000 }).toBe(true);
  return canvasSignal(page);
}

test("representative real footage stays usable across Stage 3 renderers and seeks", async ({ page, browserName }) => {
  test.setTimeout(90_000);
  test.skip(browserName !== "chromium", "Representative visual evidence is retained in Chromium");
  const footage = await fetchRealFootage();
  expect(footage.byteLength).toBeGreaterThan(100_000);

  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({
    name: "mdn-flower-real-footage.mp4",
    mimeType: "video/mp4",
    buffer: footage,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".asset-meta strong").filter({ hasText: "mdn-flower-real-footage.mp4" })).toBeVisible();

  const renderers = ["Original", "Glyph", "Point", "Particle"] as const;
  const positions = [10, 40, 70, 90];

  for (const renderer of renderers) {
    await page.getByRole("button", { name: renderer, exact: true }).click();
    let previousSignature: number | undefined;
    const visibleCounts: number[] = [];
    for (const progress of positions) {
      const signal = await seekAndWait(page, progress, previousSignature);
      visibleCounts.push(signal.visible);
      previousSignature = signal.weighted;
      await page.locator(".preview-frame").screenshot({
        path: `${evidenceDir}/${renderer.toLowerCase()}-${progress}.png`,
      });
    }
    const nonzero = visibleCounts.filter((count) => count > 0);
    expect(nonzero).toHaveLength(positions.length);
    const min = Math.min(...nonzero);
    const max = Math.max(...nonzero);
    expect(max / min).toBeLessThan(renderer === "Original" ? 4 : 3);
  }

  await page.getByRole("button", { name: "Point", exact: true }).click();
  const first = await seekAndWait(page, 50);
  await seekAndWait(page, 15, first.weighted);
  const repeated = await seekAndWait(page, 50);
  expect(repeated.visible / first.visible).toBeGreaterThan(0.7);
  expect(repeated.visible / first.visible).toBeLessThan(1.3);
  await page.screenshot({ path: `${evidenceDir}/real-footage-ui.png`, fullPage: true });
});
