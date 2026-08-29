import { expect, test } from "@playwright/test";

const sourceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="black"/><circle cx="78" cy="80" r="52" fill="white"/><rect x="145" y="35" width="60" height="90" fill="#808080"/></svg>`,
);

test("Motion Strength keyframes scrub and play through the optional timeline", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[data-source-kind="still"]').setInputFiles({
    name: "timeline-source.svg",
    mimeType: "image/svg+xml",
    buffer: sourceSvg,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);

  const motionType = page.getByLabel("Motion type");
  await expect(motionType).toHaveValue("static");
  await expect(page.getByLabel("Timeline position")).toBeDisabled();

  await motionType.selectOption("pulse");
  const keyframeToggle = page.getByRole("button", { name: "Animate strength", exact: true });
  await keyframeToggle.click();
  await expect(keyframeToggle).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Start strength").fill("20");
  await page.getByLabel("End strength").fill("180");
  await page.getByLabel("Animation duration").fill("2");
  await page.getByLabel("Keyframe easing").selectOption("linear");

  const timeline = page.getByLabel("Motion Strength timeline position");
  await expect(timeline).toBeEnabled();
  await expect(page.locator('.transport-bar[data-timeline-mode="motion-strength"]')).toBeVisible();

  const motionSection = page.locator('[data-stage5-motion="true"]');
  await timeline.fill("0");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "0.200");
  await timeline.fill("50");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "1.000");
  await timeline.fill("100");
  await expect(motionSection).toHaveAttribute("data-motion-strength", "1.800");

  await page.getByRole("button", { name: "Timeline start", exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await page.getByRole("button", { name: "Play keyframes", exact: true }).click();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(5);
  await page.getByRole("button", { name: "Stop keyframes", exact: true }).click();

  await page.screenshot({ path: "preview-evidence/stage5-motion-keyframes-1440x700-en.png", fullPage: true });
});
