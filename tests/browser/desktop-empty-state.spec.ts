import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

test("desktop first run has no fake render and the page scrolls vertically", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  await expect(page.locator(".empty-source-card")).toBeVisible();
  await expect(page.locator(".preview-frame .preview-canvas")).toHaveCSS("visibility", "hidden");
  await expect(page.locator(".inspector-panel")).toHaveCSS("pointer-events", "none");

  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }));
  expect(before.bodyOverflowY).toBe("auto");
  expect(before.scrollHeight).toBeGreaterThan(before.innerHeight);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/desktop-empty-state-scrollable-1440x700.png`, fullPage: true });
});
