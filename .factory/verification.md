# Recall Calibrator — independent product verification

**Verdict: FAIL**

- Work order: `recall-calibrator-verify-1`
- Candidate: `f9645843fa1fd42a1817e74c0b557a818f28035c`
- Candidate URL: <https://recall-calibrator.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: offline-first PWA

The core workflows, local persistence, exports, offline reload, update prompt,
privacy boundary, build, and supplied tests work. The candidate is not
releasable under the acceptance contract because the active review flow has an
axe `serious` finding and exposes the supposedly sealed recall-proxy result to
screen readers before the learner grades. The supplied accessibility test only
visits the review intro, so it misses both problems.

## Defects

Severity scale: S1 critical, S2 major/release-blocking, S3 minor.

### RC-QA-001 — S2 — sealed proxy is announced before self-grading

On a card whose normalized exact answer matches, type the answer, choose
“Reveal answer,” and inspect the grade screen with the accessibility tree. The
tree contains:

```text
paragraph: Typed-recall proxy is match; it stays hidden until you grade.
```

This text is visually clipped with `.sr-only`, not hidden from assistive
technology. A screen-reader user therefore learns Match/Partial/Miss before
choosing Again/Hard/Good/Easy. That breaks the evidence-first core workflow and
can bias the calibration signal for those users. Source:
`src/main.ts:115-119`.

Expected: the proxy result is unavailable to every user until a grade has been
committed. Actual: it is in the accessibility tree before grading.

### RC-QA-002 — S2 — active review screen has an axe serious violation

Axe 4.10.2 on the post-reveal grade screen reports one serious
`aria-prohibited-attr` violation:

```html
<div class="progress" aria-label="0% of sample complete">
```

Failure: `aria-label attribute cannot be used on a div with no valid role
attribute.` The node needs valid progress semantics or must not carry the ARIA
name. This directly fails the contract requirement of zero serious/critical
axe findings. Source: `src/main.ts:102-103`.

### RC-QA-003 — S3 — three mobile interactive targets are below 44 px

At a 390 × 844 CSS-pixel viewport, measured rendered bounds were:

| Target | Width | Height |
| --- | ---: | ---: |
| Home/brand link | 157.25 px | 36 px |
| Privacy footer link | 41.95 px | 15 px |
| Terms footer link | 34.84 px | 15 px |

These miss the attached accessibility/design requirement that all touch targets
be at least 44 × 44 CSS px.

### RC-QA-004 — S3 — mobile “Recorded” badge overlaps its label

On the post-reveal grade screen at 390 × 844, the absolutely positioned
“Recorded” stamp overlays the end of “Your typed recall · proxy sealed.” The
state remains usable, but the label is visibly crowded/obscured at the required
mobile width.

### RC-QA-005 — S3 — production caching does not use immutable asset policy

The HTML, service worker, manifest, and hashed JS/CSS assets all return:

```text
Cache-Control: public, must-revalidate, max-age=30
```

Hashed assets such as `/assets/index-BwTL_iqO.js` should receive a long-lived
immutable policy. The current deployment misses the attached performance
caching requirement and causes unnecessary revalidation.

### RC-QA-006 — S3 — response-policy hardening is incomplete

The live HTML has HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and
`X-Content-Type-Options: nosniff`. It does not return Content-Security-Policy,
Permissions-Policy, `frame-ancestors`, or X-Frame-Options. The manifest is also
served as `application/octet-stream` instead of a manifest/JSON media type.
Chromium nevertheless reported zero installability errors. No exploit was
demonstrated; this is a defense-in-depth and interoperability gap.

## Clean-checkout gates

The checkout was clean and exactly at the candidate before installation.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 59 packages installed; audit performed during install found 0 vulnerabilities |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |
| `npm test` | PASS | 1 file, 6/6 Vitest tests |
| Type check | PASS | `tsc --noEmit` runs inside the production build |
| Lint | N/A | No lint script/configuration is present |
| `npm run build` | PASS | Vite 7.3.6; `dist/` produced; service worker injected |
| `npm run test:e2e` | PASS | 3/3 supplied Chromium tests in 16.4 s |

The exact build emitted:

- JS: 29,845 B raw / 10.69 kB gzip (budget 200 kB)
- CSS: 20,685 B raw / 5.48 kB gzip (budget 50 kB)
- Mobile hero WebP: 22,840 B (budget 300 kB)
- Fonts: 0 B (budget 120 kB)

## Independent functional coverage

An isolated Chromium harness ran 51 passing assertions against the live URL;
the same key findings were reproduced from the local production build.

- Empty state led to card creation and review setup.
- Required prompt/answer validation fired; keyword mode without keywords gave
  a specific recovery message.
- Current-interval boundaries rejected 0 and 36,501 and accepted 36,500.
- Exact matching normalized whitespace, case, accents, and punctuation.
- Unit coverage confirmed full/partial/miss keyword scoring and complete-word
  boundaries rather than substring matching.
- Special characters in a prompt rendered as text, not markup.
- A complete typed-recall → reveal → grade → interval → insights workflow
  persisted through reload.
- The upper input boundary produced the documented deterministic 91,250-day
  match interval; JSON and CSV exported that value and the review evidence.
- Malformed and wrong-schema JSON imports reported recoverable errors.
- Canceling deletion preserved data; confirmed deletion cleared it; a valid
  JSON round trip restored one card and one review.
- A complete keyboard-only path created a card and completed a review using
  Tab/Enter. The skip link was first, visibly focused, and moved focus to main.
- All seven routes had one `h1`, a main landmark, and `lang="en"`.
- No uncaught page errors or console errors occurred.

Static route scans had zero serious/critical axe findings. The dynamic grade
screen produced RC-QA-002. Contrast checks passed in axe; the visual thesis is
explicitly single-mode.

## PWA, persistence, and privacy

- Chromium parsed the manifest with zero manifest or installability errors.
- After service-worker control, an explicit offline browser reload restored
  the app shell, routed to Cards offline, and retained IndexedDB data.
- In an isolated copy of the exact production artifact, changing the served
  service-worker version and calling `registration.update()` displayed “A
  fresh edition is ready.” Choosing “Update” activated the new worker and
  reloaded the page.
- Reduced-motion emulation matched and removed the hero transform.
- At 390 px, document `scrollWidth` equaled `innerWidth` (390 px); there was no
  page-level horizontal overflow.
- Request capture during workflows observed only the app origin. There were no
  analytics, trackers, remote fonts/scripts, API calls, or learner-data
  requests. JSON/CSV exports contained the expected local data.
- `/privacy` and `/terms` loaded directly; their route artifacts are included
  in the service worker's precache.

## Live deployment and response checks

- `origin/main` resolved to the candidate at verification time.
- Every one of the 22 files in the fresh local `dist/` was fetched from the
  corresponding live path and compared byte-for-byte: **22 matched, 0
  mismatched, 0 fetch failures**. This establishes that the live deployment is
  the candidate artifact despite the app not embedding a Git SHA.
- HTTP redirects to HTTPS with 301. Primary and legal routes return 200.
- A nonexistent route returns the app shell with 200 rather than a 404.
- HSTS is `max-age=10886400; includeSubDomains; preload`.
- Live request capture stayed same-origin and recorded no console/page errors.

## Lighthouse and visual review

Lighthouse 13.0.1 against the live home page, using its mobile profile:

| Category/metric | Result |
| --- | ---: |
| Performance | 93 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.0 s |
| LCP | 1.3 s |
| Speed index | 1.2 s |
| TBT | 330 ms |
| CLS | 0 |
| Transfer size | 41 KiB |

Lighthouse only exercised the home state and therefore did not contradict the
dynamic axe finding. Lab INP was not emitted; the keyboard and pointer action
smoke tests responded without observed delay.

Desktop 1440 × 1000 and mobile 390 × 844 full-page captures were reviewed.
The visual hierarchy, readable body size, responsive stacking, original
risograph asset, and lack of horizontal overflow were sound. RC-QA-003 and
RC-QA-004 were found during that review.

## Reproduction commands

```sh
npm ci
npm audit --omit=dev
npm test
npm run build
npm run test:e2e
npm run preview -- --strictPort
```

For release, fix RC-QA-001 and RC-QA-002, add a dynamic post-reveal axe test,
and rerun the entire verification. RC-QA-003 through RC-QA-006 should also be
closed before calling the product platform-grade.
