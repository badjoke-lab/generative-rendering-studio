import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

async function inspectDownloadedImage(
  page: import("@playwright/test").Page,
  filePath: string,
  mimeType: "image/png" | "image/webp",
) {
  const bytes = readFileSync(filePath);
  expect(bytes.byteLength).toBeGreaterThan(500);
  if (mimeType === "image/png") {
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  } else {
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  }

  const metrics = await page.evaluate(
    async ({ base64, mimeType }) => {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("image-decode-canvas-unavailable");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      let min = 255;
      let max = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if ((pixels[index + 3] ?? 0) === 0) continue;
        const luma = ((pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0)) / 3;
        visible += 1;
        min = Math.min(min, luma);
        max = Math.max(max, luma);
      }
      bitmap.close();
      return { width: canvas.width, height: canvas.height, visible, contrast: max - min };
    },
    { base64: bytes.toString("base64"), mimeType },
  );

  expect(metrics.width).toBeGreaterThan(100);
  expect(metrics.height).toBeGreaterThan(100);
  expect(metrics.visible).toBeGreaterThan(100);
  expect(metrics.contrast).toBeGreaterThan(20);
}

test("stage4 procedural sources export usable PNG and WebP stills", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/");

  const panel = page.locator(".procedural-source-panel");
  await panel.getByRole("button", { name: "Bloom", exact: true }).click();
  await panel.getByRole("button", { name: /Create procedural source/ }).click();
  await expect(page.locator(".asset-card.selected")).toContainText("Bloom");
  await expect(page.getByRole("button", { name: "Point", exact: true })).toHaveClass(/active/);

  const format = page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Still Export", exact: true }),
  }).locator("select");

  for (const output of [
    { value: "png", extension: "png", mimeType: "image/png" as const },
    { value: "webp", extension: "webp", mimeType: "image/webp" as const },
  ]) {
    await format.selectOption(output.value);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export current frame" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`Bloom-point.${output.extension}`);
    const outputPath = `${outputDir}/${download.suggestedFilename()}`;
    await download.saveAs(outputPath);
    await inspectDownloadedImage(page, outputPath, output.mimeType);
  }

  await page.screenshot({ path: `${evidenceDir}/stage4-completion-bloom-export-1440x700-en.png`, fullPage: true });
});
