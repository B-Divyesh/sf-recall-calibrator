# Compare typed recall with self-grades — review 1

**Verdict: FAIL**

- Work order: `recall-calibrator-review-1`
- Live URL: <https://recall-calibrator.sociobot.in>
- Reviewed: 2026-09-06 UTC
- Implementation commit reviewed: `7d0bb748790f2f288fa3ef4d21adc9eb906ea82c` (`fix: make JSON restore strict and atomic`)
- Documentation/verification tip: `1ce510be37dbba86f9de8fb2a1b276943611ffa6`
- Artifact: static, local-first PWA; no backend, account, tenant, health, or rate-limit surface

The live product is the current implementation artifact: 22 of 22 public
files from a clean production build matched the live SHA-256 bytes. The
documentation commits after `7d0bb74` do not change the app. This review is
therefore against that implementation, with the current documentation tip
recorded separately.

## Job, audience, and first action

The job is to compare typed recall with a learner's own SRS grade before that
grade is used. The audience is spaced-repetition users who want less
subjective Again/Hard/Good/Easy choices. On both fresh desktop and phone
visits, the first available action was **Add your first card**. The required
one-click sample action was not present.

The page instead opened with “Did you recall it—or just feel familiar?” and
“A second opinion for your SRS signal.” These do not state the job, audience,
or first action in plain words before scrolling.

## Findings

Severity scale: S2 is release-blocking; S3 is minor. There are **5 findings**
and **18 untested public claims**. This is not a PASS.

### RC-R1-001 — S2 — no isolated one-click demo; example cards change ordinary data

The landing page has no visible **Try it with sample data** action. Its only
example action is **Load example cards**. In a fresh 390 px browser context,
that action changed the ordinary `recall-calibrator` IndexedDB database to
three cards and those cards remained after reload.

There is no `Demo — sample data, nothing is saved` label, **Reset demo**,
**Start for real**, or separate demo storage namespace. `/demo` returns the
ordinary empty landing page rather than entering sample mode. This fails the
demo-sandbox contract and means the required sample path can alter a visitor's
real local data.

Expected: a first-screen one-click sample at `/demo` or `?demo=1`, populated
on entry, with persistent demo controls and isolated `demo:` storage.

### RC-R1-002 — S2 — claims registry is absent; 18 public claims have no required proof command

`.factory/claims.json` is missing. Consequently there are no declared
per-claim sandbox commands to run from a clean checkout. The supplied unit
and E2E suites are useful general checks, but they do not meet the required
one `@claim:<id>` test per public promise.

The 18 distinct material promise groups found in the README and live copy are:

1. data stays in the browser/device;
2. no account;
3. no cloud/remote data store;
4. deterministic exact-answer matching;
5. required-keyword matching;
6. multiple accepted answers;
7. recall proxy sealed until grading;
8. calibration/alignment reporting;
9. generous/harsh tendency and trend reporting;
10. transparent suggested intervals;
11. CSV export;
12. JSON export and restore;
13. explicit local deletion;
14. persistence across refresh;
15. offline operation after first visit;
16. installable PWA and update prompt;
17. keyboard and 390 px mobile support; and
18. reduced-motion support.

These claims need an entry, one tagged observable test each, and demo-only
execution evidence. Until then the claim commands are missing rather than
passing.

### RC-R1-003 — S2 — first screen does not state the job, audience, or sample first action in plain words

Fresh desktop (1440 × 1000) and phone (390 × 664) views both show the same
rhetorical h1, metaphor labels such as “press” and “impression,” and a manual
card-creation action. The screen does not say who the product is for, does not
give the mandatory sample action, and does not show the required three concise
facts (privacy, offline, price). `.factory/copy-audit.md` is also absent.

Expected: a ≤9-word job headline, one ≤22-word audience/outcome sentence,
**Try it with sample data** with what follows, and plain privacy/offline/price
facts. The page may retain its visual identity without relying on metaphor in
the required first-screen copy.

### RC-R1-004 — S3 — routes do not set route-specific page titles

`/`, `/review`, `/cards`, `/insights`, `/settings`, `/privacy`, `/terms`,
`/demo`, and an unknown route all report the identical title:
`Recall Calibrator — trust your review signal`.

The legal and application routes therefore lack titles such as `Privacy —
Recall Calibrator` and `Review — Recall Calibrator`. This fails the routing
and assistive-technology context requirement.

### RC-R1-005 — S3 — unknown URL is the home page, not a designed 404

`/not-a-real-route` returns HTTP 200 and renders the normal home h1, “Did you
recall it—or just feel familiar?”. There is no product-styled 404 explanation
or clear way back. The 200 itself is not the defect; presenting an unrelated
home page instead of the required 404 state is.

## Current disposition of earlier findings

| Earlier item | Current disposition and evidence |
| --- | --- |
| RC-QA-001, proxy exposed before grade | Closed. In a live typed-recall flow, no Match/Partial/Miss proxy was visible before grade; the sealed label was present. |
| RC-QA-002, invalid ARIA on progress | Closed. Live axe found no serious/critical issues on the grade state. |
| RC-QA-003, sub-44 px mobile controls | Closed. The clean-build E2E compact-target test passed; live 390 px review was usable with no horizontal overflow. |
| RC-QA-004, Recorded badge overlap | Closed. The clean-build compact sealed-label test passed. |
| RC-QA-005, immutable asset caching | Closed. Live hashed assets use `public, max-age=31536000, immutable`. |
| RC-QA-006, response-policy hardening | Closed. Live responses include CSP with `frame-ancestors 'none'`, COOP, Permissions-Policy, nosniff, referrer policy, and `X-Frame-Options: DENY`; manifest media type is correct. |
| RC-QA2-001, destructive malformed import | Closed. A malformed v1 payload reported `exportedAt must be non-empty text. Your current data was not changed.` before replacement. |

## Functional, accessibility, privacy, PWA, and route evidence

- A fresh live desktop and a fresh iPhone-sized context loaded with no console
  errors, page errors, failed requests, or non-product request origins.
- The normal sample-card review flow passed: typed `Tokyo`, revealed the
  answer, selected Good, observed Match and the proxy-led interval, exported
  CSV, and confirmed the review persisted after reload.
- Invalid/recovery checks passed: keyword mode without required keywords gave
  a specific error; interval 0 and 36,501 were invalid; 36,500 was valid; and
  malformed import left current data unchanged.
- Axe 4.10.2 via Playwright found zero serious/critical violations on `/`,
  `/review`, `/cards`, `/insights`, `/settings`, `/privacy`, `/terms`, the
  pre-grade screen, and the post-grade screen. Each tested normal route had
  one h1 and one main landmark. Reduced motion and keyboard/mobile checks are
  covered by the passing clean-build E2E suite.
- Service-worker control was established in a fresh live context. An offline
  reload of `/review` rendered the saved shell and `Offline · changes safe`.
  The update prompt is a public claim but remains unregistered under
  RC-R1-002.
- Privacy request capture during the live flow observed only
  `https://recall-calibrator.sociobot.in`. No server API, sign-in, payment,
  tenant, health, or rate-limited endpoint exists, so backend tenant,
  persistence-after-restart, health, and 429/Retry-After checks do not apply.
- `/privacy` and `/terms` return 200 and render their legal content. Primary
  routes return 200. `/demo` and the unknown URL are findings as described
  above. No external-site requests were made for link checking because this
  work order authorizes this product scope only.

## Clean-checkout commands

Fresh clone: `/tmp/recall-calibrator-review.FGSmBI`, initially at
`1ce510be37dbba86f9de8fb2a1b276943611ffa6`.

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages, 0 vulnerabilities reported |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm test` | PASS — 12 tests in 3 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — generated `dist/` |
| `npm run test:e2e` | PASS — 6/6 Chromium tests |

No claims command was runnable because the required claims registry is
missing. The clean build's 22 deployed public files were each SHA-256 matched
against the live URL: 22 matched, 0 mismatched, 0 fetch failures.

## Required next steps

1. Implement a separate, one-click `/demo` or `?demo=1` sample sandbox with
   persistent label, reset/start-real controls, isolated storage, and a
   realistic populated first view.
2. Add `.factory/demo.md`, `.factory/claims.json`, and tagged demo-only tests
   for every public claim; remove any promise that cannot be tested.
3. Rewrite the first screen and record the required copy audit.
4. Set titles on every route and add a product-styled real 404 state.
5. Rerun a clean review. PASS requires zero findings and zero untested claims.
