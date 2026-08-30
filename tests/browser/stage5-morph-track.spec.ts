import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const sourceSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="45" cy="50" r="30" fill="white"/></svg>`);
const targetSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="100" y="20" width="40" height="60" fill="white"/></svg>`);

async function loadMorphPair(page: import("@playwright/test").Page) {
  await page.locator('input[data-source-kind="still"]').setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await page.locator('input[data-source-kind="morph"]').setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });
  await expect(page.locator(".asset-card")).toContainText(["source.svg", "target.svg"]);
}

test("Stage 5 Morph is a seconds-based Timeline track rather than a separate playback clock", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await loadMorphPair(page);

  const morph = page.locator("section.inspector-section").filter({ has: page.getByRole("heading", { name: "Morph", exact: true }) });
  await morph.locator("button.toggle").click();
  await morph.getByLabel("Easing").selectOption("linear");
  await morph.getByLabel("Duration").fill("2");

  const transport = page.locator(".transport-bar");
  const timeline = transport.locator('input[type="range"]');
  const canvas = page.locator(".preview-frame .preview-canvas");
  await expect(transport).toHaveAttribute("data-timeline-mode", "morph-track");

  await timeline.fill("0");
  await expect(canvas).toHaveAttribute("data-morph-progress", "0.000");
  await timeline.fill("50");
  await expect(canvas).toHaveAttribute("data-morph-progress", "0.500");
  await timeline.fill("100");
  await expect(canvas).toHaveAttribute("data-morph-progress", "1.000");

  await timeline.fill("0");
  await page.getByRole("button", { name: "Play keyframes" }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-morph-progress"))).toBeGreaterThan(0.02);
  await page.getByRole("button", { name: "Stop keyframes" }).click();

  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(transport).toContainText("モーフ進行");
  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-1440x700-ja.png`, fullPage: true });
});

test("Morph Track stays usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await loadMorphPair(page);
  const morph = page.locator("section.inspector-section").filter({ has: page.getByRole("heading", { name: "Morph", exact: true }) });
  await morph.locator("button.toggle").click();
  await expect(page.locator(".transport-bar")).toHaveAttribute("data-timeline-mode", "morph-track");
  const metrics = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await page.screenshot({ path: `${evidenceDir}/stage5-morph-track-390x844-en.png`, fullPage: true });
});
