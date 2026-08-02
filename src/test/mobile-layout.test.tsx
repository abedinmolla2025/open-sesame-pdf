import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "@/pages/Home";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const renderAt = (ui: React.ReactElement) =>
  render(<MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>);

/** Class tokens that would pin an element wider than a 360px phone. */
const overflowRisk = (el: Element) => {
  const cls = el.getAttribute("class") ?? "";
  const decorative = /(^|\s)(absolute|fixed)(\s|$)/.test(cls);
  if (decorative) return false;
  if (/(^|\s)w-screen(\s|$)/.test(cls)) return true;
  const widths = [...cls.matchAll(/(?:^|\s)(?:min-)?w-\[(\d+)px\]/g)].map((m) => Number(m[1]));
  return widths.some((w) => w >= 360);
};

const inlinePxWidth = (el: Element) => {
  const style = el.getAttribute("style") ?? "";
  const match = style.match(/(?:min-)?width:\s*(\d+)px/);
  return match ? Number(match[1]) >= 360 : false;
};

describe("mobile layout regressions", () => {
  it("renders the homepage without fixed-width layout elements", () => {
    const { container } = renderAt(<Home />);
    const offenders = [...container.querySelectorAll("*")]
      .filter((el) => overflowRisk(el) || inlinePxWidth(el))
      .map((el) => el.tagName + "." + (el.getAttribute("class") ?? "").slice(0, 60));
    expect(offenders).toEqual([]);
  });

  it("keeps decorative hero glows out of the layout flow", () => {
    const { container } = renderAt(<Home />);
    const wide = [...container.querySelectorAll('[class*="w-[900px]"], [class*="w-[420px]"]')];
    expect(wide.length).toBeGreaterThan(0);
    for (const el of wide) {
      expect(el.getAttribute("class")).toMatch(/(^|\s)absolute(\s|$)/);
      // Their aria-hidden wrapper must also be non-interactive.
      expect(el.parentElement?.getAttribute("class")).toMatch(/pointer-events-none/);
    }
  });

  it("stacks the hero CTAs on mobile and rows them from sm up", () => {
    renderAt(<Home />);
    const explore = screen.getAllByRole("link", { name: /explore tools/i })[0];
    expect(explore.getAttribute("class")).toMatch(/w-full/);
    expect(explore.getAttribute("class")).toMatch(/sm:w-auto/);
  });

  it("keeps the tool search input inside the viewport width", () => {
    renderAt(<Home />);
    const input = screen.getByLabelText(/search for a tool/i);
    const cls = input.getAttribute("class") ?? "";
    expect(cls).not.toMatch(/w-\[\d+px\]/);
    expect(cls).toMatch(/text-sm/);
  });

  it("starts every homepage tool grid at a single column", () => {
    const { container } = renderAt(<Home />);
    const grids = [...container.querySelectorAll('[class*="grid-cols-"]')];
    expect(grids.length).toBeGreaterThan(0);
    for (const grid of grids) {
      const cls = grid.getAttribute("class") ?? "";
      const base = cls.match(/(?:^|\s)grid-cols-(\d+)/);
      if (base) expect(Number(base[1])).toBe(1);
    }
  });

  it("truncates the brand name in the header instead of pushing it wide", () => {
    renderAt(<Header />);
    const brand = screen.getByText("Open Sesame PDF");
    expect(brand.getAttribute("class")).toMatch(/truncate/);
    expect(brand.parentElement?.getAttribute("class")).toMatch(/min-w-0/);
  });

  it("collapses the footer to a stacked/two-column grid on small screens", () => {
    const { container } = renderAt(<Footer />);
    const grid = container.querySelector('[class*="grid"]');
    const cls = grid?.getAttribute("class") ?? "";
    expect(cls).toMatch(/sm:grid-cols-2/);
    expect(cls).toMatch(/md:grid-cols-4/);
    expect(cls).not.toMatch(/(^|\s)grid-cols-[2-9]/);
  });
});
