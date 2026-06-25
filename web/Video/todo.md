# Essence Studio Todo

## Current Status Snapshot

- Project status: 100/100 for the current local-first editor maintainability roadmap.
- Kapwing parity status: 100/100 for the completed current parity roadmap. Essence Studio has a strong editor, dashboard, local media, AI planning, AI generation persistence and safety review, AI auto-captions, reviewed smart-cut application, transcript-applied cuts, local silence/filler cleanup proposals, AI clip variants, AI B-roll insertion from free stock search, AI video-project generation from scripts, pasted/imported article text, selectable-text and embedded-OCR PDF sources with stock scene-media placement, AI-generated scene image placement, and owner-supplied generated scene video placement, AI image editing from selected image layers with local transparent-background fallback, AI audio cleanup with saved WAV assets, optional owner-supplied advanced audio restoration, optional owner-supplied video stabilization/eye-contact/lip-sync enhancement, selectable voice isolation/room echo/speech-enhancement/noise-reduction modes, AI voiceover-to-audio-layer generation with long-script chunking and concatenated WAV output, direct voiceover recording onto the timeline, recording studio controls for countdown, teleprompter notes, pause/resume, retake, save, recorded takes, screen-plus-camera compositing, mixed recording audio, stock music/SFX library presets with timeline import, beat marker generation with marker snapping, analyzed auto-ducking for music under dialogue, local voice/instrumental stem splitting from stereo audio, timeline layout presets, multi-take comparison, and best-take promotion, meme template presets with safe export hints, brand-aware intro/outro/lower-third templates, brand kit logos/default colors/default typography/custom font assets/template defaults/selected-layer enforcement, desktop-persisted brand fonts with native FFmpeg fontfile handoff, image creation presets for collage/grid/banner/thumbnail/wallpaper/resize workflows, GIF trim/crop/collage/conversion/color/transparent-sticker workflows with export queueing, MP4/WebM/MOV/AVI/MPEG/MP3/WAV/M4A/PNG/JPG/WebP/project-bundle converter presets, platform-specific LinkedIn/YouTube/Instagram/TikTok/feed/banner/thumbnail safe-zone canvases, gaming/podcast/education/marketing/product-demo starter workflows, local export review pages with anchored timeline/canvas comments, approval status, download history, publish-prep records for user-owned platform credentials, browser-vs-desktop render handoff guidance with required desktop routing for very long/layer-heavy exports, team-lite role permissions, local invitations, private folder metadata, project access overrides, local audit history, server-enforced signed-in workspace invitations/folders/project permissions, operational readiness views, Turso-backed hosted review links with expiry/access/comment management, hosted reviewer comments with identity capture, safe cloud-sync conflict handling, a Tauri native render adapter with typed progress/cancellation/output metadata, in-app desktop diagnostics for local storage/media/font storage/render handoff/native render smoke checks, desktop relaunch session markers, desktop proof autopilot support, local project save/reopen verification from Settings, desktop file-backed media and export smoke checks, saved and exportable desktop verification evidence, desktop verification release imports, real compositor manifest artifacts, typed render graph handoff data, native FFmpeg output execution when FFmpeg is available, native FFmpeg text/shape overlay filters, native media input trims, and audio mixing, Turso-backed cloud project versions with restore/audit history, optional self-hosted URL media, user-owned signed upload handoff, signed upload provider presets, reusable upload profiles, saved and exportable profile readiness history, profile readiness release summaries/imports, upload verification release imports, and upload verification history for cross-device reopen workflows, batch media cleanup/rename/collection assignment, and advanced crop/mask shape controls, keyframe motion editing, motion tracking attachments for text/sticker overlays, chroma key removal, keyed background replacement, object blur/censor masks, richer transition presets, free stock media import, searchable templates, compressor quality preview, captions, export queue, Tauri foundation, and real desktop relaunch proof.
- Completed feature sets: 100/100 for Kapwing parity editing depth and export delivery; 100/100 for AI media workflows and asset/template expansion; 100/100 for applied AI editing and transcript operations; 100/100 for advanced visual effects and motion tools; 100/100 for AI-assisted assembly and generation safety; 100/100 for creator formats and social delivery; 100/100 for collaboration, publishing, and desktop delivery hardening; 100/100 for native rendering, hosted sharing, and production verification depth; 100/100 for production polish, creator QA depth, and release evidence lifecycle hardening; 100/100 for export confidence, delivery operations, and creator handoff hardening; 100/100 for runtime proof, maintenance automation, and release hardening.
- Last completed feature set: 100/100 for hosted review polish and release sharing hardening.
- Next feature set status: 20/100 for review handoff runtime UX and evidence recovery.
- Verification rule: keep using `bun run typecheck` after meaningful code batches. Do not run repeated builds or deployments for small changes.
- Simplification rule: the active backlog below is the source of truth for new work. The milestone archive remains below for history, but new feature work should be planned from this section first.

## Active Kapwing Parity Backlog

### P0 - Project Simplification And Maintainability

- [x] Split `src/features/editor/state/editor-store.ts` into smaller editor domain slices for project, playback, timeline, media, captions, export, review, and dashboard integration state.
  - [x] Extract the typed editor store contract into `editor-store-types.ts`.
  - [x] Extract export queue actions into `editor-export-slice.ts`.
  - [x] Extract project/playback actions into a focused slice.
  - [x] Extract media asset and collection actions into a focused slice.
  - [x] Extract selection/timeline edit actions into focused slices.
    - [x] Extract layer selection, isolation, visibility, locking, and grouping actions into a focused slice.
    - [x] Extract history snapshot, remove, duplicate, split, and track-move commands into a focused slice.
    - [x] Extract timing, nudge, alignment, distribution, canvas fitting, and background commands into focused slices.
  - [x] Extract shared selection, timeline, preset, media cleanup, and normalization helpers into `editor-store-utils.ts`.
  - [x] Extract remaining layer creation, style preset, audio preset, typography, template, and brand color actions into focused slices.
- [x] Split `src/features/dashboard/components/dashboard-client.tsx` into focused dashboard sections, hooks, and local action modules.
- [x] Split `src/features/editor/components/inspector-panel.tsx` into layer-specific inspector panels for media, text, captions, shapes, audio, motion, and export handoff.
  - [x] Extract the inspector layer header and quick actions into a focused component.
  - [x] Extract timing and transform controls into focused inspector sections.
  - [x] Extract layer status, grouping, notes, and review controls into focused inspector sections.
  - [x] Extract text/name, caption import/export, media/audio workflow, and motion/effects controls into focused inspector sections.
- [x] Split `src/features/editor/components/timeline-panel.tsx` into ruler, tracks, clip rows, markers, drag/trim handlers, and timeline commands.
  - [x] Extract the timeline command bar for playback, split, markers, search, filters, zoom, snap, and ripple controls.
  - [x] Extract timeline marker rail and playhead rendering.
  - [x] Extract track and clip row rendering from pointer drag handlers.
  - [x] Extract timeline drag and trim handlers into a focused hook.
- [x] Split `src/features/editor/components/media-bin.tsx` into asset import, asset health, collection, missing-media, and asset-card modules.
- [x] Add a capability registry that maps each product feature to its route/component/service/check so parity gaps are visible without scanning the whole repo.
- [x] Add an internal readiness report that separates "implemented", "implemented but not runtime verified", "metadata only", and "missing".
- [x] Audit visible controls and remove or wire any control that is only decorative.

### Next 100% Feature Set - Runtime Reliability And Media Workflow

- [x] Add a lightweight runtime smoke script for editor boot, project load, media import validation, save, and export preflight without running a full build.
- [x] Add focused regression checks for play, pause, save, autosave, undo/redo, and export cancellation.
- [x] Split the media bin into import, health, collections, missing-media, and asset-card modules.
- [x] Split the dashboard client into focused dashboard sections and local action modules.
- [x] Audit visible controls and either wire, remove, or document every remaining decorative-looking control.

### Next 100% Feature Set - Kapwing Parity Editing Depth And Delivery

- [x] Add transcript-based editing primitives that can convert cue text selections into proposed timeline cuts.
- [x] Add speed controls for selected video/audio layers, including reverse and speed ramp metadata.
- [x] Add richer visual correction controls for exposure, temperature, tint, vignette, and preset LUT-style looks.
- [x] Add converter/compressor workflows for target size, bitrate, resolution, FPS, and caption burn-in or sidecar choices.
- [x] Add export version history with source project snapshot, QA status, and rendered file metadata.

### Next 100% Feature Set - AI Media And Asset Library Depth

- [x] Add Vercel AI SDK powered auto-caption orchestration with a speech-to-text provider or local adapter.
- [x] Add AI subtitle translation with SRT/VTT sidecar export for translated tracks.
- [x] Add a free or user-key stock asset browser for royalty-free images, videos, GIFs, music, and sound effects.
- [x] Expand the template library into searchable categories for social clips, ads, explainers, memes, thumbnails, banners, captions, and intros.
- [x] Add video compressor quality preview before export.

### Next 100% Feature Set - Applied AI Editing And Transcript Operations

- [x] Add a review queue that turns AI smart-cut suggestions into accepted or rejected timeline edit ranges.
- [x] Add silence and filler-word removal that applies real split/remove commands after review.
- [x] Add transcript text deletion that proposes and applies timeline cuts from caption cue selections.
- [x] Add AI clip maker variants that duplicate the project into short-form edits with safe-zone framing.
- [x] Add AI voiceover or text-to-speech adapter output as replaceable audio layers.

### Next 100% Feature Set - Advanced Visual Effects And Motion Tools

- [x] Add keyframe animation editing for position, scale, rotation, opacity, and crop.
- [x] Add chroma key/green-screen removal controls with preview and export metadata.
- [x] Add video and image background removal or replacement behind a real provider/local adapter.
- [x] Add object blur/censor tools with manual masks and basic tracking metadata.
- [x] Add richer transition library beyond fade, slide, and crossfade metadata.

### Next 100% Feature Set - AI-Assisted Assembly And Generation Safety

- [x] Add AI B-roll suggestions that insert real stock/local/generated assets into the timeline after user approval.
- [x] Add AI script-to-video and article/PDF-to-video project generation with imported article/PDF source intake and stock scene-media placement.
  - [x] Add owner-supplied generated scene video service output placement for generated video projects.
- [x] Add AI image editing workflows with real provider/local adapters and no fake placeholder outputs.
  - [x] Add a local transparent-background fallback for selected image background removal when image providers are unavailable.
- [x] Add AI audio cleanup/noise reduction workflow with saved before/after assets.
- [x] Add AI generation persistence, moderation, rate limits, and product-safe failures for every new media generation path.

### Next 100% Feature Set - Creator Formats And Social Delivery

- [x] Add meme template library with editable text boxes and safe export presets.
- [x] Add GIF editor workflows for GIF trim, crop, collage, GIF to MP4, MP4 to GIF, color-changing GIF effects, and transparent single-source GIF stickers.
  - [x] Add alpha-preserving layered transparent GIF export using PNG frame sequencing and FFmpeg palette generation.
- [x] Add image tools for photo collage, photo grid, banner maker, thumbnail maker, wallpaper maker, and image resizer.
- [x] Add social safe-zone presets for LinkedIn, YouTube Shorts, Instagram Reels, TikTok, feed posts, banners, and thumbnails.
- [x] Add gaming, podcast, education, marketing, and product-demo starter workflows.

### Next 100% Feature Set - Collaboration Publishing And Desktop Delivery

- [x] Add local share/review pages for finished exports with comments, approval status, and download history.
- [x] Add publish-prep adapters for YouTube, TikTok, Instagram, LinkedIn, and cloud drives using user-owned credentials without paid defaults.
- [x] Add desktop render handoff for long or complex projects with clear browser-vs-desktop capability routing.
- [x] Add workspace/team-lite permissions for project comments, review links, folders, and export history.
- [x] Add operational readiness views for project health, missing media, export failures, auth/database status, and AI usage limits.

### Next 100% Feature Set - Native Rendering Hosted Sharing And Production Verification

- [x] Add a native desktop render adapter for long composite exports with typed progress, cancellation, and output metadata.
  - [x] Write a native compositor manifest artifact to the desktop filesystem with real path and byte metadata.
  - [x] Serialize a typed native render graph with visible layers, timing, transforms, styles, effects, and media references.
  - [x] Add native FFmpeg execution that writes actual media bytes when FFmpeg is available and falls back to the manifest when it is not.
  - [x] Add graph-driven native FFmpeg text, subtitle, timer, shape, sticker, and progress overlays.
  - [x] Add native media-file inputs, timeline trims, overlay composition, and audio mixing.
  - [x] Add in-app desktop diagnostics for local storage, media/font storage, render spool, and native media engine readiness.
  - [x] Add native render smoke diagnostics that create a real render manifest or media output from the desktop runtime.
  - [x] Add a Settings self-test that saves, reopens, validates, and cleans up a local project before real desktop launch verification.
  - [x] Persist recent desktop verification evidence so real launch sessions can be inspected after reopen.
  - [x] Add a downloadable desktop verification evidence packet for release/debug proof.
  - [x] Add desktop readiness import for exported desktop verification evidence packets.
  - [x] Add a native desktop workflow smoke command for file-backed media recovery and export output validation.
  - [x] Require desktop rendering for very long or high-layer-budget composite exports before unsafe browser preflight attempts.
- [x] Add hosted review links with permissions, expiry, comment-only access, and Turso-backed metadata.
  - [x] Add Turso-backed hosted review link metadata with token, permission, expiry, and public review page.
  - [x] Add hosted comment submission and reviewer identity controls.
  - [x] Add link revoke, renew, and permission management.
- [x] Add an optional free or self-hosted media storage adapter for cross-device project media while keeping local-first defaults.
  - [x] Add a CORS-safe self-hosted URL media source that stores direct media URLs as metadata, not large blobs.
  - [x] Wire self-hosted URL import, recovery after reopen, project sync schema preservation, render preflight, and browser/composite renderer loading.
  - [x] Add user-owned signed upload handoff so local browser, desktop, or linked media can be published to creator-controlled storage and converted into self-hosted URL media.
  - [x] Add signed upload provider presets for common user-owned storage targets without storing provider secrets.
  - [x] Add reusable upload profiles so repeated storage uploads can derive public media URLs from saved creator-owned folder origins without saving one-time signed URLs.
  - [x] Add CORS and public URL readiness checks for saved upload provider profiles.
  - [x] Add saved readiness history for upload provider profiles.
  - [x] Add exportable profile readiness evidence for storage setup handoff review.
  - [x] Include profile readiness evidence summaries in release readiness packets.
  - [x] Add release readiness import support for profile readiness evidence packets.
  - [x] Add upload verification history so creator-owned public media URLs are checked and visible after storage handoff.
  - [x] Add exportable upload verification evidence packets for release and creator handoff review.
  - [x] Add upload verification evidence import so handoff proof can be restored across browser sessions.
  - [x] Add upload verification evidence summaries to release readiness packets.
  - [x] Add release packet import support for upload verification evidence.
  - [x] Add release packet import support for embedded desktop verification evidence and persist restored checks into desktop evidence history.
- [x] Add project version restore and audit history beyond local browser snapshots.
  - [x] Store Turso-backed project versions on signed-in sync and restore.
  - [x] Store signed-in project audit events for sync, restore, and delete.
  - [x] Add dashboard cloud version history with restore controls.
- [x] Deploy only after the next big feature batch and capture a deployed screenshot when CLI auth is healthy.
  - [x] Add a deployment release preflight checklist for hosting linkage, feature-batch publishing, deployed URL proof, screenshot proof, and release evidence export.
  - [x] Accept local deployed screenshot artifact paths as release proof so browser/node screenshot captures can be tracked without a public image host.
  - [x] Add a release evidence packet writer for deployed URL, screenshot proof, and optional desktop evidence handoff.
  - [x] Add a release evidence packet verifier that blocks stale, missing, or gate-failing proof before production claims.
  - [x] Surface release evidence verifier results in Settings so saved proof can be audited before export.
  - [x] Add strict release evidence packet finalization so generated packets can fail when verifier status is blocked.
  - [x] Prevent Settings from touching auth/database helpers during static prerender when deployment envs are not available.
  - [x] Stamp CLI-generated release evidence packets with fresh deployment proof timestamps.
  - [x] Deploy to Vercel, capture a deployed screenshot with `node_repl`, and write a local release evidence packet.

### P0 - Real Verification Gaps

- [x] Verify Tauri workflows with a real desktop launch: local file import, local project persistence after restart, media recovery, and native export save.
  - [x] Add a launch preflight checklist for the exact desktop proof workflow before the real Tauri session.
  - [x] Add a desktop evidence packet verifier that fails stale, partial, or malformed launch proof before release handoff.
  - [x] Surface desktop evidence verifier results in Settings so launch proof is visibly blocked until a ready packet exists.
  - [x] Add a desktop relaunch session marker so release proof requires checks across separate Tauri app launches.
  - [x] Add a desktop proof autopilot that can save real Tauri verification evidence from launch-session opt-in or `?desktopProof=run`.
  - [x] Write desktop proof autopilot evidence packets to Tauri app-local storage for release handoff.
  - [x] Add a dev proof runner that launches Tauri with autopilot enabled and verifies the app-local evidence packet.
  - [x] Harden the Windows dev proof runner against MSVC PDB linker limits during Tauri launch.
  - [x] Add a disk-space preflight to the desktop proof runner so low-space Tauri launches fail fast.
  - [x] Prefer the existing debug Tauri binary for desktop proof reruns to avoid unnecessary Rust recompiles.
  - [x] Capture a ready desktop relaunch evidence packet with all required checks passing.
- [x] Add an in-app desktop diagnostics self-test before real desktop launch verification.
- [x] Add a native render smoke self-test before real desktop launch verification.
- [x] Add an in-app local project save/reopen self-test before real desktop launch verification.
- [x] Add saved verification evidence for desktop readiness checks before real desktop launch verification.
- [x] Add exportable verification evidence packets for desktop readiness checks before real desktop launch verification.
  - [x] Add a CLI verifier for exported desktop evidence packets so real Tauri launch proof can be checked before release import.
- [x] Add importable desktop verification evidence packets for restoring real launch proof across sessions.
- [x] Add native desktop workflow smoke checks for file-backed media and export output before real desktop launch verification.
- [x] Add a release readiness gate that blocks production claims on missing desktop launch proof, deployed screenshot proof, provider setup, database setup, and capability score.
- [x] Add local release evidence capture for deployed screenshot proof, desktop launch proof, and exportable release evidence packets.
  - [x] Reuse saved desktop verification history as release evidence when a real desktop check is ready.
  - [x] Capture deployed app URL separately from deployed screenshot proof in release evidence packets.
  - [x] Capture deployed screenshot proof as either a public image URL or a local screenshot artifact path.
  - [x] Require local deployment proof to include both a deployed app URL and deployed screenshot URL.
  - [x] Require release desktop proof to come from a saved ready desktop verification entry, not a manual toggle.
  - [x] Import exported desktop evidence packets into release readiness so desktop-app proof can be reused across sessions.
  - [x] Import exported release evidence packets so deployment and desktop proof can be restored together.
  - [x] Show release evidence completeness for deployment URL, screenshot proof, and desktop proof before export.
  - [x] Mark stale release evidence so old deployment and desktop proof is refreshed before claiming readiness.
  - [x] Block stale release evidence from satisfying the release gate until fresh proof is saved.
  - [x] Add a CLI verifier for release evidence packets so proof handoffs fail when desktop, deployment, or release gates are incomplete.
  - [x] Label in-app release evidence exports as draft or ready based on verifier status.
- [x] Verify Vercel deployment only after the next big feature batch and capture a deployed screenshot once CLI auth is healthy.
  - [x] Add an in-app deployment preflight so missing deployed URL and screenshot proof is actionable before the real publish step.
  - [x] Capture production URL `https://essence-kapwing-blue.vercel.app`, local screenshot proof, and release evidence packet.
- [x] Add a lightweight runtime smoke script for editor boot, project load, media import validation, save, and export preflight without running a full build.
- [x] Add focused regression checks for play, pause, save, autosave, undo/redo, and export cancellation.

### Next 100% Feature Set - Production Polish Creator QA And Evidence Lifecycle

- [x] Add release evidence history with ready/draft/stale filtering, pinned latest release packet, and one-click re-verification.
- [x] Add larger sample-project QA fixtures that exercise multi-track video, captions, voiceover, stock assets, native render, review links, and upload handoff together.
- [x] Add desktop proof freshness renewal reminders and a lightweight command to refresh proof without rebuilding when a debug binary exists.
- [x] Add focused accessibility and keyboard workflow coverage for dashboard, editor shell, timeline, inspector, media bin, and Settings release cards.
- [x] Add creator-facing export QA summaries that compare selected format, safe zones, subtitles, audio loudness, missing media, and expected render route before export.

### Next 100% Feature Set - Export Confidence And Creator Delivery Ops

- [x] Persist export QA summary snapshots on export jobs and local review pages so finished exports carry their delivery evidence.
- [x] Add batch export readiness comparison across selected social deliveries before starting a batch render.
- [x] Add media attribution and license handoff summaries for stock, self-hosted, browser, and desktop media used in an export.
- [x] Add reviewer-facing proof bundles that combine export QA, render route, release evidence, desktop evidence, and download history.
- [x] Add a local maintenance center for stale proof, unused media, missing sources, failed exports, and cloud-version conflicts.

### Next 100% Feature Set - Runtime Proof Maintenance Automation And Release Hardening

- [x] Add proof-bundle import and comparison so reviewers can restore exported handoff evidence across browser profiles.
- [x] Add saved local maintenance history with ready/draft filtering and exportable maintenance evidence packets.
- [x] Add guided recovery queues for missing media relink, stale proof refresh, failed export retry, and reviewed cloud conflicts.
- [x] Add release-to-review handoff comparison that verifies latest release proof matches the export review package being shared.
- [x] Add targeted runtime checks for proof-bundle download integrity and maintenance center cleanup actions.

### Next 100% Feature Set - Review Runtime Automation And Release Operations

- [x] Add a local review-page runtime smoke that exercises comment add/resolve, status update, download record, proof bundle export, proof import, and release handoff comparison without a full build.
- [x] Add Settings release operations history that groups release evidence, maintenance evidence, review handoff status, and deployment proof into one exportable release packet.
- [x] Add stale review package detection that warns when export QA, media attribution, release evidence, or desktop proof has changed after the review package was created.
- [x] Add maintenance recovery completion tracking so relink, retry, proof refresh, and cloud-conflict cleanup actions can be verified as resolved.
- [x] Add a final lightweight release-operations check that runs the review smoke, proof export integrity, maintenance cleanup verification, and release gate comparison together.

### Next 100% Feature Set - Hosted Review Polish And Release Sharing Hardening

- [x] Add a hosted-review runtime smoke for token expiry, access modes, public review loading, reviewer comments, revoke, and renew behavior.
- [x] Add reviewer identity and audit export packets that combine hosted comments, local comments, downloads, approval state, and publish-prep records.
- [x] Add stale hosted-share proof warnings when release evidence, desktop proof, or review proof changes after a public link was issued.
- [x] Add release packet import conflict preview for desktop proof, upload verification proof, profile readiness proof, and release URL proof before overwriting local evidence.
- [x] Add a final hosted-review release check that runs hosted link smoke, stale share warnings, packet import conflict preview, and the release-operations gate together.

### Next 100% Feature Set - Review Handoff Runtime UX And Evidence Recovery

- [x] Add owner-side hosted review link search, sorting, and stale-proof filters for projects with many public review links.
- [ ] Add hosted reviewer comment export/import recovery so public feedback can be restored into local review packets after browser or account changes.
- [ ] Add release evidence dry-run import mode that previews every affected local evidence store without requiring a file input retry.
- [ ] Add reviewer handoff packet signing and integrity checks for audit packets, proof bundles, and release packets.
- [ ] Add a review handoff recovery gate that runs hosted review release gate, reviewer audit packets, proof import comparison, and release evidence dry-run checks together.

### P1 - Core Kapwing Editing Gaps

- [x] Add transcript-based editing that can remove or trim timeline ranges by editing transcript text.
- [x] Add automatic speech-to-text caption generation from imported video/audio.
- [x] Add silence removal that applies real timeline cuts, not just smart-cut suggestions.
- [x] Add filler-word removal with an editable review step before applying cuts.
- [x] Add keyframe animation editing for position, scale, rotation, opacity, and crop.
- [x] Add speed ramping, reverse video, and per-segment speed curves.
  - [x] Carry normalized speed ramp/reverse metadata into the native render graph with source-duration planning.
  - [x] Apply FFmpeg reverse, linear ramp PTS mapping, audio reverse, and tempo filters in desktop exports.
  - [x] Cover speed export metadata and FFmpeg filter wiring with targeted workflow checks.
- [x] Add chroma key/green screen removal.
- [x] Add video and image background removal or replacement.
- [x] Add object blur/censor tools with manual masks and basic tracking.
- [x] Add richer transition library beyond fade, slide, and crossfade metadata.
- [x] Add motion tracking and attach text/stickers to tracked regions.
  - [x] Add tracking attachment metadata for overlay layers with target layer, target mask, offset, and scale-follow controls.
  - [x] Resolve attached text/sticker transforms against tracked media-layer centers or object-mask centers in preview and browser composite export.
  - [x] Add an inspector attachment panel and project-sync/native-graph metadata support for tracked overlays.
- [x] Add advanced crop presets, mask shapes, rounded video masks, and custom aspect crop handles.
  - [x] Add crop aspect presets for full, square, portrait, vertical, wide, and classic crops.
  - [x] Add crop focus controls for center, left, right, top, and bottom alignment.
  - [x] Add mask shape controls for square, rounded, pill, and circle media layers.
  - [x] Use rounded media clipping in composite export, not only in the canvas preview.
- [x] Add color correction controls beyond basic brightness, contrast, and saturation, including exposure, temperature, tint, vignette, and LUT-style presets.
- [x] Add batch media operations for replace, relink, rename, collection assign, and remove-unused.
  - [x] Keep existing single replace/reconnect and batch relink flows.
  - [x] Add filtered media prefix rename.
  - [x] Add filtered media collection assignment without removing already filed assets.
  - [x] Add remove-unused cleanup based on real timeline usage.

### P1 - Kapwing AI Gaps

- [x] Add Vercel AI SDK powered auto-caption orchestration with a speech-to-text provider or local adapter.
- [x] Add AI subtitle translation with SRT/VTT sidecar export for translated tracks.
- [x] Add AI dubbing or voiceover generation with replaceable audio layers.
- [x] Add AI text-to-speech for common languages using a provider adapter that can be swapped later.
  - [x] Add long-script voiceover chunking with concatenated WAV output for provider-limited speech models.
- [x] Add AI clip maker that detects candidate short clips, creates project variants, and applies safe-zone framing.
- [x] Add AI B-roll suggestions that insert real stock/local/generated assets into the timeline after user approval.
- [x] Add AI script-to-video and article/PDF-to-video project generation.
  - [x] Add article/text/transcript/selectable-PDF and embedded-OCR PDF source import into the video-project prompt.
  - [x] Add screenshot/storyboard image-source import for video-project generation through AI Gateway vision routing.
  - [x] Add stock scene-media placement for generated video project scenes with B-roll queries.
  - [x] Add provider-backed AI image generation for generated project scene backgrounds when the configured image model is available.
  - [x] Keep AI video projects usable when only some scene images generate successfully.
- [x] Expand AI image editing workflows: mask-based inpaint, outpaint presets, background remover, legal cleanup only, and image translator.
  - [x] Add a real source-image edit path through the AI SDK image model adapter and import edited assets back onto the canvas.
  - [x] Add structured image-edit modes for inpaint, outpaint, background removal, legal cleanup, and image translation.
  - [x] Send selected object masks as AI SDK image masks for inpaint edits instead of relying on prompt-only edits.
  - [x] Add outpaint canvas presets, target-language controls, edited-image metadata, and targeted workflow checks.
- [x] Expand AI audio cleanup/noise reduction with provider-backed voice isolation, room echo reduction, and before/after preview controls.
  - [x] Add a local noise-reduction adapter that saves a cleaned WAV asset and records generation history when signed in.
  - [x] Add selectable local voice isolation and room echo reduction adapters with distinct DSP profiles.
  - [x] Add selectable local speech enhancement with a distinct DSP profile for clearer dialogue.
  - [x] Add before/after audio preview controls with cleanup metrics for the latest generated WAV.
  - [x] Add adjustable cleanup strength for local audio restoration profiles with saved generation metadata.
  - [x] Add a real owner-supplied restoration adapter for voice isolation, room echo reduction, speech enhancement, and noise reduction.
- [x] Add AI eye-contact, stabilization, and lip-sync only when a real provider or local model path is wired.
  - [x] Add an optional owner-supplied video enhancement service path for stabilization, eye-contact, and lip-sync.
- [x] Add AI generation persistence with saved prompt, model, usage, output asset, and project linkage.
- [x] Add moderation, rate limits, and product-safe failures for every new AI media generation path.

### P1 - Stock Assets, Templates, And Creation Tools

- [x] Add a stock asset browser for royalty-free images, videos, GIFs, music, and sound effects through free or user-provided providers.
- [x] Add searchable template marketplace-style library with categories for social clips, ads, explainers, memes, thumbnails, banners, captions, and intros.
- [x] Add meme template library with editable text boxes and safe export presets.
- [x] Add GIF editor workflows for GIF trim, GIF crop, GIF collage, GIF to MP4, MP4 to GIF, color-changing GIF effects, and transparent single-source GIF stickers.
  - [x] Add a GIF frame strip for FPS-aware trim start previews and source-duration clamping.
  - [x] Add rendered GIF/video source thumbnails for sampled frame positions when browser media access allows it.
  - [x] Add transparent GIF sticker export for single-source GIF routes with alpha-preserving FFmpeg palette settings.
- [x] Add image tools for photo collage, photo grid, banner maker, thumbnail maker, wallpaper maker, and image resizer.
- [x] Add social safe-zone presets for LinkedIn, YouTube Shorts, Instagram Reels, TikTok, feed posts, banners, and thumbnails.
- [x] Add gaming, podcast, education, marketing, and product-demo starter workflows.
- [x] Add reusable intro/outro and lower-third template assets tied to brand kits.

### P1 - Audio And Recording Gaps

- [x] Add music and sound effects library integration.
  - [x] Add curated stock-audio searches for ambient music, upbeat beds, whooshes, clicks, and applause.
  - [x] Add direct stock-audio timeline import with music/SFX mix defaults and attribution notes.
  - [x] Add Music & SFX collection tagging for imported stock audio.
- [x] Expand audio noise removal, speech enhancement, and room echo reduction beyond the local cleanup adapter.
  - [x] Add a local voice filter, soft noise gate, and normalization workflow that saves a cleaned WAV asset.
  - [x] Add separate voice-isolation and room-echo-reduction profiles instead of one fixed cleanup chain.
  - [x] Add a local speech-enhancement profile for dialogue clarity and balanced loudness.
  - [x] Add before/after preview controls for generated cleanup results.
  - [x] Add adjustable cleanup strength for generated cleanup results.
  - [x] Add an optional connected restoration service route for heavier user-owned audio cleanup.
- [x] Add voice isolation/split vocals workflow.
  - [x] Add a local stereo mid-side split that creates voice and instrumental WAV stem assets.
  - [x] Add audio mix panel controls that save both stems and place them as timeline layers.
  - [x] Guard the workflow with targeted audio regression checks.
- [x] Add beat markers and simple beat-sync snapping.
  - [x] Detect beat marker candidates from waveform peaks on audio layers.
  - [x] Generate and clear beat markers from the audio mix panel.
  - [x] Reuse timeline marker snapping so layer movement snaps near generated beats.
- [x] Add auto-ducking that analyzes dialogue/music regions instead of only applying presets.
  - [x] Detect overlapping dialogue/voice regions from timeline layer metadata and waveform peaks.
  - [x] Split selected music audio into normal and ducked segments with lower volume under dialogue.
  - [x] Add an audio mix panel action that applies analyzed ducking through the editor store.
- [x] Add recording studio workflow with teleprompter, countdown, pause/resume, retake, and camera plus screen layout presets.
  - [x] Add teleprompter notes for recording prep.
  - [x] Add cancelable countdown presets before capture starts.
  - [x] Add pause/resume controls during recording.
  - [x] Add retake/discard flow before saved media enters the project.
  - [x] Add camera plus screen layout presets and saved take management.
  - [x] Add simultaneous screen-plus-camera composited recording with mixed audio.
- [x] Add multi-take review with clip comparison and best-take promotion.
- [x] Add voiceover recording directly onto the timeline.

### P1 - Export, Conversion, And Delivery Gaps

- [x] Add converter workflows for MP4, WebM, MOV, AVI, MPEG, MP3, WAV, M4A, GIF, PNG, JPG, WebP, and project bundle where browser or desktop support allows.
  - [x] Add first-class export format typing, filenames, MIME metadata, and save-dialog filters for the expanded converter set.
  - [x] Add export presets for MOV, AVI, MPEG, JPG, WebP, MP3, and M4A.
  - [x] Wire browser FFmpeg and native FFmpeg argument paths for expanded video/audio/image formats.
  - [x] Update publish-prep compatibility and targeted export workflow checks.
- [x] Add video compressor controls for target size, bitrate, resolution, and FPS.
- [x] Add video compressor quality preview before export.
- [x] Add caption burn-in versus sidecar export choices.
- [x] Add transparent-background export where feasible.
- [x] Add longer-project native desktop render path that is more reliable than browser-only WASM rendering.
  - [x] Add browser-vs-desktop render handoff guidance for long, file-backed, high-resolution, or many-layer exports.
  - [x] Add a Tauri-native render job adapter with progress polling, cancellation, and output metadata.
  - [x] Add native compositor manifest files as the handoff contract for FFmpeg execution.
  - [x] Add typed native render graph serialization for FFmpeg-side compositor input.
  - [x] Add native FFmpeg execution that can produce real MP4/WebM/GIF/PNG/WAV output files when FFmpeg is installed.
  - [x] Add graph-driven native FFmpeg text, subtitle, timer, shape, sticker, and progress overlays.
  - [x] Add native media-file inputs, timeline trims, overlay composition, and audio mixing.
- [x] Add export version history with source project snapshot, QA status, and rendered file location.
- [x] Add direct share/download review pages for completed exports.
- [x] Add optional publish prep adapters for YouTube, TikTok, Instagram, LinkedIn, and cloud drive exports using user-owned credentials.

### P2 - Collaboration, Workspace, And Cloud Gaps

- [x] Add hosted share/review links with permissions, expiry, and comment-only access.
- [x] Add real-time collaborative editing or a safe conflict-resolution model for edits made by multiple users.
- [x] Add time-stamped comments attached to timeline ranges and canvas positions.
  - [x] Add normalized comment anchors for playhead time, time ranges, selected layers, and canvas percentage coordinates.
  - [x] Add review workspace controls for choosing comment anchor type and displaying anchor labels.
  - [x] Extend local and Turso comment schemas for range and canvas anchor metadata.
- [x] Add workspace roles, invites, project permissions, private folders, and audit history.
  - [x] Add signed-in project sync/restore/delete audit events.
  - [x] Add local team-lite role permissions for comments, folders, review links, members, and export history.
  - [x] Add local pending invitations, private folder metadata, project access overrides, and local audit events.
  - [x] Add review workspace controls for invites, project overrides, private folders, and audit history.
  - [x] Add server-enforced multi-user workspace invitations and folder permissions after authenticated workspace accounts are modeled.
  - [x] Add invitation acceptance links without requiring a paid email provider.
  - [x] Add email notifications after a free transactional email path is selected.
    - [x] Add free mailto-based invitation email drafts for signed-in workspace invites without paid provider defaults.
- [x] Add project version history with restore points stored beyond local browser state.
- [x] Add optional free or self-hosted media storage adapter for users who want cross-device cloud access.
- [x] Add brand kit logos, reusable colors, template defaults, and workspace-wide selected-layer brand enforcement.
- [x] Add custom font upload and font asset persistence for brand kits after the browser and Tauri font-loading path is chosen.
- [x] Add native FFmpeg fontfile mapping for exact uploaded-font desktop text rendering.
- [x] Add team usage, export, and AI generation history views.

## Milestone 0 - Foundation

- [x] Initialize git project in `G:\Kapwing`.
- [x] Scaffold latest Next.js App Router with Bun, TypeScript, Tailwind CSS, and shadcn/ui.
- [x] Add Tauri 2 shell config sharing the Next.js app.
- [x] Add desktop-only static export path for Tauri packaging.
- [x] Create Turso database `essence-kapwing`.
- [x] Add Better Auth, Drizzle, Turso, and Vercel AI SDK dependencies.
- [x] Run first `bun run typecheck`.

## Milestone 1 - Auth, Projects, And Local Media

- [x] Add Better Auth email/password server route and client helper.
- [x] Add Drizzle schema for auth, workspaces, folders, projects, brand kits, comments, templates, exports, and media metadata.
- [x] Add browser local media storage for imported video, image, and audio files.
- [x] Add Tauri media adapter entrypoints for desktop file import.
- [x] Reject unsupported browser media file types before metadata decode/storage.
- [x] Apply database migrations to Turso.
- [x] Add local multi-project autosave, search, open, duplicate, and delete library.
- [x] Add session-gated project persistence actions.

## Milestone 2 - Editor Core

- [x] Add local-first editor state with undo/redo, media bin, layers, tracks, project metadata, and export jobs.
- [x] Add canvas preview, bottom timeline, left tool rail, right inspector, and top project controls.
- [x] Add import media, text layers, subtitle layers, shapes, duplicate, split, reorder, lock, mute, trim, transform, and style controls.
- [x] Add precise drag-to-trim and drag-to-reorder timeline gestures.
- [x] Add waveform extraction and audio preview.
- [x] Add multi-select and snapping basics.
- [x] Add visual snapping guides.

## Milestone 3 - AI Features With Vercel AI SDK

- [x] Add AI SDK v6 route using `generateText` and structured `Output.object()` schemas.
- [x] Add AI assistant UI for script generation, caption drafting, repurpose plans, and edit plans.
- [x] Add AI-generated media actions when provider credentials are available.
- [x] Add AI transcript cleanup, smart cut suggestions, and brand-aware subtitle styling.
- [x] Add rate limit and usage logging per authenticated user.
- [x] Require finite forward-moving time ranges in AI captions, repurpose clips, and smart-cut outputs.
- [x] Validate generated image payload size, media type, and base64 shape before preview/import.

## Milestone 4 - Export And Format Tools

- [x] Add export planner and queue model.
- [x] Add project bundle export for full local backup.
- [x] Add FFmpeg/WASM trim plan for simple single-media exports.
- [x] Add composite video render for text, image, shape, subtitle, and audio layers.
- [x] Harden composite render cleanup for media preparation, recording, and transcode failures.
- [x] Add GIF/WebM/MP4 presets, compressor presets, and social aspect presets.
- [x] Add cancel/retry progress handling tied to actual render workers.

## Milestone 5 - Creator Editor Breadth

- [x] Meme generator.
- [x] Collage, split-screen, montage, slideshow, and image-to-video tools.
- [x] Screen recorder and webcam recorder.
- [x] SRT/VTT import/export.
- [x] Transcript download.
- [x] Reject malformed subtitle timestamps and keep transcript export immutable.
- [x] Brand kit assets, template library, reusable stickers, and safe-zone overlays.
- [x] Collaboration-lite comments, export history, project folders, share links, and team workspace management.

## Milestone 6 - Verification And Release

- [x] Run lint and typecheck. No format script is defined in `package.json`.
- [x] Run Tauri Rust check with `cargo check`.
- [x] Run one final build only after planned feature completion.
- [x] Smoke-check live public routes after deployment.
- [x] Verify browser workflows: import, edit, save, reopen, AI action, export.
- [x] Statically verify Tauri local file import and local project persistence paths.
- [x] Add in-app local project save/reopen verification for desktop readiness.
- [x] Save recent desktop verification evidence across settings reloads.
- [x] Export recent desktop verification evidence as a JSON packet.
- [x] Add native workflow smoke coverage for file-backed media recovery and desktop export output.
- [ ] Verify Tauri workflows: desktop launch, local file import, local project persistence.
- [x] Deploy with Vercel CLI after final feature completion.

## Milestone 7 - Production Readiness Hardening

- [x] Remove implementation and vendor names from user-facing product UI.
- [x] Sanitize unexpected auth, AI, project-sync, save, and export errors before showing them to users.
- [x] Add real playback and local save controls.
- [x] Add editor keyboard shortcuts and batch selected-layer commands.
- [x] Respect locked layers in shared destructive/timeline commands.
- [x] Add missing-media detection and browser reconnect flow.
- [x] Revoke replaced local media preview URLs during project switches and reconnects.
- [x] Add export preflight validation for missing media, unsupported presets, duration, and browser recording support.
- [x] Add project bundle import for local backup recovery.
- [x] Validate project bundle imports before parsing selected files.
- [x] Validate local project records before saving, listing, loading, and duplicating.
- [x] Guard fire-and-forget autosave and shortcut saves from unhandled local persistence failures.
- [x] Guard fire-and-forget dashboard refresh and audio preview playback failures.
- [x] Guard dashboard refresh and composite audio startup promise rejections at the call site.
- [x] Show product-safe editor boot notices for failed local project open and media reconnect recovery.
- [x] Preserve successful browser media imports when another selected file fails.
- [x] Add product-safe failure states for review workspace comments, folders, share links, and members.
- [x] Validate local review comments and workspace member emails before persistence.
- [x] Add product-safe screen and camera recording permission/save failure handling.
- [x] Add product-safe export preparation failure handling and retry busy guards.
- [x] Add product-safe subtitle import/export failure handling.
- [x] Keep manual subtitle cue edits bounded to finite start/end timings.
- [x] Preserve successful generated image imports when another generated image fails to save.
- [x] Share generated image base64 validation between AI schema, preview, and import paths.
- [x] Add product-safe dashboard local and signed-in library action failure handling.
- [x] Clamp inspector numeric inputs to finite, safe timing and transform values.
- [x] Normalize layer patches so inspector edits expand project duration consistently.
- [x] Clamp undo/redo playhead state and reject stale layer selection ids.
- [x] Add browser workflow verification for import, edit, save, reopen, AI, and export.
- [x] Split AI result contracts from UI and harden generated caption validation.
- [x] Add full durable recovery tests for missing local and desktop media files.
- [x] Add stronger export render tests for multi-track audio/video composites.
- [x] Add lightweight Tauri desktop workflow preflight for static export, permissions, import, restore, and export wiring.
- [x] Add scoped Tauri desktop CSP for static app, media previews, FFmpeg WASM, and online API calls.
- [x] Harden desktop media file filtering and safe import failure messaging.
- [x] Persist desktop imports into app-local storage so projects can reopen after restart.
- [x] Scope Tauri filesystem permissions for durable app-local media read/write.
- [x] Scope Tauri filesystem permissions for common native import/export folders.
- [x] Add Tauri-native export save wiring for rendered files and project bundles.
- [x] Use project-title filenames for rendered media exports.
- [x] Use the same safe export filenames in export history rows.
- [x] Use a browser-safe attached download flow for rendered exports.
- [x] Add typed export render errors with product-safe failure messages.
- [x] Mark native export save-dialog cancellation as a cancelled export job.
- [x] Preserve successful desktop imports when a multi-file batch includes failures.
- [x] Validate desktop media metadata before copying files into durable app storage.
- [x] Guard server-backed settings usage review during Tauri static frontend export.
- [x] Guard desktop-static AI, account, and signed-in project actions behind a configurable web API origin.
- [x] Validate signed-in project sync responses before loading them into local state.
- [x] Bound project sync/import schema values for dimensions, timing, captions, and media metadata.
- [x] Reject zero-length subtitle cues in synced and bundled project data.
- [x] Keep signed-in project listing resilient to corrupt stored project payloads.
- [x] Validate signed-in project route ids before database access.
- [x] Add trusted CORS handling for desktop-to-web AI, account, and project sync APIs.
- [x] Return clean client errors for malformed JSON API requests.
- [x] Add behavioral CORS checks and sanitized client AI failure messages.
- [x] Move desktop and online-service UI availability checks behind mounted runtime hooks.
- [x] Make online-service runtime hooks use deterministic first-render state for static desktop hydration.
- [x] Map fast-click desktop online-action failures to product-safe unavailable messages.
- [x] Add a product-language guard for visible UI vendor and implementation labels.
- [x] Remove unused starter assets from the public bundle.
- [x] Add lightweight AI result contract checks.
- [x] Add lightweight project bundle import checks.
- [x] Add lightweight project sync schema checks.
- [x] Add lightweight project sync storage resilience checks.
- [x] Add lightweight local project record checks.
- [x] Add tracked-source secret hygiene checks for API keys and auth tokens.
- [x] Add lightweight safe local save checks.
- [x] Add lightweight fire-and-forget safety checks.
- [x] Add lightweight editor boot resilience checks.
- [x] Add lightweight browser media validation checks.
- [x] Add lightweight media import resilience checks.
- [x] Add lightweight collaboration data validation checks.
- [x] Add lightweight review workspace resilience checks.
- [x] Add lightweight recording resilience checks.
- [x] Add lightweight export preparation resilience checks.
- [x] Add lightweight caption file resilience checks.
- [x] Add lightweight subtitle format resilience checks.
- [x] Add lightweight manual caption cue resilience checks.
- [x] Add lightweight AI image import resilience checks.
- [x] Add lightweight dashboard action resilience checks.
- [x] Add lightweight inspector number resilience checks.
- [x] Add lightweight editor store duration resilience checks.
- [x] Add lightweight editor state transition resilience checks.
- [x] Add lightweight media object URL lifecycle checks.
- [x] Add lightweight composite cleanup resilience checks.
- [x] Add one lightweight verification command for focused checks plus typecheck.
- [x] Add desktop launch verification and Tauri file/export workflow checks.
- [x] Add production telemetry/log review flow without exposing provider details in the UI.
  - [x] Add a provider-neutral production telemetry card for activity, retries, rate limits, safety review, and generated outputs.
  - [x] Remove visible provider/model labels from generation history while keeping internal records available for diagnostics.

## Milestone 8 - Asset And Timeline Management Upgrade

- [x] Add media-bin asset removal that cleans linked timeline layers and stale preview URLs.
- [x] Add undoable media-bin destructive operations with recovery notices.
- [x] Add timeline zoom, track height, and fit-to-project controls.
- [x] Add selected-layer isolate and show-all controls for dense edits.
- [x] Add persistent layer grouping controls.
- [x] Add reusable project templates created from the active timeline.
- [x] Add missing-media filters and batch relink status in the media library.
- [x] Add keyboard-accessible timeline selection and range selection improvements.

## Milestone 9 - Precision Editing And Timeline Workflow

- [x] Add keyboard nudge controls for selected layers across time and tracks.
- [x] Add editable project time markers and marker snapping.
- [x] Add exact start/end/duration editing for multi-layer selections.
- [x] Add group-aware move, trim, hide, and lock commands.
- [x] Add timeline search/filter by layer name, type, group, and media source.
- [x] Add named track lanes for audio, captions, overlays, and media.
- [x] Add layer notes and review handoff metadata.

## Milestone 10 - Review Handoff And Delivery QA

- [x] Add a project review queue for layers needing review, changes, approval, or handoff notes.
- [x] Add timeline filters for review status and noted layers.
- [x] Add a handoff summary export with project settings, markers, layers, notes, and review states.
- [x] Add a pre-export QA checklist for missing media, hidden/muted layers, unapproved review items, and timeline gaps.
- [x] Add export history metadata that captures review state at export time.
- [x] Add dashboard review status chips and filters for project libraries.
- [x] Add lightweight handoff and delivery QA verification checks.

## Milestone 11 - Asset Library And Brand Workflow

- [x] Add media favorites and a favorites filter in the media bin.
- [x] Add media collections for reusable project assets.
- [x] Add reusable layer style presets from the selected layer.
- [x] Add brand typography presets and font pairing controls.
- [x] Add batch replace/reconnect by filename for missing media.
- [x] Add template categories and richer template preview metadata.
- [x] Add lightweight asset-library and brand-workflow checks.

## Milestone 12 - Timeline Precision And Operator Controls

- [x] Add configurable timeline snap intervals for drag, trim, split, and keyboard nudging.
- [x] Add visible timeline ruler labels at adaptive zoom levels.
- [x] Add layer alignment commands for start, end, center, and playhead.
- [x] Add ripple move mode for downstream timeline edits.
- [x] Add selected-layer duration distribution commands.
- [x] Add timeline bookmark navigation controls.
- [x] Add lightweight timeline precision workflow checks.

## Milestone 13 - Caption Authoring And Transcript Workflow

- [x] Add reusable caption cue operations for normalize, shift, split, merge, and removal safety.
- [x] Add a focused cue list editor with per-cue timing and text controls.
- [x] Add cue split, merge, duplicate, and delete commands from the caption editor.
- [x] Add caption timing shift and gap/overlap repair controls.
- [x] Add transcript search, replace, and casing cleanup commands.
- [x] Add caption import conflict preview with replace, merge, and new-layer choices.
- [x] Add lightweight caption authoring workflow checks.

## Milestone 14 - Audio Mixing And Playback Workflow

- [x] Add layer-level volume and fade controls for audio-capable layers.
- [x] Add waveform zoom and selected audio region readouts.
- [x] Add audio ducking presets for voiceover, music bed, and mute-under-video.
- [x] Add audio extraction and replace-audio workflow from selected video layers.
- [x] Add audio-only export preparation and QA messaging.
- [x] Add reusable audio mix presets.
- [x] Add lightweight audio workflow checks.

## Milestone 15 - Visual Effects And Motion Workflow

- [x] Add brightness, contrast, saturation, border, and shadow controls that render in preview and export.
- [x] Add reusable visual effect presets for cinematic, clean product, high contrast, and soft shadow looks.
- [x] Add motion preset metadata for slow zoom, pan left, pan right, and settle animations.
- [x] Add progress bar and timer overlay layers.
- [x] Add freeze-frame still workflow from selected video layers.
- [x] Add transition metadata for fade, slide, and crossfade between adjacent visual layers.
- [x] Add lightweight visual effects workflow checks.

## Milestone 16 - Social Format And Delivery Variants

- [x] Add social format preset metadata for Shorts, Reels, TikTok, feed, portrait, landscape, and wide formats.
- [x] Add canvas resize controls that apply social presets from the creation workflow.
- [x] Add platform safe-zone overlays based on the active social format.
- [x] Add current-frame PNG thumbnail export from the preview canvas.
- [x] Add batch export queue presets for selected social formats.
- [x] Add project variant duplicate workflow for multiple aspect ratios.
- [x] Add lightweight social format workflow checks.

## Milestone 17 - Canvas Framing And Transform Workflow

- [x] Add horizontal and vertical flip controls that render in preview and export.
- [x] Add fit, fill, and stretch framing modes for media layers.
- [x] Add crop rectangle metadata and inspector controls for image/video layers.
- [x] Add selected-layer center, cover, and contain commands.
- [x] Add blurred background fill workflow for vertical or square variants.
- [x] Add lightweight framing workflow checks.

## Milestone 18 - Export Reliability And Queue Workflow

- [x] Surface non-blocking preflight warnings in the export panel.
- [x] Add export history controls for removing single jobs and clearing finished jobs.
- [x] Add batch export cancellation that stops remaining delivery presets.
- [x] Add richer export job details for preset, format, review state, and errors.
- [x] Add lightweight export reliability workflow checks.

## Milestone 19 - Media Health And Recovery Workflow

- [x] Add a shared media health report for available, missing, used, unused, favorite, and recoverable assets.
- [x] Add media health controls that jump directly to useful media-bin filters.
- [x] Add missing-media impact details so users can see affected timeline layers.
- [x] Add recoverable versus reconnect-required status for missing assets.
- [x] Add lightweight media health workflow checks.

## Milestone 20 - Desktop Readiness And Local Workflow

- [x] Add a shared desktop readiness report for browser and desktop runtimes.
- [x] Add a settings surface for desktop import, export, recovery, and online-action status.
- [x] Keep desktop app UI product-safe without vendor implementation labels.
- [x] Add lightweight desktop readiness workflow checks.
- [x] Mark the static desktop file/export workflow check complete.

## Milestone 21 - Project Library Health Workflow

- [x] Add a shared project health report for local project records.
- [x] Add dashboard health filters for ready, attention, and blocked projects.
- [x] Add library health summary counters.
- [x] Show project row health details for recoverable media, reconnect requirements, review items, and empty timelines.
- [x] Add lightweight dashboard project health workflow checks.

## Milestone 22 - Local Snapshot Recovery Workflow

- [x] Add local project snapshot records and validation.
- [x] Add editor checkpoint creation for the active project.
- [x] Add dashboard snapshot counts for local projects.
- [x] Add latest-snapshot restore from the local library.
- [x] Add lightweight local snapshot workflow checks.

## Milestone 23 - Local Trash Recovery Workflow

- [x] Move deleted local projects into a recoverable trash store.
- [x] Preserve project media metadata and snapshot records when moving to trash.
- [x] Add dashboard deleted-project visibility.
- [x] Add restore and permanent-delete controls for local trash.
- [x] Add lightweight local trash workflow checks.

## Milestone 24 - Snapshot Browser And Selective Restore Workflow

- [x] Add local checkpoint deletion for individual snapshots.
- [x] Add a dashboard checkpoint history dialog per project.
- [x] Add selective restore for any available checkpoint.
- [x] Add selective checkpoint removal with dashboard count refresh.
- [x] Add lightweight snapshot browser workflow checks.

## Milestone 25 - Dashboard Folder Organization Workflow

- [x] Load existing project folder assignments into the dashboard library.
- [x] Add folder filtering for all, unfiled, and named folders.
- [x] Show each local project's assigned folder in the library table.
- [x] Add per-project folder assignment and folder creation from the dashboard.
- [x] Add lightweight dashboard folder workflow checks.

## Milestone 26 - Dashboard Bulk Project Workflow

- [x] Add visible-project and per-project selection controls to the local library.
- [x] Add a bulk actions bar for selected local projects.
- [x] Add bulk folder assignment for selected projects.
- [x] Add bulk duplicate and move-to-trash actions using existing local project stores.
- [x] Add lightweight dashboard bulk workflow checks.

## Milestone 27 - Dashboard Bundle Backup Workflow

- [x] Extract shared project-bundle save helpers for editor and dashboard exports.
- [x] Add per-project bundle export from the local dashboard library.
- [x] Add selected-project bundle export from the bulk action bar.
- [x] Preserve sanitized media metadata in exported dashboard bundles.
- [x] Add lightweight dashboard bundle export workflow checks.

## Milestone 28 - Dashboard Folder Management Workflow

- [x] Add reusable folder rename and delete operations to the local collaboration store.
- [x] Remove folder assignments safely when a folder is deleted.
- [x] Add a dashboard folder manager for creating, renaming, and removing folders.
- [x] Show assigned project counts while managing folders.
- [x] Add lightweight dashboard folder management workflow checks.

## Milestone 29 - Dashboard Trash Management Workflow

- [x] Add a full dashboard trash manager for all deleted local projects.
- [x] Add deleted-project selection controls and bulk restore.
- [x] Add bulk permanent delete for selected deleted projects.
- [x] Keep the recent deleted list backed by the same restore and permanent-delete actions.
- [x] Add lightweight dashboard trash management workflow checks.

## Milestone 30 - Product Capability Readiness

- [x] Add a typed product capability registry for implemented, partial, unverified, and missing feature areas.
- [x] Add weighted product readiness scoring by capability area.
- [x] Surface the readiness report in settings without exposing implementation/vendor labels in normal editor UI.
- [x] Add focused readiness checks that fail when registry entries point at removed owner modules.
- [x] Split the product capability registry into area-specific modules if the next parity pass adds more feature entries.

## Milestone 31 - Dashboard Component Simplification

- [x] Extract local project review, folder, and snapshot badges from the dashboard client.
- [x] Extract the recently deleted project list from the dashboard client.
- [x] Update dashboard trash and local trash workflow checks for the new component boundaries.
- [x] Extract dashboard local-library actions into a focused hook or action module.
- [x] Extract signed-in library actions into a focused hook.
- [x] Extract the local library table into a focused presentational component.
- [x] Extract the signed-in project library table into a focused presentational component.
- [x] Split the dashboard current-project and AI workspace cards into focused presentational components.
- [x] Split the dashboard route shell/header into a focused layout component.
- [x] Split the editor store into smaller typed domain slices.
