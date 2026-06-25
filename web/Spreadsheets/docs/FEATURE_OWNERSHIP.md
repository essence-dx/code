# Feature Ownership Map

Use this map before adding Excel-parity work so changes start in the right folder and stay small.

## Product Surfaces

- Dashboard, auth, users, and admin controls live under `src/app`, `src/components/dashboard`, `src/features/auth`, and `src/lib`.
- Workbook editor chrome, dialogs, import/export flows, and side-panel composition start in `src/features/spreadsheet/components/spreadsheet-shell.tsx`.
- Toolbar commands and visible workbook controls start in `src/features/spreadsheet/components/spreadsheet-toolbar.tsx`.
- Grid rendering belongs in `src/features/spreadsheet/components/spreadsheet-grid.tsx`, `grid-cell.tsx`, `viewport-row.tsx`, grid header helpers, and grid hooks.

## Spreadsheet State And Commands

- Pure selection, range, movement, and used-range behavior belongs in `src/features/spreadsheet/state/selection-state.ts`.
- Editing, formatting, fill, clipboard, sorting, merge, protection, print, history, sheet lifecycle, and workbook object commands belong in the matching `src/features/spreadsheet/state/*` module.
- `src/features/spreadsheet/use-spreadsheet-state.ts` should stay orchestration-focused. Add a new command module when a feature needs a new ownership boundary.
- Formula recalculation, dependency tracking, references, locale behavior, structured references, and formula security belong in `src/features/spreadsheet/formula-*` and nearby formula modules.

## Workbook Document And Files

- Workbook schema and persisted data contracts live in `src/features/workbooks/types.ts`.
- Default document creation lives in `src/features/workbooks/default-workbook.ts`.
- Normalization and import safety currently live in `src/features/workbooks/serialization.ts`; split this into validation, normalization, migration, and file-adapter modules before adding another large document-shape feature.
- Address helpers live in `src/features/workbooks/addresses.ts`.
- File-specific import/export logic belongs in `src/features/workbooks/csv.ts`, `html.ts`, `pdf.ts`, `xml.ts`, `xlsx.ts`, backup modules, and connector modules.

## Excel-Parity Feature Areas

- Power Query-style imports, transforms, refresh metadata, and credentials belong in `src/features/workbooks/import-*`, `query-definitions.ts`, and spreadsheet import dialogs.
- PivotTables, slicers, timelines, Solver, scenarios, data tables, ToolPak-style analysis, and forecast output belong in `src/features/spreadsheet/*` modules named for the specific analysis surface.
- Charts, sparklines, inserted objects, images, shapes, and text boxes belong in chart/object modules plus the grid overlay components that render them.
- Sharing, comments, mentions, activity, and workbook permissions belong in workbook server actions, auth guards, comments modules, and dashboard/editor access checks.
- Tauri desktop, local open/save, encrypted cache, and sync reconciliation belong in the Tauri shell plus desktop/offline modules.

## Change Checklist

- When adding a `WorkbookDocument` field, update the type, default document, normalization, JSON import/export, compatibility or statistics surfaces if relevant, and a focused script check.
- When adding a range transform, add a focused check in `scripts/check-workbook-core-helpers.ts` or the feature-specific script.
- When adding formula reference behavior, cover absolute references, quoted strings, sheet names, and negative shifts.
- When changing import/export behavior, keep risky content visible in compatibility or sanitization reporting rather than silently discarding it.
