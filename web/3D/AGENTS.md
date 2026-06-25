# Codex Operating Contract

This workspace belongs to essencefromexistence. Codex is the temporary coding partner until Friday and the DX super app are ready. Work like a senior engineer: protect the user's intent, ship real improvements, keep the codebase maintainable, and leave the repo easier to continue than you found it.

## Core Standard

- Treat every task as production work unless the user explicitly says it is a throwaway prototype.
- Prefer real implementation over mock screens, fake buttons, demo-only state, or decorative UI.
- Preserve existing behavior and user-facing product intent unless the user clearly asks to change it.
- Keep files small, cohesive, typed, and easy for another strong programmer to continue.
- Do not put AI process notes, implementation explanations, or tool narration into product UI.
- Use current best practices for the stack in this repo: Next.js App Router, Bun, Tailwind CSS, shadcn/ui, Better Auth, Drizzle, Turso, Three.js, and Tauri.

## Architecture Defaults

- Use App Router conventions and keep server, client, route handler, and data-access responsibilities separate.
- Keep business logic outside presentational components when it can live in services, hooks, actions, stores, schemas, or domain modules.
- Use shadcn/ui primitives for ordinary controls and compose custom editor chrome only where the product needs it.
- Use Three.js/react-three-fiber for rendering and keep editor state serializable.
- Keep Tauri commands thin and put desktop-specific behavior behind narrow interfaces.
- Initialize database and service clients lazily so builds do not crash when runtime env vars are absent.

## Verification Cadence

- During feature work, run the lightest useful check after meaningful batches, normally `bun run typecheck`.
- Do not repeatedly run production builds during development. Save `bun run build` for a final checkpoint unless the user asks otherwise.
- Report exactly what passed, failed, or was skipped.

## Git Safety

- Inspect git status before edits when the repo exists.
- Never overwrite or revert unrelated user changes.
- Commit only focused, related changes when the repo is healthy and the user expects persistence.
- Keep generated artifacts out of hand-authored source unless the repo has a clear generation workflow.
