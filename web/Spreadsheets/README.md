# Essence Excel

A free spreadsheet workspace for creating, importing, editing, and managing workbooks.

## Current Scope

Essence Excel is not an Excel replacement yet. It currently includes:

- email/password authentication with confirmation codes
- saved workbook persistence
- protected workbook routes
- editable spreadsheet grid
- formula evaluation through HyperFormula
- multiple sheets per workbook
- undo/redo for document edits
- CSV import/export
- Tauri desktop shell configuration
- split web and desktop build modes
- local desktop workbook route with backup open/save

## Local Setup

1. Install dependencies:

```powershell
bun install
```

2. Copy `.env.example` to `.env.local` and fill the database, auth, and email values.

3. Push the schema:

```powershell
bun run db:push
```

4. Run typecheck after meaningful implementation batches:

```powershell
bun run typecheck
```

5. Run the lightweight desktop packaging guard when desktop files change:

```powershell
bun run desktop:check
```

6. Start the web app when you want to test manually:

```powershell
bun run dev
```

## Desktop Notes

The browser app remains the source of truth for saved cloud workbooks and account access. Tauri production packaging uses `bun run build:desktop`, which sets `ESSENCE_EXCEL_RUNTIME=desktop`, exports static assets, and opens `/desktop` for local workbook editing. Run `bun run seed:admin` after env setup to create or repair the owner account.
