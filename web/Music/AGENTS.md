# DX Web Preview Branch Contract

- Main branch identity: `essense-suno`.
- Dev branch purpose: connect this project with `G:\Dx\code`, the Zed fork, and the DX Code editor web preview.
- Web preview tool name: `Music`.
- Use the `dev` branch for work that makes this website available as the `Music` surface inside the DX web preview tool.

# Essence Suno Agent Contract

This workspace belongs to essencefromexistence. Codex is the temporary coding partner until Friday and the DX super app are ready.

## Operating Rules

- Treat this as production work, not a throwaway prototype.
- Build real, wired features. Do not add fake buttons, dummy generation controls, or decorative UI that is not connected to working behavior.
- Preserve intent: a free-first Suno-style music creation app with AI SDK architecture, Better Auth email/password, Drizzle, Turso, Tauri, and Vercel deployment.
- Keep files small and cohesive. Split UI, state, schemas, adapters, routes, and utilities when responsibilities diverge.
- Use latest local package versions and official docs for version-sensitive APIs.
- Prefer shadcn/ui primitives, Tailwind tokens, typed contracts, Zod validation, and narrow data helpers.
- Do not expose source-code AI implementation notes in product UI.
- During development, run `bun run typecheck` only after meaningful batches. Save build and deploy for completion checkpoints unless the user asks otherwise.
- Never commit secrets. `.env.local` stays local.

## Architecture Defaults

- Next.js App Router with React Server Components by default and client components only where interactivity requires them.
- Better Auth uses email/password only.
- Turso/libSQL and Drizzle own server-side persistence.
- Vercel AI SDK v6 is the AI boundary for text, structured output, chat, tool-style workflows, image generation, and transcription where a provider is configured.
- Music/audio generation requires a real provider adapter. If no provider is configured, the feature must be disabled and documented instead of faked.
