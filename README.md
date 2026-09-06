# Recall Calibrator

Recall Calibrator helps spaced-repetition users compare typed recall with the
Again, Hard, Good, or Easy grade they would choose. It is for people who want
a more reliable review signal before updating their scheduler.

[Try it with sample data](https://recall-calibrator.sociobot.in/demo) ·
[Live app](https://recall-calibrator.sociobot.in)

The sample opens with three cards and eight completed reviews. It has separate
browser storage, so resetting the demo or starting for real never changes
ordinary local cards or reviews.

## What it does

- Matches typed answers with deterministic exact or required-keyword rules.
- Accepts more than one exact answer for a card.
- Keeps the typed result sealed until a self-grade is chosen.
- Reports grade alignment, generous or harsh tendency, review history, and a
  deterministic suggested interval with its rule.
- Exports review history as CSV and restores cards and reviews from JSON.
- Stores cards and reviews in the browser. Local data persists after reload
  and can be deleted explicitly.
- Works offline after the first visit and is an installable standalone PWA.
- Supports keyboard review on a 390 px-wide screen and reduced-motion
  preferences.

Recall Calibrator is free. It needs no account or payment. A demo review makes
requests only to the product origin; card and review data are not sent to a
remote store.

It is a recall proxy, not a learning diagnosis. It does not replace an SRS or
grade essays, reasoning, or long-form answers.

## Run locally

Requires Node.js 20.19 or later.

```sh
npm ci
npm run dev
```

Browser data is scoped to the local origin. Open `/demo` to test the isolated
sample sandbox.

## Test and build

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

The build creates `dist/` with `index.html` at its root. Every public product
claim is recorded in [`.factory/claims.json`](.factory/claims.json). Run an
individual claim check from a clean checkout with its listed command, for
example:

```sh
npm run test:e2e -- --grep @claim:offline-reload
```

## Deploy

Deploy `dist/` as a static site. HTTPS is required for offline support outside
localhost. The static deployment configuration supplies headers, caching,
navigation fallback, and a styled 404 response. No environment variables,
backend, account, or payment integration is required.

Product scope is in [`.factory/brief.json`](.factory/brief.json). The visual
system and asset provenance are in [`.factory/design.md`](.factory/design.md).
The demo contract is in [`.factory/demo.md`](.factory/demo.md). The current
handoff is in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
