import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

async function brightPixelCount(page: import("@playwright/test").Page) {
  return page.locator(".preview-frame .preview-canvas").evaluate((canvas) => {
    const target = canvas as HTMLCanvasElement;
    const gl = target.getContext("webgl2");
    if (!gl || target.width <= 0 || target.height <= 0) return 0;
    const pixels = new Uint8Array(target.width * target.height * 4);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i] ?? 0) > 48 || (pixels[i + 1] ?? 0) > 48 || (pixels[i + 2] ?? 0) > 48) count += 1;
    }
    return count;
  });
}

test("stage4 procedural source is a real Studio source across Glyph Point and Particle", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  const panel = page.locator(".procedural-source-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Generate source");

  await panel.getByRole("button", { name: "Torus" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();

  await expect(page.locator(".asset-card.selected")).toContainText("Torus");
  await expect(page.locator(".asset-card.selected")).toContainText("Procedural source");
  await expect(page.getByRole("button", { name: "Original" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Point" })).toHaveClass(/active/);
  await expect(page.locator(".preview-frame .preview-canvas")).toHaveCSS("opacity", "1");
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(100);
  await page.screenshot({ path: `${evidenceDir}/stage4-procedural-torus-point-1440x700-en.png`, fullPage: true });

  await page.getByRole("button", { name: "Glyph" }).click();
  await expect(page.getByRole("button", { name: "Glyph" })).toHaveClass(/active/);
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(100);
  await page.screenshot({ path: `${evidenceDir}/stage4-procedural-torus-glyph-1440x700-en.png`, fullPage: true });

  await page.getByRole("button", { name: "Particle" }).click();
  await expect(page.getByRole("button", { name: "Particle" })).toHaveClass(/active/);
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(100);

  await page.getByLabel("Language").selectOption("ja");
  await expect(panel).toContainText("生成素材");
  await expect(page.locator(".asset-card.selected")).toContainText("トーラス");
  await page.screenshot({ path: `${evidenceDir}/stage4-procedural-torus-particle-1440x700-ja.png`, fullPage: true });
});

test("stage4 procedural source controls stay usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const panel = page.locator(".procedural-source-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Spiral" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Spiral");
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(50);

  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyHeight).toBeGreaterThan(metrics.innerHeight);

  await page.screenshot({ path: `${evidenceDir}/stage4-procedural-spiral-point-390x844-en.png`, fullPage: true });
});
