import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
const outputDir = `${evidenceDir}/outputs`;
mkdirSync(outputDir, { recursive: true });

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><circle cx="50" cy="50" r="34" fill="white"/></svg>`,
);

const targetSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="black"/><rect x="90" y="20" width="50" height="60" fill="white"/></svg>`,
);

test("webkit second-browser critical import Morph and still-export path", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "This release-candidate check is reserved for the WebKit project");
  await page.goto("/");
  await expect(page.getByText("Renderer Mode")).toBeVisible();

  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "source.svg", mimeType: "image/svg+xml", buffer: sourceSvg });
  await fileInputs.nth(1).setInputFiles({ name: "target.svg", mimeType: "image/svg+xml", buffer: targetSvg });
  await expect(page.getByText("WebGL2 is not available in this browser/device.")).toHaveCount(0);

  const morphSection = page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Morph", exact: true }),
  });
  const toggle = morphSection.locator("button.toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const timeline = page.getByLabel("Timeline position");
  await timeline.fill("100");
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();

  const exportSection = page.locator("section.inspector-section").filter({
    has: page.getByRole("heading", { name: "Still Export", exact: true }),
  });
  await exportSection.locator("select").selectOption("png");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame" }).click();
  const download = await downloadPromise;
  const outputPath = `${outputDir}/webkit-${download.suggestedFilename()}`;
  await download.saveAs(outputPath);

  const bytes = readFileSync(outputPath);
  expect(bytes.byteLength).toBeGreaterThan(500);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await page.screenshot({ path: `${evidenceDir}/webkit-critical.png`, fullPage: true });
});
