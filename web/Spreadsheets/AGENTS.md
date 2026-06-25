# DX Web Preview Branch Contract

- Main branch identity: `essense-excel`.
- Dev branch purpose: connect this project with `G:\Dx\code`, the Zed fork, and the DX Code editor web preview.
- Web preview tool name: `Spreadsheets`.
- Use the `dev` branch for work that makes this website available as the `Spreadsheets` surface inside the DX web preview tool.

# Essence Excel Agent Notes

This repo is a production-minded free spreadsheet workspace for essencefromexistence.

- Use Next.js App Router, Bun, Tailwind CSS v4, shadcn/ui, Better Auth, Drizzle, Turso, and Tauri.
- Keep files small and cohesive. Prefer feature folders over mega-components.
- Preserve real functionality over decorative mock UI.
- Use official/current docs when touching version-sensitive APIs.
- Run `bun run typecheck` after meaningful implementation batches. Do not run local builds repeatedly during feature work.
- Do not commit `.env.local` or any Turso/Auth secret.
