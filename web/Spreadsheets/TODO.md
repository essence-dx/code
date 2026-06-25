# Essence Excel TODO

Current project status: 100/100 for the first Excel-parity milestone.
Current advanced Excel-parity batch: 100/100.

We do not have all Excel features yet. Essence Excel has a serious spreadsheet foundation, but Microsoft Excel is a decades-deep workbook platform with desktop-only analysis, modeling, automation, collaboration, compatibility, and enterprise controls. This TODO is the simplified source of truth for closing that gap without turning the repo into messy feature sprawl.

## Simplification Rules

- Keep each feature in a small folder with UI, state, service, types, and tests where useful.
- Split large files before adding new behavior to them.
- Prefer real spreadsheet behavior over demo panels or decorative UI.
- Keep TODO and CHANGELOG factual; no inflated completion percentages.
- Run `bun run typecheck` after meaningful implementation batches. Avoid repeated local builds during normal feature work.

## References Used For The Feature Gap

- Microsoft Office for the web service description: https://learn.microsoft.com/en-us/office365/servicedescriptions/office-online-service-description/office-online-service-description
- Microsoft Excel for the web service description: https://learn.microsoft.com/en-us/office365/servicedescriptions/office-online-service-description/excel-online
- Microsoft Power Query in Excel: https://support.microsoft.com/en-gb/office/about-power-query-in-excel-7104fbee-9e62-4cb9-a02e-5bfb1a6c536a
- Microsoft Power Pivot in Excel: https://support.microsoft.com/en-us/office/power-pivot-powerful-data-analysis-and-data-modeling-in-excel-a9c2c6e2-cc49-4976-a7d7-40896795d045
- Microsoft PivotTable calculations: https://support.microsoft.com/en-us/office/calculate-values-in-a-pivottable-11f41417-da80-435c-a5c6-b0185e59da77
- Microsoft Excel formatting and file-format transfer notes: https://support.microsoft.com/en-us/office/excel-formatting-and-features-that-are-not-transferred-to-other-file-formats-8fdd91a3-792e-4aef-a5bb-46f603d0e585
- Microsoft Excel enter and format data overview: https://support.microsoft.com/en-us/office/enter-and-format-data-fef13169-0a84-4b92-a5ab-d856b0d7c1f7

## Current 100-Point Feature Set

This is the active professional batch after completing the first 100-point milestone.

- [x] 8 points - Expand Power Query-style connector transforms for remove columns, filter modes, data type changes, split columns, group by, append rows, lookup merge, pivot/unpivot, and custom columns.
- [x] 8 points - Persist refreshable query definitions, refresh history, and safe data-source credential metadata.
- [x] 8 points - Add workbook sharing links, invite flows, and per-workbook roles.
- [x] 7 points - Add threaded comments, mentions, resolve/reopen states, and notifications.
- [x] 8 points - Add dynamic arrays, spill ranges, and spill conflict handling.
- [x] 7 points - Add dependency-graph-backed dirty-cell recalculation.
- [x] 7 points - Add full chart formatting for axes, series, labels, legends, trendlines, error bars, and secondary axes.
- [x] 8 points - Add image insertion, shapes, text boxes, object layering, and object metadata preservation.
- [x] 6 points - Add workbook themes, theme colors, theme fonts, and richer managed cell styles.
- [x] 6 points - Add direct PDF export, print area editing, and drag-editable page breaks.
- [x] 6 points - Add locale-aware formula separators and formula parsing.
- [x] 7 points - Add desktop local open/save, encrypted offline cache, and sync reconciliation.
- [x] 5 points - Add macro preservation and safe disabled script recording.
- [x] 4 points - Add keyboard shortcut customization.
- [x] 3 points - Continue CSRF and session hardening for sensitive actions.
- [x] 2 points - Add feature ownership map plus focused unit checks for address, range, serialization, and formula-reference behavior.

## Next 100-Point Feature Set

Current next Excel-parity batch: 100/100.

- [x] 10 points - Add workbook compare and merge/diff UI for sheets, formulas, formatting, tables, charts, and workbook metadata.
- [x] 10 points - Add disjoint multi-range selection with named multi-area ranges, copy/paste handling, formatting, and formula-safe range transforms.
- [x] 10 points - Expand function coverage across lookup/reference, financial, statistical, date/time, text, logical, math, information, engineering, compatibility, cube, and web functions.
- [x] 8 points - Add circular reference detection, iterative calculation options, and trace precedents/dependents arrows.
- [x] 8 points - Add data model relationships between tables with a model-view surface, relationship validation, and measure-aware PivotTable output.
- [x] 8 points - Preserve embedded objects, form controls, custom XML parts, external links, workbook connections, and unsupported workbook parts during file round-trips.
- [x] 8 points - Add chart variants for stacked, 100% stacked, waterfall, funnel, histogram, box-and-whisker, treemap, sunburst, surface, and map-style charts.
- [x] 8 points - Add real-time coediting foundations with presence cursors, conflict review, and resilient save reconciliation.
- [x] 8 points - Split desktop mode from web-server mode and add production Tauri packaging checks.
- [x] 7 points - Add in-cell rich text runs plus rotated text, vertical text, shrink-to-fit, and advanced alignment presets.
- [x] 7 points - Add protected ranges per collaborator plus track-changes/history review workflows.
- [x] 8 points - Add an Office Scripts-like automation runtime with a safe permission model, custom functions, and plugin/add-in extension points.

## Upcoming 100-Point Feature Set

Current future Excel-parity batch: 100/100.

- [x] 12 points - Add a browser-safe Excel-scale grid strategy for 1,048,576 rows, 16,384 columns, sparse storage, and progressive loading.
- [x] 10 points - Add server-backed multi-device coediting transport with merge queues, remote cursors, and offline replay.
- [x] 10 points - Integrate workbook custom functions into formula evaluation with deterministic sandboxing and dependency tracking.
- [x] 10 points - Add a practical large-data-model mode with compressed column storage, relationship indexes, and streamed PivotTable refresh.
- [x] 8 points - Add template import/export for `.xltx` and `.xltm`, password-protected workbook metadata handling, and recovery import flows.
- [x] 8 points - Add touch-first selection, tablet drag handles, and mobile-friendly edit controls.
- [x] 8 points - Add Flash Fill-style pattern completion for text, dates, and structured identifiers.
- [x] 8 points - Add native embedded chart/object round-trip support beyond opaque package preservation.
- [x] 8 points - Add chart data tables, richer 3D chart compatibility metadata, and 3D chart round-trip preservation.
- [x] 8 points - Add signed add-in packages, explicit enablement, and sandboxed extension execution.
- [x] 5 points - Add translated function names, calendar-system options, and deeper right-to-left language polish.
- [x] 5 points - Add signed Tauri release packaging plus preview deployment and production smoke-check automation.

## Next 100-Point Professional Feature Set

Current production-readiness batch: 100/100.

- [x] 12 points - Add a deeper Excel formula compatibility pack with `LET`, `LAMBDA`, `TAKE`, `DROP`, `CHOOSECOLS`, `CHOOSEROWS`, and richer spill behavior.
- [x] 12 points - Add PivotTable workflow parity for grouping, drill-down sheets, synchronized slicers/timelines, and field list ergonomics.
- [x] 10 points - Add Power Query-style connector credential management, refresh history, and retryable refresh diagnostics.
- [x] 10 points - Add a conditional-formatting rule manager with icon sets, data bars, color scales, duplication, and conflict ordering.
- [x] 10 points - Add Excel-grade data validation UX with dependent dropdowns, input prompts, error alerts, and invalid-cell circles.
- [x] 10 points - Add chart editor parity for series editing, axis bounds, secondary axes, error bars, trendlines, and chart templates.
- [x] 8 points - Add screen-reader, keyboard, high-contrast, and reduced-motion accessibility hardening across the grid and side panels.
- [x] 8 points - Add offline-first workbook recovery with local durable drafts, restore checkpoints, and conflict-safe reopen flows.
- [x] 10 points - Add workbook audit export, admin activity review, and share/access report downloads.
- [x] 10 points - Add golden import/export fidelity fixtures for XLSX/XLSM/ODS/templates and round-trip regression checks.

## Next 100-Point Enterprise Feature Set

Current enterprise Excel-parity batch: 100/100.

- [x] 10 points - Preserve Excel 4.0 macro sheets and macro-sheet metadata as disabled compatibility payloads.
- [x] 10 points - Add deeper Excel clipboard metadata for charts, objects, comments, and formatted ranges.
- [x] 8 points - Add image paste into worksheets with anchored object insertion and clipboard sanitization.
- [x] 8 points - Add split-window and multiple worksheet view support across the workbook shell.
- [x] 8 points - Add multi-cell edit behavior beyond Ctrl+Enter, including selection-wide formulas and fill semantics.
- [x] 8 points - Add richer cell styles and style management for workbook-level named styles and reuse.
- [x] 8 points - Add conditional formatting support for PivotTables.
- [x] 8 points - Add full icon-set and data-bar formatting controls with editable thresholds.
- [x] 10 points - Add deeper model view features: hierarchies, KPIs, perspectives, and larger model storage.
- [x] 8 points - Add true 3D chart rendering and native 3D chart round-trip support.
- [x] 7 points - Add icons, connectors, form controls, and richer native embedded-object preservation.
- [x] 7 points - Complete keyboard parity for remaining Excel navigation and edit commands.

## Next 100-Point Professional Feature Set

Current professional hardening batch: 10/100.

- [x] 6 points - Add object selection handles, keyboard-accessible resize/move controls, and alignment guides for worksheet images, shapes, connectors, and text boxes.
- [x] 4 points - Extend embedded chart objects into the worksheet object canvas with the same handles, keyboard controls, and alignment guides.
- [ ] 10 points - Add richer native chart editing import metadata for chart titles, axis titles, legends, and series mapping.
- [ ] 10 points - Add more Excel-compatible lookup, date/time, financial, and text functions with focused formula fixtures.
- [ ] 10 points - Add workbook trust-center review flows for external links, embedded objects, controls, and disabled automation payloads.
- [ ] 10 points - Add advanced print/page setup parity for page order, paper sizes, centering, scale-to-fit, and print titles.
- [ ] 10 points - Add PivotTable layout/style presets, compact/outline/tabular modes, and repeat item labels.
- [ ] 10 points - Add Power Query connector source profiles for reusable URL, file, and database imports with refresh scheduling metadata.
- [ ] 10 points - Add desktop local-file association handling, recent file recovery, and safer save-as conflict prompts.
- [ ] 10 points - Add large-workbook performance budgets with targeted regression scripts for grid, import/export, formula, and object metadata paths.
- [ ] 10 points - Add release-quality end-to-end smoke scenarios for auth, workbook CRUD, import/export, sharing, desktop route, and keyboard workflows.

## What We Have

- Auth and accounts: email/password sign-in, Brevo confirmation codes, admin seed script, protected workbook routes, database-backed auth rate limiting, explicit session freshness policy, verified-admin dashboard actions, dashboard audit logs, admin activity review, and audit CSV/JSON downloads.
- Workbook storage: persisted owned and shared workbooks, dashboard import, workbook cards, metadata, favorites, folders, templates, versions, autosave, conflict detection, owner-managed share links, invite-based collaborators, per-workbook owner/editor/commenter/viewer roles, workbook audit CSV export, and share/access report downloads.
- Grid basics: editable cells, formula bar, sheet tabs, browser-safe Excel-scale sheet metadata, cached sparse-grid index windows, used-range flat exports for Excel-scale sheets, row and column virtualization, selection, drag ranges, undo/redo, hidden rows/columns, row and column outline groups, resizing, insert/delete rows and columns, arbitrary frozen panes, split worksheet panes, multiple worksheet windows, normal/page layout/page break preview modes, persisted custom worksheet views, and right-to-left sheet view.
- Keyboard: browser-local shortcut customization for workbook, history, clipboard, selection, editing, and formatting commands, including Ctrl+Enter selection fill, Ctrl+Page worksheet navigation, Alt+= AutoSum, conflict checks, disabling, reset-to-default, and command registry tests.
- Clipboard and range editing basics: TSV copy/paste, rich same-app copy/paste, HTML table paste, paste special, transpose paste, visible-cells copy/extract, selection-wide formula-aware range edits, image paste into anchored worksheet objects, PNG range copy, range-scoped chart/object/comment/link/formatting metadata copy-paste, and Flash Fill-style completion from nearby examples.
- Multi-range selection: disjoint active-sheet areas can be accumulated, selected, copied, pasted, styled, cleared, and saved as multi-area named ranges with formula-safe reference shifts.
- Formatting: bold, italic, underline, strikethrough, alignment, vertical alignment, rotated text, vertical text, shrink-to-fit, in-cell rich text runs, fills, text color, borders, wrapping, fonts, font size, indentation, theme-aware style presets, persisted workbook themes, workbook-level managed cell styles with toolbar save/update/apply/delete management, number formats, editable data-bar and icon-set conditional-format thresholds.
- Files: CSV, TSV, JSON, HTML, PDF, SpreadsheetML, XLSX, XLSM, XLS, and ODS import/export for core sheet content, import sanitization, disabled VBA project preservation for XLSM round-trips, disabled Excel 4.0 macro-sheet payload preservation for XLSM round-trips, opaque unsupported OOXML package-part preservation for XLSX/XLSM round-trips, native imported chart/image/OLE object metadata indexing for reviewable round-trips, plus a compatibility inspector for round-trip risk.
- Formulas: HyperFormula-backed formulas, cross-sheet references, named ranges, locale-aware separators and formula display, Excel boolean constant compatibility, `LET`, inline `LAMBDA`, `TEXTJOIN`, `CONCAT`, `XMATCH`, `ENCODEURL`, safe cube-function fallbacks, expanded function suggestions across major Excel categories, dynamic arrays with `FILTER`, `SEQUENCE`, `SORT`, `TRANSPOSE`, `UNIQUE`, `TAKE`, `DROP`, `CHOOSECOLS`, `CHOOSEROWS`, spill ranges, spill conflict handling, nested dynamic-array inputs, dependency-graph-backed dirty-cell recalculation, circular reference detection, iterative calculation settings, trace precedents/dependents navigation, clearer formula errors, formula audit/error/checking panels, and a formula watch window.
- Data features: validation rules, conditional formatting, PivotTable-scoped conditional format rules that follow refreshed value ranges, filters, criteria-range copy-to-location extracts, filter presets, custom sorts, sort/filter by colors and icons, Goal Seek, bounded one-variable Solver, bounded multi-variable Solver constraints, integer and binary Solver variable domains, adaptive nonlinear Solver engine, worker-backed larger-scale Solver model execution, Data Tables, Scenario Manager what-if analysis, Forecast Sheet output, descriptive statistics, histogram, correlation, regression, sampling, moving-average, and exponential-smoothing analysis output, structured table definitions, workbook data model relationships with validation, persisted model hierarchies, KPI status fields, model perspectives, configurable columnar model storage, table slicers and timelines for regular tables, editable, slicer-filtered, timeline-filtered, grouped, calculated-field, measure-aware, relationship-expanded, hierarchy-aware, KPI-aware, subtotaled, chart-linked, and drill-down generated PivotTables from ranges and tables, totals-row toggle, table resizing, Power Query-style connector transforms, persisted refreshable URL query definitions, refresh history, and safe credential metadata.
- Charts and visuals: bar, line, pie, area, scatter, bubble, radar, combo, stock, stacked bar, 100% stacked bar, waterfall, funnel, histogram, box-and-whisker, treemap, sunburst, surface, and map-style charts, linked PivotCharts, chart manager basics, chart presets, persisted chart formatting for axes, series, labels, legends, trendlines, error bars, secondary axes, chart data tables, projected 3D rendering with native 3D chart round-trip metadata, line sparklines, inserted images, icons, connectors, shapes, text boxes, form-control metadata, native embedded-object preservation, object ordering, and object metadata.
- Protection and accessibility: sheet protection, workbook structure protection, owner-managed collaborator protected ranges, locked/hidden formula cells, same-origin server-action guards, fresh verified-session checks for critical mutations, destructive-action confirmations, workbook activity history, threaded cell comments with mention notifications, focus mode, screen-reader grid roles, active-cell descriptions, live selection summaries, high-contrast worksheet outlines, reduced-motion scrolling, and workbook accessibility audits.
- Collaboration: owner/editor/commenter/viewer sharing, active-session presence cursors, server-backed remote cursor sync, persisted collaboration event queues, offline replay for save/conflict events, collaborator-specific range access, save-conflict review with reload/overwrite reconciliation, encrypted offline fallback, and workbook activity logs.
- Review and merge: workbook compare can load another workbook or Essence backup, summarize metadata, sheet, cell, formula, table, and chart differences, jump to affected ranges, and apply selected incoming changes through the workbook history path; tracked cell edits now flow through an owner review queue with accept/reject decisions.
- Printing: direct PDF export, print preview, A1-style print area editing, headers/footers, repeat-title toggles, page scaling, and draggable page-break handles in page-break preview.
- Automation safety: imported VBA projects are preserved but disabled, exported back to XLSM when possible, recorded scripts can replay core edit, format, row/column, sort, and cleanup commands only through a permission-gated runtime, and workbook custom functions/add-in manifests are stored as disabled-by-default extension metadata.
- Spreadsheet architecture: pure state helpers and several command groups split into focused modules for constants, document snapshots, selection/ranges, protection, sheet transforms, editing, formula-aware range editing, formatting, clipboard paste/copy, fill, sorting, merge/unmerge, history, row/column structure, outline groups, custom worksheet views, workbook window views, right-to-left grid layout, sheet lifecycle, print settings, version history, chart/sparkline commands, table commands, validation/conditional-format rules, filters/filter presets, annotations, named ranges, naming/text operations, grid geometry, grid headers, grid filter helpers, grid accessibility labels, cell adornment renderers, the grid cell renderer/editor, grid selection/fill drag orchestration, grid row virtualization, grid column virtualization, frozen pane offsets, grid split-pane layout, grid column sizing, and viewport row rendering.
- Quality guardrails: a feature ownership map and targeted workbook-core helper checks cover address parsing, range transforms, serialization normalization, formula-reference shifting, and golden XLSX/XLSM/ODS/XLTX/XLTM import/export fidelity.
- Desktop/offline/deploy foundation: split web-server and desktop-export modes, a static Tauri desktop workbook route, local workbook open/save, encrypted device cache, durable offline drafts, restore checkpoints, conflict recovery snapshots, sync reconciliation status, native icon assets, Tauri cargo checks, desktop packaging checks, and Vercel production deployment.

## Excel Features We Still Do Not Have

### 1. Workbook And File Compatibility

- [x] Preserve imported VBA projects in `.xlsm` without executing them.
- [x] Preserve Excel 4.0 macro sheets and all macro-sheet metadata.
- [x] Preserve unsupported workbook parts when round-tripping imported files.
- [x] Import/export `.xltx` and `.xltm` template files.
- [x] Open and preserve password-protected workbook metadata.
- [x] Recover damaged workbooks and unsaved recovery files.
- [x] Preserve embedded objects, form controls, ActiveX metadata, custom XML parts, external links, and workbook connections as disabled OOXML package parts for XLSX/XLSM round-trips.
- [x] Add a compatibility inspector that explains what will be lost on import/export.
- [x] Add workbook compare and merge/diff UI.

### 2. Grid Scale And View Engine

- [x] Support Excel-scale dimensions: 1,048,576 rows and 16,384 columns.
- [x] Add column virtualization for very wide sheets.
- [x] Add arbitrary frozen panes and selected-cell scroll anchoring.
- [x] Add split panes and independent pane scroll positions.
- [x] Add grouped rows and columns with collapse/expand controls.
- [x] Add custom views, page layout view, page break preview, and sheet view.
- [x] Add right-to-left sheet view.
- [x] Add split-window and multiple worksheet view support.

### 3. Editing, Selection, And Clipboard

- [x] Add disjoint multi-range selection.
- [x] Add touch selection and mobile/tablet drag handles.
- [x] Add in-cell rich text runs.
- [x] Add autocomplete for existing column values.
- [x] Add Flash Fill-style pattern completion.
- [x] Add multi-cell edit behavior beyond Ctrl+Enter.
- [x] Add image paste into worksheets.
- [x] Add deeper Excel clipboard metadata for charts, objects, comments, and formatted ranges.
- [x] Add remove duplicates.
- [x] Add Go To, Go To Special, and locate hidden cells.
- [x] Add custom lists for fill sequences.

### 4. Formula Engine And Functions

- [x] Expand function coverage across lookup/reference, financial, statistical, date/time, text, logical, math, information, engineering, compatibility, cube, and web functions.
- [x] Add dynamic arrays and spill behavior.
- [x] Add structured references for tables.
- [x] Add calculated columns in tables.
- [x] Add circular reference detection and iterative calculation options.
- [x] Add dependency graph tracing with trace precedents/dependents arrows.
- [x] Add formula watch window.
- [x] Add error checking rules beyond current formula-error lists.
- [x] Add LAMBDA-like reusable user-defined formulas.
- [x] Workerize recalculation and add an incremental recalculation plan.
- [x] Add dependency-graph-backed dirty-cell recalculation so formula edits update only affected ranges.
- [x] Add deterministic workbook custom functions with `ARG1` placeholders, sandbox validation, autocomplete, and dependency invalidation.

### 5. Formatting, Themes, And Layout

- [x] Add custom number format editor and parser.
- [x] Add workbook themes, theme colors, and theme fonts.
- [x] Add rotated text, vertical text, shrink-to-fit, and advanced alignment presets.
- [x] Add sheet tab colors.
- [x] Add gridline visibility per sheet.
- [x] Add richer cell styles and style management.
- [x] Add conditional formatting support for PivotTables.
- [x] Add full icon-set and data-bar formatting controls.

### 6. Tables, Sorting, Filtering, And Slicers

- [x] Add table slicers for regular tables.
- [x] Add slicer filtering for PivotTables.
- [x] Add timelines for regular table date filtering.
- [x] Add advanced filter copy-to-location parity.
- [x] Add sort/filter by cell color, font color, and icon.
- [x] Add table formulas that auto-fill calculated columns.
- [x] Add structured table reference syntax in formulas.

### 7. PivotTables, PivotCharts, And Analysis

- [x] Start PivotTable foundation with source range modeling, field-list layout state, and grouped aggregation.
- [x] Add PivotTable creation from ranges and tables.
- [x] Add editable PivotTable rows, columns, values, aggregations, and grand totals.
- [x] Add PivotTable report filters with persisted selections.
- [x] Add multi-level PivotTable row fields and subtotal rows.
- [x] Add PivotTable grouping for date and numeric row/column fields.
- [x] Add PivotTable field-list drag/drop polish.
- [x] Add PivotTable calculated fields.
- [x] Add PivotTable calculated items.
- [x] Add PivotTable drill-down and refresh.
- [x] Add PivotCharts.
- [x] Add slicers and timelines for PivotTables.
- [x] Add DAX-like measures or a simplified measure engine.
- [x] Add Goal Seek what-if analysis.
- [x] Add Scenario Manager saved input sets.
- [x] Add one-variable Data Tables.
- [x] Add bounded one-variable Solver.
- [x] Add bounded multi-variable Solver constraints.
- [x] Add integer and binary Solver variable domains.
- [x] Add adaptive nonlinear Solver engine.
- [x] Add worker-backed larger-scale Solver model execution.
- [x] Add saved Solver model manager with named models and reusable presets.
- [x] Add Forecast Sheet output.
- [x] Add Data Analysis ToolPak descriptive statistics.
- [x] Add Data Analysis ToolPak histogram output.
- [x] Add Data Analysis ToolPak regression and correlation output.
- [x] Add Data Analysis ToolPak sampling output.
- [x] Add Data Analysis ToolPak moving average output.
- [x] Add Data Analysis ToolPak exponential smoothing.

### 8. Power Query, Data Connections, And Data Model

- [x] Add import connectors for local files, URLs, databases, and common web data.
- [x] Add a query editor with transform steps.
- [x] Add merge, append, split columns, data type changes, remove columns, filter rows, group by, pivot/unpivot, and custom columns.
- [x] Add refreshable queries and safe stored data-source credential metadata.
- [x] Add data model relationships between tables.
- [x] Add millions-row data model support or a practical browser-safe equivalent.
- [x] Add deeper model view features: hierarchies, KPIs, perspectives, and larger model storage.

### 9. Charts, Shapes, Images, And Objects

- [x] Add stacked, 100% stacked, waterfall, funnel, histogram, box-and-whisker, map, treemap, sunburst, surface, and combo variants beyond current basics.
- [x] Add true 3D chart rendering and native 3D chart round-trip support.
- [x] Add full chart formatting: axes, series, labels, legends, gridlines, trendline options, error bars, and secondary axes.
- [x] Add chart data table display/export support.
- [x] Add chart export as image.
- [x] Add embedded chart preservation in file import/export.
- [x] Add image insertion and image object management.
- [x] Add shapes, text boxes, and object layering.
- [x] Add icons, connectors, form controls, and native embedded-object preservation.

### 10. Printing, Export, And Page Layout

- [x] Add direct PDF export.
- [ ] Add page layout view.
- [x] Add drag-editable page break preview.
- [x] Add headers/footers with fields such as page number, date, file name, sheet name.
- [x] Add print titles and print area editing in the grid.
- [x] Add page scaling presets and print preview pagination controls.

### 11. Collaboration, Sharing, And Permissions

- [x] Add workbook sharing links and invite-based access.
- [x] Add per-workbook roles: owner, editor, commenter, viewer.
- [x] Add protected ranges per collaborator.
- [x] Add active-session coediting presence cursors and conflict review foundations.
- [x] Add server-backed multi-device coediting transport, merge queues, and offline replay.
- [x] Add threaded comments, @mentions, resolve/reopen, and notifications.
- [x] Add track changes/history review equivalent.
- [x] Add workbook activity log.

### 12. Review, Audit, And Governance

- [x] Add spell check.
- [x] Add Accessibility Checker.
- [x] Add Inspect Workbook privacy/security checks.
- [x] Add workbook statistics.
- [x] Add external link review and broken-link repair.
- [x] Add formula consistency checks.
- [x] Add audit logs for admin actions, auth events, imports, exports, and destructive workbook actions.

### 13. Automation And Extensibility

- [x] Add a macro preservation model with safe disabled execution.
- [x] Add disabled script recording for review-only repeatable UI action capture.
- [x] Add Office Scripts-like automation runtime with a safe permission model.
- [x] Add custom functions with sandboxing.
- [x] Add add-in/plugin architecture.
- [x] Add keyboard shortcut customization.

### 14. Security, Reliability, And Compliance

- [x] Add rate limiting for import routes.
- [x] Continue CSRF/session hardening review for future sensitive actions.
- [x] Add import sanitization for formulas, external links, HTML, XML, and embedded content.
- [x] Add formula sandboxing/security review.
- [x] Add encrypted local cache for desktop/offline mode.
- [x] Add backup/restore flows.
- [x] Add destructive-action confirmation consistency.

### 15. Accessibility And Internationalization

- [x] Complete keyboard parity for remaining Excel navigation and edit commands.
- [x] Add full screen-reader announcements for formula errors, validation, selections, and table regions.
- [x] Add locale-aware separators and formula parsing.
- [x] Add translated function names where feasible.
- [x] Add calendar-system support.
- [x] Add right-to-left language polish across UI and grid.

### 16. Desktop, Offline, And Deployment

- [x] Split desktop mode from web-server mode so Tauri production packaging is reliable.
- [x] Add local open/save for desktop workbooks.
- [x] Add offline editing cache.
- [x] Add sync reconciliation after offline edits.
- [x] Add production Tauri packaging configuration and lightweight checks.
- [ ] Run signed production Tauri bundles/installers for release.
- [ ] Add preview deployment checks and production smoke tests.

## Simplification TODOs

- [x] Extract pure spreadsheet state helpers into `src/features/spreadsheet/state/*` modules and move shared selection/range type consumers off the React state hook.
- [x] Extract chart, sparkline, table, conditional-format, and data-validation command mutations out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [x] Extract filter, filter preset, named range, note, and link command mutations out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [x] Extract editing, formatting, and row/column structure command mutations out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [x] Extract sheet lifecycle, protection, print-settings, and version-history command mutations out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [x] Extract clipboard paste/copy, fill, sorting, and clear-content command mutations out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [x] Extract selection helpers, merge/unmerge, history, and dirty-state helpers out of `src/features/spreadsheet/use-spreadsheet-state.ts`.
- [ ] Split `src/features/spreadsheet/use-spreadsheet-state.ts` further only when a new command group needs ownership; the current hook is now mostly orchestration.
- [x] Extract grid geometry, table styling, cell accessibility labels, and cell adornment renderers out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Extract grid select-all, row header, column header, and column-filter helper rendering out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Extract grid cell rendering, table-filter overlays, validation dropdowns, and in-cell editing out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Extract grid selection drag, fill-handle drag, and committed range selection orchestration out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Extract grid row virtualization, row measuring, frozen-first-row range extraction, and scroll-to-selection behavior out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Extract grid column sizing and virtualized viewport row rendering out of `src/features/spreadsheet/components/spreadsheet-grid.tsx`.
- [x] Add horizontal column virtualization with spacer tracks, selected-column scroll anchoring, and frozen-first-column inclusion.
- [x] Replace first-row/first-column-only freezing with row and column freeze counts, sticky offsets, and freeze-at-selection controls.
- [x] Add vertical, horizontal, and four-pane worksheet split layouts with independent scroll containers and active-pane scroll anchoring.
- [ ] Split `src/features/spreadsheet/components/spreadsheet-shell.tsx` into command orchestration, import/export handlers, dialogs, and layout components.
- [ ] Keep `src/features/spreadsheet/components/spreadsheet-grid.tsx` focused on shell coordination; only split further when adding pane virtualization or new grid modes.
- [ ] Split `src/features/spreadsheet/components/spreadsheet-toolbar.tsx` into toolbar groups with shared command metadata.
- [ ] Split `src/features/workbooks/serialization.ts` into validation, normalization, migration, and clipboard/file adapters.
- [x] Add a short feature ownership map so future work starts in the right folder.
- [x] Add focused unit tests for address parsing, range transforms, serialization normalization, and formula reference shifts.

## Next Work Queue

1. [x] Push and verify the current database schema in production after the OTP/dashboard changes.
2. [x] Add rate limiting and auth/session hardening for the Better Auth routes.
3. [x] Add column virtualization for very wide sheets now that grid rendering responsibilities are split.
4. [x] Add split panes and independent pane scroll positions.
5. [x] Add grouped rows and columns with collapse/expand controls.
6. [x] Add custom views, page layout view, page break preview, and sheet view.
7. [x] Add right-to-left sheet view.
8. [x] Workerize formula recalculation and add an incremental recalculation plan.
9. [x] Start PivotTable foundation: source range model, field list state, and grouped aggregation service.
10. [x] Add custom number format editor and parser.
11. [x] Add gridline visibility per sheet.
12. [x] Add sheet tab colors.
13. [x] Add autocomplete for existing column values.
14. [x] Add custom lists for fill sequences.
15. [x] Add remove duplicates.
16. [x] Add workbook statistics.
17. [x] Add formula consistency checks.
18. [x] Add external link review and broken-link repair.
19. [x] Add Inspect Workbook privacy/security checks.
20. [x] Add Accessibility Checker.
21. [x] Add table calculated-column formula autofill.
22. [x] Add Go To and Go To Special navigation.
23. [x] Add workbook spell check.
24. [x] Add audit logs for admin, auth, import, export, and destructive workbook actions.
25. [x] Add a compatibility inspector for import/export and round-trip losses.
26. [x] Add a formula watch window for selected formulas.
27. [x] Add formula error-checking rules beyond formula result errors.
28. [x] Add rate limiting for workbook import actions.
29. [x] Add consistent confirmations for destructive spreadsheet actions.
30. [x] Add workbook import sanitization for risky formulas, links, hidden history, and control characters.
31. [x] Add formula sandboxing so external-resource and workbook-link formulas are blocked during recalculation.
32. [x] Add per-workbook activity history in the spreadsheet review panel.
33. [x] Add dedicated Essence backup download and restore flow.
34. [x] Add SVG image export for workbook charts.
35. [x] Add quick print scale presets to the print setup panel.
36. [x] Add live screen-reader announcements for selection, validation, formula-error, and table context.
37. [x] Add print preview pagination controls.
38. [x] Add printable header and footer fields.
39. [x] Add sort and filter by cell color, font color, and icon.
40. [x] Add advanced filter copy-to-location extracts for criteria ranges.
41. [x] Add persisted table slicers for regular table filtering.
42. [x] Add persisted regular-table timelines for date period filtering.
43. [x] Add generated PivotTable creation from selected ranges and structured tables.
44. [x] Add editable PivotTable row, column, value, aggregation, and grand-total layout controls.
45. [x] Add persisted PivotTable report filters with filtered aggregation output.
46. [x] Add multi-level PivotTable row fields with generated subtotal rows.
47. [x] Add linked PivotCharts from generated PivotTable output ranges.
48. [x] Add PivotTable drill-down detail sheets from filtered source rows.
49. [x] Add PivotTable date and numeric grouping controls.
50. [x] Add PivotTable calculated fields for arithmetic between numeric source fields.
51. [x] Add PivotTable slicer-style filters and date timelines.
52. [x] Add Goal Seek what-if analysis.
53. [x] Add Scenario Manager saved input sets.
54. [x] Add one-variable Data Tables.
55. [x] Add Data Analysis ToolPak descriptive statistics.
56. [x] Add Data Analysis ToolPak histogram output.
57. [x] Add Data Analysis ToolPak regression and correlation output.
58. [x] Add Data Analysis ToolPak sampling output.
59. [x] Add Data Analysis ToolPak moving average output.
60. [x] Add Data Analysis ToolPak exponential smoothing output.
61. [x] Add Forecast Sheet output.
62. [x] Add bounded one-variable Solver.
63. [x] Add multi-variable Solver constraints.
64. [x] Add integer and binary Solver variable domains.
65. [x] Add adaptive nonlinear Solver engine.
66. [x] Add worker-backed larger-scale Solver model execution.
67. [x] Add saved Solver model manager with named models and reusable presets.
68. [x] Add structured table reference syntax in formulas.
69. [x] Add PivotTable field-list drag/drop polish.
70. [x] Add PivotTable calculated items.
71. [x] Add DAX-like measures or a simplified measure engine.
72. [x] Add import connectors for local files, URLs, databases, and common web data.
73. [x] Add a query editor with transform steps.
74. [x] Add merge, append, split columns, data type changes, remove columns, filter rows, group by, pivot/unpivot, and custom columns.
75. [x] Persist refreshable query definitions, refresh history, and safe data-source credential metadata.
76. [x] Add workbook sharing links, invite flows, and per-workbook roles.
77. [x] Add threaded comments, mentions, resolve/reopen states, and notifications.
78. [x] Add dynamic arrays, spill ranges, and spill conflict handling.
79. [x] Add dependency-graph-backed dirty-cell recalculation.
80. [x] Add full chart formatting controls.
81. [x] Add image insertion, shapes, text boxes, object layering, and object metadata preservation.
82. [x] Add workbook themes, theme colors, theme fonts, and richer managed cell styles.
83. [x] Add direct PDF export, print area editing, and drag-editable page breaks.
84. [x] Add locale-aware formula separators and formula parsing.
85. [x] Add desktop local open/save, encrypted offline cache, and sync reconciliation.
86. [x] Add macro preservation and safe disabled script recording.
87. [x] Add keyboard shortcut customization.
88. [x] Continue CSRF and session hardening for sensitive actions.
89. [x] Add a feature ownership map plus focused unit checks for address, range, serialization, and formula-reference behavior.
90. [x] Add workbook compare and merge/diff UI for sheets, formulas, formatting, tables, charts, and workbook metadata.
91. [x] Add disjoint multi-range selection with named multi-area ranges, copy/paste handling, formatting, and formula-safe range transforms.
92. [x] Expand function coverage across lookup/reference, financial, statistical, date/time, text, logical, math, information, engineering, compatibility, cube, and web functions.
93. [x] Add circular reference detection, iterative calculation options, and trace precedents/dependents arrows.
94. [x] Add data model relationships between tables with a model-view surface, relationship validation, and measure-aware PivotTable output.
95. [x] Preserve embedded objects, form controls, custom XML parts, external links, workbook connections, and unsupported workbook parts during file round-trips.
96. [x] Add chart variants for stacked, 100% stacked, waterfall, funnel, histogram, box-and-whisker, treemap, sunburst, surface, and map-style charts.
97. [x] Add real-time coediting foundations with presence cursors, conflict review, and resilient save reconciliation.
98. [x] Split desktop mode from web-server mode and add production Tauri packaging checks.
99. [x] Add in-cell rich text runs plus rotated text, vertical text, shrink-to-fit, and advanced alignment presets.
100. [x] Add protected ranges per collaborator plus track-changes/history review workflows.
101. [x] Add an Office Scripts-like automation runtime with a safe permission model, custom functions, and plugin/add-in extension points.
102. [x] Add a browser-safe Excel-scale grid strategy for 1,048,576 rows, 16,384 columns, sparse storage, and progressive loading.
103. [x] Add server-backed multi-device coediting transport with merge queues, remote cursors, and offline replay.
104. [x] Integrate workbook custom functions into formula evaluation with deterministic sandboxing and dependency tracking.
105. [x] Add a practical large-data-model mode with compressed column storage, relationship indexes, and streamed PivotTable refresh.
106. [x] Add template import/export, password metadata handling, and workbook recovery import flows.
107. [x] Add touch-first selection, tablet drag handles, and mobile-friendly edit controls.
108. [x] Add Flash Fill-style pattern completion for text, dates, and structured identifiers.
109. [x] Add native embedded chart/object round-trip support beyond opaque package preservation.
110. [x] Add chart data tables, richer 3D chart compatibility metadata, and 3D chart round-trip preservation.
111. [x] Add signed add-in packages, explicit enablement, and sandboxed extension execution.
112. [x] Add translated function names, calendar-system options, and deeper right-to-left language polish.
113. [x] Add signed Tauri release packaging plus preview deployment and production smoke-check automation.
114. [x] Add a deeper Excel formula compatibility pack with `LET`, `LAMBDA`, `TAKE`, `DROP`, `CHOOSECOLS`, `CHOOSEROWS`, and richer spill behavior.
115. [x] Add PivotTable workflow parity for grouping, drill-down sheets, synchronized slicers/timelines, and field list ergonomics.
116. [x] Add Power Query-style connector credential management, refresh history, and retryable refresh diagnostics.
117. [x] Add a conditional-formatting rule manager with icon sets, data bars, color scales, duplication, and conflict ordering.
118. [x] Add Excel-grade data validation UX with dependent dropdowns, input prompts, error alerts, and invalid-cell circles.
119. [x] Add chart editor parity for series editing, axis bounds, secondary axes, error bars, trendlines, and chart templates.
120. [x] Add screen-reader, keyboard, high-contrast, and reduced-motion accessibility hardening across the grid and side panels.
121. [x] Add offline-first workbook recovery with local durable drafts, restore checkpoints, and conflict-safe reopen flows.
122. [x] Add workbook audit export, admin activity review, and share/access report downloads.
123. [x] Add golden import/export fidelity fixtures for XLSX/XLSM/ODS/templates and round-trip regression checks.
