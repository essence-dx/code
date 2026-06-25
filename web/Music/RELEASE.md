# Essence Suno Release Checklist

## Current Production

- Live URL: `https://essence-suno.vercel.app`
- Last verified production smoke: root page returned `200`; security headers were present; `/api/ai/status` returned Groq text enabled; `/api/readiness` returned `100/100` core release readiness and `50/100` full optional-upgrade coverage.
- Current production mode: Groq-backed free-first text AI; optional image/transcription/music provider credentials are not configured yet.

## Lightweight Checkpoint

- Run `bun run typecheck`.
- Run `bun run verify:production` for the full lightweight production gate.
- Run `bun run smoke:production`.
- Run `bun run smoke:production:cron` after cron or health monitor changes.
- Run `bun run smoke:production:auth` to verify the email/password session and protected library APIs with a temporary cleaned-up account.
- Run `bun run smoke:production:browser-auth` after auth UI changes or before important releases.
- Run `bun run smoke:production:deep` after AI route changes or before important releases.
- Run `bun run smoke:production:browser` after UI changes or before important releases.
- Confirm the smoke result includes security headers and no product-facing stack-name leakage.
- Confirm `/api/health` returns `ok: true` for uptime monitoring.
- Confirm `CRON_SECRET` is configured before deploying `vercel.json` cron changes.
- Open Settings and review Release readiness.
- Confirm Turso migrations are applied.
- Confirm `.env.local` or Vercel env has `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- For large synced audio, confirm `BLOB_READ_WRITE_TOKEN` is configured.

## Optional AI Providers

- Text AI: set `GROQ_API_KEY`, `AI_BACKEND=groq`, `AI_TEXT_MODEL=llama-3.1-8b-instant`, and `AI_STRUCTURED_TEXT_MODEL=openai/gpt-oss-20b`.
- Image AI: set `AI_IMAGE_MODEL` plus supported credentials.
- Transcription: set `OPENAI_API_KEY` and optionally `AI_TRANSCRIPTION_MODEL`.
- Music generation: set `AI_AUDIO_PROVIDER_URL` and `AI_AUDIO_PROVIDER_WEBHOOK_SECRET` for a real provider callback.
- Provider monitoring: optionally set `AI_AUDIO_PROVIDER_HEALTH_URL`.
- Scheduled monitor: set `CRON_SECRET`; Vercel Cron calls `/api/cron/health` once daily and records a safe provider event.

## Known Release Limits

- Small shared audio files use Turso storage up to the configured cap.
- Large synced audio uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured.
- Audio job status responses expose safe playback summaries, not raw stored provider output or inline generation content.
- `/api/health` is available for uptime probes and safe deployment metadata.
- `/api/cron/health` is protected by `CRON_SECRET` and records readiness/provider monitor events.
- Suno-grade music generation is blocked until a real generation provider/model is connected.

## Final Commands

Run these only at the release checkpoint:

```bash
bun run typecheck
bun run verify:production
bun run build
vercel deploy --prod
SMOKE_REQUIRE_HEALTH=1 bun run smoke:production
SMOKE_REQUIRE_CRON=1 bun run smoke:production:cron
```
