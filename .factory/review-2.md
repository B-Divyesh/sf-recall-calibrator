# Compare typed recall with self-grades — review 2

**Verdict: PASS — 0 findings and 0 untested claims.**

- Work order: `recall-calibrator-review-2`
- Live URL: <https://recall-calibrator.sociobot.in>
- Implementation candidate reviewed: `d228149dab55db289c98b785e83412dec92450fc`
- Documentation/report tip reviewed: `f3f116b398ad7314d9c7a0903940d05be130ef1e`
- Reviewed: 2026-09-06 UTC
- Artifact: local-first static offline PWA; no backend, account, tenant, health, or rate-limit surface

The documentation commits after `d228149` do not change product code or assets. A new production build matched the deployed public artifact: 26/26 files matched byte-for-byte. `staticwebapp.config.json` is deployment input and the generated source map is not a public product file.

## Job, audience, and first action

The job is to compare typed recall with the self-grade a learner would send to an SRS. The audience is spaced-repetition users who want evidence before choosing Again, Hard, Good, or Easy. The first action is **Try it with sample data**.

Fresh 1440 × 1000 desktop and 390 × 844 phone browsers showed the job, audience, sample action, consequence, and private/offline/free facts before scrolling. The live title is `Recall Calibrator — compare recall and grades`; the page has one `h1` and a `main` landmark. The phone has no horizontal overflow. Captures are `/work/.evidence/review2-live-desktop.png` and `/work/.evidence/review2-live-phone.png`.

## Findings

None.

| Severity | Count |
| --- | ---: |
| S1 critical | 0 |
| S2 major | 0 |
| S3 minor | 0 |

## Declared claims

`.factory/claims.json` has 18 distinct claims, 18 distinct `@claim:` tags, and one declared command for each tag. I ran every declared command separately from the clean installed checkout. All passed; no public claim in the live copy or README was missing from the registry.

| Claims | Result |
| --- | --- |
| demo-isolation, privacy-local, no-account-payment, no-remote-store | PASS |
| exact-match, keyword-match, accepted-answers, sealed-proxy | PASS |
| calibration-report, calibration-tendency, transparent-interval | PASS |
| csv-export, json-restore, delete-local-data | PASS |
| offline-reload, pwa-install, keyboard-mobile, reduced-motion | PASS |

The full browser suite passed 22/22 Chromium tests. The unit suite passed 12/12. A fresh live demo opened with three realistic cards and eight reviews, kept its persistent **Demo — sample data, nothing is saved** label, reset to eight reviews, and showed Match plus the 2.5× interval rule only after the grade. A separately created ordinary card was absent in demo and remained after **Start for real**; no sample card was copied to ordinary storage. The live request capture during the review contained only `https://recall-calibrator.sociobot.in`.

## Normal, invalid, recovery, accessibility, and PWA checks

- Live normal review: typed HTTP recall stayed sealed before grade, then Good showed Match and its deterministic rule. The phone result capture is `/work/.evidence/review2-live-phone-result.png`.
- Live boundaries: interval 0 and 36,501 were invalid; 36,500 was valid. The browser suite also passed keyword recovery, malformed-import retention, JSON restore, deletion confirmation, CSV export, and exact/keyword matching.
- Keyboard/mobile: the full 390 px Tab/Enter review claim passed; live phone width was 390 px with no overflow. The skip link, focus styles, labelled controls, native progress, and route-heading focus are covered by the suite.
- Accessibility: Playwright axe 4.10.2 on fresh live desktop, phone, and demo result, plus the local route sweep, found zero serious or critical violations. No live console or page errors occurred on the fresh home checks. This is the repository's Playwright axe integration; no `verify-url.sh` exists here.
- Motion and offline: reduced-motion removes the visual transform and makes control transitions effectively instant. In a new service-worker-controlled live context, `/demo` reloaded offline with the populated report and **Offline · changes safe**.
- Routing: root, Demo, Review, Cards, Insights, Data, Privacy, Terms, `robots.txt`, and `sitemap.xml` returned 200. A missing URL rendered the designed “That page was not found.” state with a recovery link. Its HTTP 200 is the expected SPA fallback, not a broken page.
- Privacy and policy: source and live request inspection found no analytics, remote fonts, third-party scripts, or learner-data request. Live CSP, frame denial, COOP, Permissions Policy, HSTS, referrer policy, nosniff, manifest media type, and immutable hashed-asset caching are present.

Backend tenant isolation, restart persistence, health checks, and 429/`Retry-After` do not apply to this static PWA. CLI/library/desktop consumer checks do not apply. The brief requires deterministic local matching; an AI step is not a missing feature for this job.

## Clean-checkout gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages installed |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| `npm test` | PASS — 12/12 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — `dist/index.html` created |
| `npm run test:e2e` | PASS — 22/22 |
| All 18 commands in `.factory/claims.json` | PASS — 18/18 |

The fresh build stayed inside static budgets: JS 37,997 B raw / 12,792 B gzip, CSS 23,087 B raw / 5,941 B gzip, mobile hero 22,840 B, and no shipped fonts.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| RC-QA-001 — proxy exposed before grade | Closed: live accessibility snapshot omitted Match before grade; claim passed. |
| RC-QA-002 — invalid progress ARIA | Closed: native progress and dynamic axe passed. |
| RC-QA-003 — sub-44 px phone targets | Closed: 390 px target test passed. |
| RC-QA-004 — Recorded badge overlap | Closed: compact result clearance test and live capture passed. |
| RC-QA-005 — no immutable caching | Closed: live hashed JS has one-year immutable caching. |
| RC-QA-006 — incomplete policy headers/manifest type | Closed: live headers and manifest media type are correct. |
| RC-QA2-001 — malformed import destroys data | Closed: strict validation and atomic retention tests passed. |
| RC-R1-001 — no isolated one-click demo | Closed: live demo, reset, Start for real, and storage isolation passed. |
| RC-R1-002 — claims registry missing | Closed: 18 claims each have a passing command. |
| RC-R1-003 — unclear first screen | Closed: job, audience, first action, consequence, and facts appeared before scroll. |
| RC-R1-004 — shared route titles | Closed: route-title sweep passed. |
| RC-R1-005 — no designed 404 | Closed: live missing route has a designed recovery state. |

## Result

**PASS — 0 findings and 0 untested claims.**

