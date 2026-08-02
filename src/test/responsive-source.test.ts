import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Static responsive regression guards.
 *
 * These rules encode the mobile-fit fixes so future edits can't silently
 * reintroduce horizontal overflow or desktop-only layouts.
 */

const SRC = path.resolve(__dirname, "..");
const IGNORED_DIRS = new Set(["ui", "test"]);

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      collectFiles(full, acc);
    } else if (/\.tsx$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = collectFiles(SRC).map((file) => ({
  file: path.relative(SRC, file),
  source: readFileSync(file, "utf8"),
}));

/** Every `className="..."` literal in a file, with its 1-based line number. */
function classNames(source: string): { line: number; value: string }[] {
  const out: { line: number; value: string }[] = [];
  source.split("\n").forEach((text, i) => {
    for (const m of text.matchAll(/className="([^"]*)"/g)) {
      out.push({ line: i + 1, value: m[1] });
    }
  });
  return out;
}

const isDecorative = (value: string) => /(^|\s)(absolute|fixed)(\s|$)/.test(value);

describe("responsive source guards", () => {
  it("has files to check", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("never sizes layout elements with viewport-wide units", () => {
    const offenders: string[] = [];
    for (const { file, source } of FILES) {
      for (const { line, value } of classNames(source)) {
        if (/(^|[\s:])(w-screen|min-w-screen|min-w-\[100vw\])/.test(value)) {
          offenders.push(`${file}:${line} → ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("only allows wide fixed pixel widths on absolutely positioned decoration", () => {
    const offenders: string[] = [];
    for (const { file, source } of FILES) {
      for (const { line, value } of classNames(source)) {
        const widths = [...value.matchAll(/(?:^|[\s:])(?:min-)?w-\[(\d+)px\]/g)].map((m) =>
          Number(m[1])
        );
        // 360px is the narrowest phone width we support.
        if (widths.some((w) => w >= 360) && !isDecorative(value)) {
          offenders.push(`${file}:${line} → ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not use dense unprefixed grid columns that break on phones", () => {
    const offenders: string[] = [];
    for (const { file, source } of FILES) {
      for (const { line, value } of classNames(source)) {
        for (const m of value.matchAll(/(^|\s)grid-cols-(\d+)/g)) {
          if (Number(m[2]) >= 5) offenders.push(`${file}:${line} → ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps mobile gutters on the homepage, header and footer containers", () => {
    const shells = FILES.filter((f) =>
      ["pages/Home.tsx", "components/Header.tsx", "components/Footer.tsx"].includes(f.file)
    );
    expect(shells).toHaveLength(3);

    for (const { file, source } of shells) {
      const containers = classNames(source).filter((c) => /(^|\s)container(\s|$)/.test(c.value));
      expect(containers.length, `${file} should use container`).toBeGreaterThan(0);
      for (const c of containers) {
        expect(c.value, `${file}:${c.line} needs a mobile gutter (px-*)`).toMatch(/(^|\s)px-\d/);
      }
    }
  });

  it("keeps the homepage hero fluid on small screens", () => {
    const home = FILES.find((f) => f.file === "pages/Home.tsx")!;
    // Heading and body copy must scale up from a mobile base size.
    expect(home.source).toMatch(/text-\[1\.9rem\][^"]*sm:text-4xl/);
    // Hero CTAs stack full width on mobile.
    const fullWidthCtas = classNames(home.source).filter((c) =>
      /w-full\s+sm:w-auto/.test(c.value)
    );
    expect(fullWidthCtas.length).toBeGreaterThanOrEqual(2);
    // Tool grids start at one column.
    expect(home.source).toMatch(/grid-cols-1\s+sm:grid-cols-2/);
  });
});
