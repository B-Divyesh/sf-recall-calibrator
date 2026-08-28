# Recall Calibrator — independent product verification 3

**Verdict: PASS**

- Work order: `recall-calibrator-verify-3`
- Candidate commit: `968e7f23031f73fc56376c13bbacf9b0b16528ce`
- Candidate URL: <https://recall-calibrator.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: local-first, offline PWA; static site with no server API

This is a fresh verification from a clean checkout at the candidate SHA. The
deployed app is the candidate build and meets the researched brief: it records
typed exact/keyword recall before self-grading, keeps the deterministic proxy
sealed through grading, reports calibration and transparent intervals, retains
data locally, and exports it.

## Defects

None found.

| Severity | Count | Notes |
| --- | ---: | --- |
| S1 critical | 0 | — |
| S2 release-blocking | 0 | — |
| S3 minor | 0 | — |

## Clean-checkout gates

| Gate | Result | Fresh evidence |
| --- | --- | --- |
| Checkout | PASS | Clean `main` at `968e7f23031f73fc56376c13bbacf9b0b16528ce` before install. |
| `npm ci` | PASS | 60 packages installed; 0 vulnerabilities reported. |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities. |
| `npm test` | PASS | 12 tests in 3 files. |
| `npm run typecheck` | PASS | `tsc --noEmit`. |
| `npm run lint` | PASS | Repository-defined lint command (`tsc --noEmit`). |
| `npm run build` | PASS | Production `dist/` generated. |
| `npm run test:e2e` | PASS | 6/6 Chromium tests against a freshly started production preview. |

The first standalone E2E rerun encountered Playwright's stale reusable preview
server and returned `ERR_CONNECTION_REFUSED`; starting a new `npm run preview`
then produced the passing 6/6 result above. This was test-harness state, not a
product failure.

Production output is within the static-PWA budgets: initial JS is 33,440 B raw
(11.79 kB gzip, budget 200 kB), CSS is 21,735 B raw (5.65 kB gzip, budget 50
kB), the mobile 720 WebP is 22,840 B (budget 300 kB), and there are no shipped
webfonts.

## End-to-end product checks

Fresh Chromium checks against the live URL covered the smallest useful job:

- Created a keyword card (`Alpha Beta`, required `alpha, beta`, 10-day
  interval). Keyword mode without keywords showed the recovery text “Add at
  least one required keyword, or choose exact answer.”
- Reloaded after creation; the IndexedDB card persisted.
- Typed `ALPHA, beta!`, revealed the answer, confirmed the proxy stayed sealed
  before self-grade, selected Good, and received Match with a 25-day interval.
  This confirms normalized deterministic matching and the 2.5× rule.
- Repeated the card with `alpha`, selected Easy, and confirmed Partial with a
  30-day interval (the 1.2× partial-recall rule applied to 25 days).
- Exported valid v1 JSON (1 card, 2 reviews) and CSV (header plus 2 data rows).
- Tried malformed v1 JSON; it showed the field-specific `exportedAt must be
  non-empty text` error before confirmation. Cancelling the delete-data dialog
  preserved 1 card and 2 reviews.

The supplied unit/browser coverage also passed for exact answers, multiple
accepted answers, keyword matching, import transaction integrity, malformed
nested imports, responsive review, persistence, and the complete keyboard-only
review path.

## Accessibility, responsive behavior, and motion

- Axe 4.10.2 found zero serious or critical issues on live `/`, `/cards`,
  `/insights`, `/settings`, `/privacy`, and `/terms`, each with exactly one
  `h1`; the dynamic post-reveal grade state also had zero serious/critical
  findings.
- At 390 × 844, all primary routes had no page-level horizontal overflow.
  The supplied mobile suite additionally passed its 44 px target and sealed
  label checks.
- Keyboard smoke test: Skip to content was first and focused; Enter moved focus
  to `main`; the next keyboard-focused action exposed the designed 3 px
  vermilion focus outline. The supplied suite completed review at 390 px with
  Tab/Enter only.
- With `prefers-reduced-motion: reduce`, hero transforms were `none` and button
  transition duration was effectively zero (`1e-06s`).
- No console errors, uncaught page errors, or failed requests occurred during
  independent live desktop or mobile workflows.

## PWA, privacy, and policies

- On the live origin, service-worker control was established; an explicit
  offline mobile reload rendered the home shell and “Offline · changes safe”.
- In a disposable copy of the exact `dist/`, changing only the worker cache
  version produced “A fresh edition is ready.” Clicking Update activated the
  new worker: `recall-shell-effe87c2ee`/runtime caches were replaced with
  `recall-shell-qa-update-2`/runtime caches and no worker remained waiting.
- Captured browser requests during card creation, review, export, malformed
  import, and deletion-cancel stayed solely on
  `https://recall-calibrator.sociobot.in`. Source inspection found no runtime
  API, analytics, tracker, remote-font, or third-party-script use. Cards,
  answers, typed recall, grades, and history are in IndexedDB; export/import
  and local deletion are exposed in the UI.
- Live root, worker, and asset responses include CSP (`script-src 'self'`,
  `connect-src 'self'`, `frame-ancestors 'none'`), COOP same-origin,
  Permissions-Policy, `X-Frame-Options: DENY`, nosniff, strict-origin referrer
  policy, and HSTS. Hashed assets are `public, max-age=31536000, immutable`;
  worker and manifest are `no-cache`; the manifest is served correctly.
- This is a static PWA with no backend, account/sign-in, unlock, or API
  endpoint. Rate-limit, concurrency, persistence-boundary server, health, and
  Entra tenant checks are therefore not applicable. It is not a library or CLI,
  so pack/consumer checks are also not applicable.

## Deployment identity

Fresh local and live SHA-256 comparisons matched all 22 publicly served
distributable files, including HTML, route documents, JS, CSS, images, icons,
manifest, service worker, offline page, robots, and sitemap. The only apparent
23rd-file difference is `/staticwebapp.config.json`: Azure consumes that
deployment configuration and does not serve it; its public request correctly
receives the navigation fallback HTML. Core `index.html`, hashed JS, and the
generated worker were separately byte-identical to the candidate build.

## Reproduce

```sh
npm ci
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
```
