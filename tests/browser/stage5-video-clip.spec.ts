import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const movingSquareWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(),
  "base64",
);

const redBlueTextureWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-red-blue-texture.webm.base64", "utf8").trim(),
  "base64",
);

async function primaryVideoTime(page: Page) {
  return page.locator("video.source-video-element").first().evaluate((video: HTMLVideoElement) => video.currentTime);
}

async function auxiliaryVideoProgress(page: Page, index: number) {
  return page.locator("video.source-video-element").nth(index).evaluate((video: HTMLVideoElement) => (
    Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0
  ));
}

async function loadPrimaryVideo(page: Page) {
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({
    name: "stage5-clip-source.webm",
    mimeType: "video/webm",
    buffer: movingSquareWebm,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-stage5-video-clip="true"]')).toBeVisible();
}

test("webkit second-browser critical: Stage 5 shared video clip bounds playback, transport, synchronized media, and layer opacity", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await loadPrimaryVideo(page);

  const clipPanel = page.locator('[data-stage5-video-clip="true"]');
  await expect(clipPanel.getByRole("heading", { name: "Video clip", exact: true })).toBeVisible();
  await expect(page.getByLabel("Source in")).toHaveValue("0");
  await expect(Number(await page.getByLabel("Source out").inputValue())).toBeCloseTo(2, 1);

  await page.getByLabel("Source in").fill("0.5");
  await page.getByLabel("Source out").fill("1.5");
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(0.5, 1);
  await expect(page.getByLabel("Video position")).toHaveValue("0");
  await expect(clipPanel).toContainText("0.50–1.50");
  await expect(clipPanel).toContainText("1.00 seconds");

  await page.getByRole("button", { name: "Video end" }).click();
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(1.5, 1);
  await expect(page.getByLabel("Video position")).toHaveValue("100");

  await page.getByRole("button", { name: "Video start" }).click();
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(0.5, 1);
  await expect(page.getByLabel("Video position")).toHaveValue("0");

  await page.getByLabel("Video position").fill("50");
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(1, 1);
  await expect(page.getByLabel("Video position")).toHaveValue("50");

  await page.locator('input[data-source-kind="video-texture"]').setInputFiles({
    name: "stage5-clip-texture.webm",
    mimeType: "video/webm",
    buffer: redBlueTextureWebm,
  });
  await expect(page.locator('[data-source-role="texture"]')).toBeVisible();
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeCloseTo(0.5, 1);

  await page.getByRole("button", { name: "Video start" }).click();
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeCloseTo(0.25, 1);
  await page.getByLabel("Video position").fill("50");
  await expect.poll(() => auxiliaryVideoProgress(page, 2)).toBeCloseTo(0.5, 1);

  await page.getByRole("button", { name: "Show original under transform" }).click();
  await page.getByRole("button", { name: "Toggle Original layer opacity keyframes" }).click();
  await page.getByLabel("Start opacity").fill("10");
  await page.getByLabel("End opacity").fill("90");
  await page.getByLabel("Opacity easing").selectOption("linear");

  await page.getByRole("button", { name: "Video start" }).click();
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.1");
  await page.getByRole("button", { name: "Video end" }).click();
  await expect(page.locator(".video-composite-underlay")).toHaveCSS("opacity", "0.9");

  await page.getByLabel("Video position").fill("95");
  await page.getByRole("button", { name: "Play video" }).click();
  await expect.poll(() => primaryVideoTime(page)).toBeGreaterThanOrEqual(1.49);
  await expect.poll(() => primaryVideoTime(page)).toBeLessThanOrEqual(1.505);
  await expect(page.getByRole("button", { name: "Pause video" })).toBeDisabled();
  await expect(page.getByLabel("Video position")).toHaveValue("100");

  await page.getByLabel("Language").selectOption("ja");
  await expect(clipPanel.getByRole("heading", { name: "動画クリップ", exact: true })).toBeVisible();
  await expect(page.getByLabel("開始位置")).toHaveValue("0.5");
  await expect(page.getByLabel("終了位置")).toHaveValue("1.5");
});

test("Stage 5 shared video clip controls fit the mobile inspector", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile layout evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await loadPrimaryVideo(page);
  await page.getByLabel("Source in").fill("0.5");
  await page.getByLabel("Source out").fill("1.5");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
