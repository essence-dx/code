---
name: Presentations
description: Create, edit, render, verify, and export editable PowerPoint PPTX decks with artifact-tool APIs.
---

# Presentations

Use this skill when the user asks for a deck, slide deck, presentation,
PowerPoint, PPT, or `.pptx` deliverable. Keep the workflow small: use
artifact-tool APIs, follow an existing template when one is provided, render the
result, and fix visible issues before delivery.

## Contract

- Use `@oai/artifact-tool` only.
- Export PPTX with `PresentationFile.exportPptx(presentation)`.
- Do not use Python PPTX mutation, direct OOXML edits, LibreOffice save-as, or a
  separate presentation runtime for the final deck.
- Use native editable shapes, text, images, tables, and charts. Full-slide
  bitmaps are not acceptable final slides unless the user explicitly asks for an
  image-only artifact.
- Use the Codex `image_gen` tool for generated raster assets when needed; do not
  call external image APIs or read image API keys.

## Workspace

Use the chat mode supplied by Codex. If the chat is not projectless, use the
project-backed layout.

Set:

- `SKILL_DIR=<absolute path to this skill>`
- `THREAD_ID=${CODEX_THREAD_ID:-manual-<timestamp-or-short-random-suffix>}`
- `TASK_SLUG=<sanitized task/deck slug>`
- `TOPIC_SLUG=<sanitized final deck filename slug>`

Select the remaining paths:

| Chat | Scratch workspace | Final PPTX |
| --- | --- | --- |
| Projectless | `$PWD/work/presentations/$TASK_SLUG` | User-requested path, otherwise `$PWD/outputs/$TOPIC_SLUG.pptx` |
| Project-backed | `$SCRATCH_ROOT/codex-presentations/$THREAD_ID/$TASK_SLUG` | User-requested path, repository convention, or `<project-root>/outputs/$TOPIC_SLUG.pptx` |

For project-backed chats, use an external scratch directory supplied by the
host. If none is supplied, compute `SCRATCH_ROOT` with
`node -p "require('node:os').tmpdir()"`; do not hardcode a platform-specific
temp path. Project-backed scratch must remain outside the repository.

An explicit user destination always wins. Set `OUTPUT_DIR` to the directory
containing `FINAL_PPTX`. If a projectless final is outside `outputs/`, an
optional copy under `outputs/` may be created for app surfacing, but the
requested path remains the primary result. Do not modify Git ignore settings
to conceal scratch files.

### Common workspace layout

After selecting `WORKSPACE`, set:

- `TMP_DIR=$WORKSPACE/tmp`
- `SLIDES_DIR=$TMP_DIR/slides`
- `PREVIEW_DIR=$TMP_DIR/preview`
- `LAYOUT_DIR=$TMP_DIR/layout`
- `ASSET_DIR=$TMP_DIR/assets`
- `QA_DIR=$TMP_DIR/qa`

Use absolute paths in scripts and handoffs. Put every generated file under
`$TMP_DIR` except `FINAL_PPTX` and any additional deliverables explicitly
requested by the user. Retain `$WORKSPACE` after delivery so follow-up turns
can inspect and reuse the prior work.

Use `.txt` for every generated intermediate prose artifact in `$TMP_DIR`,
including plans, source notes, prompt records, design notes, QA ledgers, and
fallback reasons. Reserve `.md` for installed skill/reference files such as
`SKILL.md`, `references/*.md`, and templates shipped with the skill. Do not
create generated planning files such as `slide-plan.md`.

## Mode Router

Choose one mode before coding:

- `create`: build a new deck from the prompt and source material.
- `template-following`: a source PPTX supplies the layout, style, or template.
  Follow `references/template-following.md`; this is an exact clone/edit path.
- `targeted-edit`: make bounded edits to an existing deck.

For `template-following` and `targeted-edit`, preserve the source deck's
typography, palette, spacing, layout, charts, images, placeholders, footers, page
markers, and brand chrome unless the user explicitly asks to restyle.

## Read The API Docs

Before authoring code, read `artifact_tool/API_QUICK_START.md`. Use
`artifact_tool/api/API_DOCS.md` as the API index and open only the topic
references needed for the task. These files are copied from the canonical
TypeScript presentation API docs used by `@oai/artifact-tool`.

For template-following work, also read `references/template-following.md` for
the exact clone/edit workflow, mapping contract, placeholder rules, and fidelity
gate.

Use live runtime help instead of guessing:

```js
const docs = presentation.help("slide.charts.add", {
  include: ["index", "examples", "notes"],
  maxChars: 6000,
});
console.log(docs);
```

## Basic Workflow

1. Identify mode, audience, desired slide count, sources, and output path.
2. Extract source facts into `$TMP_DIR/source-notes.txt`. Do not invent
   metrics, dates, logos, screenshots, or product UI.
3. Write the mode-specific plan artifacts. Use `$TMP_DIR/slide-plan.txt` for
   a new deck, `$TMP_DIR/edit-plan.txt` for a targeted edit, or the template
   audit and frame map required below. Record the slide list, required
   facts/assets, provenance, and object types needed.
4. Create or import the presentation with artifact-tool.
5. Build or edit slides with editable elements.
6. Render every slide plus a contact sheet or montage.
7. Use `templates/visual-qa-template.md` to write
   `$QA_DIR/visual-qa.txt`.
8. Fix visible issues, rerender, and export `FINAL_PPTX`.
9. Verify that `FINAL_PPTX` exists and that the retained `$WORKSPACE` still
   contains the source, preview, layout, asset, and QA files needed for
   follow-up work.

## Content Provenance

- Keep `$TMP_DIR/source-notes.txt` as the traceability ledger for facts,
  claims, data, quotations, and assets used in the deck.
- For each source, record a human-readable title, URL or source path,
  publication/source date when available, access date when relevant, and the
  slide or claim it supports.
- Distinguish user-provided material, source-deck content, official external
  sources, licensed assets, and generated assets. For generated assets, record
  that they were generated and the intended use.
- Put audience-appropriate citations in slide footers, speaker notes, or a
  sources appendix when traceability matters. Do not expose private local paths
  in the user-facing deck; use readable source names instead.
- Treat logos, app icons, product UI, screenshots, customer marks, and other
  identity assets as provenance-sensitive. Use user-provided, source-deck, or
  verified official assets; otherwise omit them.
- Assume the artifact reader has not seen the conversation. Do not include
  chat-relative language such as "as requested", "from this thread", "above",
  or "below" unless the user explicitly wants process commentary.

## Create Mode

Use `Presentation.create({ slideSize })`, `presentation.slides.add()`,
`slide.shapes.add(...)`, `slide.images.add(...)`, `slide.tables.add(...)`, and
`slide.charts.add(...)` as appropriate.

Use `$TMP_DIR/slide-plan.txt` for the implementation plan and
`$TMP_DIR/source-notes.txt` for content and asset provenance.

Before coding, define the create deck's basic style in
`$TMP_DIR/slide-plan.txt`:

- Colors: choose a topic-specific palette with one dominant color carrying
  roughly `60-70%` of the visual weight, `1-2` supporting tones, and one sharp
  accent. Do not give every color equal weight. Record exact hex values and
  ensure text/background pairs have strong contrast.
- Font families: name the exact heading, body, and numeric/KPI families. Prefer
  user-provided or brand/source fonts when available and suitable; otherwise use
  a deliberate Office-safe pairing such as `Aptos Display` + `Aptos`,
  `Georgia` + `Aptos`, `Aptos` + `Aptos`, or `Arial` + `Arial`.
- Font sizes: define an explicit role-based scale. Unless the user or brand
  requires otherwise, use cover titles `52-68px`, section titles `44-56px`,
  slide titles `30-40px`, eyebrow/kicker text `12-14px`, section headers
  `20-26px`, body/card prose `18-22px`, KPI/stat numbers `44-72px`,
  chart/table labels and legends `14-16px`, and captions/source notes
  `10-12px`. Avoid microtext outside non-critical footer or source notes.

Apply the chosen palette, families, and scale consistently across create-mode
slides. If content does not fit, rewrite, widen, split, or relayout before
shrinking important text.

Use config-first facade calls and explicit geometry for placement, dense
diagrams, and text-fit-sensitive layouts. Use `slide.autoLayout(...)` when
deterministic spacing within a frame is useful.

For charts, use native chart APIs first. Shape-drawn charts are a fallback only
when the native chart API cannot represent the intended visual clearly; record
the reason in QA notes.

## Template Following

Follow `references/template-following.md`. This mode is exact clone/edit:
inspect every source slide, map every output slide to a source slide, duplicate
the mapped slides into a starter deck, and edit inherited objects in place. Do
not rebuild mapped slides from blank layouts or use
`presentation.slides.add()`.

Create:

- `$TMP_DIR/template-audit.txt`
- `$TMP_DIR/template-frame-map.json`
- `$TMP_DIR/deviation-log.txt`
- `$TMP_DIR/template-starter.pptx`

Keep `$TMP_DIR/source-notes.txt` for content and asset provenance. The
template audit must identify source-deck provenance, preservation rules,
reusable patterns, inherited placeholders, and intentional deviations.

Inspect the complete source deck:

```bash
node "$SKILL_DIR/scripts/inspect_template_deck.mjs" \
  --workspace "$TMP_DIR" \
  --pptx "<source.pptx>"
```

Map each output slide to an inherited source slide and identify element-level
`editTargets`. Then validate the map and build the starter deck:

```bash
node "$SKILL_DIR/scripts/validate_template_plan.mjs" \
  --workspace "$TMP_DIR" \
  --map "$TMP_DIR/template-frame-map.json"

node "$SKILL_DIR/scripts/prepare_template_starter_deck.mjs" \
  --workspace "$TMP_DIR" \
  --pptx "<source.pptx>" \
  --map "$TMP_DIR/template-frame-map.json" \
  --out "$TMP_DIR/template-starter.pptx" \
  --preview-dir "$TMP_DIR/template-starter-preview" \
  --layout-dir "$TMP_DIR/template-starter-layout" \
  --contact-sheet "$TMP_DIR/template-starter-contact-sheet.png"
```

Import `template-starter.pptx` with artifact-tool and edit only inherited
slides/objects unless the validated frame map explicitly allows an insertion.
Preserve source typography, palette, spacing, layout, placeholders, brand
chrome, images, crops, tables, and chart frames unless the user explicitly asks
to change them. Audit structural placeholders, including `sldNum`, `dt`, and
`ftr`; fill or delete them explicitly even when rendered PNGs hide them.

If no source slide can support requested content without a parallel rebuild,
report the blocker and the closest viable source-slide options.

## Targeted Edits

Import the supplied PPTX and edit copied objects in place:

```js
const presentation = await PresentationFile.importPptx(
  await FileBlob.load(sourcePptx),
);
const snapshot = await presentation.inspect({
  kind: "slide,textbox,shape,image,table,chart,layout",
  maxChars: 8000,
});
console.log(snapshot.ndjson);
const target = presentation.resolve(anchorIdFromInspect);
// edit target
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(finalPptx);
```

Use `$TMP_DIR/edit-plan.txt` for scoped edits. Preserve the complete deck,
slide order, and unrelated objects. Render before/after evidence for affected
slides.

## QA Gate

Before final delivery:

- Confirm the PPTX exists, is non-empty, and has the expected slide count.
- Confirm `OUTPUT_DIR` contains only the final PPTX and explicitly requested
  deliverables.
- Render every final slide and inspect the full-size renders.
- Check for text overflow, clipping, accidental wrapping, misaligned boxes,
  detached labels, broken connectors, and inconsistent footers/page markers.
- Verify chart values, labels, and visual marks share the same source data.
- Verify every material claim and externally sourced asset is traceable through
  `source-notes.txt`, and that user-facing citations or notes are present where
  the audience needs them.
- Verify intended fonts are present in the exported PPTX XML. For
  artifact-tool text styles, use `typeface`, not pptxgenjs-style `fontFace`;
  `fontFace` is ignored and can leave the PPTX on a theme fallback such as
  Calibri even when rendered PNGs look acceptable.
- Verify logos, app icons, product UI, screenshots, and customer marks are
  user-provided, official, or otherwise sourced; remove unverified identity
  assets.
- For imported decks, compare before/after renders and preserve inherited
  frames, crops, type, placeholders, and chart/table positions unless intentionally
  changed.
- For template-following work, run the fidelity gate:

  ```bash
  node "$SKILL_DIR/scripts/check_template_fidelity.mjs" \
    --workspace "$TMP_DIR" \
    --starter-pptx "$TMP_DIR/template-starter.pptx" \
    --final-pptx "$FINAL_PPTX" \
    --map "$TMP_DIR/template-frame-map.json" \
    --starter-layout-dir "$TMP_DIR/template-starter-layout" \
    --final-layout-dir "$LAYOUT_DIR/final" \
    --edit-dir "$TMP_DIR"
  ```

  Fix all failures, including unresolved structural placeholders, fresh-slide
  rebuilds, opaque overlays masking inherited content, or prohibited
  Python/OOXML/LibreOffice mutation.
- Confirm generated planning and QA prose uses `.txt`, including
  `slide-plan.txt`, `edit-plan.txt`, template audit/deviation logs, and
  `qa/visual-qa.txt`.

If render-visible defects remain, fix and rerender before exporting.

## Retained Workspace And Final Response

After final export and verification, keep `$WORKSPACE` intact even when
`OUTPUT_DIR` is an external directory. Scratch files remain available to the
model for later iterations. Only the final PPTX and explicitly requested
deliverables are user-facing.

Return the final `.pptx` path, a short QA summary, and any remaining caveats.
Do not attach scratch plans, previews, layout JSON, or temporary assets unless
the user asks for them.
