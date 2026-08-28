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

async function createKind(page: import("@playwright/test").Page, name: string) {
  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name, exact: true }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText(name);
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(80);
}

test("webkit second-browser critical: stage4 flow and noise forms render as real procedural sources", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  const panel = page.locator(".procedural-source-panel");
  await expect(panel).toBeVisible();
  for (const name of ["Wave", "Ribbon", "Vortex", "Noise"]) {
    await expect(panel.getByRole("button", { name, exact: true })).toBeVisible();
  }

  await createKind(page, "Wave");
  await expect(page.getByRole("button", { name: "Original" })).toBeDisabled();
  await page.screenshot({ path: `${evidenceDir}/stage4-wave-point-1440x700-en.png`, fullPage: true });

  await createKind(page, "Ribbon");
  await page.getByRole("button", { name: "Glyph" }).click();
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(80);

  await createKind(page, "Vortex");
  await page.getByRole("button", { name: "Particle" }).click();
  await expect.poll(() => brightPixelCount(page)).toBeGreaterThan(80);
  await page.screenshot({ path: `${evidenceDir}/stage4-vortex-particle-1440x700-en.png`, fullPage: true });

  await createKind(page, "Noise");
  await page.getByLabel("Language").selectOption("ja");
  await expect(panel).toContainText("ウェーブ");
  await expect(panel).toContainText("リボン");
  await expect(panel).toContainText("渦");
  await expect(panel).toContainText("ノイズ");
  await expect(page.locator(".asset-card.selected")).toContainText("ノイズ");
  await expect(page.locator(".asset-card.selected")).toContainText("手続き生成素材");
  await page.screenshot({ path: `${evidenceDir}/stage4-noise-particle-1440x700-ja.png`, fullPage: true });
});

test("stage4 eight-form selector stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const firstRunPreviewTop = await page.locator(".preview-frame").evaluate((element) => element.getBoundingClientRect().top);
  expect(firstRunPreviewTop).toBeLessThan(844);

  await createKind(page, "Ribbon");
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyHeight).toBeGreaterThan(metrics.innerHeight);
  await page.screenshot({ path: `${evidenceDir}/stage4-ribbon-point-390x844-en.png`, fullPage: true });
});
