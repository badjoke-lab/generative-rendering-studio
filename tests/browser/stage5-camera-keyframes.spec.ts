import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

async function createRibbon(page: import("@playwright/test").Page) {
  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name: "Ribbon" }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Ribbon");
}

test("Stage 5 Camera keyframes sample through the shared transport and can combine with Motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");
  await createRibbon(page);

  const camera = page.locator('[data-stage5-camera="true"]');
  await camera.getByRole("button", { name: "Toggle Camera keyframes" }).click();
  await expect(camera).toHaveAttribute("data-stage5-camera-keyframes", "on");
  await camera.getByLabel("Camera duration").fill("2");
  await camera.getByLabel("End Pan X").fill("35");
  await camera.getByLabel("End Pan Y").fill("-15");
  await camera.getByLabel("End Zoom").fill("140");
  await camera.getByLabel("End Rotation").fill("25");

  const canvas = page.locator(".preview-frame .preview-canvas");
  const timeline = page.locator('.transport-bar input[type="range"]');
  await timeline.fill("0");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.000");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "0.000");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.000");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "0.0");

  await timeline.fill("50");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.175");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "-0.075");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.200");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "12.5");

  await timeline.fill("100");
  await expect(canvas).toHaveAttribute("data-camera-pan-x", "0.350");
  await expect(canvas).toHaveAttribute("data-camera-pan-y", "-0.150");
  await expect(canvas).toHaveAttribute("data-camera-zoom", "1.400");
  await expect(canvas).toHaveAttribute("data-camera-rotation", "25.0");

  const motion = page.locator('[data-stage5-motion="true"]');
  await motion.getByLabel("Motion type").selectOption("pulse");
  await motion.getByRole("button", { name: "Toggle keyframes" }).click();
  const transport = page.locator(".transport-bar");
  await expect(transport).toHaveAttribute("data-timeline-mode", "multi-track");
  await expect(transport).toHaveAttribute("data-timeline-tracks", "camera+motion-strength");
  await timeline.fill("0");
  await page.getByRole("button", { name: "Play keyframes" }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-camera-pan-x"))).toBeGreaterThan(0.01);
  await page.getByRole("button", { name: "Stop keyframes" }).click();

  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-1440x700-en.png`, fullPage: true });
  await page.getByLabel("Language").selectOption("ja");
  await expect(camera).toContainText("カメラをキーフレーム化");
  await expect(page.locator(".transport-time")).toContainText("Studioトラック");
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-1440x700-ja.png`, fullPage: true });
});

test("Camera keyframe controls stay usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createRibbon(page);
  const camera = page.locator('[data-stage5-camera="true"]');
  await camera.getByRole("button", { name: "Toggle Camera keyframes" }).click();
  await expect(camera.getByLabel("End Zoom")).toBeVisible();
  const metrics = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await page.screenshot({ path: `${evidenceDir}/stage5-camera-keyframes-390x844-en.png`, fullPage: true });
});
