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

async function loadIndependentSources(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "primary-timing.svg",
    mimeType: "image/svg+xml",
    buffer: primarySvg,
  });
  await page.locator('input[data-source-kind="scene-layer"]').setInputFiles({
    name: "secondary-red.svg",
    mimeType: "image/svg+xml",
    buffer: secondarySvg,
  });
}

test("webkit second-browser critical: Stage 5 independent source clip timing shares the Studio transport", async ({ page }) => {
  await loadIndependentSources(page);

  const layerPanel = page.locator('[data-stage5-layer-stack="independent-source"]');
  const composite = page.locator('[data-independent-source-composite="true"]');
  const transport = page.locator(".transport-bar");
  await expect(layerPanel).toBeVisible();
  await expect(layerPanel.getByLabel("Toggle independent source timeline timing")).toHaveAttribute("aria-pressed", "false");
  await expect(transport).toHaveAttribute("data-timeline-mode", "idle");
  await expect(composite).toHaveAttribute("data-secondary-visible", "true");

  await layerPanel.getByLabel("Toggle independent source timeline timing").click();
  await expect(layerPanel.locator('[data-stage5-layer-timing="on"]')).toBeVisible();
  await expect(transport).toHaveAttribute("data-timeline-mode", "layer-timing");
  await expect(transport).toHaveAttribute("data-timeline-tracks", "layer-timing");

  await layerPanel.getByLabel("Independent source timeline start").fill("1");
  await layerPanel.getByLabel("Independent source timeline duration").fill("1");
  await expect(composite).toHaveAttribute("data-secondary-visible", "false");

  const timeline = page.getByLabel("Layer timeline position");
  await timeline.fill("50");
  await expect(composite).toHaveAttribute("data-secondary-visible", "true");
  await expect(page.locator(".timecode")).toContainText("00:01.00");

  await timeline.fill("100");
  await expect(composite).toHaveAttribute("data-secondary-visible", "false");
  await expect(page.locator(".timecode")).toContainText("00:02.00");

  await page.getByLabel("Language").selectOption("ja");
  await expect(layerPanel.getByText("タイムラインに配置")).toBeVisible();
  await expect(layerPanel.getByLabel("独立素材のタイムライン開始")).toHaveValue("1");
  await expect(layerPanel.getByLabel("独立素材のタイムライン時間")).toHaveValue("1");
});

test("Stage 5 exports timing-only animation for an independent source clip", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Timing-only recording evidence is retained in Chromium");
  await loadIndependentSources(page);
  await page.getByRole("button", { name: "Original", exact: true }).click();

  const layerPanel = page.locator('[data-stage5-layer-stack="independent-source"]');
  await layerPanel.getByLabel("Independent source opacity").fill("100");
  await layerPanel.getByLabel("Toggle independent source timeline timing").click();
  await layerPanel.getByLabel("Independent source timeline start").fill("0.5");
  await layerPanel.getByLabel("Independent source timeline duration").fill("0.5");

  const animationButton = page.getByRole("button", { name: "Export layer timing animation" });
  if (await animationButton.isDisabled()) {
    const unsupported = page.getByText("Short animation export is not supported by this browser/device.");
    if (await unsupported.isVisible()) test.skip(true, "Chromium runner does not expose canvas MediaRecorder");
  }
  await expect(animationButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await animationButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^primary-timing-svg-original-layer-timing-composite\.(webm|mp4)$/);
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
        video.addEventListener("error", () => reject(new Error("layer-timing-recording-decode-failed")), { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("layer-timing-replay-canvas-unavailable");
      const redDominantCounts: number[] = [];
      const sample = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let redDominant = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index] ?? 0;
          const green = pixels[index + 1] ?? 0;
          const blue = pixels[index + 2] ?? 0;
          if (red > 100 && red > green + 50 && red > blue + 50) redDominant += 1;
        }
        redDominantCounts.push(redDominant);
      };
      await video.play();
      const startedAt = performance.now();
      while (!video.ended && performance.now() - startedAt < 3_000) {
        await new Promise((resolve) => setTimeout(resolve, 60));
        sample();
      }
      return {
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth,
        height: video.videoHeight,
        redDominantCounts,
      };
    } finally {
      video.remove();
      URL.revokeObjectURL(url);
    }
  }, { base64: bytes.toString("base64"), mimeType });

  expect(replay.width).toBeGreaterThan(0);
  expect(replay.height).toBeGreaterThan(0);
  expect(replay.duration ?? 0).toBeGreaterThan(0.7);
  expect(replay.redDominantCounts.length).toBeGreaterThan(8);
  expect(Math.min(...replay.redDominantCounts)).toBeLessThan(50);
  expect(Math.max(...replay.redDominantCounts)).toBeGreaterThan(100);
  await expect(page.getByText("Layer timing animation file created.")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-independent-source-clip-timing.png`, fullPage: true });
});
