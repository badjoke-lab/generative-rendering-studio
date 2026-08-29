import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

const png1x1White = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=",
  "base64",
);

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="50" cy="50" r="34" fill="white"/></svg>`,
);

const targetSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="90" y="20" width="50" height="60" fill="white"/></svg>`,
);

function assetName(page: Page, name: string) {
  return page.locator(".asset-meta strong").filter({ hasText: name });
}

function morphSection(page: Page) {
  return page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Morph", exact: true }),
  });
}

function stillExportSection(page: Page) {
  return page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Still Export", exact: true }),
  });
}

function morphToggle(page: Page) {
  return morphSection(page).locator("button.toggle");
}

async function inspectDownloadedImage(
  page: Page,
  filePath: string,
  mimeType: "image/png" | "image/webp",
  expected: { width: number; height: number },
) {
  const bytes = readFileSync(filePath);
  expect(bytes.byteLength).toBeGreaterThan(500);
  if (mimeType === "image/png") {
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  } else {
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  }

  const metrics = await page.evaluate(
    async ({ base64, mimeType }) => {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("image-decode-canvas-unavailable");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let lumaMin = 255;
      let lumaMax = 0;
      let visiblePixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha === 0) continue;
        visiblePixels += 1;
        const luma = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        lumaMin = Math.min(lumaMin, luma);
        lumaMax = Math.max(lumaMax, luma);
      }
      bitmap.close();
      return { width: canvas.width, height: canvas.height, lumaMin, lumaMax, visiblePixels };
    },
    { base64: bytes.toString("base64"), mimeType },
  );

  expect(metrics.width).toBe(expected.width);
  expect(metrics.height).toBe(expected.height);
  expect(metrics.visiblePixels).toBeGreaterThan(100);
  expect(metrics.lumaMax - metrics.lumaMin).toBeGreaterThan(20);
}

async function inspectDownloadedAnimation(page: Page, filePath: string, mimeType: "video/webm" | "video/mp4") {
  const bytes = readFileSync(filePath);
  expect(bytes.byteLength).toBeGreaterThan(2_000);

  const replay = await page.evaluate(
    async ({ base64, mimeType }) => {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = url;
      video.style.position = "fixed";
      video.style.left = "-10000px";
      document.body.append(video);

      try {
        await new Promise<void>((resolve, reject) => {
          video.addEventListener("loadeddata", () => resolve(), { once: true });
          video.addEventListener("error", () => reject(new Error("recording-replay-decode-failed")), { once: true });
        });

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("recording-replay-canvas-unavailable");

        const samples: Array<{ time: number; centroidX: number | null; weight: number }> = [];
        const frames: Record<string, string> = {};
        const sampleFrame = () => {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let weight = 0;
          let weightedX = 0;
          for (let y = 0; y < canvas.height; y += 4) {
            for (let x = 0; x < canvas.width; x += 4) {
              const index = (y * canvas.width + x) * 4;
              const luma = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
              const foreground = Math.max(0, luma - 25);
              if (foreground <= 0) continue;
              weight += foreground;
              weightedX += x * foreground;
            }
          }
          const centroidX = weight > 0 ? weightedX / weight : null;
          samples.push({ time: video.currentTime, centroidX, weight });
          const frame = canvas.toDataURL("image/png");
          if (!frames.start) frames.start = frame;
          if (video.currentTime >= 0.45 && !frames.middle) frames.middle = frame;
          if (video.currentTime >= 0.8) frames.end = frame;
        };

        await video.play();
        const startedAt = performance.now();
        while (!video.ended && performance.now() - startedAt < 4_000) {
          await new Promise((resolve) => setTimeout(resolve, 60));
          sampleFrame();
        }
        if (!samples.length || samples.at(-1)?.time !== video.currentTime) sampleFrame();
        if (!frames.end) frames.end = canvas.toDataURL("image/png");

        return {
          duration: Number.isFinite(video.duration) ? video.duration : null,
          ended: video.ended,
          currentTime: video.currentTime,
          width: video.videoWidth,
          height: video.videoHeight,
          samples,
          frames,
        };
      } finally {
        video.remove();
        URL.revokeObjectURL(url);
      }
    },
    { base64: bytes.toString("base64"), mimeType },
  );

  expect(replay.width).toBeGreaterThan(0);
  expect(replay.height).toBeGreaterThan(0);
  const maxTime = Math.max(0, ...replay.samples.map(({ time }) => time));
  expect(replay.duration ?? maxTime).toBeGreaterThan(0.5);
  expect(maxTime).toBeGreaterThan(0.8);

  const validSamples = replay.samples.filter(
    (sample): sample is { time: number; centroidX: number; weight: number } =>
      sample.centroidX !== null && Number.isFinite(sample.centroidX) && sample.weight > 0,
  );
  expect(validSamples.length).toBeGreaterThan(5);
  const first = validSamples[0];
  const last = validSamples[validSamples.length - 1];
  expect(last.centroidX - first.centroidX).toBeGreaterThan(replay.width * 0.08);
  const smoothedCentroids = validSamples.map((_, index, samples) => {
    const window = samples.slice(Math.max(0, index - 1), Math.min(samples.length, index + 2));
    return window.reduce((total, sample) => total + sample.centroidX, 0) / window.length;
  });
  const deltas = smoothedCentroids.slice(1).map((centroidX, index) => centroidX - smoothedCentroids[index]);
  expect(Math.min(...deltas)).toBeGreaterThan(-replay.width * 0.03);

  for (const [name, dataUrl] of Object.entries(replay.frames)) {
    const encoded = dataUrl.split(",", 2)[1];
    if (encoded) writeFileSync(`${evidenceDir}/animation-replay-${name}.png`, Buffer.from(encoded, "base64"));
  }

  return replay;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Renderer Mode")).toBeVisible();
});

test("imports supported still sources and switches renderers", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.png", mimeType: "image/png", buffer: png1x1White });
  await expect(assetName(page, "source.png")).toBeVisible();

  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await expect(assetName(page, "source.svg")).toBeVisible();

  for (const renderer of ["Original", "Glyph", "Point", "Particle"]) {
    await page.getByRole("button", { name: renderer, exact: true }).click();
    await expect(page.locator(".canvas-status")).toContainText(`${renderer} Mode`);
    await page.locator(".preview-frame").screenshot({
      path: `${evidenceDir}/renderer-${renderer.toLowerCase()}.png`,
    });
  }

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
});

test("creates text and persists Japanese locale selection", async ({ page }) => {
  page.once("dialog", async (dialog) => dialog.accept("テスト"));
  await page.getByRole("button", { name: /Text/ }).click();
  await expect(assetName(page, "テスト")).toBeVisible();

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByText("見た目を選ぶ", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/locale-ja.png`, fullPage: true });
  await page.reload();
  await expect(page.getByLabel("言語")).toHaveValue("ja");
});

test("runs coherent A-to-B Morph controls and verifies PNG/WebP files", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });

  await expect(assetName(page, "target.svg")).toBeVisible();
  const toggle = morphToggle(page);
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Stage 2 morph preview")).toBeVisible();

  const timeline = page.getByLabel("Timeline position");
  for (const progress of [0, 50, 100]) {
    await timeline.fill(String(progress));
    await expect(page.getByText(`${progress}%`, { exact: true }).first()).toBeVisible();
    await page.locator(".preview-frame").screenshot({
      path: `${evidenceDir}/morph-${progress}.png`,
    });
  }
  await timeline.fill("0");

  const canvasDimensions = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  const format = stillExportSection(page).locator("select");
  for (const output of [
    { value: "png", extension: "png", mimeType: "image/png" as const },
    { value: "webp", extension: "webp", mimeType: "image/webp" as const },
  ]) {
    await format.selectOption(output.value);
    const stillDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export current frame" }).click();
    const download = await stillDownload;
    expect(download.suggestedFilename()).toBe(`source-svg-point.${output.extension}`);
    const outputPath = `${outputDir}/${download.suggestedFilename()}`;
    await download.saveAs(outputPath);
    await inspectDownloadedImage(page, outputPath, output.mimeType, canvasDimensions);
  }
});

test("records, replays and recovers from a short Morph animation", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });

  const toggle = morphToggle(page);
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const animationButton = page.getByRole("button", { name: "Export Morph animation" });
  if (await animationButton.isDisabled()) {
    await expect(page.getByText("Short animation export is not supported by this browser/device.")).toBeVisible();
    test.skip(true, "Chromium runner does not expose canvas MediaRecorder");
  }

  const durationControl = morphSection(page)
    .locator("label")
    .filter({ hasText: "Duration" })
    .locator('input[type="range"]');
  await durationControl.fill("1");

  const addSourceButton = page.getByRole("button", { name: /Add Source/ });
  const glyphButton = page.getByRole("button", { name: "Glyph", exact: true });
  const particleButton = page.getByRole("button", { name: "Particle", exact: true });
  const stillButton = page.getByRole("button", { name: "Export current frame" });

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await animationButton.click();
  await expect(page.getByRole("button", { name: "Recording animation…" })).toBeDisabled();
  await expect(addSourceButton).toBeDisabled();
  await expect(glyphButton).toBeDisabled();
  await expect(particleButton).toBeDisabled();
  await expect(stillButton).toBeDisabled();
  await expect(durationControl).toBeDisabled();
  await page.screenshot({ path: `${evidenceDir}/recording-locked.png`, fullPage: true });

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/source-svg-to-target-svg-point\.(webm|mp4)$/);
  const outputPath = `${outputDir}/${download.suggestedFilename()}`;
  await download.saveAs(outputPath);
  await expect(page.getByText("Animation file created. The preview is held on the final frame.")).toBeVisible();
  await expect(addSourceButton).toBeEnabled();
  await expect(glyphButton).toBeEnabled();
  await expect(particleButton).toBeEnabled();
  await expect(stillButton).toBeEnabled();
  await expect(durationControl).toBeEnabled();
  await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/animation-final.png` });
  await page.screenshot({ path: `${evidenceDir}/recording-recovered.png`, fullPage: true });

  const mimeType = download.suggestedFilename().endsWith(".mp4") ? "video/mp4" : "video/webm";
  await inspectDownloadedAnimation(page, outputPath, mimeType);
});

test("narrow viewport keeps the Studio document alive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("main.studio-shell")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    canvasCount: document.querySelectorAll("canvas").length,
  }));
  expect(metrics.bodyWidth).toBeGreaterThan(0);
  expect(metrics.bodyHeight).toBeGreaterThan(0);
  expect(metrics.canvasCount).toBeGreaterThan(0);
  await page.screenshot({ path: `${evidenceDir}/narrow-390x844.png`, fullPage: true });
});

test("second-browser critical import Morph and still-export path", async ({ page, browserName }) => {
  test.skip(browserName !== "firefox", "This release-candidate check is reserved for the Firefox project");
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });
  await expect(page.getByText("WebGL2 is not available in this browser/device.")).toHaveCount(0);

  const toggle = morphToggle(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const timeline = page.getByLabel("Timeline position");
  await timeline.fill("100");
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();

  const canvasDimensions = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  const format = stillExportSection(page).locator("select");
  await format.selectOption("png");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame" }).click();
  const download = await downloadPromise;
  const outputPath = `${outputDir}/firefox-${download.suggestedFilename()}`;
  await download.saveAs(outputPath);
  await inspectDownloadedImage(page, outputPath, "image/png", canvasDimensions);
  await page.screenshot({ path: `${evidenceDir}/firefox-critical.png`, fullPage: true });
});
