import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="50" cy="50" r="34" fill="white"/></svg>`,
);
const targetSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="90" y="20" width="50" height="60" fill="white"/></svg>`,
);

function morphSection(page: Page) {
  return page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Morph", exact: true }),
  });
}

test("Morph Camera and Motion keyframes share one Studio playhead", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Renderer Mode")).toBeVisible();

  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "multi-source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "multi-target.svg", mimeType: "image/svg+xml", buffer: targetSvg });

  const morphToggle = morphSection(page).locator("button.toggle");
  await morphToggle.click();
  await expect(morphToggle).toHaveAttribute("aria-pressed", "true");

  const motionSection = page.locator('section[data-stage5-motion="true"]');
  await motionSection.getByLabel("Motion type").selectOption("pulse");
  const motionToggle = motionSection.getByLabel("Toggle keyframes");
  await expect(motionToggle).toBeEnabled();
  await motionToggle.click();
  await expect(motionToggle).toHaveAttribute("aria-pressed", "true");

  const cameraSection = page.locator('section[data-stage5-camera="true"]');
  const cameraToggle = cameraSection.getByLabel("Toggle Camera keyframes");
  await expect(cameraToggle).toBeEnabled();
  await cameraToggle.click();
  await expect(cameraToggle).toHaveAttribute("aria-pressed", "true");

  const transport = page.locator(".transport-bar");
  await expect(transport).toHaveAttribute("data-timeline-mode", "multi-track");
  await expect(transport).toHaveAttribute("data-timeline-tracks", "morph+camera+motion-strength");
  await expect(transport.getByText("Studio tracks", { exact: true })).toBeVisible();

  const playhead = transport.locator('input[type="range"]');
  await expect(playhead).toHaveAttribute("aria-label", "Studio timeline position");
  await playhead.fill("50");

  const canvas = page.locator("canvas.preview-canvas");
  await expect(canvas).toHaveAttribute("data-morph-progress", "0.500");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.175");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "1.000");

  await page.screenshot({ path: `${evidenceDir}/stage5-multitrack-1440x700-en.png`, fullPage: true });

  await page.getByLabel("Language").selectOption("ja");
  await expect(transport.getByText("Studioトラック", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/stage5-multitrack-1440x700-ja.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(transport).toHaveAttribute("data-timeline-mode", "multi-track");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: `${evidenceDir}/stage5-multitrack-390x844-ja.png`, fullPage: true });
});
