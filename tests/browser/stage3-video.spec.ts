import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

// ffmpeg-generated 160x100, 10fps, 2.0s VP9 WebM with a white square moving left -> right.
// ffprobe verifies an explicit 2.000000s duration so both playback and seeking are testable.
const movingSquareWebm = Buffer.from(
  "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAR7EU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEjTbuMU6uEHFO7a1OsggRS7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuNy4xMDNXQYxMYXZmNjEuNy4xMDNEiYhAn0AAAAAAABZUrmvIrgEAAAAAAAA/14EBc8WI0MaiHWhcoL2cgQAitZyDdW5kiIEAhoVWX1ZQOYOBASPjg4QF9eEA4JCwgaC6gWSagQJVsIRVuYEBElTDZ0B/c3OfY8CAZ8iZRaOHRU5DT0RFUkSHjExhdmY2MS43LjEwM3Nz2mPAi2PFiNDGoh1oXKC9Z8ilRaOHRU5DT0RFUkSHmExhdmM2MS4xOS4xMDEgbGlidnB4LXZwOWfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDIuMDAwMDAwMDAwAB9DtnVCpOeBAKPkgQAAgIJJg0IACfAGNgY4JBwYQgAAoEfY/WIM2+k8AABrPVE/uClN6SdJujwh/HMSHhZo02O359RW9Zjq8tkR7lLMvpx2AJ8W3CT0Vuj3Uz+ndJf5xCglRKaAlfMwEfSzk9mIUKOXgQBkAIYAQJKcKElAAANwAABZ+AQ3VICjl4EAyACGAECSnCxKwAADcAAAWfgEN1SAo5eBASwAhgBAkpwsScAAA3AAAFn4BDdUgKOXgQGQAIYAQJKcKEigAANwAABZ+AQ3VICjl4EB9ACGAECSnCRHgAADcAAAWfgEN1SAo5eBAlgAhgBAkpwkRuAAA3AAAFn4BDdUgKOXgQK8AIYAQJKcIEZAAANwAABZ+AQ3VICjl4EDIACGAECSnCBFwAADcAAAWfgEN1SAo5eBA4QAhgBAkpwgRUAAA3AAAFn4BDdUgKPkgQPogIJJg0IACfAGNgY4JBwYQgAAoEfY/WIM2+k8AABrPVE/uClN6SdJujwh/HMSHhZo02O359RW9Zjq8tkR7lLMvpx2AJ8W3CT0Vuj3Uz+ndJf5xCglRKaAlfMwEfSzk9mIUKOXgQRMAIYAQJKcIETgAANwAABZ+AQ3VICjl4EEsACGAECSnBxEYAADcAAAWfgEN1SAo5eBBRQAhgBAkpwcRAAAA3AAAFn4BDdUgKOXgQV4AIYAQJKcHEOgAANwAABZ+AQ3VICjl4EF3ACGAECSnBhDQAADcAAAWfgEN1SAo5eBBkAAhgBAkpwYQwAAA3AAAFn4BDdUgKOXgQakAIYAQJKcGELAAANwAABZ+AQ3VICjl4EHCACGAECSnBhCgAADcAAAWfgEN1SAo6qBB2wAhgBAkpwYQkAAA3AAAAqZy3wMEIPvPSswLieDRLHXwAABBVFAtzgcU7trpLuPs4EAt4r3gQHxggGo8IEDu5GzggPot4v3gQHxggGo8IIBSg==",
  "base64",
);

test("imports a browser-decodable video and transforms changing frames", async ({ page }) => {
  await page.goto("/");
  const videoInput = page.locator('input[data-source-kind="video"]');
  await videoInput.setInputFiles({ name: "stage3-moving-square.webm", mimeType: "video/webm", buffer: movingSquareWebm });

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".asset-meta strong").filter({ hasText: "stage3-moving-square.webm" })).toBeVisible();
  await expect(page.locator(".asset-meta")).toContainText("Video");
  await expect(page.locator(".source-panel .stage3-note")).toContainText("Video-to-source Morph is not part of this Stage 3 baseline");

  await page.getByRole("button", { name: "Point", exact: true }).click();
  const preview = page.locator(".preview-frame");
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-start.png` });
  const start = await page.locator("canvas").screenshot();

  await page.getByLabel("Play video").click();
  await page.waitForTimeout(850);
  await page.getByLabel("Pause video").click();
  const position = Number(await page.getByLabel("Video position").inputValue());
  expect(position).toBeGreaterThan(15);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-playing.png` });
  const later = await page.locator("canvas").screenshot();
  expect(later.equals(start)).toBe(false);

  await page.getByLabel("Video position").fill("80");
  await page.waitForTimeout(200);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-seek-80.png` });
  const seeked = await page.locator("canvas").screenshot();
  expect(seeked.equals(later)).toBe(false);

  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".canvas-status")).toContainText("Original Mode");
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-original-seek-80.png` });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stage3-moving-square-webm-original.png");
});
