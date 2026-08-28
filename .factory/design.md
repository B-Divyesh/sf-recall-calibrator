# Recall Calibrator — visual thesis

## Direction: the memory print room

Recall is not a binary light switch; it is a fuzzy impression that becomes
measurable when two marks are laid over one another. The interface therefore
uses a **risograph tactile collage**: the learner's typed recall is one ink
layer, their self-grade is a second, and calibration is the registration
between them. Slight offsets, clipped paper scraps, grain, stamps, and visible
rules make the product feel like an honest measuring instrument rather than a
black-box tutor. Decoration appears only where it explains this comparison.

## Palette

The light treatment is deliberately single-mode: warm uncoated paper is part
of the product metaphor and is painted explicitly. It remains legible in dark
system environments instead of changing the meaning of its ink layers.

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F4EDDC` | canvas and install splash |
| Paper high | `#FFF9EA` | fields and raised sheets |
| Ink | `#20233D` | body text; 13.4:1 on paper |
| Muted ink | `#57576A` | secondary text; 6.1:1 on paper |
| Indigo | `#3548A4` | primary actions and recall layer |
| Indigo dark | `#24337E` | hover and focus support |
| Vermilion | `#C43E2F` | mismatch, annotations, urgency |
| Moss | `#317054` | verified match and success |
| Ochre | `#B56C10` | partial recall and warning |

No gradients. Overprint effects use flat translucent fields, sparse CSS grain,
and deliberate 2–4 px offsets. Meaning never depends on color: stamps always
include a word or symbol.

## Type

- **Display:** Georgia, Cambria, `Times New Roman`, serif. Editorial, human,
  and available locally with no font download.
- **Working text:** `Arial Narrow`, Arial, Helvetica, sans-serif. Direct and
  compact like workshop labels. Numbers use tabular figures.
- Scale: 16 px body, 20 px label, 25 px section heading, fluid 40–64 px h1.
  Body line-height is 1.55 and reading measure stays below 68 characters.

## Spacing and geometry

The base unit is 4 px; primary gaps are 8, 12, 16, 24, 32, 48, and 64 px.
Content caps at 1120 px. Review work is a single 720 px measure so the prompt
remains dominant. Corners are mostly 2–8 px rather than pill-shaped; paper
pieces use uneven clipped corners and offset shadows. Controls are at least
44 px tall with at least 8 px between targets.

At 390 px, the navigation becomes a compact top strip, paired metric blocks
stack, grade choices form a 2×2 grid, and nonessential explanatory captions
shorten. The prompt and typed-recall field remain above the fold.

## Interaction grammar

The journey is a print pass: **set a card → make an impression → reveal the
plate → stamp the grade → inspect registration**. One filled indigo action is
present at each step. Screen changes use a 180 ms opacity plus 8 px vertical
settle. Stamps land with a single 220 ms scale movement. Pressed buttons move
2 px like a physical platen. Under `prefers-reduced-motion`, movement and
transforms are removed and state changes are instantaneous; no animation
loops.

Focus uses a 3 px vermilion outline plus 3 px paper offset. Errors use an
announced inline note that says what happened and how to recover. Offline and
update notices are visible paper labels, never transient color alone.

## Asset plan and provenance

The hero illustration is an original generated bitmap: a top-down risograph
collage of two overlapping memory cards, a hand-operated registration press,
and aligned/misaligned ink marks. It demonstrates calibration without claiming
automatic intelligence. CSS-authored registration marks, stamps, and grain
complete the system; icons are small authored SVGs or Unicode marks with text.

### Prompt sheet

- Subject: tabletop memory-registration press, two overlapping flashcard
  impressions, abstract question mark and check marks, ruler ticks.
- World/materials: handmade cut paper, fibrous uncoated stock, imperfect
  risograph ink, torn edges, tactile editorial collage.
- Light/lens: flat overhead scan, nearly shadowless, close editorial crop.
- Palette words: warm oat paper, deep indigo, vermilion red, sparing moss.
- Negative list: photorealism, people, hands, gradients, glossy 3D, legible
  text, letters, logos, watermarks, brands, UI screenshot, fake controls.

Generation prompt: “Top-down editorial risograph paper collage of a compact
memory registration press comparing two overlapping flashcard impressions;
one indigo layer and one vermilion layer partially align, with abstract check
marks, question-mark-like curves and ruler registration ticks; handmade torn
paper, fibrous warm oat stock, imperfect ink coverage, limited three-ink
palette, flat overhead scan, nearly shadowless, sophisticated independent
magazine illustration, ample negative space, no people, no hands, no gradients,
no glossy 3D, no legible text, no letters, no logos, no watermark, no brands,
no UI screenshot.”

- Generator: Azure AI Foundry factory image deployment via
  `/opt/fleet/lib/gen-image.sh`.
- Generation date: 2026-08-28.
- License/provenance: original AI-generated asset commissioned for this product;
  no source artwork, named artist, brand, or copyrighted character referenced.
- Review criteria: no text artifacts, stray anatomy, trademark-like marks,
  misleading UI, broken card edges, or palette drift. Selected source and its
  prompt sidecar are kept in `assets/src/`; optimized derivatives ship locally.
