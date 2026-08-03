# Visual regression tests

Playwright screenshot tests across four breakpoints: `mobile-390`, `tablet-768`,
`desktop-1280`, `desktop-1920`.

## Commands

```bash
npm run test:visual            # compare against baselines
npm run test:visual:update     # re-record baselines after an intentional change
npm run test:visual:report     # open the last HTML report/diffs
```

Baselines live in `tests/visual/__screenshots__/<breakpoint>/`. Commit them.

## Failure policy

A test fails when more than **0.5%** of pixels differ (`maxDiffPixelRatio: 0.005`,
per-pixel `threshold: 0.2`), so antialiasing noise passes while layout shifts,
overflow, spacing and color regressions fail. Failures write
`*-actual.png` / `*-diff.png` next to the baseline plus a trace.

`pages.spec.ts` also asserts `documentElement.scrollWidth <= clientWidth`, which
catches horizontal mobile overflow even if pixels happen to match.

## Notes

- Animations/transitions are disabled and the cookie/PWA prompts are pre-dismissed
  in `helpers.ts` so runs are deterministic.
- The dev server is started automatically (`reuseExistingServer`); set
  `PLAYWRIGHT_BASE_URL` to test a deployed URL instead.
- Adding a route to `ROUTES` in `helpers.ts` covers it on every breakpoint.
