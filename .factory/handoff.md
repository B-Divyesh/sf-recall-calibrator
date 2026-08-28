# Recall Calibrator — build handoff

Work order: `recall-calibrator-build-1`

Completed: 2026-08-28

## What was built

- Finished Vite + TypeScript offline PWA, deployed as static files in `dist/`.
- Card bench supports exact matching, multiple accepted answers, required
  keywords, and a current interval.
- Review press preserves the evidence-first order: typed recall, answer reveal,
  self-grade, then comparison. The deterministic proxy is not shown before the
  grade. It records Match/Partial/Miss, grade gap, and a transparent next
  interval (miss → 1 day, partial × 1.2, match × 2.5).
- Insights include alignment score, generous/harsh tendency, eight-sample
  improvement trend, review table, and exportable interval history.
- IndexedDB stores cards, review history, and settings locally. JSON exports
  restore the full database; CSV exports review evidence and intervals. Import
  and deletion require explicit confirmation.
- PWA manifest includes 192/512/maskable icons. A generated, versioned service
  worker precaches the built app and routes, uses cache-first local assets,
  network-first navigation, an offline fallback, and an in-app update prompt.
- `/privacy` and `/terms` are public application routes with static route
  fallbacks. There are no accounts, analytics, third-party runtime resources,
  or network calls containing learner data.
- Product-specific risograph system and original-art provenance are documented
  in `.factory/design.md`. The selected WebP is 81 KB at 1200 px and 23 KB at
  720 px; its original source and prompts are retained in `assets/src/`.

## Verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Results on 2026-08-28:

- `npm test`: 6/6 unit tests passed.
- `npm run test:e2e`: 3/3 Chromium tests passed, covering the complete review
  workflow, one-h1/axe checks on six routes, 390×844 px layout, persistence,
  and a reload plus in-app navigation with the browser explicitly offline.
- Axe: no serious or critical violations; the automated suite checks all
  rules, including contrast.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100,
  SEO 100. Measured FCP 1.0 s, LCP 1.4 s, TBT 120 ms, CLS 0, and Max
  Potential FID 170 ms.
- Production payload: 29.9 KB JS (10.7 KB gzip), 20.7 KB CSS (5.5 KB gzip),
  zero webfont bytes, 23 KB mobile hero WebP. These are under the 200/50/120/
  300 KB JS/CSS/font/hero budgets.
- `npm audit`: zero known vulnerabilities.
- Manual screenshots were reviewed at desktop and 390 px. Focus treatment,
  skip link, 44 px targets, responsive stacking, and reduced-motion overrides
  are present. No browser console errors were observed in Playwright.

Lighthouse command used (the current CLI no longer exposes a PWA category):

```sh
CHROME_PATH=/opt/pw-browsers/chromium-1208/chrome-linux64/chrome \
  npx --yes lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu --no-zygote'
```

## Known boundaries and next steps

- Matching is intentionally deterministic. Synonyms only count when added as
  accepted answers, and keyword mode cannot evaluate nuance or essay quality.
- v1 has JSON/CSV ownership export but no direct `.apkg` import/export. That is
  the clearest follow-up if users ask for workflow integration.
- Intervals are advisory and deliberately simple; they must be reviewed before
  copying into a scheduler. This product calibrates input signals rather than
  replacing FSRS or another scheduling algorithm.
- The app is single-device and local-only by design. Browser/site-data clearing
  can remove the database, so the Data screen recommends periodic exports.
