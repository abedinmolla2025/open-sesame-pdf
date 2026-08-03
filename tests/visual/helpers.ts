import { type Page } from "@playwright/test";

/**
 * Key routes covered by visual regression. Keep this list small and
 * high-signal — homepage plus one page per layout archetype.
 */
export const ROUTES = [
  { slug: "home", path: "/" },
  { slug: "unlock-pdf", path: "/unlock-pdf" },
  { slug: "merge", path: "/merge" },
  { slug: "image-tools", path: "/image-tools" },
  { slug: "about", path: "/about" },
] as const;

/** Freeze anything that would make screenshots non-deterministic. */
export async function stabilize(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
}

/** Navigate, suppress overlays/animations, wait for fonts, then settle. */
export async function gotoStable(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Dismiss consent / install prompts so they don't overlay content.
  await page.evaluate(() => {
    try {
      localStorage.setItem("imagetools-cookie-consent", "accepted");
      localStorage.setItem("pwa-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await stabilize(page);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
}
