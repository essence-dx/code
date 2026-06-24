# Visual QA

Use this checklist after rendering final slides. A deck is not ready while a
render-visible blocker remains.

## Mechanical

- PPTX exists and is non-empty:
- Expected slide count:
- Every final slide rendered:
- Contact sheet or montage reviewed:
- Layout JSON reviewed when available:
- Intended fonts present in exported PPTX XML:
- `slide-plan.txt` or `edit-plan.txt` reviewed:
- `source-notes.txt` reviewed:
- Accepted runtime/export caveats:

## Deck-Level

- Title-only storyline makes sense:
- One coherent grid, margin, footer, and page-marker system:
- Repeated slide types use consistent spacing and hierarchy:
- Slide rhythm varies for real page-function reasons:
- No three-slide run repeats the same macro-layout without intent:
- Sources, dates, units, and assumptions are clear where needed:
- Material claims map to entries in `source-notes.txt`:
- User-facing citations, speaker notes, or source appendix are present where
  traceability is needed:

## Slide-Level

- Title states the takeaway, not just the topic:
- One dominant proof object is immediately findable:
- Body copy directly supports the title:
- No paragraph exists only to fill space:
- Text stays inside its allotted box:
- No unexpected wrapping, clipping, hidden overflow, or low contrast:
- Font family matches the intended design system; no unintended theme fallback
  such as Calibri:
- Filled cards, panels, and callouts have clear padding:
- No object covers labels, data, stage names, or body text that should remain
  readable:
- Images are relevant, high-resolution, and deliberately cropped:

## Charts, Tables, And Diagrams

- Chart values, labels, and visual marks use the same source data:
- Native chart APIs were used unless a fallback reason is recorded:
- Axes, units, baselines, and comparisons are honest:
- Labels attach visibly to the marks or regions they describe:
- Connectors land on the intended source and target objects:
- Tables preserve row/column grammar and remain readable:

## Imported Decks

- Before/after renders reviewed for each edited slide:
- Inherited typography, palette, spacing, footers, page markers, frames, crops,
  placeholders, charts, tables, and brand chrome were preserved unless the user
  asked for a change:
- Any intentional deviation is recorded:
- No empty inherited placeholder or default prompt text remains visible:

## Asset Integrity

- Logos, app icons, product UI, screenshots, customer marks, and other identity
  assets are user-provided, official, or sourced:
- Asset origin and usage are recorded in `source-notes.txt`:
- No generated or hand-drawn lookalike identity assets:
- No full-slide bitmap replaces editable text, charts, tables, or diagrams
  unless explicitly requested:

## Issue Ledger

| Issue | Slide(s) | Severity | Fix path | Status |
|---|---:|---|---|---|
|  |  |  |  |  |

Severity values:

- `blocker`: must fix before delivery.
- `fix-before-delivery`: should fix before delivery.
- `accepted-tradeoff`: may remain only with a short reason.

## Final Decision

- Pass/fail:
- QA ledger saved as `$QA_DIR/visual-qa.txt`:
- Remaining compromises to disclose:
