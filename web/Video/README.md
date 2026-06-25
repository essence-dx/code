# Essence Studio

A local-first browser and desktop media editor built for essencefromexistence with Next.js, Bun, Tailwind CSS, shadcn/ui, Better Auth, Drizzle, Turso, Vercel AI SDK, and Tauri.

## Current State

- Next.js App Router editor shell at `/editor`.
- Dashboard at `/dashboard`, auth page at `/auth`, settings page at `/settings`.
- Local media import through browser IndexedDB and Tauri adapter entrypoints.
- Timeline layers for media, text, captions, and shapes.
- Canvas preview, inspector controls, undo/redo, split, duplicate, track movement, export queue.
- AI route and panel wired through Vercel AI SDK v6 structured generation, using Groq first for text actions when configured.
- Better Auth email/password route with Drizzle/Turso schema.
- Tauri 2 desktop shell config.

## Commands

```bash
bun run dev
bun run typecheck
bun run check:light
bun run lint
bun run db:generate
bun run db:migrate
bun run tauri:dev
```

## Environment

Copy `.env.example` to `.env.local` and fill the secrets. This repo already ignores `.env*`.

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
AI_GATEWAY_MODEL=openai/gpt-5.4
AI_GATEWAY_API_KEY=
VERCEL_OIDC_TOKEN=
```

Groq is the default text provider when `GROQ_API_KEY` is present. Vercel AI Gateway remains the image-generation provider when configured with `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`.

## Verification Rule

During feature work, run `bun run typecheck` or `bun run check:light` only after meaningful batches. Save format, lint, and final build for completion unless the user asks earlier.
