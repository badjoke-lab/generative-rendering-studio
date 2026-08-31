import { readFileSync } from "node:fs";
import { expect, test, type Locator } from "@playwright/test";

const primarySvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100">
    <rect width="160" height="100" fill="black"/>
    <rect x="10" y="20" width="50" height="60" fill="white"/>
  </svg>`,
);

const secondarySvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100">
    <rect x="90" y="10" width="60" height="80" fill="rgb(255,32,32)"/>
  </svg>`,
);

// Exercise React's real range-input event path instead of relying on text-entry semantics.
async function setRangeValue(locator: Locator, value: number) {
  await locator.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new Error("expected-range-input");
    }
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("adds an independent second source layer and preserves it in still export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Renderer Mode")).toBeVisible();

  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "primary.svg",
    mimeType: "image/svg+xml",
    buffer: primarySvg,
  });
  await expect(page.locator(".asset-meta strong").filter({ hasText: "primary.svg" })).toBeVisible();
  await page.getByRole("button", { name: "Original", exact: true }).click();

  const secondaryInput = page.locator('input[data-source-kind="scene-layer"]');
  await expect(secondaryInput).toBeEnabled();
  await secondaryInput.setInputFiles({
    name: "secondary.svg",
    mimeType: "image/svg+xml",
    buffer: secondarySvg,
  });
  await expect(page.locator('[data-source-role="scene-layer"] .asset-meta strong')).toHaveText("secondary.svg");

  const composite = page.locator('[data-independent-source-composite="true"]');
  const panel = page.locator('[data-stage5-layer-stack="independent-source"]');
  await expect(composite).toHaveAttribute("data-secondary-visible", "true");
  await expect(composite).toHaveAttribute("data-secondary-layer-order", "secondary-top");
  await expect(panel).toBeVisible();

  await setRangeValue(panel.getByLabel("Independent source opacity"), 45);
  await expect(panel.locator('[data-layer-id="source-secondary"] output')).toHaveText("45%");

  await panel.getByLabel("Blend mode: secondary.svg").selectOption("screen");
  await expect(composite).toHaveAttribute("data-secondary-blend-mode", "screen");

  await panel.getByLabel("Stack order").selectOption("main-top");
  await expect(composite).toHaveAttribute("data-secondary-layer-order", "main-top");
  await panel.getByLabel("Stack order").selectOption("secondary-top");
  await expect(composite).toHaveAttribute("data-secondary-layer-order", "secondary-top");

  await panel.getByRole("button", { name: "Toggle independent source visibility" }).click();
  await expect(composite).toHaveAttribute("data-secondary-visible", "false");
  await panel.getByRole("button", { name: "Toggle independent source visibility" }).click();
  await expect(composite).toHaveAttribute("data-secondary-visible", "true");
  await setRangeValue(panel.getByLabel("Independent source opacity"), 100);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("button.render-button").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("primary-svg-original-composite.png");
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const bytes = readFileSync(filePath!);
  expect(bytes.byteLength).toBeGreaterThan(500);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  const metrics = await page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("export-inspection-canvas-unavailable");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let redDominantPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha > 0 && red > 100 && red > green + 50 && red > blue + 50) redDominantPixels += 1;
    }
    bitmap.close();
    return { width: canvas.width, height: canvas.height, redDominantPixels };
  }, bytes.toString("base64"));

  expect(metrics.width).toBeGreaterThan(0);
  expect(metrics.height).toBeGreaterThan(0);
  expect(metrics.redDominantPixels).toBeGreaterThan(100);
});
