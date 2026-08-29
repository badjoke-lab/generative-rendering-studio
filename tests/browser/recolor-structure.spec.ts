import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const lightArtwork = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140">
    <rect width="240" height="140" fill="#ffffff"/>
    <circle cx="68" cy="70" r="42" fill="#3b3b3b"/>
    <rect x="135" y="30" width="70" height="22" rx="5" fill="#555555"/>
    <rect x="135" y="64" width="54" height="18" rx="4" fill="#777777"/>
    <rect x="135" y="94" width="64" height="16" rx="4" fill="#222222"/>
  </svg>`,
);

async function settle(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function setRange(page: Page, labelText: string, value: number) {
  const label = page.locator("section.inspector-section label").filter({ hasText: labelText }).first();
  const input = label.locator('input[type="range"]');
  await input.evaluate((element, nextValue) => {
    const inputElement = element as HTMLInputElement;
    inputElement.value = String(nextValue);
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function canvasMetrics(page: Page) {
  const canvas = page.locator("canvas.preview-canvas");
  return canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const gl = canvasElement.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) throw new Error("webgl2-unavailable");
    const width = canvasElement.width;
    const height = canvasElement.height;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const corner = [pixels[0] ?? 0, pixels[1] ?? 0, pixels[2] ?? 0];
    const tint = [0xc7, 0xc2, 0xff];
    const x0 = Math.floor(width * 0.2);
    const x1 = Math.ceil(width * 0.8);
    const y0 = Math.floor(height * 0.2);
    const y1 = Math.ceil(height * 0.8);
    let total = 0;
    let nonBackground = 0;
    let tintLike = 0;

    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const offset = (y * width + x) * 4;
        const r = pixels[offset] ?? 0;
        const g = pixels[offset + 1] ?? 0;
        const b = pixels[offset + 2] ?? 0;
        const backgroundDistance = Math.hypot(r - corner[0], g - corner[1], b - corner[2]);
        const tintDistance = Math.hypot(r - tint[0], g - tint[1], b - tint[2]);
        total += 1;
        if (backgroundDistance > 30) nonBackground += 1;
        if (tintDistance < 70) tintLike += 1;
      }
    }

    return {
      width,
      height,
      nonBackgroundFraction: nonBackground / Math.max(1, total),
      tintFraction: tintLike / Math.max(1, total),
    };
  });
}

test("webkit second-browser critical: render color preserves tonal source structure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  const fileInput = page.locator('input[type="file"]').nth(0);
  await fileInput.setInputFiles({ name: "light-artwork.svg", mimeType: "image/svg+xml", buffer: lightArtwork });
  await expect(page.locator(".asset-meta strong").filter({ hasText: "light-artwork.svg" })).toBeVisible();

  await page.getByRole("button", { name: "Glyph", exact: true }).click();
  await setRange(page, "Density", 100);
  await setRange(page, "Size", 180);

  const sourceColorToggle = page.locator(".toggle-row").filter({ hasText: "Source Color" }).locator("button.toggle");
  if ((await sourceColorToggle.getAttribute("aria-pressed")) !== "true") await sourceColorToggle.click();
  await settle(page);
  const sourceColorMetrics = await canvasMetrics(page);

  await sourceColorToggle.click();
  await expect(sourceColorToggle).toHaveAttribute("aria-pressed", "false");
  await settle(page);
  const recolorMetrics = await canvasMetrics(page);

  expect(sourceColorMetrics.nonBackgroundFraction).toBeGreaterThan(0.5);
  expect(recolorMetrics.nonBackgroundFraction).toBeGreaterThan(0.03);
  expect(recolorMetrics.nonBackgroundFraction).toBeLessThan(sourceColorMetrics.nonBackgroundFraction * 0.65);
  expect(recolorMetrics.tintFraction).toBeGreaterThan(0.02);

  await page.locator(".preview-frame").screenshot({
    path: `${evidenceDir}/recolor-structure-glyph-1440x700-en.png`,
  });
});
