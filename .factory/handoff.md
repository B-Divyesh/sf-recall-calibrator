# Recall Calibrator — repair handoff

**Status: ready for review**

- Work order: `recall-calibrator-repair-3`
- Product: <https://recall-calibrator.sociobot.in>
- Final implementation SHA: `d228149dab55db289c98b785e83412dec92450fc`
- Main repair SHA: `9d9b11cb26043b4266a60f319862739f9e25fb49`
- Documentation handoff content SHA: `2a6e8aa099c0f3d605d2d45d9ef51251c30f2c6a`
- Verified and deployed: 2026-09-06 UTC
- Artifact: static local-first PWA. No backend, account, API, payment, or
  shared database is used.

## What changed

- Added `/demo` and `?demo=1` as a one-click sample sandbox. It seeds three
  realistic cards and eight review results in the separate IndexedDB database
  `demo:recall-calibrator`. The persistent banner exposes **Reset demo** and
  **Start for real**. Leaving demo discards only demo data.
- Added outcome-based browser coverage for demo isolation, local persistence,
  privacy boundary, matching modes, sealed results, reports, export/restore,
  deletion, offline reload, PWA manifest, keyboard/mobile, and reduced motion.
  `.factory/claims.json` contains 18 public claims; each has exactly one
  `@claim:<id>` demo-only test command.
- Rewrote the first screen in plain words: job, audience, visible sample
  action, real first step, and private/offline/free facts. The landing audit is
  in `.factory/copy-audit.md`.
- Added per-route titles and metadata, canonical/OG/Twitter metadata, a local
  1200 × 630 social image, sitemap routes, a product-styled SPA 404, and the
  Static Web Apps 404 response override with a standalone styled `404.html`.
- Restored required mobile target checks. All visible non-radio controls on a
  390 px screen are at least 44 × 44 px; the sealed status label has an 8 px
  clearance from its badge.
- Preserved prior repairs: strict atomic imports, sealed proxy before grade,
  valid progress semantics, local-only data, offline PWA, headers, immutable
  hashed-asset caching, and local export/deletion.

## Review finding disposition

| Finding | Disposition |
| --- | --- |
| RC-R1-001 — no isolated demo | Closed. `/demo` has isolated IndexedDB, populated output, persistent controls, reset, and Start for real. Browser and live checks confirm no demo card enters ordinary storage. |
| RC-R1-002 — missing claims registry | Closed. 18 claims are registered with one tagged demo-only outcome test each; every listed command passed from the clean installed checkout. |
| RC-R1-003 — unclear first screen | Closed. Fresh desktop and phone browsers show “Compare typed recall with your grade,” the spaced-repetition audience, sample action, real action, and three facts before scrolling. |
| RC-R1-004 — shared titles | Closed. Root, demo, Review, Cards, Insights, Data, Privacy, Terms, and unknown route titles are distinct; live checks covered Demo, Privacy, Terms, and 404. |
| RC-R1-005 — no designed 404 | Closed. Unknown SPA fallback renders “That page was not found” with a home link; `staticwebapp.config.json` also serves the product-styled `404.html` for Static Web Apps 404 handling. |
| RC-QA-001 / RC-QA-002 | Still closed. Dynamic review testing confirms the result is absent until grading, then runs axe with zero serious/critical findings. |
| RC-QA-003 / RC-QA-004 | Still closed and strengthened. A 390 px browser test checks all visible target sizes and sealed-label clearance. |
| RC-QA-005 / RC-QA-006 | Still closed. Live hashed assets return immutable caching; live headers include CSP, frame protection, permissions policy, nosniff, referrer policy, and COOP. |
| RC-QA2-001 | Still closed. Unit and browser recovery tests reject malformed nested imports before confirmation and retain existing demo data. |

## Verification

Clean setup started with:

```sh
npm ci
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Results:

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm test`: 12/12 Vitest tests passed.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run build`: passed; `dist/` has root `index.html`.
- `npm run test:e2e`: 22/22 Chromium tests passed.
- Every one of the 18 commands in `.factory/claims.json` was run after the
  final build and passed.
- `/opt/fleet/lib/verify-url.sh` passed locally and on live HTTPS. Fresh live
  desktop and iPhone-sized contexts had no console/page errors.
- `@axe-core/playwright` found zero serious/critical violations on every
  primary route and the dynamic post-grade screen, locally and on live `/demo`.
  The standalone `@axe-core/cli` command was attempted but its Selenium runner
  could not discover Chrome in this container; the Playwright axe integration
  is the equivalent configured accessibility gate and passed.
- A fresh live review typed `Hyper Text Transfer Protocol`, chose Good, showed
  Match and a 45-day interval, and recorded requests only to the product
  origin. A fresh live mobile context established service-worker control,
  went offline, reloaded `/demo`, and retained the eight-row sample report.
- A live SHA-256 comparison matched 26 of 26 served product files from the
  final `dist/` (0 mismatches, 0 fetch failures). `staticwebapp.config.json`
  is Azure deployment configuration and is not a served product file.
- Lighthouse 13 mobile, live root: Performance 99, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.5 s, LCP 1.8 s, TBT 60 ms, CLS 0.
- Budgets: initial JS 38.00 KB raw / 12.87 KB gzip; CSS 23.09 KB raw / 5.93 KB
  gzip; mobile hero WebP 22.84 KB; no webfonts.

## Deployment

Deployed the final static `dist/` with the durable factory static deployment
configuration to the existing one-product app `sf-recall-calibrator`. The
deployment completed successfully and HTTPS served the final candidate.

The product is free under the researched brief. There is no paid offer,
checkout, billing registration, external integration, or `billing-offer.json`
to register.

## Run and maintain

```sh
npm ci
npm run dev
# Open /demo for the isolated sample.

npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Deploy `dist/` with `/opt/fleet/lib/deploy-static.sh recall-calibrator dist`.
No environment variables are required.

## Known gaps

No product gaps are known. The only tooling limitation encountered was the
standalone axe CLI's Chrome discovery in this worker image; the same axe rules
were exercised successfully through the shipped Playwright integration.
