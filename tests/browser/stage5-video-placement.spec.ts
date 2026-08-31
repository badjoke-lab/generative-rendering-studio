import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const movingSquareWebm = Buffer.from(
  readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(),
  "base64",
);

async function loadPrimaryVideo(page: Page) {
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({
    name: "stage5-placement-source.webm",
    mimeType: "video/webm",
    buffer: movingSquareWebm,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-stage5-video-clip="true"]')).toBeVisible();
}

async function primaryVideoTime(page: Page) {
  return page.locator("video.source-video-element").first().evaluate((video: HTMLVideoElement) => video.currentTime);
}

async function timelineTime(page: Page) {
  return Number(await page.locator(".transport-bar").getAttribute("data-video-timeline-time"));
}

test("webkit second-browser critical: placed video clip uses a real Studio timeline gap and source mapping", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await loadPrimaryVideo(page);

  await page.getByLabel("Source in").fill("0.5");
  await page.getByLabel("Source out").fill("1.5");
  await page.getByLabel("Timeline start").fill("0.5");

  await expect(page.getByLabel("Timeline start")).toHaveValue("0.5");
  await expect(page.getByLabel("Video position")).toHaveValue("0");
  await expect(page.locator(".preview-frame")).toHaveAttribute("data-video-clip-active", "false");
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(0.5, 1);
  await expect.poll(() => timelineTime(page)).toBeCloseTo(0, 2);

  await page.getByLabel("Video position").fill("50");
  await expect.poll(() => timelineTime(page)).toBeCloseTo(0.75, 1);
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(0.75, 1);
  await expect(page.locator(".preview-frame")).toHaveAttribute("data-video-clip-active", "true");
  await expect(page.locator(".timecode")).toContainText("00:00.75");

  await page.getByRole("button", { name: "Video start" }).click();
  await expect.poll(() => timelineTime(page)).toBeCloseTo(0, 2);
  await expect.poll(() => primaryVideoTime(page)).toBeCloseTo(0.5, 1);
  await expect(page.locator(".preview-frame")).toHaveAttribute("data-video-clip-active", "false");

  const playbackStartedAt = Date.now();
  await page.getByRole("button", { name: "Play video" }).click();
  await expect.poll(() => primaryVideoTime(page), { timeout: 4000 }).toBeGreaterThan(0.55);
  expect(Date.now() - playbackStartedAt).toBeGreaterThanOrEqual(300);
  await expect(page.locator(".preview-frame")).toHaveAttribute("data-video-clip-active", "true");

  await expect.poll(() => primaryVideoTime(page), { timeout: 4000 }).toBeGreaterThanOrEqual(1.49);
  await expect.poll(() => timelineTime(page)).toBeCloseTo(1.5, 1);
  await expect(page.getByRole("button", { name: "Pause video" })).toBeDisabled();
  await expect(page.getByLabel("Video position")).toHaveValue("100");
  await expect(page.locator(".preview-frame")).toHaveAttribute("data-video-clip-active", "true");

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByLabel("タイムライン先頭")).toHaveValue("0.5");
});
