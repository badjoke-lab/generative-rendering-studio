import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const evidenceDir = "preview-evidence";
mkdirSync(evidenceDir, { recursive: true });

const movingSquareWebm = Buffer.from(
  "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAASeEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEjTbuMU6uEHFO7a1OsggSI7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuNy4xMDNXQYxMYXZmNjEuNy4xMDNEiYhAn0AAAAAAABZUrmvIrgEAAAAAAAA/14EBc8WIBfTOZa6/QCOcgQAitZyDdW5kiIEAhoVWX1ZQOYOBASPjg4QE95DV4JCwgaC6gWSagQJVsIRVuYEBElTDZ0B/c3OfY8CAZ8iZRaOHRU5DT0RFUkSHjExhdmY2MS43LjEwM3Nz2mPAi2PFiAX0zmWuv0AjZ8ilRaOHRU5DT0RFUkSHmExhdmM2MS4xOS4xMDEgbGlidnB4LXZwOWfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDIuMDAwMDAwMDAwAB9DtnVC2ueBAKPkgQAAgIJJg0IACfAGNgg4JBwYQgAAMHAAAGmH//9ZrxFeriFJP9TzqPpDA4EBcGme6lxDmq7RgEkFAANwAJ8wWNFjGNjP/c14FtR01EZQsXbFc5twDQgbtcne/DBxR+5AxDW8AKOYgQBTAIYAQJKcEElAAAMgAABgcyvR65ygo5eBAKcAhgBAkpwQSsAAAyAAAFoBd0wkgKOYgQD6AIYAQJKcEEnAAAMgAABgV5WUhxYAo5iBAU0AhgBAkpwQSKAAAyAAAF/rlZSHFgCjl4EBoQCGAECSnBBHgAADIAAAWgF3TCSAo5qBAfQAhgBAkpwQRuAAAyAAAGBZsS+T0QYHoKOZgQJHAIYAQJKcEEZAAAMgAABf65WUk533AKOXgQKbAIYAQJKcEEXAAAMgAABaAXdjlpCjmYEC7gCGAECSnBBFQAADIAAAYFeVlJOd9wCjr4EDQQCGAMCSnBBB4AADcAAAejwRtQY2ZDN4rQzSf+LpVh0y7Z2sXlMNUymhWm+go5mBA5UAhgBAkpwQROAAAyAAAF/rlWH7xH0Ao5iBA+gAhgBAkpwQRGAAAyAAAGBXlV7D3TCjl4EEOwCGAECSnABEAAADIAAAW5kWzgz4o5aBBI8AhgBAkpwAQ6AAAyAAAFtEGjyoo5eBBOIAhgBAkpwAQ0AAAyAAAFn+K73AAKOXgQU1AIYAQJKcAEMAAAMgAABbmRbODPijmoEFiQCGAECSnBBCwAADIAAAXV1Xw1oZHmIAo5eBBdwAhgBAkpwQQoAAAyAAAFn+K73AAKOXgQYvAIYAQJKcEEJAAAMgAABbmRbODPijooEGgwCGAMCSnBBAIAADIAAAXWaplkED8XWcxhKQ67e/mJCjl4EG1gCGAECSnBBCAAADIAAAWf4rvcAAo5eBBykAhgBAkpwQQeAAAyAAAFuZFs4M+KOXgQd9AIYAQJKcEEHAAAMgAABZ/iu9wAAcU7trkbuPs4EAt4r3gQHxggGo8IED",
  "base64",
);

test("imports a browser-decodable video and transforms changing frames", async ({ page }) => {
  await page.goto("/");
  const videoInput = page.locator('input[data-source-kind="video"]');
  await videoInput.setInputFiles({ name: "stage3-moving-square.webm", mimeType: "video/webm", buffer: movingSquareWebm });

  await expect(page.locator(".asset-meta strong").filter({ hasText: "stage3-moving-square.webm" })).toBeVisible();
  await expect(page.locator(".asset-meta")).toContainText("Video");
  await expect(page.getByText(/Video-to-source Morph is not part of this Stage 3 baseline/)).toBeVisible();

  await page.getByRole("button", { name: "Point", exact: true }).click();
  const preview = page.locator(".preview-frame");
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-start.png` });
  const start = await page.locator("canvas").screenshot();

  await page.getByLabel("Play video").click();
  await page.waitForTimeout(850);
  await page.getByLabel("Pause video").click();
  const position = Number(await page.getByLabel("Video position").inputValue());
  expect(position).toBeGreaterThan(15);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-playing.png` });
  const later = await page.locator("canvas").screenshot();
  expect(later.equals(start)).toBe(false);

  await page.getByLabel("Video position").fill("80");
  await page.waitForTimeout(200);
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-point-seek-80.png` });
  const seeked = await page.locator("canvas").screenshot();
  expect(seeked.equals(later)).toBe(false);

  await page.getByRole("button", { name: "Original", exact: true }).click();
  await expect(page.locator(".canvas-status")).toContainText("Original Mode");
  await preview.screenshot({ path: `${evidenceDir}/stage3-video-original-seek-80.png` });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current frame", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("stage3-moving-square-webm-original.png");
});
