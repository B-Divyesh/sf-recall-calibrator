# Recall Calibrator — repair handoff

**Status: PASS**

- Work order: `recall-calibrator-repair-1`
- Independent-verifier base: `bc176af17a3a2edab4a37802f6a9da4f265bfc60`
- Repaired product commit: `ecd79f7ebb335a9d7f996eea14af29994c9bcadf`
- Deployed URL: <https://recall-calibrator.sociobot.in>
- Deployment: Azure Static Web Apps, static/PWA artifact (`dist/`)
- Verified: 2026-08-28 UTC

## What was repaired

All findings in [the independent verification report](verification.md) are closed without changing the researched workflow or local-first data model.

| Finding | Repair | Regression coverage |
| --- | --- | --- |
| RC-QA-001 (S2) | Removed the calculated Match/Partial/Miss sentence from the pre-grade DOM completely. The proxy is calculated and persisted only once the learner commits a grade, then appears on the result screen. | Dynamic Playwright test asserts no proxy result exists before grading and that it appears only afterward. Live browser check reported `proxyVisibleBeforeGrade: 0`. |
| RC-QA-002 (S2) | Replaced the unnamed progress `<div>` with native `<progress value max>` semantics. | Dynamic post-reveal axe scan is part of `test:e2e`; zero serious/critical violations locally and live. |
| RC-QA-003 (S3) | Made the brand and mobile legal links at least 44×44 CSS px. | 390px test measures all three targets. Live measured 157.25×44, 53.95×44, and 46.84×44 px. |
| RC-QA-004 (S3) | Reworked the typed-recall header into a two-column grid, reserving a column for the Recorded stamp. | 390px test asserts an 8px gap between the label and stamp. |
| RC-QA-005 (S3) | Added static-host policy: `/assets/*` is `public, max-age=31536000, immutable`; worker and manifest are `no-cache`. | Unit test checks config; live `HEAD` confirms asset and update policies. |
| RC-QA-006 (S3) | Added CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, Permissions-Policy, COOP, and `application/manifest+json`. Removed inline recovery/offline styling so the strict CSP remains usable. | Unit test checks config; live `HEAD` confirms all response headers and manifest type. |

## Verification evidence

Fresh dependency install and local gates:

- `npm ci`: passed; 59 packages installed.
- `npm audit --omit=dev`: passed; 0 vulnerabilities.
- `npm run typecheck` and `npm run lint`: passed (`tsc --noEmit`).
- `npm test`: passed, 2 files / 8 tests (deterministic matching, intervals, and static policy).
- `npm run build`: passed; `dist/` created. Initial JS is 29,922 B raw / 10.66 kB gzip; CSS is 21,735 B raw / 5.65 kB gzip; mobile hero WebP is 22,840 B. All remain within product budgets.
- `npm run test:e2e`: passed, 4/4 Chromium tests: dynamic review axe/proxy seal, all primary routes, 390px offline reload, and compact target/overlap checks.
- Local `verify-url.sh`: 200; title, `lang=en`, one h1, main landmark, image alt coverage, and console all passed (599 ms load).

Live desktop and mobile browser verification:

- `verify-url.sh https://recall-calibrator.sociobot.in`: 200; no browser errors; title/lang/one h1/main/alt/button checks passed (770 ms load).
- Dynamic post-reveal desktop check: proxy absent before grade; typed grade completed; result visible; axe serious/critical `[]`; browser errors `[]`.
- 390×844 check: no horizontal overflow; all documented touch targets meet 44 px; sealed label and stamp do not overlap.
- Keyboard check completed Load examples → Review → Start review → typed recall → Reveal → grade entirely with Enter/key input.
- Privacy capture observed only `https://recall-calibrator.sociobot.in`; no analytics, remote fonts/scripts, or learner-data requests.
- Offline reload passed in the 390px Playwright test after service-worker control. A separate isolated update-worker test changed the worker cache version, called `registration.update()`, displayed “A fresh edition is ready,” and activated after Update.
- Live identity: all 22 publicly served build files matched byte-for-byte against `dist/`; `staticwebapp.config.json` is intentionally consumed by Azure Static Web Apps rather than served.
- Live Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 996 ms, LCP 1355 ms, CLS 0, transfer 55,898 B.

## Deployment and response policy

Deployed with `/opt/fleet/lib/deploy-static.sh recall-calibrator dist` (Azure deployment ID `1050f88a-4202-42cd-9fae-2101249506a2`). Live checks confirmed:

- JavaScript assets: `Cache-Control: public, max-age=31536000, immutable`.
- Service worker and manifest: `Cache-Control: no-cache`.
- Manifest: `Content-Type: application/manifest+json`.
- CSP permits only same-origin application resources and explicitly denies framing; Permissions-Policy disables unneeded device/payment capabilities; `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` are present.

## Run and deploy

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
/opt/fleet/lib/deploy-static.sh recall-calibrator dist
```

## Known gaps / next steps

None known. The application remains intentionally single-mode, local-only, and free of third-party runtime services as specified in the brief.
