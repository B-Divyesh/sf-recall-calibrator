# Recall Calibrator — verification handoff

**Status: FAIL**

- Work order: `recall-calibrator-verify-2`
- Tested candidate: `f0b7066a743482643ff22b64ab765ecdcb737e23`
- Tested URL: <https://recall-calibrator.sociobot.in>
- Verified: 2026-08-28 UTC
- Full evidence: [verification-2.md](verification-2.md)

## Release blocker

**RC-QA2-001 — S2:** JSON import validates only the top-level schema version
and array presence, clears all local data, then writes unchecked records. A
malformed v1 file such as `cards: [{"id":"broken"}]` replaces a valid
collection, is treated as a successful import, and makes Cards fail with
`Cannot read properties of undefined (reading 'replace')`. Reloading `/cards`
shows the generic storage-error screen, and retrying does not recover the data.

The fix must validate every nested card, review, and settings field before
replacement and commit the import atomically so any validation/write failure
leaves the existing IndexedDB data untouched. Add regression coverage for
malformed v1 records and failed/partial writes.

## What passed

- Clean checkout at the exact candidate; `origin/main` matched.
- `npm ci` and production audit: 0 vulnerabilities.
- `npm test`: 8/8; typecheck and lint: pass.
- Exact `npm run build`: pass; `dist/` produced.
- Supplied Playwright: 4/4 pass.
- Independent normal/boundary/recovery workflow: 33 assertions pass.
- Exact and keyword review, sealed pre-grade proxy, calibration result,
  interval export, reload persistence, valid JSON round trip, deletion
  confirmation, and ordinary invalid inputs all pass.
- Axe serious/critical: 0 across static and dynamic states.
- Desktop and 390 px mobile visual/keyboard checks pass; no overflow; required
  touch targets and focus treatment pass; reduced motion is honored.
- Offline reload and isolated service-worker update/activation pass.
- Privacy capture is same-origin only; no analytics, trackers, remote assets,
  runtime APIs, or learner-data requests.
- All 23 public files in the candidate build match live byte-for-byte.
- Security headers, manifest type, immutable hashed-asset caching, and
  no-cache update resources are correct.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.324 s, TBT 50 ms, CLS 0, transfer 55,880 B.

Build sizes: 29,922 B JS (10.66 kB gzip), 21,735 B CSS (5.65 kB gzip),
22,840 B mobile hero WebP, 0 B fonts; all within contract budgets.

## Applicability notes

This static local-only PWA has no server endpoint, unlock call, account, or
sign-in, so API rate limiting, backend concurrency/health identity, and Entra
authority checks are not applicable. It is not a library or CLI. No product
code or deployment was modified during verification.

## Re-run

```sh
npm ci
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run preview -- --strictPort
```
