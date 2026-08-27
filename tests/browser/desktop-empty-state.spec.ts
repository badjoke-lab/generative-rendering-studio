import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

test("desktop first run is scrollable, source-honest, and keeps quickstart labels horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  await expect(page.locator(".empty-source-card")).toBeVisible();
  await expect(page.locator(".preview-frame .preview-canvas")).toHaveCSS("opacity", "0");
  await expect(page.locator(".inspector-panel")).toHaveCSS("pointer-events", "none");

  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }));
  expect(before.bodyOverflowY).toBe("auto");
  expect(before.scrollHeight).toBeGreaterThan(before.innerHeight);

  await page.getByLabel("Language").selectOption("ja");
  const stepLayout = await page.locator(".workflow-steps > span").evaluateAll((steps) =>
    steps.map((step) => {
      const rect = step.getBoundingClientRect();
      const style = getComputedStyle(step);
      return { width: rect.width, height: rect.height, whiteSpace: style.whiteSpace, wordBreak: style.wordBreak };
    }),
  );
  expect(stepLayout).toHaveLength(4);
  for (const step of stepLayout) {
    expect(step.width).toBeGreaterThan(90);
    expect(step.height).toBeLessThan(50);
    expect(step.whiteSpace).toBe("nowrap");
    expect(step.wordBreak).toBe("keep-all");
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/desktop-empty-state-scrollable-1440x700-ja.png`, fullPage: true });
});

test("mobile first run also hides the fake preview and remains scrollable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator(".empty-source-card")).toBeVisible();
  await expect(page.locator(".preview-frame .preview-canvas")).toHaveCSS("opacity", "0");
  await expect(page.locator(".canvas-status")).toBeHidden();

  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
  }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyHeight).toBeGreaterThan(metrics.innerHeight);
  expect(metrics.bodyOverflowY).toBe("auto");

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/mobile-empty-state-scrollable-390x844.png`, fullPage: true });
});
