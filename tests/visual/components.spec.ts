import { test, expect } from "@playwright/test";
import { gotoStable } from "./pages.spec";

/**
 * Component-level snapshots. These catch regressions in the sticky header,
 * hero and footer independently of long-page content changes.
 */
test.describe("component visual regression", () => {
  test("header", async ({ page }) => {
    await gotoStable(page, "/");
    await expect(page.locator("header").first()).toHaveScreenshot("header.png");
  });

  test("hero", async ({ page }) => {
    await gotoStable(page, "/");
    await expect(page.locator("main section").first()).toHaveScreenshot("hero.png");
  });

  test("footer", async ({ page }) => {
    await gotoStable(page, "/");
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toHaveScreenshot("footer.png");
  });
});
