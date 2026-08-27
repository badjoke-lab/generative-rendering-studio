import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";

test("390px Japanese first-run flow is understandable and does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByLabel("Language").selectOption("ja");

  await expect(page.getByText("まずここから", { exact: true })).toBeVisible();
  await expect(page.getByText("素材を追加 → 見た目を選ぶ → 必要なら2つ目の素材へ変形 → 保存、の順で使います。", { exact: true })).toBeVisible();
  await expect(page.getByText("まだ素材がありません", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /画像 \/ SVGを追加/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "＋ テキスト", exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: "動画", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "3D", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "タイムライン", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "エフェクト", exact: true })).toHaveCount(0);

  const saveButton = page.getByRole("button", { name: "保存", exact: true });
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toBeDisabled();

  const metrics = await page.evaluate(() => {
    const save = document.querySelector<HTMLButtonElement>(".render-button");
    const preview = document.querySelector<HTMLElement>(".preview-frame");
    const saveRect = save?.getBoundingClientRect();
    const previewRect = preview?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      saveRight: saveRect?.right ?? Infinity,
      saveTop: saveRect?.top ?? Infinity,
      saveBottom: saveRect?.bottom ?? Infinity,
      saveWhiteSpace: save ? getComputedStyle(save).whiteSpace : "",
      previewTop: previewRect?.top ?? Infinity,
      previewHeight: previewRect?.height ?? 0,
    };
  });

  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.saveRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.saveTop).toBeGreaterThanOrEqual(0);
  expect(metrics.saveBottom).toBeLessThanOrEqual(60);
  expect(metrics.saveWhiteSpace).toBe("nowrap");
  expect(metrics.previewTop).toBeLessThan(metrics.viewportHeight);
  expect(metrics.previewHeight).toBeGreaterThan(250);

  await page.screenshot({ path: `${evidenceDir}/mobile-first-run-ja-390x844.png`, fullPage: true });
});
