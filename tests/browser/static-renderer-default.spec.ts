import { expect, test, type Page } from "@playwright/test";

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="black"/><circle cx="78" cy="80" r="52" fill="white"/><rect x="145" y="35" width="60" height="90" fill="#808080"/></svg>`,
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
    return { hash, visible, width: copy.width, height: copy.height };
  });
}

test("imported still renderers stay static until Motion is explicitly applied", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "static-source.svg",
    mimeType: "image/svg+xml",
    buffer: sourceSvg,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);

  for (const mode of ["Glyph", "Point", "Particle"] as const) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(page.locator(".canvas-status")).toContainText(`${mode} Mode`);
    await expect.poll(async () => (await canvasSignature(page)).visible).toBeGreaterThan(100);

    const first = await canvasSignature(page);
    await page.waitForTimeout(450);
    const second = await canvasSignature(page);

    expect(second.width).toBe(first.width);
    expect(second.height).toBe(first.height);
    expect(second.visible).toBe(first.visible);
    expect(second.hash).toBe(first.hash);
  }
});
