import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const circleSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="black"/><circle cx="70" cy="90" r="55" fill="white"/></svg>`,
);

const squareSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="black"/><rect x="130" y="35" width="110" height="110" fill="white"/></svg>`,
);

const starSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="black"/><polygon fill="white" points="70,25 84,68 130,68 93,94 107,138 70,112 33,138 47,94 10,68 56,68"/></svg>`,
);

const triangleSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="black"/><polygon fill="white" points="185,25 125,145 240,145"/></svg>`,
);

function morphSection(page: Page) {
  return page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Morph", exact: true }),
  });
}

async function captureMorph(
  page: Page,
  label: string,
  source: Buffer,
  target: Buffer,
) {
  await page.goto("/");
  const stillInput = page.locator('input[data-source-kind="still"]');
  const morphInput = page.locator('input[data-source-kind="morph"]');
  await stillInput.setInputFiles({ name: `${label}-a.svg`, mimeType: "image/svg+xml", buffer: source });
  await morphInput.setInputFiles({ name: `${label}-b.svg`, mimeType: "image/svg+xml", buffer: target });
  await expect(page.getByText("WebGL2 is not available in this browser/device.")).toHaveCount(0);

  const toggle = morphSection(page).locator("button.toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const timeline = page.getByLabel("Timeline position");
  for (const progress of [0, 50, 100]) {
    await timeline.fill(String(progress));
    await expect(page.getByText(`${progress}%`, { exact: true }).first()).toBeVisible();
    await page.locator(".preview-frame").screenshot({
      path: `${evidenceDir}/morph-correspondence-${label}-${progress}.png`,
    });
  }
}

test("retains circle-to-square correspondence evidence without scanline ordering", async ({ page }) => {
  await captureMorph(page, "circle-square", circleSvg, squareSvg);
});

test("retains star-to-triangle correspondence evidence for the real-device banding regression", async ({ page }) => {
  await captureMorph(page, "star-triangle", starSvg, triangleSvg);
});
