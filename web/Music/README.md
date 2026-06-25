# Essence Suno

Free-first Suno-style music workspace for creating, organizing, editing, sharing, and preparing songs.

Production: https://essence-suno.vercel.app

## What Works

- Email/password accounts with OTP email verification.
- User library metadata, playlists, public profiles, share links, and small synced audio playback.
- Local IndexedDB audio library for uploads, recordings, edits, and Studio projects.
- Player, queue, playlist queue, waveform view, crop/fade/split, full export, range export, mixer controls, autosave versions, and restore points.
- AI routes for chat, lyrics, style prompts, structured briefs, metadata, playlist ideas, hook captions, cover prompts/images, transcription, and external audio job adapters.
- Text AI is available when a provider key is configured.
- Readiness and AI job diagnostics in Settings.
- Provider capability matrix for text, image, transcription, music generation, stems, voice, persona, remaster, and audio-to-MIDI readiness.
- Machine-readable `/api/health` plus a daily `/api/cron/health` monitor for production readiness checks.
- Optional large-audio storage path for bigger synced files.

## Free-First Limits

- Small shared audio files currently use the built-in shared-audio cap.
- Larger synced audio files use optional production storage when `BLOB_READ_WRITE_TOKEN` is configured.
- Suno-grade generation needs a real `AI_AUDIO_PROVIDER_URL`; the app has an adapter and callback contract but does not fake music generation.
- Image, transcription, music, stem, voice, persona, remaster, and audio-to-MIDI providers remain disabled until their provider credentials are configured.

## Local Commands

```bash
bun install
bun run db:migrate
bun run db:seed-admin
bun run typecheck
bun run smoke:production
bun run dev
```

During active work, use `bun run typecheck` as the lightweight check. Save production build and deployment for the final release checkpoint.

## Environment

Copy `.env.example` to `.env.local` and fill the values that match the local or deployed environment. Keep secrets out of git.

Recommended free-first Groq defaults:

```bash
AI_BACKEND=groq
AI_TEXT_MODEL=llama-3.1-8b-instant
AI_STRUCTURED_TEXT_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=...
```

The Settings readiness panel and `/api/readiness` show which optional providers are configured without exposing secret values.
Set `CRON_SECRET` in production so Vercel Cron can call the protected daily health monitor.
