# DX Web Preview Branch Contract

- Main branch identity: `essense-powerpoint`.
- Dev branch purpose: connect this project with `G:\Dx\code`, the Zed fork, and the DX Code editor web preview.
- Web preview tool name: `Presentations`.
- Use the `dev` branch for work that makes this website available as the `Presentations` surface inside the DX web preview tool.

# Essence PowerPoint Agent Notes

This repo belongs to essencefromexistence. Build it as a serious free PowerPoint-style editor, not a throwaway demo.

- Preserve the editor workflow and real functionality while improving it.
- Keep files small and cohesive: feature state, UI components, database schema, auth, and platform config stay separated.
- Prefer real implementation over fake screens or decorative-only UI.
- Use Bun, Next.js App Router, Tailwind CSS, shadcn/ui components, Better Auth, Drizzle, Turso, and Tauri according to the repo's current setup.
- Use `rg` for search and inspect local code before changing architecture.
- Keep verification light during active work. The user's standing rule is to run `typecheck` only after a big change and avoid repeated builds until the feature set is complete.
- Do not commit secrets. Keep `.env.example` committed and real `.env*` files ignored.
