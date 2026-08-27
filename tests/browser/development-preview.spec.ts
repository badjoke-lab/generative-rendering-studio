import { expect, test, type Page } from "@playwright/test";

const png1x1White = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=",
  "base64",
);

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="50" cy="50" r="34" fill="white"/></svg>`,
);

const targetSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="90" y="20" width="50" height="60" fill="white"/></svg>`,
);

function assetName(page: Page, name: string) {
  return page.locator(".asset-meta strong").filter({ hasText: name });
}

function morphToggle(page: Page) {
  const section = page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Morph", exact: true }),
  });
  return section.locator("button.toggle");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Renderer Mode")).toBeVisible();
});

test("imports supported still sources and switches renderers", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.png", mimeType: "image/png", buffer: png1x1White });
  await expect(assetName(page, "source.png")).toBeVisible();

  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await expect(assetName(page, "source.svg")).toBeVisible();

  for (const renderer of ["Original", "Glyph", "Point", "Particle"]) {
    await page.getByRole("button", { name: renderer, exact: true }).click();
    await expect(page.getByText(`${renderer} Mode`, { exact: true })).toBeVisible();
  }

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
});

test("creates text and persists Japanese locale selection", async ({ page }) => {
  page.once("dialog", async (dialog) => dialog.accept("テスト"));
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(assetName(page, "テスト")).toBeVisible();

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByText("レンダラー", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("言語")).toHaveValue("ja");
});

test("runs coherent A-to-B Morph controls and exports a still", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });

  await expect(assetName(page, "target.svg")).toBeVisible();
  const toggle = morphToggle(page);
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Stage 2 morph preview")).toBeVisible();

  const timeline = page.getByLabel("Timeline position");
  await timeline.fill("100");
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
  await timeline.fill("0");

  const stillDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame" }).click();
  const download = await stillDownload;
  expect(download.suggestedFilename()).toMatch(/source-svg-point\.png$/);
  const path = await download.path();
  expect(path).toBeTruthy();
});

test("records a short Morph animation when Chromium exposes canvas recording", async ({ page }) => {
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });

  const toggle = morphToggle(page);
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const animationButton = page.getByRole("button", { name: "Export Morph animation" });
  if (await animationButton.isDisabled()) {
    await expect(page.getByText("Short animation export is not supported by this browser/device.")).toBeVisible();
    test.skip(true, "Chromium runner does not expose canvas MediaRecorder");
  }

  const durationLabel = page.getByText("Duration", { exact: true }).locator("..");
  await durationLabel.locator('input[type="range"]').fill("1");

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await animationButton.click();
  await expect(page.getByRole("button", { name: "Recording animation…" })).toBeDisabled();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/source-svg-to-target-svg-point\.(webm|mp4)$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  await expect(page.getByText("Animation file created. The preview is held on the final frame.")).toBeVisible();
});

test("narrow viewport keeps the Studio document alive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("main.studio-shell")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    canvasCount: document.querySelectorAll("canvas").length,
  }));
  expect(metrics.bodyWidth).toBeGreaterThan(0);
  expect(metrics.bodyHeight).toBeGreaterThan(0);
  expect(metrics.canvasCount).toBeGreaterThan(0);
});
