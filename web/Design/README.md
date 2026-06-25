# Canva - Design

Essence Studio is a private visual design workspace for creating, organizing, and publishing original design projects.

The product is original to this repository. It does not ship Canva logos, proprietary templates, paid media, or AI features. See [LEGAL_BOUNDARY.md](LEGAL_BOUNDARY.md) for the project boundary.

## Local Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Lightweight Verification

During active feature work, prefer:

```bash
bun run typecheck
bun run test
```

Run lint, format, production build, Tauri checks, and deployment only at explicit milestone gates.

## Environment

Copy `.env.example` to `.env.local` and fill in the database, auth, and mail values. Brevo is the preferred production email provider; local preview remains available for development.
