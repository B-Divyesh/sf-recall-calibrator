# Demo sandbox

Open [https://recall-calibrator.sociobot.in/demo](https://recall-calibrator.sociobot.in/demo), or use `/demo` on a local preview.

The demo starts in one click with three realistic flashcards (Japan's capital,
photosynthesis inputs, and HTTP) and eight completed reviews. It opens a
populated calibration report immediately, then lets visitors review or edit
sample cards.

Demo storage uses the separate IndexedDB database `demo:recall-calibrator`.
It never reads or writes the ordinary `recall-calibrator` database. **Reset
demo** replaces only the sample database with its original cards and reviews.
**Start for real** discards the sample database and opens the ordinary card
screen; it does not copy sample data or change ordinary local data.

All claim tests enter through `/demo` in a fresh browser context.
