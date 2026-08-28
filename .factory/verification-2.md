# Recall Calibrator — independent product verification 2

**Verdict: FAIL**

- Work order: `recall-calibrator-verify-2`
- Candidate: `f0b7066a743482643ff22b64ab765ecdcb737e23`
- Candidate URL: <https://recall-calibrator.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: offline-first static PWA

The candidate's core review workflow, deterministic matching, persistence,
exports, accessibility, offline reload, service-worker update path, privacy
boundary, response policy, and performance all passed. The live deployment is
also byte-identical to the candidate's production artifact. The release still
fails the acceptance contract because the JSON restore boundary accepts
malformed version-1 records, deletes valid local data before validation, and
leaves core routes unable to render.

## Defects

Severity scale: S1 critical, S2 major/release-blocking, S3 minor.

### RC-QA2-001 — S2 — malformed v1 import destroys valid local data and corrupts the app

Freshly reproduced in both the local production build and the live deployment:

1. Load the three example cards.
2. Open Data and import this file, accepting the replacement confirmation:

   ```json
   {
     "schemaVersion": 1,
     "exportedAt": "2026-08-28T00:00:00.000Z",
     "cards": [{ "id": "broken" }],
     "reviews": [],
     "settings": { "sampleSize": 20, "normalizedPunctuation": true }
   }
   ```

3. IndexedDB changes from the three valid example records to the single
   malformed `{ "id": "broken" }` record. The UI treats the import as
   successful; it does not show a validation error.
4. Choosing Cards changes the URL to `/cards`, raises
   `Cannot read properties of undefined (reading 'replace')`, and leaves the
   Data screen displayed.
5. Reloading `/cards` shows the generic “The local drawer would not open”
   storage-error screen. “Try again” cannot repair the corrupt record.

Expected: validate every card, review, and settings field before confirmation
and replacement; write the entire import atomically; preserve current data on
any validation/write/render failure. Actual: `src/db.ts:59-64` validates only
the top-level version and arrays, calls `clearAll()` first, and then writes
unchecked records. `src/main.ts:149` later assumes `card.prompt` and the other
card fields are valid. This violates the required invalid-input recovery path
and the local-first data-ownership promise. Users without a separate export
cannot recover the deleted collection.

No S1 or additional S2/S3 defects were found in this run.

## Clean-checkout quality gates

The checkout began clean at the exact candidate. `origin/main` independently
resolved to the same SHA during verification.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 59 packages installed; npm reported 0 vulnerabilities |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |
| `npm test` | PASS | 2 files, 8/8 Vitest tests |
| `npm run typecheck` | PASS | `tsc --noEmit` exited 0 |
| `npm run lint` | PASS | Repository lint script (`tsc --noEmit`) exited 0 |
| `npm run build` | PASS | Exact production command completed and created `dist/` |
| `npm run test:e2e` | PASS | 4/4 supplied Chromium tests in 18.1 s |

The production build emitted:

- Initial JavaScript: 29,922 B raw / 10.66 kB gzip (200 kB budget)
- CSS: 21,735 B raw / 5.65 kB gzip (50 kB budget)
- Mobile hero WebP: 22,840 B (300 kB budget)
- Fonts: 0 B (120 kB budget)
- Complete `dist/`: 383,526 B

## Independent functional coverage

An isolated live Chromium run passed 33 explicit assertions before the
separate corrupt-import reproduction:

- Empty Review routed to card setup.
- Browser validation rejected empty prompt/answer, interval 0, interval
  36,501, and blank typed recall. Interval 36,500 was accepted.
- Keyword mode without keywords announced a specific recovery message.
- Prompt markup rendered literally rather than as HTML.
- Exact matching normalized case, accents, whitespace, and punctuation.
- A match at the accepted interval boundary produced the documented 91,250-day
  proxy-led interval and persisted it through reload.
- A separate keyword card produced Partial for one of two complete keywords,
  aligned with Hard, and produced a 6-day interval from 5 days.
- The proxy result was absent from the DOM before grading and appeared only
  after grade commitment.
- Populated Insights accurately reported the saved review.
- JSON and CSV downloads contained the answer variants, typed evidence, proxy
  result, grade, and interval. CSV cells use formula-injection protection.
- Malformed JSON syntax and a wrong schema version produced recoverable errors
  without changing data.
- Canceling deletion preserved data; confirming deletion cleared it; importing
  the product's own valid JSON restored one card and one review.

The supplied unit suite additionally covered full/partial/miss keyword
scoring, complete-word boundaries, normalization, interval rules, bias, and
eight-sample improvement.

RC-QA2-001 is the uncovered structural-validation case: a payload with the
right top-level version and arrays but invalid records.

## Accessibility, keyboard, responsive layout, and visual review

- Axe 4.10.2 found **0 serious/critical violations** on empty Review, populated
  Cards, pre-grade, post-grade, populated Insights, and every primary route.
- The factory `verify-url.sh` passed locally and live: HTTP 200, title,
  `lang="en"`, one `h1`, main landmark, alt coverage, labelled buttons, and
  no console/page errors on the normal path.
- A keyboard-only 390 px run used Tab/Enter for the skip link, example loading,
  Review navigation, sample start, typed recall, reveal, and grade. The skip
  link was first, visibly focused with a 3 px vermilion outline, and moved
  focus to `main`; review entry focused the labelled textarea and grading
  focused the first grade button.
- At 390 × 844, both home and the dynamic result had `scrollWidth === 390`.
  The brand, all navigation items, legal links, and grade buttons met the
  44 px target requirement. The sealed label and Recorded badge had a 13.71 px
  gap and did not overlap.
- Reduced-motion emulation matched; the hero transform became `none` and UI
  transition duration became 0.001 ms.
- Desktop 1440 × 1000 and mobile 390 × 844 captures were visually reviewed.
  Hierarchy, legibility, responsive stacking, original risograph identity,
  and state clarity were sound.
- The visual thesis explicitly documents its single light treatment, palette,
  typography, spacing, motion, asset prompt, generator, date, and provenance.

## PWA, persistence, and privacy

- Chromium returned no manifest parse or installability errors. The manifest
  has standalone display, a versioned start URL, theme/background tokens, 192
  and 512 px icons, and a 512 px maskable icon.
- After service-worker control, a 390 px offline reload restored the app,
  displayed “Offline · changes safe,” and retained 3 cards and 1 review in
  IndexedDB.
- In an isolated copy of the production artifact, changing the worker cache
  version and calling `registration.update()` displayed “A fresh edition is
  ready.” Choosing Update activated the new worker, reloaded the page, and
  replaced `recall-shell-qa-update-2` / `recall-runtime-qa-update-2` with the
  `qa-update-3` caches.
- Normal workflow request capture observed 13 requests, all to the product
  origin. No analytics, trackers, remote fonts/scripts, runtime APIs, or
  learner-data requests were observed. Source inspection found no application
  network client beyond the same-origin service-worker fetch handler.
- `/privacy` and `/terms` load directly and explain IndexedDB storage, exports,
  deletion, and the recall-proxy limitation.

The product has no backend, unlock endpoint, account, or sign-in. API rate
limiting, backend concurrency/health identity, and Entra authority checks are
therefore not applicable. This is not a library or CLI, so consumer packing is
also not applicable.

## Live identity and response policy

- All **23** publicly served files from the fresh `dist/` build matched the
  corresponding live bytes exactly: 23 matched, 0 mismatched, 0 fetch failures.
  `staticwebapp.config.json` was correctly excluded because Azure consumes it
  as deployment configuration rather than serving it as a product file.
- HTTPS home, Privacy, Terms, manifest, worker, and assets returned 200. HTTP
  redirected to HTTPS with 301. An unknown route uses the intended SPA shell.
- HTML carries HSTS, strict-origin referrer policy, nosniff, CSP with
  `frame-ancestors 'none'`, Permissions-Policy, COOP, and `X-Frame-Options:
  DENY`.
- Hashed assets return `Cache-Control: public, max-age=31536000, immutable`.
  The worker and manifest return `no-cache`; the manifest media type is
  `application/manifest+json`.
- The app does not embed a Git SHA, but byte-for-byte comparison of every
  public build output establishes that the live artifact is the candidate.

## Lighthouse

Lighthouse 13.0.1 against the live home page with its mobile profile:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.323 s |
| LCP | 1.324 s |
| Speed Index | 1.633 s |
| Total Blocking Time | 50 ms |
| CLS | 0 |
| Transfer size | 55,880 B |

Lighthouse did not emit a lab INP value. Keyboard and pointer interactions in
the workflow completed without observable delay.

## Reproduction and release requirement

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

Release requires closing RC-QA2-001 with strict runtime schema validation and
an atomic, non-destructive import, adding regression tests for invalid nested
records and failed writes, then rerunning this verification.
