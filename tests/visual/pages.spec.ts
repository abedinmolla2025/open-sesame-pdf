import { test, expect } from "@playwright/test";
import { ROUTES, gotoStable } from "./helpers";

test.describe("page visual regression", () => {
  for (const route of ROUTES) {
    test(`${route.slug} matches baseline`, async ({ page }) => {
      await gotoStable(page, route.path);
      await expect(page).toHaveScreenshot(`${route.slug}.png`, { fullPage: true });
    });
  }
});

test("no horizontal overflow on any route", async ({ page }) => {
  for (const route of ROUTES) {
    await gotoStable(page, route.path);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `${route.path} overflows horizontally (${scrollWidth}px > ${clientWidth}px)`
    ).toBeLessThanOrEqual(clientWidth + 1);
  }
});
