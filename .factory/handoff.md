# Recall Calibrator — repair handoff

**Status: PASS**

- Work order: `recall-calibrator-repair-2`
- Verifier report commit: `28665cdf8259d4eddd7d88541bb1fcebfdad1acf`
- Tested candidate: `f0b7066a743482643ff22b64ab765ecdcb737e23`
- Repair commit: `7d0bb748790f2f288fa3ef4d21adc9eb906ea82c`
- Deployed URL: <https://recall-calibrator.sociobot.in>
- Deployment: Azure Static Web Apps, static/PWA artifact (`dist/`)
- Azure deployment ID: `ccbcc5ea-c661-4f31-bde4-46329674fc5c`
- Verified: 2026-08-28 UTC

## What was repaired

RC-QA2-001 (S2) is closed without changing the researched workflow, visual
system, matching rules, privacy boundary, or deployment class.

- Added a strict runtime parser at the untrusted JSON boundary. It validates
  every card, review, and settings field, including non-empty text, arrays,
  enums, finite/ranged numbers, whole-day intervals, dates, score/label and
  grade/score consistency, gap integrity, and unique record IDs.
- Validation now completes before the replacement confirmation is shown. A
  malformed file receives a field-specific, announced error stating that
  current data was not changed.
- Replaced clear-then-write import logic with one IndexedDB `readwrite`
  transaction spanning cards, reviews, and settings. Clears and all puts
  commit together; any synchronous or request/transaction failure aborts and
  rolls the whole replacement back.
- Made explicit local deletion atomic across the same three stores as a
  related data-safety improvement.

## Exact regression coverage

`tests/db.test.ts` uses a browser-compatible IndexedDB implementation and
proves all three required boundaries:

1. malformed nested card, review, and settings records are rejected with a
   field-specific recovery message;
2. duplicate IDs are rejected instead of silently overwriting records;
3. validation failure preserves cards, reviews, and settings;
4. a simulated review-store failure after an earlier card write rolls back
   clears, the earlier write, and settings as one atomic unit.

The Chromium regression imports the verifier's exact malformed shape
(`cards: [{"id":"broken"}]`) after loading three valid cards. It asserts no
confirmation appears, the named validation error is announced, Cards still
renders all three records, reload retains them, and the storage-error screen
never appears. A second new scenario completes the 390 px review path with
Tab/Enter only, including the skip link and focus handoffs.

## Clean local verification

- `npm ci`: passed; 60 packages installed, 0 vulnerabilities.
- `npm audit --omit=dev`: passed; 0 vulnerabilities.
- `npm test`: passed, 3 files / 12 tests.
- `npm run typecheck`: passed (`tsc --noEmit`).
- `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed; `dist/index.html` exists at the artifact root.
- `npm run test:e2e`: passed, 6/6 Chromium tests.
- Local `verify-url.sh`: HTTP 200, title, `lang=en`, one h1, main landmark,
  image alt coverage, labelled buttons, and zero console/page errors.
- Axe 4.10.2: zero serious/critical findings on all primary routes and the
  dynamic sealed-proxy state.
- Desktop 1366×900 and mobile 390×844 captures were visually inspected. The
  mobile test has no horizontal overflow, required targets remain at least 44
  px, the sealed label remains unobscured, and reduced motion still passes.

Production sizes remain within the static/PWA budgets:

- initial JavaScript: 33,440 B raw / 11.79 kB gzip (budget 200 kB);
- CSS: 21,735 B raw / 5.66 kB gzip (budget 50 kB);
- mobile hero WebP: 22,840 B (budget 300 kB);
- fonts: 0 B (budget 120 kB);
- complete `dist/`: 398,450 B.

Local Lighthouse 13.0.1 scored Performance 100, Accessibility 100, Best
Practices 100, and SEO 100. FCP was 0.9 s, LCP 1.5 s, Speed Index 0.9 s, TBT
0 ms, CLS 0, and transfer 56 KiB. Lab INP was not emitted; the keyboard and
pointer workflow completed without observable delay.

## Live verification and deployment policy

- `verify-url.sh https://recall-calibrator.sociobot.in`: HTTP 200, 860 ms
  load, correct semantics, and zero console/page errors.
- The deployed malformed-import reproduction showed zero confirmations, the
  field-specific `cards[0].prompt` error, three cards before and after reload,
  390 px scroll width at a 390 px viewport, and no browser errors.
- All 23 publicly served files matched the fresh `dist/` bytes exactly (23
  matched, 0 mismatched, 0 fetch failures). Azure consumes
  `staticwebapp.config.json`, so it is intentionally excluded from identity.
- Home, Privacy, Terms, manifest, worker, and an SPA fallback returned 200;
  HTTP redirected to HTTPS with 301.
- The document returns HSTS, strict-origin referrer policy, nosniff, CSP with
  `frame-ancestors 'none'`, Permissions-Policy, COOP, and `X-Frame-Options:
  DENY`. Hashed assets are immutable for one year; the worker and manifest are
  `no-cache`; the manifest type is `application/manifest+json`.
- A live 390 px offline reload retained three cards, displayed “Offline ·
  changes safe,” used `recall-shell-effe87c2ee`, and logged no errors.
- An isolated production-artifact update changed the worker version to
  `qa-update-4`; the in-app update notice appeared, Update activated it, and
  the old `effe87c2ee` cache was replaced by `recall-shell-qa-update-4`.
- Live request capture during the malformed-import workflow observed only the
  product origin. There are no analytics, trackers, remote assets, runtime
  APIs, or learner-data requests.
- Live Lighthouse 13.0.1 scored 100/100/100/100. FCP was 1.0 s, LCP 1.2 s,
  Speed Index 1.0 s, TBT 70 ms, CLS 0, and transfer 43 KiB. Lab INP was not
  emitted.

This product has no backend, account, sign-in, unlock endpoint, library
package, or CLI. Backend rate/concurrency/health, Entra identity, and
package-consumer checks are therefore not applicable.

## Run and deploy

```sh
npm ci
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
/opt/fleet/lib/deploy-static.sh recall-calibrator dist
```

## Known gaps / next steps

None known. The local-only, single-light-treatment product remains within the
brief and the original `pwa-offline` artifact class.
