import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="black"/><circle cx="74" cy="80" r="50" fill="white"/><rect x="145" y="32" width="62" height="94" fill="#808080"/></svg>`,
);

test("Stage 5 exports selected Motion without requiring a Morph target", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Motion recording evidence is retained in Chromium");
  await page.goto("/");
  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "motion-export.svg",
    mimeType: "image/svg+xml",
    buffer: sourceSvg,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Point", exact: true }).click();
  await page.getByLabel("Motion type").selectOption("pulse");
  await page.getByLabel("Strength").fill("200");
  await page.getByLabel("Speed").fill("300");
  await page.getByLabel("Animation duration").fill("1");

  await expect(page.getByText("Add an optional second source above to create a source-to-source Morph.")).toBeVisible();
  const animationButton = page.getByRole("button", { name: "Export Motion animation" });
  if (await animationButton.isDisabled()) {
    await expect(page.getByText("Short animation export is not supported by this browser/device.")).toBeVisible();
    test.skip(true, "Chromium runner does not expose canvas MediaRecorder");
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await animationButton.click();
  await expect(page.getByRole("button", { name: "Recording animation…" })).toBeDisabled();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^motion-export-svg-point-pulse-motion\.(webm|mp4)$/);
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
        video.addEventListener("error", () => reject(new Error("motion-recording-decode-failed")), { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("motion-replay-canvas-unavailable");
      const hashes: number[] = [];
      const sample = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261 >>> 0;
        for (let index = 0; index < pixels.length; index += 16) {
          hash ^= pixels[index] ?? 0;
          hash = Math.imul(hash, 16777619) >>> 0;
          hash ^= pixels[index + 1] ?? 0;
          hash = Math.imul(hash, 16777619) >>> 0;
          hash ^= pixels[index + 2] ?? 0;
          hash = Math.imul(hash, 16777619) >>> 0;
        }
        hashes.push(hash);
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
  await expect(page.getByText("Motion animation file created.")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-motion-animation-export.png`, fullPage: true });
});
