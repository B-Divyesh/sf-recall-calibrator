# Recall Calibrator

Recall Calibrator is a private review companion for spaced-repetition users
who want evidence behind their Again/Hard/Good/Easy choice. It asks for typed
recall before revealing the answer, scores that response with transparent
exact or keyword rules, and compares the result with the learner's self-grade.

It does not replace Anki or another scheduler, and it does not diagnose
learning. It improves the quality of the signal you choose to send to one.

Live: <https://recall-calibrator.sociobot.in>

## What v1 includes

- Exact-answer and required-keyword cards with multiple accepted answers
- Evidence-first review; the proxy is sealed until after the self-grade
- Personal signal alignment, generous/harsh tendency, and recent trend
- Transparent proxy-led intervals in the review result and CSV export
- IndexedDB persistence, full JSON export/restore, and explicit local deletion
- Installable offline PWA with a versioned app-shell cache and update prompt
- Responsive 390 px layout, complete keyboard path, and reduced-motion mode

All card content and review history remain in the browser. There are no
accounts, analytics, remote fonts, third-party scripts, or runtime APIs.

## Run locally

Requires a current Node.js release (Node 20.19+ recommended).

```sh
npm ci
npm run dev
```

Vite prints the local development URL. Browser data is scoped to that origin.

## Test and build

```sh
npm test          # deterministic matching and calibration unit tests
npm run test:e2e # Playwright workflow, axe, mobile, and offline tests
npm run build    # reproducible static output in dist/
```

The exact production build command is `npm run build`. It creates `dist/` with
`index.html` at the root and route fallbacks for `/privacy`, `/terms`, and the
application screens. To inspect it locally, run `npm run preview` after build.

## Deploy

Deploy the contents of `dist/` as a static site. HTTPS is required for service
workers outside localhost. No environment variables or backend are needed.

The researched product contract is in [`.factory/brief.json`](.factory/brief.json),
the risograph visual system and asset provenance are in
[`.factory/design.md`](.factory/design.md), and verification notes are in
[`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [`LICENSE`](LICENSE).
