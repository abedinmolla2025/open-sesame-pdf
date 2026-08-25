import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const makeFixture = async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("Mobile editor responsive test", {
    x: 48,
    y: 760,
    size: 18,
    font,
    color: rgb(0.08, 0.1, 0.14),
  });
  page.drawText("Replace this phrase during testing.", {
    x: 48,
    y: 720,
    size: 12,
    font,
    color: rgb(0.08, 0.1, 0.14),
  });
  return document.save();
};

test("loaded editor remains usable at 390px", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, "Mobile-only regression test");

  await page.goto("/editor", { waitUntil: "networkidle" });
  const pdf = await makeFixture();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "responsive-test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await page.waitForSelector('img.pdf-bg', { timeout: 30_000 });
  await page.waitForSelector('button[aria-label^="Choose editor tool"]', { timeout: 30_000 });

  const metrics = await page.evaluate(() => {
    const save = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Save PDF"));
    const tools = [...document.querySelectorAll("aside")].find((aside) => aside.textContent?.includes("Editor tools"));
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      saveRight: save?.getBoundingClientRect().right ?? 0,
      quickToolsRight: tools?.getBoundingClientRect().right ?? 0,
    };
  });

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.saveRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.quickToolsRight).toBeLessThanOrEqual(metrics.viewportWidth);
  await expect(page.getByRole("button", { name: /Save PDF/i })).toBeVisible();
  await expect(page.getByText("Editor tools", { exact: true })).toBeVisible();
});
