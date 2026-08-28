# Recall Calibrator — verification handoff

**Independent verification result: FAIL**

- Work order: `recall-calibrator-verify-1`
- Tested candidate: `f9645843fa1fd42a1817e74c0b557a818f28035c`
- Tested deployment: <https://recall-calibrator.sociobot.in>
- Date: 2026-08-28 UTC

The production build, supplied tests, primary workflows, local persistence,
exports/import, offline reload, service-worker update prompt, privacy boundary,
bundle budgets, and live artifact identity all passed. The candidate still
fails the acceptance contract on two release-blocking dynamic accessibility
defects:

1. The Match/Partial/Miss proxy is present in the accessibility tree before
   the learner grades, even though the UI calls it sealed. This breaks the core
   calibration order for screen-reader users (`src/main.ts:115-119`).
2. Axe reports a serious `aria-prohibited-attr` violation on the active review
   progress `<div>` because it has `aria-label` without a valid role
   (`src/main.ts:102-103`). The supplied route-level axe test does not enter a
   review and misses this state.

Minor defects: three home/footer touch targets measure below 44 × 44 px at 390
px; the “Recorded” badge overlaps the proxy-sealed label on that viewport;
hashed assets use only `max-age=30` rather than immutable caching; and live
responses lack CSP/frame/permissions policy headers while serving the manifest
as `application/octet-stream`.

Full commands and exact evidence are in the
[verification report](verification.md). Key results:

- `npm test`: 6/6 passed.
- `npm run build`: passed; JS 29,845 B, CSS 20,685 B, mobile hero 22,840 B.
- `npm run test:e2e`: 3/3 passed.
- Independent live harness: 51/51 functional assertions passed, then the
  separate dynamic axe inspection found the serious issue above.
- Live identity: all 22 `dist/` files matched byte-for-byte.
- Lighthouse live mobile: 93 performance, 100 accessibility, 100 best
  practices, 100 SEO; LCP 1.3 s, CLS 0.
- No browser console/page errors and no cross-origin runtime requests.
- Chromium PWA installability errors: none; offline reload and simulated
  waiting-worker update both passed.

Next step: fix both major defects and extend Playwright axe coverage through
the post-reveal grade state, then run a fresh independent verification. No
product code was changed during this verification.
