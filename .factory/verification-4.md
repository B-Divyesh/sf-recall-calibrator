# Compare typed recall with self-grades — verification 4

**Verdict: PASS**

- Work order: `recall-calibrator-verify-4`
- Live URL: <https://recall-calibrator.sociobot.in>
- Implementation candidate: `d228149dab55db289c98b785e83412dec92450fc`
- Documentation tip reviewed before this report: `22d38aa6c864d81e1d246034aea3466d37187c4e`
- Verified: 2026-09-06 UTC
- Finding count: **0**
- Untested claim count: **0**

The implementation passes. This was a fresh independent check of the clean
checkout and the deployed static PWA. No product code was changed.

## Job, audience, and first action

The job is to compare typed recall with the grade a learner would give an SRS.
The audience is spaced-repetition users who want evidence before choosing
Again, Hard, Good, or Easy. The first action is **Try it with sample data**.

Fresh 1440 × 1000 desktop and 390 × 844 phone browsers showed that job,
audience, action, what the action opens, and the private/offline/free facts
before scrolling. The title names the job. The first screen uses plain words.

## Findings

None.

| Severity | Count |
| --- | ---: |
| S1 critical | 0 |
| S2 major | 0 |
| S3 minor | 0 |

## Declared claims

`.factory/claims.json` contains 18 unique claims and 18 unique commands. Each
claim tag occurs exactly once in the browser suite. Every command was run
separately from the clean installed checkout and passed.

| Claim | Result | Observable evidence |
| --- | --- | --- |
| `demo-isolation` | PASS | Reset and Start for real left the ordinary card unchanged. |
| `privacy-local` | PASS | A sample card remained after reload with demo mode intact. |
| `no-account-payment` | PASS | A review completed without credential or payment UI. |
| `no-remote-store` | PASS | The review emitted only product-origin requests. |
| `exact-match` | PASS | Normalized HTTP text produced Match. |
| `keyword-match` | PASS | One of two required keywords produced Partial. |
| `accepted-answers` | PASS | An alternate exact answer produced Match. |
| `sealed-proxy` | PASS | The result was absent before grading and present afterward. |
| `calibration-report` | PASS | The demo showed alignment and all eight history rows. |
| `calibration-tendency` | PASS | The demo showed tendency and recent grade-gap trend. |
| `transparent-interval` | PASS | A 10-day Match showed 25 days and the 2.5× rule. |
| `csv-export` | PASS | CSV had the expected header and eight data rows. |
| `json-restore` | PASS | Export, delete, and restore returned all sample data. |
| `delete-local-data` | PASS | Confirmed deletion removed every sample card. |
| `offline-reload` | PASS | A controlled fresh context reloaded `/demo` offline. |
| `pwa-install` | PASS | Standalone manifest and required icons were present. |
| `keyboard-mobile` | PASS | Tab and Enter completed a review at 390 px without overflow. |
| `reduced-motion` | PASS | Motion transforms were removed and transitions were effectively instant. |

The live pages and README were cross-checked against the registry. No unlisted
public promise was found. Evidence logs are under
`/work/.evidence/claim-*.log`; the summary is
`/work/.evidence/claims-summary.tsv`.

## Clean-checkout gates

The checkout was clean at `22d38aa` before dependency installation. The only
changes after testing are this report and the handoff update.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages installed; 0 vulnerabilities reported |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm test` | PASS — 12/12 tests in 3 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — `dist/index.html` created |
| `npm run test:e2e` | PASS — 22/22 Chromium tests |
| 18 individual claim commands | PASS — 18/18 |

Build output stayed within the static budgets: initial JavaScript 38.00 KB
raw / 12.87 KB gzip, CSS 23.09 KB raw / 5.93 KB gzip, mobile hero WebP
22.84 KB, and no webfonts.

## Live demo and user paths

- `/demo` opened a useful report immediately with three realistic cards,
  eight review rows, a 59/100 alignment score, grade tendency, result
  distribution, and recent trend.
- The **Demo — sample data, nothing is saved** label stayed visible on demo
  routes. Adding a fourth sample card then choosing **Reset demo** restored the
  original three. **Start for real** returned the separately created ordinary
  card and no sample card.
- A live HTTP review kept Match out of the accessible state until a grade was
  chosen. Good then showed Match, 45 days, and the 2.5× rule.
- Inputs rejected intervals 0 and 36,501 and accepted 36,500. Keyword mode
  without a keyword gave the recovery message. A malformed nested v1 import
  was rejected and all four current demo cards remained.
- Empty states, native confirmation cancellation, valid export/restore,
  deletion, exact/keyword boundaries, and formula-safe CSV behavior are also
  covered by the passing unit and browser suites.

## Accessibility, phone, keyboard, and motion

- The factory URL verifier passed live: title, `lang="en"`, one `h1`, main
  landmark, image alt coverage, labelled buttons, and zero console errors.
- Playwright axe 4.10.2 found zero serious or critical violations on home,
  Demo, Review, Cards, Insights, Data, Privacy, Terms, the 404 state, and the
  live post-grade result.
- A fresh 390 px browser completed the review with Tab and Enter. The skip
  link was first, moved focus to main, and route navigation and browser Back
  focused the new heading.
- Visible phone controls measured at least 44 × 44 CSS px. The result had no
  horizontal overflow or label/badge overlap.
- Reduced-motion emulation removed transforms and reduced transitions to
  0.001 ms. No flashing or looping animation exists.
- Fresh desktop, phone, phone-result, and 404 captures were inspected at
  `/work/.evidence/live-*.png`; no clipping or blocked task was found.

The earlier standalone axe CLI could not discover Chrome in the repair
worker. This verification used the repository's pinned Chromium and the
equivalent Playwright axe integration locally and live; it passed.

## Privacy, offline use, updates, and installability

- Request capture through the live demo and review observed only
  `https://recall-calibrator.sociobot.in`. Source inspection found no
  analytics, tracker, remote font, third-party script, runtime API, or learner
  data request.
- Cards, answers, grades, and history use IndexedDB. Demo data uses the
  separate `demo:recall-calibrator` database.
- A fresh service-worker-controlled phone context went offline, reloaded
  `/demo`, retained all eight rows, and showed **Offline · changes safe**.
- The manifest is standalone with 192, 512, and maskable icons. In an isolated
  copy of the exact build, a changed worker displayed **An update is ready**;
  choosing Update activated the new worker, reloaded the demo, and replaced
  the old shell/runtime caches.
- Privacy and Terms load directly and explain local storage, exports,
  deletion, limitations, and demo isolation.

This product has no backend, account, tenant, server database, health route,
or product API. Tenant isolation, restart persistence, and 429/Retry-After
checks are not applicable. It is not a CLI, library, or desktop artifact.

The brief requires deterministic local matching. An AI step would weaken that
constraint and is not missed leverage for this job.

## Routes, links, and response policy

- Root, Demo, Review, Cards, Insights, Data, Privacy, and Terms each had the
  intended route title, one `h1`, `lang="en"`, and a main landmark.
- Twenty-three unique links were inspected. Every same-origin destination
  returned 200 and no dead link was found.
- An unknown live URL rendered **That page was not found**, used the correct
  title, kept the product design, exposed a home recovery link, and passed
  axe. Azure's SPA fallback returned HTTP 200 for this state. Status alone was
  not classified as a defect because the required structure and recovery path
  worked; the earlier review also stated that 200 itself was not its defect.
- Live headers include CSP with `frame-ancestors 'none'`, COOP, Permissions
  Policy, HSTS, nosniff, strict-origin referrer policy, and frame denial.
  Hashed assets are immutable for one year. The worker and manifest use
  `no-cache`, and the manifest has the correct media type.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| RC-QA-001 — proxy exposed before grade | Closed. Live accessibility snapshot excluded Match/Partial/Miss until grade commitment. |
| RC-QA-002 — invalid progress ARIA | Closed. Progress uses a native `progress` element; dynamic axe passed. |
| RC-QA-003 — phone targets below 44 px | Closed. Fresh live 390 px measurements found none below 44 × 44. |
| RC-QA-004 — Recorded badge overlap | Closed. Phone result inspection and suite clearance assertion passed. |
| RC-QA-005 — no immutable caching | Closed. Live hashed JS/CSS return one-year immutable caching. |
| RC-QA-006 — incomplete headers and manifest type | Closed. Live policy headers and manifest media type are correct. |
| RC-QA2-001 — malformed import destroys data | Closed. Live malformed nested import was rejected before replacement and retained current data. |
| RC-R1-001 — no isolated one-click demo | Closed. Live demo, label, reset, Start for real, and ordinary-data isolation passed. |
| RC-R1-002 — claims registry missing | Closed. 18 unique claims, one test each, and 18 passing commands. |
| RC-R1-003 — unclear first screen | Closed. Job, audience, sample action, consequence, and three facts were visible before scrolling on phone and desktop. |
| RC-R1-004 — route titles shared | Closed. All eight routes and the 404 state had distinct correct titles. |
| RC-R1-005 — no designed 404 | Closed. Unknown live URL rendered the designed 404 state and recovery link. |

## Live candidate identity and performance

The current documentation commits after `d228149` change only
`.factory/handoff.md`; they do not change the product. A fresh build matched
all 26 publicly served files byte-for-byte: 26 matches, 0 mismatches, and 0
fetch failures. `staticwebapp.config.json` is deployment configuration and was
not counted as a served product file. The deployed implementation is therefore
`d228149dab55db289c98b785e83412dec92450fc`.

Fresh Lighthouse 13.0.1 mobile results for the live root:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First Contentful Paint | 1.0 s |
| Largest Contentful Paint | 1.3 s |
| Speed Index | 1.2 s |
| Total Blocking Time | 60 ms |
| Cumulative Layout Shift | 0 |
| Transfer size | 57 KiB |

## Result

**PASS — 0 findings and 0 untested claims.**

