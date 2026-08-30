import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

async function webglBrightBounds(page: import("@playwright/test").Page) {
  return page.locator(".preview-frame .preview-canvas").evaluate((canvas) => {
    const target = canvas as HTMLCanvasElement;
    const gl = target.getContext("webgl2");
    if (!gl || target.width <= 0 || target.height <= 0) return null;
    const pixels = new Uint8Array(target.width * target.height * 4);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let minX = target.width;
    let maxX = -1;
    let minY = target.height;
    let maxY = -1;
    for (let y = 0; y < target.height; y += 1) {
      for (let x = 0; x < target.width; x += 1) {
        const i = (y * target.width + x) * 4;
        if ((pixels[i] ?? 0) > 48 || (pixels[i + 1] ?? 0) > 48 || (pixels[i + 2] ?? 0) > 48) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  });
}

async function createRibbon(page: import("@playwright/test").Page) {
  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name: "Ribbon" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Ribbon");
}

test("webkit second-browser critical: Stage 5 Camera pans zooms and rotates the shared WebGL view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await createRibbon(page);

  const camera = page.locator('[data-stage5-camera="true"]');
  await expect(camera.getByRole("heading", { name: "Camera", exact: true })).toBeVisible();
  const before = await webglBrightBounds(page);
  expect(before).not.toBeNull();

  await page.getByLabel("Pan X").fill("30");
  await page.getByLabel("Pan Y").fill("20");
  await page.getByLabel("Zoom").fill("150");
  await page.getByLabel("Rotation").fill("25");

  const canvas = page.locator(".preview-frame .preview-canvas");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.300");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "0.200");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.500");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "25.0");

  await expect.poll(async () => (await webglBrightBounds(page))?.centerX ?? 0).toBeGreaterThan((before?.centerX ?? 0) + 20);
  await expect.poll(async () => (await webglBrightBounds(page))?.centerY ?? 0).toBeGreaterThan((before?.centerY ?? 0) + 10);
  await expect.poll(async () => (await webglBrightBounds(page))?.width ?? 0).toBeGreaterThan((before?.width ?? 0) * 1.15);

  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(camera.getByRole("heading", { name: "カメラ", exact: true })).toBeVisible();
  await expect(page.getByLabel("横移動")).toHaveValue("30");
  await expect(page.getByLabel("ズーム")).toHaveValue("150");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-1440x700-ja.png`, fullPage: true });
});

test("Stage 5 Camera also transforms Original video canvas and still export", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Original canvas/export evidence is retained in Chromium");
  await page.setViewportSize({ width: 1440, height: 700 });
  const movingSquareWebm = Buffer.from(readFileSync("tests/fixtures/stage3-moving-square.webm.base64", "utf8").trim(), "base64");
  await page.goto("/");
  await page.locator('input[data-source-kind="video"]').setInputFiles({ name: "camera-source.webm", mimeType: "video/webm", buffer: movingSquareWebm });
  await page.getByRole("button", { name: "Original", exact: true }).click();
  const canvas = page.locator(".preview-frame .preview-canvas");
  const before = await canvas.screenshot();
  await page.getByLabel("Pan X").fill("35");
  await page.getByLabel("Pan Y").fill("-25");
  await page.getByLabel("Zoom").fill("140");
  await page.getByLabel("Rotation").fill("20");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.350");
  const after = await canvas.screenshot();
  expect(after.equals(before)).toBe(false);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  const path = `${evidenceDir}/outputs/stage5-camera-${download.suggestedFilename()}`;
  await download.saveAs(path);
  const bytes = readFileSync(path);
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-original-1440x700-en.png`, fullPage: true });
});

test("Stage 5 Camera controls remain usable without horizontal overflow on mobile", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Mobile evidence is retained in Chromium");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createRibbon(page);
  await page.getByLabel("Pan X").fill("20");
  await page.getByLabel("Zoom").fill("130");
  await page.getByLabel("Rotation").fill("-15");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-stage5-camera="true"]')).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-ribbon-390x844-en.png`, fullPage: true });
});
