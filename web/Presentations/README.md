# Essence PowerPoint

A free presentation workspace for creating, managing, presenting, and exporting decks.

## Current Shape

- Dashboard: account, access, and website management surface.
- Editor: local-persisted deck state with slide CRUD, object editing, notes, imports, exports, zoom, undo, and redo.
- Auth: email/password accounts with email confirmation codes.
- Storage: user-owned decks, slide data, image assets, comments, and version history.

## Commands

```powershell
bun run dev
bun run typecheck
bun run lint
bun run format
bun run db:generate
bun run db:migrate
bun run tauri dev
```

The active verification rule for this project is to avoid repeated production builds during feature work. Use `bun run typecheck` after meaningful batches, then build once when the feature target is complete.

## Environment

Copy `.env.example` to `.env.local` and fill:

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-strong-random-secret
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=ajju40959@gmail.com
BREVO_SENDER_NAME=Essence PowerPoint
ADMIN_EMAIL=admin@mail.com
ADMIN_PASSWORD=change-before-production
```

For a managed database, replace `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the hosted database URL and scoped token.
