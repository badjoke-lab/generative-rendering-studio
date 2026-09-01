import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

const primarySvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">
    <rect width="240" height="160" fill="black"/>
    <circle cx="70" cy="80" r="48" fill="white"/>
    <rect x="118" y="40" width="44" height="80" fill="#808080"/>
  </svg>`,
);

const secondarySvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">
    <rect x="174" y="24" width="48" height="112" fill="rgb(255,24,24)"/>
  </svg>`,
);

test("Stage 5 records Motion with the independent second source in the exported animation", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Composite animation recording evidence is retained in Chromium");
  await page.goto("/");

  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "primary-motion.svg",
    mimeType: "image/svg+xml",
    buffer: primarySvg,
  });
  await page.getByRole("button", { name: "Point", exact: true }).click();

  await page.locator('input[data-source-kind="scene-layer"]').setInputFiles({
    name: "secondary-red.svg",
    mimeType: "image/svg+xml",
    buffer: secondarySvg,
  });
  const layerPanel = page.locator('[data-stage5-layer-stack="independent-source"]');
  await expect(layerPanel).toBeVisible();
  await layerPanel.getByLabel("Independent source opacity").fill("100");
  await layerPanel.getByLabel("Blend mode: secondary-red.svg").selectOption("normal");

  await page.getByLabel("Motion type").selectOption("pulse");
  await page.getByLabel("Strength").fill("200");
  await page.getByLabel("Speed").fill("300");
  await page.getByLabel("Animation duration").fill("1");

  const animationButton = page.getByRole("button", { name: "Export Motion animation" });
  if (await animationButton.isDisabled()) {
    const unsupported = page.getByText("Short animation export is not supported by this browser/device.");
    if (await unsupported.isVisible()) test.skip(true, "Chromium runner does not expose canvas MediaRecorder");
  }
  await expect(animationButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await animationButton.click();
  await expect(page.getByRole("button", { name: "Recording animation…" })).toBeDisabled();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^primary-motion-svg-point-pulse-motion-composite\.(webm|mp4)$/);
  const outputPath = `${outputDir}/${download.suggestedFilename()}`;
  await download.saveAs(outputPath);

  const bytes = readFileSync(outputPath);
  expect(bytes.byteLength).toBeGreaterThan(2_000);
  const mimeType = download.suggestedFilename().endsWith(".mp4") ? "video/mp4" : "video/webm";
  const replay = await page.evaluate(async ({ base64, mimeType }) => {
    const binary = atob(base64);
    const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    document.body.append(video);
    try {
      await new Promise<void>((resolve, reject) => {
        video.addEventListener("loadeddata", () => resolve(), { once: true });
        video.addEventListener("error", () => reject(new Error("composite-recording-decode-failed")), { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("composite-replay-canvas-unavailable");
      const hashes: number[] = [];
      const redDominantCounts: number[] = [];
      const sample = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261 >>> 0;
        let redDominant = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index] ?? 0;
          const green = pixels[index + 1] ?? 0;
          const blue = pixels[index + 2] ?? 0;
          const alpha = pixels[index + 3] ?? 0;
          if (alpha > 0 && red > 100 && red > green + 50 && red > blue + 50) redDominant += 1;
          if (index % 16 === 0) {
            hash ^= red;
            hash = Math.imul(hash, 16777619) >>> 0;
            hash ^= green;
            hash = Math.imul(hash, 16777619) >>> 0;
            hash ^= blue;
            hash = Math.imul(hash, 16777619) >>> 0;
          }
        }
        hashes.push(hash);
        redDominantCounts.push(redDominant);
      };
      await video.play();
      const startedAt = performance.now();
      while (!video.ended && performance.now() - startedAt < 3_000) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        sample();
      }
      return {
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth,
        height: video.videoHeight,
        hashes,
        redDominantCounts,
      };
    } finally {
      video.remove();
      URL.revokeObjectURL(url);
    }
  }, { base64: bytes.toString("base64"), mimeType });

  expect(replay.width).toBeGreaterThan(0);
  expect(replay.height).toBeGreaterThan(0);
  expect(replay.duration ?? 0).toBeGreaterThan(0.5);
  expect(replay.hashes.length).toBeGreaterThan(5);
  expect(new Set(replay.hashes).size).toBeGreaterThan(1);
  expect(Math.min(...replay.redDominantCounts)).toBeGreaterThan(100);
  await expect(page.getByText("Motion animation file created.")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-independent-source-animation-export.png`, fullPage: true });
});
