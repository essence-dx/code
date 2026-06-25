# DX Web Preview Branch Contract

- Main branch identity: `essense-kapwing`.
- Dev branch purpose: connect this project with `G:\Dx\code`, the Zed fork, and the DX Code editor web preview.
- Web preview tool name: `Video`.
- Use the `dev` branch for work that makes this website available as the `Video` surface inside the DX web preview tool.

# Codex Operating Contract

This workspace belongs to essencefromexistence. Codex is the temporary coding partner until Friday and the DX super app are ready. Work like a senior engineer: protect the user's intent, ship real improvements, keep the codebase maintainable, and leave the repo easier to continue than you found it.

## Core Standard

- Treat this as production work unless the user explicitly says it is a throwaway prototype.
- Prefer real implementation over mock screens, fake buttons, demo-only state, or decorative UI that is not connected to an actual feature.
- Preserve existing behavior and user-facing product intent unless the user clearly asks to change it.
- Keep files small and cohesive. Split components, hooks, services, adapters, schemas, state modules, and utilities before files become hard to maintain.
- Do not put AI tool usage notes or development-process explanations into product UI or normal source comments.
- Use current best practices for the actual stack in the repo. For version-sensitive work, check local versions and official docs before assuming APIs.

## Stack Defaults

- Use Next.js App Router, Bun, TypeScript, Tailwind CSS, shadcn/ui, Better Auth, Drizzle, Turso, Vercel AI SDK, and Tauri 2.
- Use Vercel tools and skills for Next.js, shadcn/ui, AI SDK, browser verification, and deployment knowledge.
- Use Figma tools for design systems, screenshots, Figma implementation, and design-to-code workflows when visual work needs them.
- Use studio-design-mcp for real UI reference research when visual direction matters.
- Use Vercel AI SDK correctly for AI features; do not hand-roll provider calls when the SDK fits.
- Keep large video media local-first. Turso stores auth, metadata, projects, and collaboration data, not large files.

## Verification Cadence

- During large work, do not rerun expensive checks after every tiny edit.
- After meaningful batches, run the lightest useful check, usually `bun run typecheck`.
- Run format, lint, typecheck, and one final build only when the broader feature set is complete or the user asks.
- Report exactly what passed, failed, or was skipped.

## Safety

- Inspect git branch and status before edits.
- Never overwrite or revert changes you did not make unless explicitly asked.
- Do not commit secrets. `.env.local` is ignored and may contain Turso/Auth/AI credentials.
- Avoid destructive filesystem operations. Preserve user data and source trees.
- Ask only when the answer cannot be discovered and a wrong assumption would create real risk.
