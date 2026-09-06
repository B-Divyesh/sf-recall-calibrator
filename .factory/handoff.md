# Recall Calibrator — review handoff

**Status: FAIL — not ready for acceptance**

- Review work order: `recall-calibrator-review-1`
- Implementation reviewed: `7d0bb748790f2f288fa3ef4d21adc9eb906ea82c`
- Documentation tip: `1ce510be37dbba86f9de8fb2a1b276943611ffa6`
- Live URL: <https://recall-calibrator.sociobot.in>
- Reviewed: 2026-09-06 UTC

The live artifact exactly matches the clean production build (22/22 public
files). Core recall, export, persistence, invalid-import recovery,
accessibility, privacy request boundary, and offline reload checks pass.

Acceptance fails with 5 findings and 18 untested public claims. The main
blockers are the absent isolated one-click demo, missing claims registry and
per-claim proof, and first screen that does not state the job/audience/sample
action in plain words. Route-specific titles and a designed 404 state are also
missing.

Fresh commands passed: `npm ci`, `npm audit --omit=dev`, `npm test` (12),
`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e`
(6/6). This static PWA has no backend/API, account, payment, or CLI/library;
tenant isolation, restart persistence, health, 429, and consumer-install
checks do not apply.

Full evidence, previous-finding disposition, and required repairs:
[review-1.md](review-1.md).
