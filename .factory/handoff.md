# Compare typed recall with self-grades — verification 4 handoff

**Status: independently verified — PASS**

- Work order: `recall-calibrator-verify-4`
- Live URL: <https://recall-calibrator.sociobot.in>
- Implementation candidate: `d228149dab55db289c98b785e83412dec92450fc`
- Documentation tip reviewed: `22d38aa6c864d81e1d246034aea3466d37187c4e`
- Verified: 2026-09-06 UTC
- Findings: 0
- Untested claims: 0

## What was done

No product code was changed. The clean checkout, all public claims, and the
live deployment were independently checked against the brief and attached
contracts. The full report is in [`.factory/verification-4.md`](verification-4.md).

## Verification results

- `npm ci` and `npm audit --omit=dev`: passed; 0 vulnerabilities.
- `npm test`: 12/12 passed.
- Typecheck and lint: passed.
- `npm run build`: passed and created `dist/index.html`.
- `npm run test:e2e`: 22/22 passed.
- Every command in `.factory/claims.json`: 18/18 passed separately.
- Fresh live desktop and 390 px phone checks: passed.
- One-click demo, populated report, persistent label, reset, Start for real,
  and ordinary-data isolation: passed.
- Normal review, invalid boundaries, malformed-import recovery, keyboard,
  focus, reduced motion, offline reload, update activation, installability,
  privacy request capture, legal pages, route titles, links, and designed 404:
  passed.
- Playwright axe: zero serious or critical violations locally and live.
- Factory URL verifier: passed with no console errors.
- Live artifact match: 26/26 served files matched the fresh build.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO; LCP 1.3 s, TBT 60 ms, CLS 0.

## Run the checks

```sh
npm ci
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Run every individual command in `.factory/claims.json` for the per-claim
evidence. Open `/demo` for the isolated sample.

## Known gaps and next steps

No product gaps were found. No repair or redeployment is required.
