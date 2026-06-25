# DX Web Preview Branch Contract

- Main branch identity: `essense-canva`.
- Dev branch purpose: connect this project with `G:\Dx\code`, the Zed fork, and the DX Code editor web preview.
- Web preview tool name: `Graphics`.
- Use the `dev` branch for work that makes this website available as the `Graphics` surface inside the DX web preview tool.

# G:\Canva Operating Contract

This workspace belongs to essencefromexistence. Codex is the temporary coding partner until Friday and the DX super app are ready.

## Product Goal

Build Essence Canva: a free, self-owned Canva-like design studio with real browser and Tauri workflows. Do not copy Canva branding, paid templates, licensed stock assets, or protected UI one-for-one. Build equivalent original functionality.

## Engineering Rules

- Treat this as production work, not a disposable prototype.
- Prefer real implementation over fake buttons, mock-only UI, or decorative panels.
- Keep files small and feature-owned. Extract components, hooks, services, schema, and adapters before a file becomes hard to continue.
- Use the repo stack: latest stable Next.js App Router, Bun, Tailwind CSS, shadcn/ui, Better Auth, Drizzle, Turso, and Tauri.
- Preserve existing behavior unless the user clearly asks to change it.
- Do not create useless file sprawl; add files only when they clarify ownership.
- Keep comments rare and useful.
- Never commit `.env.local` or private tokens.

## Verification

- During large work, run typecheck only after meaningful batches.
- Do not run repeated production builds while feature work is still in progress.
- Before calling a large milestone complete, run format, lint, typecheck, then one final build only if the user has not forbidden it.
- Report exactly what passed, failed, and was skipped.

## Tooling

- Use Vercel skills/tools for Next.js, shadcn/ui, browser verification, and deployment work.
- Use Figma tools when translating screenshots/designs or building a design system.
- Use studio-design-mcp for UI reference research when visual direction matters.
- Use `rg` first for repo search.
- On Windows/PowerShell, prefer safe native commands and avoid destructive operations.
