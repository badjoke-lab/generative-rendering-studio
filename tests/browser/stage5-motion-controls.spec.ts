import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="black"/><circle cx="72" cy="78" r="48" fill="white"/><rect x="142" y="30" width="64" height="96" fill="#808080"/></svg>`,
);

async function canvasSignature(page: Page) {
  return page.locator(".preview-frame canvas").first().evaluate((canvas: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("signature-canvas-unavailable");
    ctx.drawImage(canvas, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let hash = 2166136261 >>> 0;
    let visible = 0;
    for (let index = 0; index < pixels.length; index += 1) {
      hash ^= pixels[index] ?? 0;
      hash = Math.imul(hash, 16777619) >>> 0;
      if (index % 4 === 3 && (pixels[index] ?? 0) > 0) visible += 1;
    }
    return { hash, visible };
  });
}

async function expectCanvasToMove(page: Page) {
  const first = await canvasSignature(page);
  expect(first.visible).toBeGreaterThan(100);
  await expect.poll(async () => (await canvasSignature(page)).hash, { timeout: 2000 }).not.toBe(first.hash);
}

test("Stage 5 Motion stays Static by default and moves only after explicit user selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Retained Motion visual evidence is captured in Chromium");
  await page.goto("/");
  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "motion-source.svg",
    mimeType: "image/svg+xml",
    buffer: sourceSvg,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Point", exact: true }).click();

  const motionType = page.getByLabel("Motion type");
  await expect(motionType).toHaveValue("static");
  await expect(page.getByLabel("Strength")).toHaveCount(0);
  await expect(page.getByLabel("Speed")).toHaveCount(0);

  const staticFirst = await canvasSignature(page);
  expect(staticFirst.visible).toBeGreaterThan(100);
  await page.waitForTimeout(450);
  const staticSecond = await canvasSignature(page);
  expect(staticSecond.hash).toBe(staticFirst.hash);
  await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/stage5-motion-static.png` });

  await motionType.selectOption("pulse");
  await page.getByLabel("Strength").fill("200");
  await page.getByLabel("Speed").fill("300");
  await expectCanvasToMove(page);
  await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/stage5-motion-pulse.png` });

  await motionType.selectOption("drift");
  await expectCanvasToMove(page);
  await page.locator(".preview-frame").screenshot({ path: `${evidenceDir}/stage5-motion-drift.png` });

  await motionType.selectOption("static");
  await page.waitForTimeout(80);
  const restoredFirst = await canvasSignature(page);
  await page.waitForTimeout(450);
  const restoredSecond = await canvasSignature(page);
  expect(restoredSecond.hash).toBe(restoredFirst.hash);

  await page.getByLabel("Language").selectOption("ja");
  await expect(page.getByRole("heading", { name: "動き", exact: true })).toBeVisible();
  await expect(page.getByLabel("動きの種類")).toHaveValue("static");
  await page.screenshot({ path: `${evidenceDir}/stage5-motion-1440x700-ja.png`, fullPage: true });
});
