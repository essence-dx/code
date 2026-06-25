# Changelog

## 2026-05-16 - Hosted Review Link Controls

- Added owner-side hosted review link search, sorting, active filtering, needs-attention filtering, and stale-proof filtering.
- Reused hosted-share freshness reports so proof-attention sorting and stale-proof filtering reflect real release/review evidence state.
- Added focused workflow coverage for hosted review link controls.

## 2026-05-16 - Hosted Review Release Gate

- Added a hosted-review release gate that runs hosted link smoke, stale hosted-share warnings, release packet conflict previews, and the release-operations gate together.
- Marked the hosted review polish and release sharing hardening feature set complete at 100/100.
- Opened the next review handoff runtime UX and evidence recovery feature set.

## 2026-05-16 - Release Packet Import Conflict Preview

- Added release packet import conflict previews for release URL proof, desktop proof, upload verification proof, and profile readiness proof.
- Routed release evidence packet imports through confirmation before overwriting conflicting local evidence.
- Added focused workflow coverage for conflict preview behavior and lightweight verification wiring.

## 2026-05-16 - Hosted Share Freshness Warnings

- Added hosted-share freshness reports that compare each public link issue time against release evidence, desktop proof, and local review proof timestamps.
- Surfaced stale or incomplete hosted-share proof warnings inside the hosted review link manager before release sharing.
- Added focused workflow coverage for hosted-share freshness warnings and lightweight verification wiring.

## 2026-05-16 - Reviewer Audit Packets

- Added reviewer audit packets that combine hosted comments, local comments, download history, approval status, and publish-prep records.
- Added a review-page audit card that can load hosted comments by share URL or token and export one handoff JSON packet.
- Preserved hosted reviewer email identity in comment contracts and audit exports.

## 2026-05-16 - Hosted Review Runtime Smoke

- Added a hosted-review runtime smoke runner for public review loading, comment-enabled access, view-only access, download access comments, revoke, renew, and expiry behavior.
- Added an in-memory hosted review adapter so the link/comment state machine can be checked without a full build or database fixture.
- Added a focused smoke script and started the hosted review polish and release sharing hardening feature set.

## 2026-05-16 - Release Operations Gate

- Added a lightweight release-operations gate that runs review runtime smoke, proof export integrity, maintenance recovery completion, stale review package detection, and release handoff comparison checks together.
- Marked the review runtime automation and release operations feature set complete at 100/100.
- Opened the next hosted review polish and release sharing hardening feature set in TODO.

## 2026-05-16 - Maintenance Recovery Completion

- Added maintenance recovery completion checks for proof refresh, media relink, export retry, and cloud-conflict cleanup lanes.
- Surfaced resolved and pending recovery status in the Settings maintenance queue so actions can be verified after each scan.
- Added a focused workflow check and advanced the review runtime automation feature set.

## 2026-05-16 - Stale Review Package Detection

- Added a review freshness report that detects export QA, media attribution, release evidence, and desktop proof timestamps that moved after review package creation.
- Surfaced review freshness warnings on local export review pages so stale proof can be refreshed before handoff.
- Added a focused workflow check and advanced the review runtime automation feature set.

## 2026-05-16 - Release Operations History

- Added a Settings release operations card that groups release evidence, deployment proof, maintenance evidence, and review handoff proof into one release packet.
- Added saved release operations snapshots with ready, draft, and blocked filtering plus JSON packet export.
- Added a focused workflow check and advanced the review runtime automation feature set.

## 2026-05-16 - Export Review Runtime Smoke

- Added a reusable export review runtime smoke runner covering review load, status updates, comments, downloads, proof export/import, and release handoff comparison.
- Added a collaboration-store adapter so the same smoke path can run against the browser-backed local review store.
- Added a focused smoke script and advanced the review runtime automation feature set.

## 2026-05-16 - Proof And Maintenance Runtime Checks

- Extracted proof-bundle download serialization so exported proof JSON can be parsed and verified by a targeted runtime check.
- Added a focused check for proof-bundle download integrity and maintenance center cleanup/recovery actions.
- Marked the runtime proof hardening feature set complete and opened the next review runtime automation set.

## 2026-05-16 - Release Review Handoff Comparison

- Added a release-to-review handoff comparison that checks review proof bundles against the latest release and desktop evidence.
- Surfaced release handoff match, review, and mismatch evidence on local export review pages.
- Added a focused workflow check and advanced the runtime proof hardening feature set.

## 2026-05-16 - Guided Maintenance Recovery

- Added a typed local recovery queue for stale proof refresh, missing media relink, failed export retry, and reviewed cloud conflicts.
- Surfaced guided recovery actions in Settings and wired failed exports back into the real export queue.
- Added editor recovery messaging, a focused workflow check, and advanced the runtime proof hardening feature set.

## 2026-05-16 - Local Maintenance History

- Added typed maintenance evidence packets for local proof, media, export queue, and cloud-conflict scan results.
- Added saved local maintenance snapshots with ready, draft, and blocked filtering in Settings.
- Added downloadable maintenance evidence packets, a focused workflow check, and advanced the runtime proof hardening feature set.

## 2026-05-16 - Proof Bundle Import And Comparison

- Added proof-bundle JSON validation, local import history, and comparison reports for restored reviewer handoff evidence.
- Wired local review pages to import proof bundles, compare them against the current live review package, and display restored proof when the local review package is missing.
- Added a focused workflow check and advanced the runtime proof hardening feature set.

## 2026-05-16 - Local Maintenance Center

- Added a Settings maintenance center that scans stale proof, unused media, missing sources, failed exports, and cloud-version conflicts.
- Wired cleanup actions for unused current-session media, failed export jobs, and reviewed cloud conflict records.
- Added local cloud conflict history capture, a focused workflow check, marked the export confidence feature set complete, and opened the next hardening set.

## 2026-05-16 - Reviewer Proof Bundles

- Added typed reviewer proof bundles that combine export QA, render route, media attribution, release evidence, desktop evidence, and download history into one handoff record.
- Surfaced proof bundles on local export review pages with a reviewer-facing JSON export action.
- Added a focused workflow check and advanced the export confidence feature set.

## 2026-05-16 - Media Attribution Handoff

- Added typed media attribution metadata and export handoff summaries for stock, self-hosted URL, browser-imported, and desktop-file media used in exports.
- Preserved Wikimedia stock license/credit data and self-hosted URL provenance into media assets, export jobs, local review packages, and review pages.
- Added a focused workflow check and advanced the export confidence feature set.

## 2026-05-16 - Batch Export Readiness

- Added a batch export readiness report that compares selected social deliveries by target size, QA status, and browser/desktop route before batch rendering.
- Wired batch rendering to use delivery-specific conversion settings and refuse blocked batches before starting queued exports.
- Added a focused workflow check and advanced the export confidence feature set.

## 2026-05-16 - Export QA Snapshot Evidence

- Persisted export QA snapshots on queued export jobs with selected format, safe-zone, subtitle, audio, missing-media, and render-route evidence.
- Carried export QA evidence into local review packages and surfaced it on review pages and export history rows.
- Added a focused workflow check and advanced the export confidence feature set.

## 2026-05-16 - Export QA Summary

- Added creator-facing export QA summaries for selected format, safe zones, subtitles, audio, missing media, and render route.
- Wired the summary into the existing pre-export QA dialog so it uses the same selected render plan and browser/desktop handoff decision as the export button.
- Added a focused workflow check, marked the production polish feature set complete, and opened the next export confidence feature set.

## 2026-05-16 - Accessibility Keyboard Coverage

- Added explicit landmarks and labels for the dashboard, editor workspace, media library, timeline, inspector, and release readiness controls.
- Strengthened timeline clip keyboard state with selected-state announcements and descriptive clip labels.
- Added a focused accessibility and keyboard workflow check and wired it into the lightweight verification suite.

## 2026-05-16 - Desktop Proof Freshness

- Added desktop proof freshness reminders for ready, renew-soon, stale, missing, and blocked evidence states.
- Added `desktop:proof:refresh`, a strict refresh command that reuses an existing Tauri debug binary and refuses rebuild fallback.
- Surfaced proof freshness in Settings and covered the workflow with a targeted check.

## 2026-05-16 - Creator QA Sample Fixture

- Added a larger creator QA sample project fixture covering multi-track video, captions, voiceover, stock media, desktop render routing, hosted review links, and upload handoff evidence.
- Added a targeted workflow check and wired it into the lightweight check suite.
- Updated TODO tracking for the production polish feature set.

## 2026-05-16 - Release Evidence History

- Added saved release evidence history with ready, draft, and stale filtering.
- Added pinned release evidence snapshots and one-click re-verification in Settings.
- Updated release readiness checks and TODO tracking for the production evidence lifecycle.

## 2026-05-16 - Desktop Proof Completion

- Captured a ready Tauri desktop relaunch evidence packet with all required launch, persistence, storage, media, native render, and export checks passing.
- Marked the native rendering, hosted sharing, and production verification feature set complete at 100/100.
- Opened the next 100-point production polish, creator QA, and release evidence lifecycle feature set.
- Updated desktop capability evidence to reflect the ready real desktop proof packet.

## 2026-05-16 - Desktop Proof Dev Runner

- Added a `desktop:proof:dev` script that launches Tauri proof mode with desktop verification autopilot enabled.
- Polls for the app-local desktop evidence packet, audits it, and exits blocked unless a ready packet is produced.
- Accepts BOM-prefixed JSON evidence packets so Windows-authored handoff files can still be verified.
- Sets a Windows MSVC no-PDB link flag for proof runs to avoid `LNK1140` before the desktop app can open.
- Checks workspace drive free space before launching Tauri so low-space proof runs fail with an actionable blocker.
- Prefers an existing debug Tauri binary for proof reruns so desktop relaunch evidence can be captured without recompiling Rust.
- Covered the proof runner in the desktop launch workflow check so the last release gate has a repeatable command path.

## 2026-05-16 - Desktop Evidence File Handoff

- Added Tauri app-local JSON evidence writing for desktop verification history.
- Updated desktop proof autopilot so real launch-session checks save both browser history and a handoff file.
- Surfaced the saved desktop evidence file path in Settings and covered the workflow with targeted checks.

## 2026-05-16 - Desktop Proof Autopilot

- Added a hidden desktop proof autopilot that can run real desktop verification from a launch-session opt-in or `?desktopProof=run`.
- Saved autopilot verification reports into the same desktop evidence history used by Settings and release readiness.
- Updated desktop readiness and Tauri workflow checks so launch proof automation remains covered without weakening the release gate.

## 2026-05-16 - Desktop Relaunch Proof Marker

- Added a native Tauri launch-session marker and client-side verification step for desktop proof.
- Required desktop launch evidence to cross separate app launches before it can satisfy release proof.
- Updated desktop readiness, launch-proof, Tauri workflow checks, TODO tracking, and capability evidence.

## 2026-05-16 - Long Script Voiceover Chunking

- Raised the AI voiceover script limit and split longer scripts into provider-safe speech chunks.
- Concatenated generated WAV chunks into one replaceable voiceover audio asset for timeline import.
- Updated voiceover workflow checks and capability evidence for long-script speech generation.

## 2026-05-16 - Local Image Background Removal

- Added a local transparent-background image edit fallback that removes edge-connected background pixels and exports a real transparent PNG.
- Wired background removal to work when image-model providers are unavailable, while keeping provider-backed image edits as the primary path.
- Updated AI image workflow checks and capability evidence for offline transparent-background editing.

## 2026-05-16 - Connected Scene Video Generation

- Added an optional owner-supplied scene video generation adapter for generated video projects.
- Added a signed-in API route, client helper, and AI project review action that imports generated scene videos as real timeline media.
- Updated AI usage/generation records, settings labels, capability evidence, env documentation, and workflow checks for scene video outputs.

## 2026-05-16 - Transparent Composite GIF Export

- Added an alpha-preserving layered transparent GIF export path that renders transparent canvas frames to PNG and encodes them with FFmpeg palette generation.
- Removed the transparent composite GIF preflight blocker now that layered transparent GIFs have a browser export path.
- Updated export reliability checks and capability evidence for layered transparent GIF exports.

## 2026-05-16 - Settings Deployment Prerender Guard

- Moved Settings auth, AI usage, and AI generation loading behind a guarded runtime helper.
- Prevented missing Turso deployment envs from crashing Settings prerender during Vercel builds.
- Updated static export safety checks so Settings keeps the Tauri static path and avoids direct database helper imports.
- Stamped CLI-generated release evidence packets with fresh deployment proof timestamps so deploy screenshots do not verify as stale immediately.
- Relinked the project to the current Vercel account, deployed production to `https://essence-kapwing-blue.vercel.app`, captured a deployed screenshot with `node_repl`, and wrote a local release evidence packet.
- Marked deployed screenshot capability evidence ready after the production URL and screenshot artifact were captured.

## 2026-05-16 - Production Telemetry Review

- Added a provider-neutral production telemetry report for activity review, generation failures, rate limits, safety review, and generated output metadata.
- Added a Settings telemetry card and targeted workflow check so production review is visible without exposing provider or model names in the UI.
- Removed visible provider/model labels from generation history while preserving internal diagnostic records.

## 2026-05-16 - Strict Release Evidence Finalization

- Added strict mode to the release evidence packet writer so production proof generation can fail when the evidence verifier is blocked.
- Added audit status and blocker counts to release packet writer output for CI and handoff automation.
- Updated the Settings release export action to distinguish draft proof from ready proof.

## 2026-05-16 - In-App Evidence Verification

- Surfaced release evidence verifier results in Settings so saved deployment, screenshot, desktop, provider, and database proof is audited before release export.
- Surfaced desktop evidence verifier results in Settings so launch proof clearly shows missing, limited, failed, and stale checks before release handoff.
- Expanded focused release and desktop readiness checks to cover the new in-app verifier surfaces.

## 2026-05-16 - Desktop Evidence Packet Verifier

- Added a desktop evidence packet audit module for ready launch proof, missing requirements, stale proof, failed or limited checks, and malformed packet counts.
- Added a Bun verifier script for exported desktop evidence packets with strict and JSON modes for release handoff automation.
- Added targeted workflow coverage, lightweight check wiring, TODO tracking, and desktop capability evidence for validating real Tauri launch proof packets.

## 2026-05-16 - Release Evidence Packet Verifier

- Added a release evidence packet audit module that checks missing proof, stale proof, blocked gates, warning gates, and embedded desktop evidence consistency.
- Added a Bun verifier script for release evidence packets with JSON output and strict failure behavior for production proof handoff.
- Added targeted workflow coverage, lightweight check wiring, TODO tracking, and capability evidence for release proof verification.

## 2026-05-16 - Release Evidence Packet Writer

- Added a Bun release evidence writer for deployed URL, screenshot proof, and optional desktop evidence packet handoff.
- Extracted a pure release evidence packet payload helper so browser export and CLI packet creation share the same schema.
- Added targeted workflow coverage and TODO/capability tracking for post-deploy release proof generation.

## 2026-05-16 - Deployment Screenshot Artifact Proof

- Added local deployed screenshot artifact paths as valid release screenshot proof alongside public screenshot URLs.
- Updated release evidence capture, import normalization, and Settings proof display for screenshot artifact handoff.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for deploy screenshot proof captured by browser automation.

## 2026-05-16 - Desktop Evidence Import

- Added desktop evidence packet imports to the Desktop app readiness panel.
- Centralized desktop evidence packet parsing and bounded history restoration for exported verification checks.
- Expanded desktop readiness and launch proof workflow checks, TODO tracking, and release-proof handoff coverage.

## 2026-05-16 - Desktop Verification Release Packet Import

- Restored embedded desktop verification evidence when release evidence packets are imported and persisted it into desktop evidence history.
- Updated Settings release proof import to apply the embedded ready desktop check and summarize it with restored storage proof.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for desktop proof round-tripping.

## 2026-05-16 - Upload Evidence Release Packet Import

- Restored self-hosted upload verification evidence when release evidence packets are imported.
- Updated Settings release proof import messaging to summarize restored upload checks and profile readiness checks together.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for full storage proof round-tripping.

## 2026-05-16 - Profile Readiness Release Evidence Import

- Restored self-hosted upload profile readiness evidence when release evidence packets are imported.
- Updated Settings release proof import messaging so restored profile readiness checks are visible immediately.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for round-tripped storage setup proof.

## 2026-05-16 - Profile Readiness Release Evidence Summary

- Included self-hosted upload profile readiness evidence in exported release evidence packets.
- Added a Settings release-readiness summary for profile readiness checks alongside upload handoff evidence.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for storage setup proof in release packets.

## 2026-05-16 - Upload Profile Readiness Evidence Export

- Added exportable and importable JSON evidence packets for self-hosted upload profile readiness checks.
- Updated the recent profile checks panel with compact download/import actions so storage setup proof can move between sessions.
- Expanded upload workflow checks, TODO tracking, and capability evidence for storage handoff review.

## 2026-05-16 - Upload Profile Readiness History

- Added bounded saved readiness history for self-hosted upload provider profiles.
- Updated the upload dialog to persist profile readiness checks and show recent results for the selected storage profile.
- Expanded upload workflow checks, TODO tracking, and capability evidence for repeat creator-owned storage validation.

## 2026-05-16 - Self-Hosted Upload Profile Readiness

- Added CORS and public URL readiness checks for saved self-hosted upload profiles.
- Added a profile readiness panel in the upload dialog with secure URL, derived public URL, and browser HEAD probe results.
- Expanded upload workflow checks, TODO tracking, and capability evidence for creator-owned storage setup validation.

## 2026-05-16 - Self-Hosted Upload Provider Presets

- Added signed upload provider presets for generic PUT, Cloudflare R2, S3-compatible, Supabase Storage, Firebase Storage, and Bunny Storage targets.
- Extended reusable upload profiles with provider preset metadata while keeping one-time signed upload URLs out of storage.
- Updated upload dialog placeholders, workflow checks, TODO tracking, and capability evidence for common user-owned storage handoffs.

## 2026-05-16 - Release Upload Evidence Summary

- Added self-hosted upload evidence summaries to the release readiness panel.
- Included upload verification evidence in exported release evidence packets alongside deployment and desktop proof.
- Expanded release readiness workflow checks, TODO tracking, and capability evidence for creator-owned media handoff review.

## 2026-05-16 - Self-Hosted Upload Evidence Import

- Added self-hosted upload evidence packet imports so creator storage proof can be restored across browser sessions.
- Updated the recent upload checks panel with a compact import action and refreshed dialog state after successful imports.
- Expanded workflow checks, TODO tracking, and capability evidence for upload evidence roundtrips.

## 2026-05-16 - Self-Hosted Upload Evidence Export

- Added exportable JSON evidence packets for self-hosted upload verification history.
- Added a compact download action to recent upload checks so creator-owned storage handoff proof can be saved without exposing signed upload URLs.
- Expanded self-hosted upload workflow checks, TODO tracking, and capability evidence for release handoff review.

## 2026-05-16 - Self-Hosted Upload Verification History

- Added bounded local upload verification history for creator-owned storage handoffs.
- Verified uploaded public media URLs with a CORS-safe HEAD check and recorded verified, limited, or failed outcomes without storing signed upload URLs.
- Surfaced recent upload checks inside the self-hosted upload dialog and expanded workflow/capability/TODO tracking.

## 2026-05-16 - Self-Hosted Upload Profiles

- Added reusable local storage profiles for user-owned media uploads without saving one-time signed upload URLs.
- Updated the upload dialog to derive public media URLs from saved public folder origins, save new profiles, and remove stale profiles.
- Expanded the self-hosted upload workflow check, TODO tracking, and capability evidence for repeat storage publishing.

## 2026-05-16 - Self-Hosted Upload Handoff

- Added a user-owned signed upload workflow that uploads browser, desktop, or linked media to creator-controlled storage with a signed PUT URL.
- Converted successfully uploaded media into self-hosted URL assets so synced projects can reopen the media across devices without storing large files in project metadata.
- Added media-card upload controls, a shadcn dialog for upload/public URLs, capability evidence, TODO tracking, and a targeted self-hosted upload workflow check.

## 2026-05-16 - Deployment Release Preflight

- Added a deployment release preflight checklist for hosting linkage, feature-batch publishing, deployed URL proof, screenshot proof, and release evidence export.
- Surfaced the preflight in Settings so the remaining deployed screenshot blocker is actionable without pretending runtime proof already exists.
- Added a targeted deployment release preflight workflow check and capability evidence while keeping the real Vercel deploy and screenshot unresolved until a big feature release.

## 2026-05-16 - Desktop Launch Preflight

- Added a desktop launch preflight checklist that turns missing proof into the exact Tauri app workflow: launch, import local media, reopen project, and save native export.
- Surfaced the preflight in Settings beside saved desktop evidence so release blockers are actionable before the real desktop launch.
- Added a targeted desktop launch preflight workflow check and TODO tracking while keeping the actual Tauri launch proof unresolved until runtime verification is performed.

## 2026-05-16 - Connected Video Enhancement

- Added an optional owner-supplied video enhancement route for stabilization, eye-contact, and lip-sync workflows.
- Added editor-side video enhancement controls and import flow that stay disabled unless a real connected service is configured.
- Updated AI generation records, usage actions, env documentation, capability evidence, and TODO tracking for connected video enhancement.

## 2026-05-16 - Connected Audio Restoration

- Added an optional owner-supplied advanced audio restoration route for heavier voice isolation, room echo reduction, speech enhancement, and noise reduction.
- Added editor controls that keep local cleanup as the default while exposing the connected service only when it is configured.
- Updated audio cleanup workflow checks, capability evidence, env documentation, and TODO tracking for the new restoration adapter.

## 2026-05-15 - Workspace Invite Email Drafts

- Added free email-draft generation for signed-in workspace invitations using the user's own email client.
- Added an Email action beside copy and revoke controls for pending signed-in invites.
- Updated collaboration capability evidence and TODO tracking so invitation emails no longer require a paid provider default.

## 2026-05-15 - Desktop Launch Proof Gate

- Added a desktop launch proof summary that verifies project reopen, storage, media, render, file-backed media, and native export output checks.
- Updated the Settings desktop card to show launch proof coverage from saved desktop evidence.
- Tightened release evidence import so desktop proof must include the required launch workflow checks, not just a ready status flag.

## 2026-05-15 - Editor Store Domain Split

- Split editor history commands into a dedicated typed state slice.
- Moved core project commit and layer-writing helpers out of the store entrypoint.
- Kept the editor store as a slimmer composition layer while preserving existing playback, undo/redo, and layer creation behavior.

## 2026-05-15 - Fresh Release Gate Proof

- Tightened the release readiness gate so stale deployment or desktop proof stays visible but no longer satisfies production readiness.
- Added a release evidence readiness helper and wired Settings release checks to fresh proof status instead of raw saved values.
- Updated targeted release workflow checks and TODO tracking for stale-proof gate behavior.

## 2026-05-15 - Release Evidence Freshness

- Added stale-proof detection for release evidence so old deployment and desktop proof is visibly marked before release.
- Updated the Settings release evidence summary with Ready, Missing, and Stale states.
- Updated release workflow checks, capability evidence, and TODO tracking for proof freshness.

## 2026-05-15 - Release Evidence Completeness

- Added a release evidence completeness summary for deployed app URL, deployed screenshot proof, and desktop proof.
- Updated the Settings release readiness card to show which proof pieces are ready or missing before export.
- Updated release workflow checks, capability evidence, and TODO tracking for proof completeness visibility.

## 2026-05-15 - Release Evidence Packet Import

- Added import support for exported release evidence packets in Settings.
- Added release evidence packet schema metadata and safe packet parsing for deployment and desktop proof restoration.
- Updated release readiness checks, capability evidence, and TODO tracking for full proof packet round-tripping.

## 2026-05-15 - Paired Deployment Release Proof

- Tightened deployment release proof so local evidence requires both a deployed app URL and deployed screenshot URL.
- Added environment support for deployed app URL proof alongside screenshot proof.
- Updated release readiness checks, capability evidence, and TODO tracking for paired deployment proof.

## 2026-05-15 - Desktop Evidence Packet Import

- Added release-readiness import for exported desktop verification evidence packets.
- Added packet parsing that selects the newest ready desktop verification entry and turns it into release proof.
- Updated release workflow checks, capability evidence, and TODO tracking for cross-session desktop proof reuse.

## 2026-05-15 - Verified Desktop Release Proof

- Replaced manual desktop release verification with proof tied to a saved ready desktop verification entry.
- Added desktop verification ID, timestamp, and step-count metadata to release evidence packets.
- Updated release readiness checks, capability evidence, and TODO tracking for stricter desktop proof.

## 2026-05-15 - Deployment URL Release Evidence

- Added a separate deployed app URL field to release evidence so Vercel deployment proof is tracked apart from screenshot proof.
- Updated the Settings release readiness card to save, display, clear, and export deployed app URLs with the release evidence packet.
- Updated release readiness workflow checks, capability evidence, and TODO tracking for deployment URL proof.

## 2026-05-15 - Desktop Verification Release Evidence

- Connected saved desktop verification history to the release readiness gate so ready desktop checks can count as release proof.
- Added a Settings action to reuse the latest ready desktop check and include it in exported release evidence packets.
- Updated release readiness checks, capability evidence, and TODO tracking for desktop verification evidence reuse.

## 2026-05-15 - Release Evidence Capture

- Added local release evidence storage for deployed screenshot URLs and desktop launch verification proof.
- Updated the Settings release readiness card with save, clear, and export controls for release proof packets.
- Extended release readiness workflow checks and capability evidence for saved proof and exportable release evidence.

## 2026-05-15 - Release Readiness Gate

- Added a release readiness report that gates production claims on product capability score, desktop launch proof, deployed screenshot proof, AI provider setup, and Turso database setup.
- Added a Settings release readiness card with progress, blocked/warning/ready gate states, and next checkpoint guidance.
- Added a targeted release readiness workflow check and included it in the lightweight check sequence.

## 2026-05-15 - Adjustable Audio Cleanup Strength

- Added a shadcn slider for local AI audio cleanup strength across noise reduction, voice isolation, room echo reduction, and speech enhancement modes.
- Routed cleanup strength into the local DSP profile scaling, output summary, and signed-in generation history payload.
- Updated AI audio cleanup workflow checks, capability evidence, and TODO tracking for the new control.

## 2026-05-15 - Image-Source AI Video Projects

- Added screenshot/storyboard image-source import for AI video-project generation from the assistant panel.
- Routed image-source video projects through Vercel AI SDK multimodal messages and AI Gateway vision model configuration instead of the Groq text-only default.
- Updated AI video project workflow checks, capability evidence, and TODO tracking for the new image-source path.

## 2026-05-15 - AI Scene Image Resilience

- Made AI video-project scene image creation resilient to partial provider failures, saving and placing successful scene images while keeping generated text-layout scenes for failures.
- Added generated scene image success/failure counts to the review summary and local project creation message.
- Updated AI video project workflow checks, capability evidence, and TODO tracking for partial scene image recovery.

## 2026-05-15 - AI Scene Image Placement

- Added generated scene-image slots for AI video projects with prompt plans derived from each scene's visual direction, caption context, aspect ratio, and palette.
- Added an AI scene image creation path in the generated project review that uses the existing image model route, saves real returned assets, and places them into the generated timeline.
- Updated AI video project workflow checks, capability evidence, and TODO tracking for provider-backed scene image placement without fake media.

## 2026-05-15 - Speech Enhancement Audio Cleanup

- Added a local speech-enhancement audio cleanup mode with a distinct DSP profile for clearer dialogue, softer background gating, and balanced loudness.
- Reused the existing cleanup control surface, WAV output path, before/after preview, and signed-in generation history contract for the new mode.
- Updated AI/audio capability evidence, TODO tracking, and targeted audio cleanup workflow coverage.

## 2026-05-15 - Embedded-OCR PDF Source Intake

- Added embedded OCR/ActualText and UTF-16 hex PDF text extraction for AI article/PDF-to-video source import.
- Carried source extraction mode into generated video-project prompts so the assistant can distinguish plain text, HTML, selectable PDF text, and embedded-OCR PDF text.
- Updated AI video project workflow checks, capability evidence, and TODO tracking for stronger PDF-to-video intake.

## 2026-05-15 - AI Video Source Intake

- Added article/text/transcript/selectable-PDF source import for AI video-project prompts with bounded client-side extraction.
- Added generated project scene-media placement so B-roll queries can pull matching free stock clips into the saved AI video project timeline.
- Updated AI video project checks, capability evidence, and TODO tracking for richer article/PDF-to-video workflows.

## 2026-05-15 - Transparent GIF Sticker Export

- Added a transparent GIF sticker preset and workflow for single-source GIF exports.
- Routed eligible transparent GIFs through alpha-preserving FFmpeg palette generation while blocking unsupported layered transparent GIF exports with a clear preflight message.
- Updated export/GIF checks, capability evidence, and TODO tracking for the transparent GIF route.

## 2026-05-15 - GIF Thumbnail Strip

- Added browser-safe source-frame thumbnail extraction for GIF workflow frame samples using video/image media and canvas.
- Updated the GIF frame strip to show rendered thumbnails when available, with a graceful unavailable state for media that cannot be sampled.
- Updated GIF workflow checks, capability evidence, and TODO tracking for the thumbnail extraction path.

## 2026-05-15 - GIF Frame Strip

- Added a GIF frame preview planner that calculates export FPS, frame count, trim bounds, sampled frame times, and GIF transparency route status.
- Added a shadcn-based frame strip to the GIF workflow panel so creators can scrub trim start by frame and jump the editor playhead to sampled frame positions.
- Updated GIF workflow checks, capability evidence, and TODO tracking for the richer GIF editing path.

## 2026-05-15 - Heavy Export Desktop Routing

- Added render budget rules that require the desktop renderer for very long, frame-heavy, or layer-heavy composite exports instead of allowing unsafe browser attempts.
- Updated the export route badge and handoff workflow checks so creators see when desktop is required versus merely recommended.
- Updated product capability evidence and TODO tracking for the stronger long-export handoff path.

## 2026-05-15 - Desktop Workflow Smoke

- Added a native desktop workflow smoke command that validates file-backed media write/reopen cleanup and desktop export output creation.
- Wired the workflow smoke report into the Settings desktop verification runner alongside local project persistence and runtime diagnostics.
- Updated desktop capability evidence, TODO tracking, and targeted Tauri/readiness checks for the stronger desktop workflow proof path.

## 2026-05-15 - Desktop Verification Export

- Added a downloadable desktop verification evidence packet for saved readiness checks.
- Updated the Settings desktop readiness card with an evidence export action using the existing shadcn control surface.
- Updated desktop capability evidence, TODO tracking, and targeted readiness checks for release/debug proof exports.

## 2026-05-15 - Desktop Verification Evidence

- Added a local verification history store that keeps the latest desktop readiness evidence across Settings reloads.
- Updated the Settings desktop readiness card to save each combined verification run and show recent ready, limited, and failed step counts.
- Updated desktop capability evidence, TODO tracking, and targeted readiness checks for the saved evidence trail.

## 2026-05-15 - Desktop Verification Runner

- Added a combined desktop verification runner that checks native readiness and performs a real local project save, reopen, validation, and cleanup roundtrip.
- Updated the Settings desktop readiness card to run the combined verification workflow while keeping product copy implementation-neutral.
- Updated desktop capability evidence, TODO tracking, and targeted workflow coverage for the new project persistence self-test.

## 2026-05-15 - Native Render Smoke Diagnostics

- Added a native render smoke path that runs through the desktop renderer and creates either a real media output or a compositor handoff manifest.
- Wired the smoke result into desktop diagnostics so Settings can distinguish ready native output from limited manifest-only fallback.
- Updated desktop readiness evidence, TODO tracking, and targeted Tauri checks for render smoke coverage.

## 2026-05-15 - Desktop Runtime Diagnostics

- Added a desktop diagnostics command that checks local workspace storage, media/font library preparation, native render spool write/read access, and optional native media engine availability.
- Added a settings self-test control that runs the diagnostics from the app and reports ready, limited, or failed checks without exposing implementation/vendor names in the product UI.
- Updated desktop readiness evidence, TODO tracking, and targeted desktop/Tauri workflow checks for the new runtime verification path.

## 2026-05-15 - Native Font Export Mapping

- Added Tauri AppLocalData persistence for uploaded brand font files so desktop exports can read the same custom fonts used in the editor.
- Passed brand font metadata through the native render graph and mapped matching text-layer font families to FFmpeg `fontfile` options.
- Updated project sync validation, capability evidence, and targeted brand/native render workflow checks for browser and desktop font sources.

## 2026-05-15 - Brand Font Assets

- Added local-first custom brand font upload for TTF, OTF, WOFF, and WOFF2 files with IndexedDB-backed persistence.
- Added automatic `FontFace` loading in the editor so uploaded fonts can be used by brand typography presets and canvas text rendering.
- Added Tauri CSP support for blob-loaded fonts, native render graph font metadata, and targeted brand font workflow coverage.

## 2026-05-15 - Workspace Invitation Acceptance

- Added signed-in workspace invitation acceptance links that convert pending invitations into active workspace members.
- Added a dedicated invitation page and typed client acceptance flow with clear sign-in and wrong-email failure states.
- Added copyable invitation links to the cloud workspace access panel so teams can invite without a paid email provider.

## 2026-05-15 - Server Workspace Access

- Added Turso-backed workspace members, invitations, project permission overrides, folder visibility, and workspace audit events for signed-in projects.
- Added a signed-in workspace access API and shadcn-based cloud access panel inside the review workspace.
- Added a targeted server workspace access workflow check and kept verification lightweight with typecheck.

## 2026-05-15 - Workspace Access Controls

- Added local workspace invitations, project-specific access overrides, private folder metadata, assignment access modes, and local audit events.
- Added a focused shadcn-based access panel in the review workspace for pending invites, project access, and audit history without bloating the main dialog.
- Updated workspace activity metrics, collaboration capability evidence, and targeted workflow coverage while keeping full deployment/Tauri verification gated.

## 2026-05-15 - Safe Cloud Sync Conflicts

- Added a project sync conflict model that compares the client's last known cloud revision with the signed-in library revision before saving.
- Returned clean conflict responses for stale saves, added client-side conflict errors, and made editor/dashboard sync messaging avoid silent overwrites.
- Recorded forced cloud syncs distinctly in version labels and audit details, then updated collaboration readiness evidence.

## 2026-05-15 - Workspace Activity Reporting

- Added a local workspace activity report for members, folders, export reviews, downloads, publish-prep records, unresolved review comments, and recent exports.
- Added a settings activity card that combines team activity, export history, and signed-in AI usage/generation counts.
- Updated collaboration readiness evidence and marked the team usage/history view backlog item complete.

## 2026-05-15 - Brand Kit Enforcement

- Added persistent brand kit settings for default colors, default typography, imported logo assets, and enforcement toggles.
- Added a shadcn-based brand kit panel that can choose logo assets, place a logo on the canvas, and apply brand defaults to selected layers.
- Routed editor templates through brand kit defaults and added targeted workflow coverage for schema, store, template, and UI wiring.

## 2026-05-15 - Anchored Review Comments

- Added normalized project comment anchors for playhead timestamps, timeline ranges, selected layers, and canvas percentage positions.
- Added review workspace controls for creating anchored comments and displaying compact anchor labels.
- Extended local/Turso comment metadata and collaboration capability evidence, then added targeted workflow coverage.

## 2026-05-15 - Expanded Converter Formats

- Added first-class export presets and metadata for MOV, AVI, MPEG, JPG, WebP, MP3, and M4A alongside the existing MP4, WebM, GIF, PNG, WAV, and project bundle paths.
- Wired expanded converter routing through browser FFmpeg, still-frame canvas export, native FFmpeg format handling, save-dialog metadata, and publish-prep compatibility.
- Updated export reliability, native-render, and export-output workflow checks for the broader format set.

## 2026-05-15 - Local Vocal Stem Splitting

- Added a local stereo mid-side splitter that creates separate voice and instrumental WAV stem files from imported audio.
- Added audio mix panel controls that save both stems into browser media storage and place them on adjacent timeline tracks.
- Shared WAV encoding between audio cleanup and stem splitting, then expanded targeted audio workflow checks.

## 2026-05-15 - Analyzed Audio Auto-Ducking

- Added dialogue-aware auto-ducking that detects voice regions from overlapping timeline layers and waveform peaks.
- Added a store action that splits a selected music layer into normal and lowered-volume ducked segments.
- Added an audio mix panel control and targeted workflow coverage for applying analyzed ducking without full builds.

## 2026-05-15 - Beat Marker Audio Sync

- Added waveform-peak beat marker detection for audio layers.
- Added generate and clear controls in the audio mix panel for timeline beat markers.
- Reused timeline marker snapping so layer movement can snap near generated beats.

## 2026-05-15 - Stock Music And SFX Library

- Added curated free stock-audio search presets for ambient music, upbeat beds, whooshes, clicks, and applause.
- Added direct audio timeline import from stock search with music/SFX mix defaults and attribution notes.
- Added automatic Music & SFX collection tagging for imported stock audio and expanded stock workflow coverage.

## 2026-05-15 - Brand-Aware Template Assets

- Added brand-color-aware template instantiation so stock templates can inherit the active project palette.
- Added a reusable outro CTA template and wired intro and lower-third templates to brand colors.
- Updated template filtering, brand capability evidence, and asset-brand workflow coverage for intro/outro/lower-third assets.

## 2026-05-15 - Advanced Audio Cleanup Modes

- Added selectable local audio cleanup profiles for noise reduction, voice isolation, and room echo reduction with separate DSP chains.
- Added before/after preview controls with peak and noise-floor metrics for the latest generated cleanup asset.
- Updated audio cleanup history metadata, capability evidence, and targeted workflow coverage for the expanded cleanup path.

## 2026-05-15 - AI Image Edit Modes

- Added structured AI image edit modes for mask inpaint, outpaint, background removal, legal cleanup, and text translation.
- Added source-mask creation from selected image-layer object masks and passed masks through the AI SDK image-edit request path.
- Added image edit controls for outpaint presets and target language, plus edited-image metadata and targeted workflow checks.

## 2026-05-15 - Motion Tracking Attachments

- Added tracking attachment metadata so text and sticker layers can follow media layer centers or tracked object-mask centers.
- Added a tracking attachment inspector panel with target region, offset, detach, and scale-follow controls.
- Wired tracked transforms through preview, browser composite export, project sync validation, native render graph metadata, and targeted workflow checks.

## 2026-05-15 - Speed Ramp Native Export

- Added normalized speed metadata and source-duration planning to the native render graph so export jobs preserve timeline speed intent.
- Wired Tauri FFmpeg rendering for reverse video, linear speed-ramp PTS mapping, reversed audio, tempo adjustment, and pitch-control fallbacks.
- Expanded speed and native-render workflow checks to cover speed graph serialization and FFmpeg filter wiring.

## 2026-05-15 - Transparent PNG Export

- Added a transparent PNG export preset and a background-mode conversion setting for feasible alpha-background still exports.
- Wired transparent-background PNG rendering through the browser canvas path and the Tauri native FFmpeg render graph.
- Expanded export and native-render workflow checks to cover transparent-background planning and alpha-preserving PNG output arguments.

## 2026-05-15 - Inspector Panel Section Split

- Extracted text/name controls, caption import/export editing, media/audio workflows, and motion/effects controls from `inspector-panel.tsx`.
- Reduced `inspector-panel.tsx` from 341 lines to 124 lines while preserving the same selected-layer composition flow.
- Marked the active inspector simplification backlog complete after lightweight typecheck and editor smoke verification.

## 2026-05-15 - Editor Store Slice Completion

- Extracted layer creation, freeze-frame, audio extraction/replacement, sticker, meme, media layout, and AI caption actions into `editor-layer-creation-slice.ts`.
- Extracted reusable timeline template actions into `editor-template-slice.ts` and style/audio/typography/brand-color actions into `editor-preset-brand-slice.ts`.
- Reduced `editor-store.ts` to a focused 222-line Zustand composition file and marked the editor store split complete in the active backlog.

## 2026-05-15 - Editor Store Utility Split

- Moved shared editor store selection, timeline, preset, media cleanup, and normalization helpers into `editor-store-utils.ts`.
- Reduced `editor-store.ts` from 990 lines to 676 lines while keeping the Zustand store focused on state wiring and action orchestration.
- Updated the active simplification backlog with the next remaining slice targets for layer creation, presets, templates, and brand color actions.

## 2026-05-15 - Native FFmpeg Media Inputs

- Added native FFmpeg planning for Tauri filesystem and self-hosted media inputs, including app-local desktop media resolution.
- Added trim-aware video/image overlay composition from the render graph and timeline-positioned audio mixing with volume, delay, and fade filters.
- Updated native render workflow coverage, desktop capability evidence, and kept the active set at 99/100 pending real desktop launch verification.

## 2026-05-15 - Native FFmpeg Overlay Filters

- Added graph-driven FFmpeg `drawtext` overlays for text, subtitle, and timer layers in native desktop renders.
- Added FFmpeg `drawbox` overlays for shape, sticker, and progress layers using render-graph timing, transforms, colors, and opacity.
- Added a targeted FFmpeg filter smoke check on the local machine and kept native compositing at 99/100 until media-file inputs and audio mixing are wired.

## 2026-05-15 - Native FFmpeg Output Path

- Added native FFmpeg probing through `ESSENCE_FFMPEG_PATH` or the system `ffmpeg` binary for desktop render jobs.
- Added cancellable FFmpeg process execution that writes actual MP4, WebM, GIF, PNG, or WAV output files when FFmpeg is available, while preserving the compositor manifest fallback when it is not.
- Updated native render workflow coverage, desktop capability evidence, and moved the native rendering hosted sharing set to 99/100.

## 2026-05-15 - Native Render Graph Handoff

- Added a typed native render graph that serializes visible layers, timing, transforms, styles, effects, and referenced media into the desktop render request.
- Embedded the graph in the native compositor manifest so the next FFmpeg worker has project content data instead of only output metadata.
- Updated native render workflow coverage, desktop capability evidence, and moved overall Kapwing parity to 99/100.

## 2026-05-15 - Native Render Manifest Spool

- Added real desktop filesystem output for the native render adapter by writing a compositor manifest artifact instead of returning a synthetic `native-render://` placeholder.
- Added manifest metadata for the requested output, timeline dimensions, layer count, native FFmpeg handoff status, artifact kind, and original requested export format.
- Updated native render workflow coverage, desktop capability evidence, and moved overall Kapwing parity to 98/100.

## 2026-05-15 - Multi-Take Recording Review

- Added a recorded-take review panel with A/B selection, video/audio previews, duration and size comparison, and layout selection.
- Added best-take promotion from the review panel onto the timeline, including favorite marking for promoted takes.
- Updated recording workflow coverage, visible-control evidence, capability evidence, and moved overall Kapwing parity to 97/100.

## 2026-05-15 - Studio Screen And Camera Recording

- Added a browser recording adapter that captures screen and camera together, composites them into a canvas stream, and mixes screen/camera audio.
- Added the Studio recording action to the editor recorder so full-frame, picture-in-picture, and split layouts can be recorded as a single take.
- Updated recording resilience coverage, visible-control evidence, capability evidence, and moved overall Kapwing parity to 96/100.

## 2026-05-15 - Recording Layout Presets

- Added recorded-take management that files captures into a dedicated media collection.
- Added timeline placement presets for full-frame, picture-in-picture, and left/right split screen or camera recordings.
- Updated recording workflow coverage, store layer insertion options, capability evidence, and moved overall Kapwing parity to 95/100.

## 2026-05-15 - Recording Studio Controls

- Added recording countdown presets, cancelable countdown flow, teleprompter notes, pause/resume controls, and retake/discard handling to the recorder.
- Expanded the recording resilience check and visible-control/capability evidence so the studio controls stay wired.
- Updated the active recording todo breakdown and moved overall Kapwing parity to 94/100.

## 2026-05-15 - Timeline Voiceover Recording

- Added an audio-only voiceover recording mode alongside screen and camera recording.
- Saved voiceover captures as local audio assets and inserted them directly onto a new timeline audio track at the current playhead.
- Updated recording workflow coverage, audio capability evidence, and moved overall Kapwing parity to 93/100.

## 2026-05-15 - Advanced Crop And Mask Shapes

- Added crop aspect presets, crop focus controls, and media mask shape buttons for square, rounded, pill, and circular layer masks.
- Updated composite rendering so rounded image/video masks export with the same clipping behavior as the preview canvas.
- Updated framing workflow coverage, core editor capability evidence, and moved overall Kapwing parity to 92/100.

## 2026-05-15 - Batch Media Operations

- Added a focused media-bin batch action panel for filtered collection assignment, prefix rename, and unused-media cleanup.
- Kept batch behavior tied to real project usage and collection state so already-filed media is not toggled out accidentally.
- Updated core editor capability evidence and moved overall Kapwing parity to 91/100.

## 2026-05-15 - Self-Hosted Media Adapter

- Added a self-hosted URL media source so creators can link direct CORS-enabled files from storage they control without moving large media into Turso.
- Added the media-bin URL import dialog, project reopen recovery, sync schema preservation, render preflight support, and browser/composite renderer loading for self-hosted media.
- Updated platform capability evidence, moved the native rendering/hosted sharing/production verification set to 95/100, and moved overall Kapwing parity to 90/100.

## 2026-05-15 - Cloud Version Restore And Audit History

- Added Turso-backed project version and audit event tables so signed-in syncs create restorable cloud checkpoints beyond local browser snapshots.
- Added cloud version list and restore APIs, dashboard version history UI, restore controls, and sync/restore/delete audit entries for signed-in project metadata.
- Added workflow coverage, updated collaboration capability evidence, moved the native rendering/hosted sharing/production verification set to 90/100, and moved overall Kapwing parity to 89/100.

## 2026-05-15 - Native Render Adapter

- Added a Tauri-native render job adapter with start/status/cancel commands, typed progress state, cancellation, and output metadata for long desktop-route exports.
- Added a TypeScript native render adapter that the export panel can call when the render handoff planner selects the desktop route, plus workflow coverage for the command contract and frontend integration.
- Updated desktop capability evidence, moved the native rendering/hosted sharing/production verification set to 80/100, and moved overall Kapwing parity to 88/100.

## 2026-05-15 - Hosted Review Link Management

- Added owner-side hosted link management with list, copy, permission changes, 30-day renewal, and revoke actions from the review workspace share tab.
- Added a PATCH path for authenticated hosted review link updates, typed client helpers, and workflow coverage for revoke/renew/permission management.
- Updated collaboration capability evidence, moved the native rendering/hosted sharing/production verification set to 60/100, and moved overall Kapwing parity to 87/100.

## 2026-05-15 - Hosted Review Comments

- Added a Turso-backed hosted review comments table tied to hosted links and projects, with reviewer name/email capture, comment body validation, optional scene anchors, and future resolution metadata.
- Added public hosted comment API routes, typed client helpers, and a real reviewer comment form on `/share/[token]` with refresh, validation, saved comment display, and disabled states for expired or view-only links.
- Added workflow coverage, updated collaboration capability evidence, moved the native rendering/hosted sharing/production verification set to 40/100, and moved overall Kapwing parity to 86/100.

## 2026-05-15 - Hosted Review Link Metadata

- Added a Turso-backed hosted review link table with tokens, permissions, expiry, enabled state, project ownership, and export metadata.
- Added authenticated review-link API routes, a public `/share/[token]` hosted review metadata page, and a review-workspace action that creates and copies comment-only hosted links for synced projects.
- Added workflow coverage, updated collaboration capability evidence, moved the native rendering/hosted sharing/production verification set to 20/100, and moved overall Kapwing parity to 85/100.

## 2026-05-15 - Operational Readiness View

- Added an operational readiness report that combines local project health, missing media, current export failures, online account/API availability, and daily AI limit state.
- Added a settings card that loads local project health from IndexedDB, reads current export jobs, and shows actionable readiness signals without exposing provider implementation details.
- Added workflow coverage, updated platform capability evidence, completed the collaboration/publishing/desktop hardening set at 100/100, defined the next native rendering/hosted sharing/production verification set, and moved overall Kapwing parity to 84/100.

## 2026-05-15 - Team-Lite Workspace Permissions

- Added a shared workspace permission model for owner, editor, and viewer roles across comments, comment resolution, folders, review links, member management, and export history.
- Enforced permissions in the local collaboration store when a role is supplied and surfaced the active access level in the review workspace dialog.
- Added workflow coverage, updated collaboration capability evidence, moved the collaboration/publishing/desktop hardening set to 80/100, and moved overall Kapwing parity to 83/100.

## 2026-05-15 - Desktop Render Handoff

- Added a typed render handoff planner that detects long timelines, many layers, high-resolution output, large frame counts, and desktop-only media before export.
- Surfaced browser-versus-desktop route guidance directly in the export footer and blocked browser attempts when a project still depends on desktop-only media.
- Added desktop readiness and workflow coverage, updated desktop capability evidence, moved the collaboration/publishing/desktop hardening set to 60/100, and moved overall Kapwing parity to 82/100.

## 2026-05-15 - User-Owned Publish Prep

- Added publish-prep targets for YouTube, TikTok, Instagram, LinkedIn, and cloud drives with explicit user-owned credential requirements.
- Added local publish-prep records on export review pages, including platform checklist status for rendered file availability, approval, accepted format, and credentials.
- Added workflow coverage, updated publishing capability evidence, moved the collaboration/publishing/desktop hardening set to 40/100, and moved overall Kapwing parity to 81/100.

## 2026-05-15 - Local Export Review Pages

- Added local export review packages for completed jobs with persisted approval status, rendered-file metadata, QA snapshots, comments, and download-history records.
- Added a `/review/[reviewId]` page and an export-panel action that opens a local review page for completed exports without pretending to publish to a cloud service.
- Added workflow coverage, updated export-delivery capability evidence, moved the collaboration/publishing/desktop hardening set to 20/100, and moved overall Kapwing parity to 80/100.

## 2026-05-15 - Creator Starter Workflows

- Added starter workflow presets for gaming highlights, podcast clips, education lessons, marketing launches, and product demos.
- Added a starter workflow panel that resizes the project to the right platform canvas, adds editable templates, and queues the recommended export preset.
- Added workflow coverage, updated capability evidence, completed the creator formats and social delivery set at 100/100, defined the next collaboration/publishing/desktop hardening set, and moved overall Kapwing parity to 79/100.

## 2026-05-15 - Platform Safe-Zone Presets

- Expanded social format presets with exact LinkedIn feed/banner, Instagram Reels/feed, TikTok, YouTube Shorts/video/thumbnail/banner, and wide banner canvases.
- Updated social format application so the current project can resize into the chosen platform canvas and the preview safe-zone overlay follows the exact active social format instead of only the aspect ratio.
- Added social workflow coverage, updated delivery capability evidence, moved the creator formats and social delivery set to 80/100, and moved overall Kapwing parity to 78/100.

## 2026-05-15 - GIF Editing Workflows

- Added dedicated GIF workflow presets for trim, square crop, GIF collage, GIF-to-MP4, MP4-to-GIF, and color-styled GIF effects.
- Added a GIF tools panel that creates real editable layers, applies trim/crop/color patches, builds collage layouts, sets the target aspect ratio, and queues the matching export preset.
- Added workflow coverage, updated capability evidence, moved the creator formats and social delivery set to 60/100, and moved overall Kapwing parity to 77/100.

## 2026-05-15 - Image Creation Tool Presets

- Added dedicated image creation presets for photo collage, photo grid, thumbnail, banner, wallpaper, and image resize workflows.
- Wired the layout panel to apply image-tool aspect ratios, editable media layers, asset limits, and export-preset hints instead of relying on generic layout controls only.
- Added workflow coverage, updated capability evidence, moved the creator formats and social delivery set to 40/100, and moved overall Kapwing parity to 76/100.

## 2026-05-15 - Meme Template Library

- Added reusable meme template presets for vertical reactions, square feed GIFs, creator commentary, and portrait hot-take posts.
- Wired the meme generator to apply template text, style, duration, aspect ratio, and recommended safe export preset while keeping all generated meme layers editable.
- Added workflow coverage, moved the creator formats and social delivery set to 20/100, and moved overall Kapwing parity to 75/100.

## 2026-05-15 - AI Audio Cleanup Workflow

- Added a local audio cleanup adapter that decodes audio, applies voice-range filters, soft noise gating, and peak normalization, then saves a cleaned WAV as a real editable timeline asset.
- Added a signed-in audio cleanup history route so cleaned assets are recorded with usage, safety, output metadata, and generation history when online services are available.
- Added workflow coverage, updated capability evidence, completed the AI-assisted assembly and generation safety feature set at 100/100, defined the next creator formats and social delivery set, and moved overall Kapwing parity to 74/100.

## 2026-05-15 - AI Image Editing Adapter

- Added an AI image-edit action that requires a selected image layer, validates and sends the source image through the AI SDK image prompt path, and imports the edited result as a real local media asset.
- Added product-safe source-image handling for missing, unsupported, and oversized images before requests reach the AI route.
- Updated AI usage/generation records, capability evidence, and the active roadmap, moving the AI-assisted assembly and generation safety set to 80/100 and overall Kapwing parity to 73/100.

## 2026-05-15 - AI Generation Persistence And Safety

- Added an AI generation ledger that stores prompt text, model/provider, project linkage, status, safety status, output summaries, and generated asset metadata without storing large media blobs.
- Added deterministic safety preflight for editor, transcription, and voiceover AI paths, with blocked/flagged status surfaced through safe API failures and settings history.
- Added workflow coverage, generation-history settings UI, capability evidence, moved the AI-assisted assembly and generation safety set to 60/100, and moved overall Kapwing parity to 72/100.

## 2026-05-15 - AI Video Project Generation

- Added an AI video-project action that turns scripts, briefs, and pasted article/PDF text into structured scenes with captions, visual direction, colors, stock-search B-roll queries, and export intent.
- Added a project generator that converts AI scene blueprints into real editable local projects with timed background, headline, visual-direction, caption, progress, and marker layers.
- Added review and save/open UI, workflow coverage, capability evidence, moved the AI-assisted assembly and generation safety set to 40/100, and moved overall Kapwing parity to 71/100.

## 2026-05-15 - AI B-roll Stock Insertion

- Added an AI B-roll action that returns structured, reviewable cutaway suggestions with safe stock search terms, timing, placement, and rationale.
- Added a B-roll review workflow that lets creators accept or skip suggestions, searches free stock media, downloads approved assets, saves them locally, and inserts timed layers on the canvas.
- Added workflow coverage, usage labels, capability evidence, moved the AI-assisted assembly and generation safety set to 20/100, and moved overall Kapwing parity to 70/100.

## 2026-05-15 - Expanded Transition Library

- Added real push, zoom, pop, wipe-left, and wipe-up transition presets alongside the existing fade, slide, and crossfade options.
- Routed transition scale and clipping through both live preview and composite canvas export so the new presets render in actual output, not just metadata.
- Completed the advanced visual effects and motion feature set at 100/100, defined the next AI-assisted assembly and generation safety feature set, and moved overall Kapwing parity to 69/100.

## 2026-05-15 - Object Blur And Censor Masks

- Added manual object masks for media layers with blur and solid censor modes, rectangle controls, opacity, color, and basic tracking metadata.
- Routed masks through the canvas media effects path so preview and composite export share the same renderer.
- Added workflow coverage, updated capability evidence, advanced the visual effects and motion feature set to 80/100, and moved overall Kapwing parity to 68/100.

## 2026-05-15 - Keyed Background Replacement

- Added normalized background replacement settings for keyed media, including color and opacity controls.
- Extended the chroma key renderer to paint replacement backgrounds behind keyed image and video media in preview and composite export.
- Added workflow coverage, updated capability evidence, advanced the visual effects and motion feature set to 60/100, and moved overall Kapwing parity to 67/100.

## 2026-05-15 - Chroma Key Removal

- Added normalized chroma key layer settings for green-screen removal, including key color, similarity, smoothness, and spill suppression.
- Wired chroma key controls into the visual effects inspector for image and video layers, with a keyed canvas preview for selected media.
- Applied the same pixel alpha keying in composite export, updated capability evidence, advanced the visual effects and motion feature set to 40/100, and moved overall Kapwing parity to 66/100.

## 2026-05-15 - Keyframe Motion Editing

- Added saved layer keyframes for position, size, rotation, scale, crop, and opacity with normalized project sync support.
- Wired keyframe interpolation into preview and composite export so motion edits affect both the canvas and rendered output.
- Added an inspector keyframe panel with start/current/end capture, easing, time edits, and removal, moving the advanced visual effects and motion tools set to 20/100 and overall Kapwing parity to 65/100.

## 2026-05-15 - AI Voiceover Audio Layers

- Added a Vercel AI SDK speech workflow backed by a Groq Orpheus adapter for short creator voiceovers.
- Added an authenticated AI speech route with usage limits, CORS handling, safe JSON parsing, WAV output validation, and AI usage logging.
- Wired the AI panel to generate a voiceover from the prompt, save it into local browser media, and insert it as a replaceable audio layer, completing the applied AI editing feature set at 100/100 and moving overall Kapwing parity to 64/100.

## 2026-05-15 - AI Clip Variants

- Added repurpose clip project variants that trim overlapping layers to the AI clip range, shift the result to a short-form timeline, and map each platform to a social canvas preset.
- Added safe-zone-aware layer framing plus a caption overlay for saved short-form variants.
- Wired the AI repurpose result to save editable local clip variants, added workflow coverage, advanced the applied AI editing feature set to 80/100, and moved overall Kapwing parity to 63/100.

## 2026-05-15 - Applied Transcript Cuts

- Wired caption transcript search proposals to the same timeline cut command used by reviewed smart cuts.
- Added an "Apply transcript cuts" action in the subtitle transcript tools so text-match deletion can remove matching timeline ranges after preview.
- Extended transcript workflow coverage, advanced the applied AI editing feature set to 60/100, and moved overall Kapwing parity to 62/100.

## 2026-05-15 - Silence And Filler Cleanup Review

- Added local cleanup suggestions that detect filler phrases from caption cues and low-volume regions from audio waveforms.
- Wired the AI panel's cleanup action into the smart-cut review queue so accepted silence and filler ranges apply as real timeline cuts.
- Added cleanup workflow coverage, advanced the applied AI editing feature set to 40/100, and moved overall Kapwing parity to 61/100.

## 2026-05-15 - Smart Cut Review Queue

- Added a timeline cut helper that merges reviewed cut ranges, splits crossed layers into real segments, ripples later unlocked layers, preserves locked layers, and keeps undo history through the editor store.
- Replaced read-only AI smart-cut output with an accept/skip review queue and an "Apply accepted cuts" action wired to the real timeline.
- Added smart-cut application workflow coverage, advanced the applied AI editing feature set to 20/100, and moved overall Kapwing parity to 60/100.

## 2026-05-15 - Searchable Template Library

- Expanded editor templates across social clips, ads, explainers, memes, thumbnails, banners, captions, intros, and layout starters.
- Replaced the fixed category buttons with search plus category selection so built-in and saved templates are easier to find from the Create panel.
- Completed the AI media and asset feature set at 100/100, defined the next applied AI editing feature set, and moved overall Kapwing parity to 59/100.

## 2026-05-15 - Compressor Quality Preview

- Added a pure export quality preview helper that estimates video bitrate, output size, resolution, FPS, quality label, and compression warnings from the active export settings.
- Surfaced the quality preview in the export converter bar beside target size, bitrate, resolution, FPS, and caption delivery controls.
- Added export reliability checks for the quality preview, advanced the AI media and asset feature set to 80/100, and moved overall Kapwing parity to 58/100.

## 2026-05-15 - Free Stock Media Browser

- Added a free stock media search and download path backed by Wikimedia Commons, including kind, size, license, attribution, thumbnail, and source metadata.
- Added an editor stock browser that searches images, videos, audio, and all media types, then imports selected results into the local media bin through the same validation path as uploaded files.
- Added stock media capability evidence, advanced the AI media and asset feature set to 60/100, and moved overall Kapwing parity to 57/100.

## 2026-05-15 - AI Auto-Caption Orchestration

- Added an authenticated AI transcription route that uses Vercel AI SDK transcription with Groq Whisper models to turn uploaded audio or video files into timed caption chunks.
- Wired the editor AI panel to load selected local browser or desktop media, submit it as a safe media upload, and add returned captions directly to the timeline.
- Added auto-caption capability evidence, advanced the AI media and asset feature set to 40/100, and moved overall Kapwing parity to 56/100.

## 2026-05-15 - AI Subtitle Translation

- Added a Vercel AI SDK structured output action for subtitle translation that preserves caption timing, emphasis, source language, target language, and translation notes.
- Extended the AI panel and result renderer with translated caption application plus SRT and VTT sidecar downloads.
- Added translation workflow checks, updated AI capability evidence, advanced the AI media and asset feature set to 20/100, and moved overall parity to 55/100.

## 2026-05-15 - Export Version Metadata

- Added export source snapshots with project title, dimensions, FPS, duration, layer count, media count, and QA capture timing.
- Returned rendered file metadata from bundle, FFmpeg, composite, and PNG export save paths so completed jobs can show saved filename, format, size, path, and saved time.
- Added export version metadata to the export history UI, completed the editing-depth feature set at 100/100, moved overall parity to 54/100, and defined the next AI media and asset library feature set.

## 2026-05-15 - Converter And Compressor Planning

- Added normalized export conversion settings for target file size, manual bitrate, resolution, FPS, and caption delivery mode.
- Extended render planning, FFmpeg arguments, and composite manifests so custom conversion settings affect output dimensions, frame rate, bitrate, and caption burn-in versus sidecar behavior.
- Added compact converter/compressor controls to the export bar with SRT sidecar download support, advanced the editing-depth feature set to 80/100, and moved overall parity to 53/100.

## 2026-05-15 - Visual Correction Depth

- Added normalized exposure, temperature, tint, vignette, and look-preset metadata to layer styles with schema validation.
- Extended the visual effects inspector with correction sliders and richer LUT-style look presets for cinematic, product, contrast, shadow, warm-film, and cool-clean looks.
- Wired preview filters and canvas export vignette rendering through the shared visual effects helpers, advanced the editing-depth feature set to 60/100, and moved overall parity to 52/100.

## 2026-05-15 - Media Speed Controls

- Added normalized layer speed metadata for reverse playback, preserve-pitch preference, and linear speed ramps.
- Extended the inspector timing panel with media speed presets, reverse, preserve-pitch, and ramp start/end controls for video and audio layers.
- Wired preview and composite rendering time mapping through speed helpers, added workflow coverage, advanced the editing-depth feature set to 40/100, and moved overall parity to 51/100.

## 2026-05-14 - Transcript Cut Proposals

- Added transcript cut proposal primitives that convert caption text matches or cue selections into merged timeline cut ranges with duration, cue IDs, text, and reason metadata.
- Extended the caption transcript tools with a cut preview control that shows proposed cut ranges directly beside transcript find, replace, and casing cleanup.
- Added transcript cut workflow coverage, advanced the Kapwing parity editing depth feature set to 20/100, and moved overall parity to 50/100.

## 2026-05-14 - Visible Control Audit

- Added a visible-control audit registry covering the main dashboard, editor, media, AI, recording, caption, review, and export controls that can look decorative if they lose wiring.
- Added a lightweight audit check that verifies every audited control still has source evidence and blocks placeholder wiring such as dummy labels, empty click handlers, hash links, and permanently disabled buttons.
- Completed the runtime reliability and media workflow feature set at 100/100 and defined the next Kapwing parity editing depth feature set.

## 2026-05-14 - Dashboard Client Composition Split

- Split the dashboard route composition into a dashboard client controller hook plus focused overview and project library sections.
- Kept current project actions, local library actions, signed-in library actions, bundle import refs, and editor navigation wired through the existing dashboard hooks.
- Added a lightweight dashboard composition check and advanced the next feature set to 72/100.

## 2026-05-14 - Media Bin Module Split

- Split the media bin into focused import controls, status and missing-media panels, collection controls, shared message types, and reusable asset cards.
- Kept browser import, desktop import, reconnect, batch reconnect, media health, favorites, collections, waveform preview, add-to-timeline, remove, and restore behavior wired through the existing media bin container.
- Updated media import and health workflow checks for the new module boundaries and advanced the next feature set to 48/100.

## 2026-05-14 - Editor Control Regression Checks

- Added a focused editor control regression script that verifies real store transitions for play/pause, undo/redo, and export job cancellation.
- Added browser-only source guards for autosave, keyboard save, topbar save/undo/redo, timeline play controls, playback clock stopping, and export cancellation wiring.
- Registered the control regression check in the lightweight suite and advanced the next feature set to 24/100.

## 2026-05-14 - Editor Runtime Smoke Check

- Added a lightweight runtime smoke script that exercises project creation, media import validation, local save-record validation, project bundle parsing, and export preflight without starting a server or running a build.
- Extracted browser media type inference into a pure media utility so runtime checks can validate import behavior without touching IndexedDB.
- Registered the smoke check in the lightweight verification suite and advanced the next feature set to 12/100.

## 2026-05-14 - Timeline Marker, Track, And Drag Split

- Extracted timeline marker/playhead rendering into a marker rail component.
- Extracted track and clip row rendering into a timeline track list component with lane metadata and review badges preserved.
- Extracted timeline drag and trim behavior into a focused hook so pointer mechanics no longer live inside the panel composition.
- Updated the active TODO status to 100/100 for the current local-first editor maintainability roadmap and defined the next feature set.

## 2026-05-14 - Timeline Command Bar Component

- Started the timeline panel simplification milestone by extracting playback, split, marker, alignment, duration, search, filter, zoom, track-height, scrubber, snap, and ripple controls into a focused command bar.
- Left drag, marker rail, playhead, track, and clip rendering behavior unchanged for a safer first timeline split.
- Updated the active TODO status to 99/100 for the local-first roadmap.

## 2026-05-14 - Inspector Review And Status Sections

- Extracted review status, layer notes, locked/hidden/muted toggles, grouping actions, group selection, and track movement into focused inspector sections.
- Kept the main inspector panel focused on store wiring and section composition while preserving existing layer behavior.
- Updated the active TODO status to 98/100 for the local-first roadmap.

## 2026-05-14 - Inspector Timing And Transform Sections

- Extracted shared inspector field controls, selected-layer timing controls, and transform/framing controls from the main inspector panel.
- Kept timing edits, selection-bounds edits, canvas fit, crop, flip, and blurred-background actions wired to the existing editor store behavior.
- Updated the active TODO status to 97/100 for the local-first roadmap.

## 2026-05-14 - Inspector Header Component

- Started the inspector panel simplification milestone by extracting the selected-layer header and quick actions into a focused component.
- Kept isolate, show-all, duplicate, and delete behavior wired to the existing editor store actions.
- Updated the active TODO status to 96/100 for the local-first roadmap.

## 2026-05-14 - Editor Timeline Edit Store Slice

- Extracted layer patching, selected-layer timing, bounds transforms, nudging, alignment, duration distribution, canvas fitting, and blurred-background creation into a focused editor timeline edit slice.
- Moved the related timing, framing, ripple, and selected-bounds helpers out of the main store so the store keeps shrinking around composition.
- Updated timeline precision, framing, state transition, and duration resilience checks for the new slice boundary.
- Updated the active TODO status to 95/100 for the local-first roadmap.

## 2026-05-14 - Editor Layer Command Store Slice

- Extracted history snapshots, selected-layer removal, duplication, splitting, and track movement into a focused editor layer command slice.
- Kept structural timeline edits dependent on explicit clone, snap, group, and duration helpers instead of hidden store coupling.
- Updated state transition checks for the new layer command slice boundary.
- Updated the active TODO status to 94/100 for the local-first roadmap.

## 2026-05-14 - Editor Selection Store Slice

- Extracted safe-zone toggling, layer isolation, show-all, hidden/locked toggles, grouping, group selection, single selection, and range selection into a focused editor selection slice.
- Removed the old inline selection helper from the main editor store while keeping group-aware behavior and timeline ordering dependencies explicit.
- Updated the active TODO status to 93/100 for the local-first roadmap.

## 2026-05-14 - Editor Media Store Slice

- Extracted media asset, favorite, collection, remove, and recovery actions into a focused editor media slice.
- Kept object URL cleanup, project duration recalculation, and selection recovery dependencies explicit for behavior-preserving store simplification.
- Updated media object URL lifecycle checks for the new media slice boundary.
- Updated the active TODO status to 92/100 for the local-first roadmap.

## 2026-05-14 - Editor Project Playback Slice

- Extracted project setup, project metadata, playhead, playback, timeline snap, ripple, and marker actions into a focused editor project/playback slice.
- Kept media URL cleanup and project normalization dependencies explicit so the first store split stays behavior-preserving.
- Updated media URL lifecycle, timeline precision, and editor transition checks for the new slice boundary.
- Updated the active TODO status to 91/100 for the local-first roadmap.

## 2026-05-14 - Editor Store Export Slice

- Started the editor store domain-slice milestone.
- Extracted the typed editor store contract and removed the large inline interface from the store implementation.
- Extracted export queue actions into a focused export slice for queue, update, remove, and clear-finished behavior.
- Updated export reliability checks to validate the new export slice boundary.
- Updated the active TODO status to 90/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Page Shell

- Extracted the dashboard page shell and route header into a focused layout component.
- Reduced the dashboard client to state wiring and section composition.
- Kept the existing dashboard routes, labels, and controls unchanged while simplifying ownership.
- Updated the active TODO status to 89/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Top Card Components

- Extracted the current project card into a focused component that owns project summary, sync, continue, and preset project controls.
- Extracted the AI workspace card into a focused component while keeping the same editor entry path.
- Updated runtime guard checks to follow the new current-project component boundary.
- Updated the active TODO status to 88/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Signed-In Library Card

- Extracted the signed-in project library table, refresh action, empty state, sync message, and cloud project row actions into a focused presentational component.
- Kept the dashboard client focused on composing project, local library, AI workspace, and signed-in library sections.
- Updated client API and dashboard action resilience checks for the signed-in library component boundary.
- Updated the active TODO status to 87/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Local Library Card

- Extracted the dashboard local project library table, filters, folder manager, bulk actions, snapshot controls, and trash list into a focused presentational component.
- Added a shared dashboard message view so local and signed-in library status messages no longer live inside the main dashboard client.
- Updated dashboard workflow checks to validate the new hook/component ownership boundaries.
- Updated the active TODO status to 86/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Signed-In Library Hook

- Extracted signed-in project library state and actions into a focused dashboard cloud-library hook.
- Moved client API availability handling and product-safe sync failure mapping out of the dashboard client.
- Added a shared dashboard message type used by local and signed-in library hooks.
- Updated action resilience and client API runtime checks for the new hook boundary.
- Updated the active TODO status to 85/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Local Library Hook

- Extracted local dashboard project state, filters, folder actions, snapshots, trash recovery, bundle import, and bulk actions into a focused local-library hook.
- Reduced the dashboard client to the current project surface, local library rendering, and signed-in library sync.
- Updated workflow checks to validate the new dashboard hook boundary.
- Updated the active TODO status to 84/100 for the local-first roadmap.

## 2026-05-14 - Dashboard Component Simplification

- Started the dashboard component simplification milestone.
- Extracted project review, folder, and snapshot badges from the dashboard client.
- Extracted the recently deleted project list from the dashboard client.
- Updated dashboard trash and local trash workflow checks to validate the new component boundaries.
- Updated the active TODO status to 83/100 for the local-first roadmap.

## 2026-05-14 - Capability Registry Modularization

- Split the product capability registry into area-specific modules for platform, core editor, AI, assets, audio/recording, export/delivery, desktop, and collaboration.
- Kept the public registry export stable for settings and product capability checks.
- Confirmed the capability guardrail still reports 49/100 Kapwing-style parity across 37 capabilities.
- Updated the active TODO status to 82/100 for the local-first roadmap.

## 2026-05-14 - Product Capability Guardrails

- Added a lightweight product capability check that validates unique registry ids, actionable entries, coverage across all product areas, and existing local owner paths.
- Wired the capability check into the lightweight check chain.
- Updated the active TODO status to 81/100 for the local-first roadmap and 49/100 for full Kapwing-style parity, based on the typed readiness report.

## 2026-05-14 - Product Capability Readiness

- Started the product capability readiness milestone.
- Added a typed product capability registry covering ready, partial, missing, and desktop/deployment verification gaps.
- Added a weighted readiness report grouped by core editor, AI, assets, audio/recording, export/delivery, desktop, collaboration, and platform quality.
- Surfaced the product readiness report in settings with next highest-value gaps.
- Updated the active TODO status to 80/100 for the local-first roadmap and 47/100 for full Kapwing-style parity.

## 2026-05-14 - Kapwing Parity Audit And TODO Simplification

- Audited the current public Kapwing feature surface against the actual Essence Studio roadmap.
- Added a simplified active backlog at the top of `todo.md` so new work starts from the highest-value parity gaps instead of the completed milestone archive.
- Recorded current status as 79/100 for the local-first roadmap and 46/100 for full Kapwing parity.
- Added explicit missing-feature todos for project simplification, real Tauri verification, transcript editing, applied smart cuts, auto captions, media AI, stock assets, templates, recording, export conversion, publishing, collaboration, and cloud workspace workflows.
- Skipped typecheck because this batch only changed planning documentation.

## 2026-05-14 - Dashboard Trash Management Workflow

- Started the dashboard trash management workflow milestone.
- Added a full deleted-project manager for local trash recovery.
- Deleted projects now support selection, bulk restore, and bulk permanent delete.
- The recent deleted list now uses the same restore and permanent-delete action path as the full manager.
- Added a lightweight dashboard trash management workflow check and expanded the local trash workflow check.

## 2026-05-14 - Dashboard Folder Management Workflow

- Started the dashboard folder management workflow milestone.
- Added reusable local folder rename and delete operations.
- Removing a folder now clears project assignments so affected projects become unfiled safely.
- Added a dashboard folder manager for creating, renaming, and removing local project folders.
- Folder management now shows assigned project counts for each folder.
- Added a lightweight dashboard folder management workflow check and completed the milestone.

## 2026-05-14 - Dashboard Bundle Backup Workflow

- Started the dashboard bundle backup workflow milestone.
- Extracted a shared project-bundle save helper for editor exports and dashboard library exports.
- Added per-project bundle export from the local dashboard library.
- Added selected-project bundle exports from the dashboard bulk actions bar.
- Dashboard bundle exports preserve sanitized media metadata without browser object URLs.
- Added a lightweight dashboard bundle export workflow check and completed the milestone.

## 2026-05-14 - Dashboard Bulk Project Workflow

- Started the dashboard bulk project workflow milestone.
- Added visible-project and per-project selection controls to the local library.
- Added a compact bulk actions bar for selected local projects.
- Selected projects can now be assigned to a folder, duplicated, or moved to trash together.
- Bulk actions reuse the existing local project, folder, and trash stores.
- Added a lightweight dashboard bulk workflow check and completed the milestone.

## 2026-05-14 - Dashboard Folder Workflow

- Started the dashboard folder organization workflow milestone.
- Connected the existing local project folder store to the dashboard library.
- Added folder filters for all projects, unfiled projects, and named folders.
- Local project rows now show their assigned folder.
- Added a project folder dialog for assigning an existing folder or creating and assigning a new folder from the dashboard.
- Added a lightweight dashboard folder workflow check and completed the milestone.

## 2026-05-14 - Snapshot Browser Milestone

- Started the snapshot browser and selective restore workflow milestone.
- Prioritized project-level checkpoint history so recovery is no longer limited to the latest checkpoint.
- Added individual local checkpoint deletion.
- Added a dashboard checkpoint history dialog with snapshot date, layer count, media count, and duration context.
- Dashboard projects now support restoring or removing a specific checkpoint and refreshing checkpoint counts afterward.
- Added a lightweight snapshot browser workflow check and completed the milestone.

## 2026-05-14 - Local Trash Recovery Milestone

- Started the local trash recovery workflow milestone.
- Prioritized reversible deletion, dashboard recovery visibility, and permanent cleanup as an explicit action.
- Added validated local trash records for deleted project recovery.
- Local project deletion now moves records to trash instead of immediately removing them.
- Snapshot records are preserved while projects are in trash and cleaned up only on permanent deletion.
- Dashboard now shows recently deleted projects with restore and permanent-delete controls.
- Added a lightweight local trash workflow check and completed the milestone.

## 2026-05-14 - Local Snapshot Recovery Milestone

- Started the local snapshot recovery workflow milestone.
- Prioritized manual checkpoints, dashboard snapshot visibility, and latest-snapshot recovery for long editing sessions.
- Added validated local project snapshot records with sanitized media metadata.
- Added an editor checkpoint button for the active project.
- Dashboard local projects now show checkpoint counts.
- Added latest-checkpoint restore from the local library.
- Added a lightweight local snapshot workflow check and completed the milestone.

## 2026-05-14 - Project Library Health Milestone

- Started the project library health workflow milestone.
- Prioritized dashboard triage for blocked projects, recoverable media, review attention, and empty timelines.
- Added a shared project health report for local project records.
- Added dashboard health filters for ready, attention, and blocked projects.
- Added library health summary counters for media recovery, reconnect needs, and review items.
- Project rows now show health badges and concise details for recoverable media, reconnect requirements, review items, and empty timelines.
- Added a lightweight dashboard project health workflow check and completed the milestone.

## 2026-05-14 - Desktop Readiness Milestone

- Started the desktop readiness and local workflow milestone.
- Prioritized visible desktop capability status, local import/export confidence, and product-safe runtime language.
- Added a shared desktop readiness report for browser and desktop runtime capability states.
- Added a settings desktop app card for local import, local export, media recovery, and online-action status.
- Added a lightweight desktop readiness workflow check and wired it into the light check chain.
- Marked the static desktop file/export workflow check complete while leaving real desktop launch verification for a future run.

## 2026-05-14 - Media Health Milestone

- Started the media health and recovery workflow milestone.
- Prioritized reusable asset health reporting, filter-driven media triage, and clearer missing-media impact details.
- Added a shared media health report for ready, missing, used, unused, favorite, recoverable, and reconnect-required assets.
- Added compact media-bin health controls that jump to ready, missing, recoverable, used, unused, and favorite filters.
- Missing media now shows affected timeline-layer impact details and recoverable or reconnect-required status.
- Added a lightweight media health workflow check and completed the media health milestone.

## 2026-05-14 - Export Reliability Milestone

- Started the export reliability and queue workflow milestone.
- Prioritized clearer preflight feedback, recoverable export history, and safer batch delivery cancellation.
- Added non-blocking preflight warning display in the export panel.
- Added export history controls for single-job removal and finished-job cleanup.
- Batch exports now stop remaining delivery presets after cancellation.
- Export jobs now show preset, format, review state, and error details in the queue.
- Added a lightweight export reliability workflow check and completed the export reliability milestone.

## 2026-05-14 - Canvas Framing Milestone

- Started the canvas framing and transform workflow milestone.
- Prioritized real transform controls and render parity for preview and export paths.
- Added horizontal and vertical flip controls with preview, export, and sync-schema support.
- Added fit, fill, and stretch framing modes for media layers with matching preview and export rendering.
- Added crop rectangle metadata and inspector controls for image/video layers with source-cropped canvas export.
- Added selected-layer center, cover, and contain commands for fast canvas fitting.
- Added a blurred background fill workflow for selected image/video layers in vertical or square compositions.
- Added a lightweight framing workflow check and completed the canvas framing and transform workflow milestone.

## 2026-05-14 - Social Delivery Variants

- Added batch delivery targets for YouTube, Shorts, TikTok/Reels, square GIF, and current-frame thumbnail exports.
- Added local project variant saving for selected social aspect ratios with adapted layer dimensions.
- Added a lightweight social format workflow check and completed the social format and delivery variants milestone.

## 2026-05-14 - Current Frame PNG Export

- Added a PNG Current Frame export preset for thumbnail and still-image delivery.
- Added current-frame composite rendering that draws the active canvas state to PNG without requiring MediaRecorder.
- PNG frame exports now share the same layer, effects, motion, transition, and overlay rendering path as video composite exports.

## 2026-05-14 - Social Format Presets

- Started the social format and delivery variants milestone.
- Added social format preset metadata for YouTube, Shorts, TikTok/Reels, square feed, portrait feed, and wide cinema formats.
- Added creation-panel format controls and platform-aware safe-zone overlays tied to the active project aspect ratio.

## 2026-05-14 - Visual Effects Workflow Checks

- Added a lightweight visual effects workflow check covering effects normalization, presets, motion, transitions, overlays, render planning, and sync validation.
- The lightweight check chain now includes the visual effects workflow check.
- Completed the visual effects and motion workflow milestone.

## 2026-05-14 - Freeze Frame Capture

- Added a real selected-video freeze-frame workflow that captures the current playhead frame to a local PNG asset.
- Freeze frames are saved through the browser media store and inserted as editable image layers with inherited framing and visual style.
- Added inspector feedback for successful captures, skipped missing media, and failed frame reads.

## 2026-05-14 - Layer Transitions

- Added typed fade, slide, and crossfade transition metadata for visual layers.
- Added inspector transition controls for incoming and outgoing layer transitions with duration control.
- Preview and composite export rendering now apply transition opacity and slide offsets from the shared transition engine.

## 2026-05-14 - Progress And Timer Overlays

- Added real progress bar and countdown or elapsed timer layers from the editor rail.
- Progress and timer overlays now render consistently in live preview, project sync payloads, timelines, and composite exports.
- Overlay defaults use the shared visual style and motion pipeline, so borders, shadows, filters, and animation presets apply normally.

## 2026-05-14 - Motion Presets

- Added layer motion metadata for none, slow zoom, pan left, pan right, and settle presets.
- Motion settings now persist with project data and sync validation.
- Added shared motion interpolation utilities for preview and export rendering.

## 2026-05-14 - Visual Effect Presets

- Added reusable visual effect presets for cinematic, clean product, high contrast, and soft shadow looks.
- Presets apply real style patches for brightness, contrast, saturation, border, and shadow controls.
- Visual presets live in a shared editor module for reuse beyond the inspector.

## 2026-05-14 - Visual Effects Controls

- Started the visual effects and motion workflow milestone.
- Added brightness, contrast, saturation, border width, shadow blur, and shadow color style fields with sync validation.
- Visual effect defaults are now normalized through shared editor utilities.

## 2026-05-14 - Audio Workflow Checks

- Added a lightweight audio workflow check for gain/fade math, built-in presets, saved mix schema, WAV render planning, and editor wiring.
- Added the audio workflow check to the lightweight verification chain.
- Completed the audio mixing and playback workflow milestone.

## 2026-05-14 - Reusable Audio Mix Presets

- Added project-level saved audio mix presets that persist with project metadata and sync payloads.
- Audio-capable layers can save the current volume, fade, and muted state as a reusable preset.
- Saved audio presets can be applied to selected audio/video layers or removed from the mix panel.

## 2026-05-14 - Audio Export Preparation

- Added a WAV Audio export preset for single-source audio-only export preparation.
- Export preflight now gives specific audio-only guidance instead of generic video export failure text.
- Delivery QA now warns when the visible timeline is audio-only and points to the correct WAV export path.

## 2026-05-14 - Video Audio Workflows

- Added a video audio workflow panel for extracting a video's audio into editable audio layers.
- Added replace-audio workflow that mutes selected video layers and creates synced replacement audio layers from imported audio assets.
- Store actions now support group-aware selected video audio extraction and replacement.

## 2026-05-14 - Audio Ducking Presets

- Added reusable audio mix presets for voiceover, music bed, and muted bed workflows.
- Audio presets apply real layer volume, fade, and muted values from the mix panel.
- Preset definitions live in a shared audio module for reuse beyond the inspector.

## 2026-05-14 - Audio Region Waveform Readouts

- Added selected audio/video region readouts for timeline span, source span, clip duration, and speed.
- Added waveform zoom controls for audio layers with extracted waveform peaks.
- The audio mix panel now receives the selected media asset for source-aware waveform display.

## 2026-05-14 - Audio Mix Controls

- Started the audio mixing and playback workflow milestone.
- Added layer-level volume, fade-in, and fade-out metadata with sync validation.
- Preview playback and composite rendering now apply layer volume and fades for audio-capable layers.

## 2026-05-14 - Caption Authoring Workflow Checks

- Added a lightweight caption authoring workflow check for cue operations, transcript transforms, inspector wiring, and import preview wiring.
- Added the caption authoring check to the lightweight verification chain.
- Completed the caption authoring and transcript workflow milestone.

## 2026-05-14 - Caption Import Preview

- Caption file import now previews parsed cues instead of immediately overwriting the current subtitle layer.
- Added replace, merge, and new-layer choices for imported caption files.
- Added a store action for creating caption layers directly from imported cues.

## 2026-05-14 - Transcript Editing Tools

- Added transcript search with live match counts across caption cues.
- Added replace-all and casing cleanup commands for caption transcript text.
- Transcript transformations now live in reusable subtitle operations.

## 2026-05-14 - Caption Timing Tools

- Added caption timing shift controls for moving all cues earlier or later by a chosen amount.
- Added caption timing repair to preserve cue duration while removing overlap collisions and small gaps.
- Timing cleanup now lives in shared subtitle operations for reuse by import and editor workflows.

## 2026-05-14 - Caption Cue List Editor

- Added a focused cue list editor with per-cue start, end, text, and emphasis controls.
- Added caption cue split, merge-with-next, duplicate, and delete commands.
- Caption updates now normalize through the shared cue operation layer before updating the subtitle layer.

## 2026-05-14 - Caption Cue Operations

- Started the caption authoring feature set.
- Added reusable subtitle cue operations for normalization, shifting, splitting, merging, and safe removal.
- Caption import, manual caption parsing, and subtitle exports now share the same cue normalization path.

## 2026-05-14 - Timeline Precision Workflow Checks

- Added a lightweight timeline precision workflow check covering snap defaults, ripple mode, sync validation, ruler ticks, and toolbar wiring.
- Added the timeline precision check to the lightweight verification chain.
- Moved timeline ruler tick generation into a plain editor utility for direct verification.

## 2026-05-14 - Timeline Marker Navigation

- Added previous and next marker controls to the timeline toolbar.
- Marker navigation wraps across the marker list and selects the jumped-to marker.
- Marker jumps update the playhead directly for faster bookmark-based editing.

## 2026-05-14 - Duration Distribution Commands

- Added commands to equalize selected layer durations or fill the selected timeline span.
- Duration distribution respects grouped selections, locked layers, and undo history.
- Added compact timeline toolbar controls with tooltips for duration distribution.

## 2026-05-14 - Ripple Move Mode

- Added project-level ripple move mode with persistent project metadata and sync validation.
- Moving or keyboard-nudging selected layers can now shift unlocked downstream layers by the same time delta.
- Added a timeline toolbar toggle for ripple editing with a tooltip.

## 2026-05-14 - Timeline Layer Alignment

- Added selected-layer alignment commands for start, center, end, and playhead.
- Alignment respects grouped selections and locked layers while preserving undo history.
- Added compact timeline toolbar controls with tooltips for precise layer alignment.

## 2026-05-14 - Adaptive Timeline Ruler

- Added a dedicated timeline ruler with readable time labels above tracks.
- Ruler tick spacing now adapts to project duration and timeline zoom level.
- The playhead, markers, and tracks share the same timeline geometry for easier precision editing.

## 2026-05-14 - Configurable Timeline Snapping

- Added project-level timeline snap interval settings from 0.05s to 2s.
- Drag, trim, duplicate offsets, keyboard nudges, and split actions now honor the project snap interval.
- Snap interval settings persist with project data and sync validation.

## 2026-05-14 - Asset Brand Workflow Checks

- Added a lightweight asset-library and brand-workflow verification script.
- The check covers project schema support for media collections, layer style presets, brand typography presets, and key UI wiring.
- Added the new check to the lightweight verification chain.

## 2026-05-14 - Template Categories

- Added categories and richer preview metadata to built-in editor templates.
- Added template category filters in the creation panel.
- Template cards now show category, layer count, expected duration, and best-use metadata.

## 2026-05-14 - Batch Media Reconnect

- Added batch missing-media reconnect from the media bin.
- Selected files now match missing media by exact filename or filename base before reconnecting each matching asset.
- Batch reconnect reports reconnected, failed, and unmatched counts without discarding successful reconnects.

## 2026-05-14 - Brand Typography Presets

- Added project-level brand typography presets for heading, body, and caption font pairings.
- Added brand-tab controls to save font pairings, preview them, remove them, and apply heading/body/caption roles to selected text-like layers.
- Typography application respects locked layers and only targets text, subtitle, and sticker layers.

## 2026-05-14 - Layer Style Presets

- Added project-level layer style presets that persist with project data and sync payloads.
- Added inspector controls to save the selected layer style, preview saved style swatches, apply presets to selected editable layers, and remove presets.
- Style preset application respects locked selected layers.

## 2026-05-14 - Media Collections

- Added project-level media collections that persist with project data and sync payloads.
- Added media-bin collection creation, selection, filtering, membership toggles, and removal.
- Removing media now also removes that asset from project collections.

## 2026-05-14 - Media Favorites

- Started the asset library and brand workflow feature set.
- Added persistent media favorites to the editor store.
- Added favorite buttons, favorite badges, and a favorites filter to the media bin.

## 2026-05-14 - Handoff QA Checks

- Added a lightweight handoff and delivery QA verification script.
- The check covers handoff summary content, delivery QA blockers/warnings, and project review summary priority.
- Added the new check to the lightweight verification chain.

## 2026-05-14 - Dashboard Review Status

- Added reusable project review summaries for dashboard and synced-project metadata.
- Local project rows now show review status chips and can be filtered by review state.
- Synced project summaries now include review status when the signed-in library returns project metadata.

## 2026-05-14 - Export Review Snapshots

- Export jobs now capture the current delivery QA state when queued.
- Export history rows now show the captured QA status in the editor and review workspace.
- Review snapshots persist with local export history for later delivery audits.

## 2026-05-14 - Pre-Export Delivery QA

- Added a pre-export QA checklist for missing media, hidden layers, muted audio, unresolved review items, and visible timeline gaps.
- Added a delivery status button beside export so review risks are visible before rendering.
- Kept QA logic in a reusable editor domain module for future export history and dashboard reuse.

## 2026-05-14 - Handoff Summary Export

- Added markdown handoff summary export from the review queue.
- Handoff summaries include project settings, markers, media assets, layer timing, notes, flags, and review status.
- Shared subtitle downloads now use a general text-download helper instead of owning browser download behavior in the subtitle module.

## 2026-05-14 - Review Timeline Filters

- Added timeline filters for layers with review status and layers with handoff notes.
- Review and notes filters work alongside timeline search so editors can quickly isolate handoff work.

## 2026-05-14 - Project Review Queue

- Started the review handoff and delivery QA feature set.
- Added an inspector review queue that surfaces layers with notes, review-needed states, requested changes, and approvals.
- Empty inspector selection now gives reviewers a useful project-level queue instead of a dead end.

## 2026-05-14 - Layer Review Metadata

- Added persisted layer notes, review status, and review update timestamps to the editor project model and sync schema.
- Added inspector controls for layer handoff notes and review status.
- Timeline search now matches layer notes and review status, and clips show compact review badges when a layer needs attention or approval.

## 2026-05-14 - Named Timeline Lanes

- Timeline tracks now infer lane names from real layer content: media, audio, captions, overlays, or mixed.
- Track headers now show compact lane names and layer counts so dense timelines are easier to scan.
- Timeline search now also matches inferred lane categories such as captions, overlays, audio, and media.

## 2026-05-14 - Timeline Search And Filters

- Added timeline layer search across layer names, layer types, group status, media asset names, and media source terms.
- Added timeline filters for all layers, grouped layers, missing media, media layers, and text-style layers.
- Empty filtered timelines now show a clear no-match state instead of looking like an empty project.

## 2026-05-14 - Group-Aware Editing Commands

- Grouped layers now move and trim together when dragging, nudging, or editing selection timing.
- Hidden and locked inspector toggles now apply to selected groups instead of only the focused layer.
- Timeline dragging now lets the store handle marker/grid snapping consistently for grouped moves and trims.

## 2026-05-14 - Multi-Layer Timing Bounds

- Added exact selection start, end, and duration controls for multi-layer selections.
- Multi-layer timing edits now move or scale unlocked selected layers together while preserving their relative timing.
- Locked selected layers remain protected from bulk timing edits.

## 2026-05-14 - Timeline Markers

- Added editable timeline markers with label, time, color, jump-to-marker, and delete controls.
- New projects now include marker support while older saved projects remain compatible.
- Layer dragging and keyboard nudging now snap to nearby markers before falling back to the normal timeline grid.

## 2026-05-14 - Keyboard Layer Nudging

- Started the precision editing feature loop with keyboard nudge controls.
- Arrow left and right now move selected unlocked layers by timeline snap increments, with Shift for one-second nudges.
- Arrow up and down now move selected unlocked layers between tracks while preserving locked-layer protection.

## 2026-05-14 - Persistent Layer Groups

- Added persisted layer group identifiers to project data, local saves, project bundles, and signed-in project sync validation.
- Added inspector controls to group selected layers, select an existing group, and ungroup grouped layers.
- Timeline clips now show grouped-layer status, and duplicated grouped selections receive fresh group identifiers.

## 2026-05-14 - Media Removal Recovery

- Added a recovery slot for the last removed media asset and its linked timeline layers.
- Media removal now keeps the removed preview URL alive only while recovery is available, then releases it when discarded.
- Added a media-bin restore notice so accidental asset removals can be recovered without resurrecting broken timeline history.

## 2026-05-14 - Timeline Range Selection

- Added timeline-order range selection for layers.
- Shift-select now selects a contiguous layer range, while Ctrl/Meta-select keeps additive toggling for pointer and keyboard selection.
- Keyboard layer selection now uses the same selection rules as pointer selection.

## 2026-05-14 - Media Library Filters

- Added All, Missing, Used, and Unused filters to the media library.
- Added missing-media counts and reconnect status so larger projects surface broken sources quickly.
- Successful reconnects now report remaining missing media instead of silently clearing the row.

## 2026-05-14 - Saved Timeline Templates

- Added reusable templates created from the active visible timeline layers.
- Saved templates now persist in the local editor store and can be applied back into projects with fresh layer IDs.
- Applying a saved template skips unavailable media-backed layers and reports the partial add instead of creating broken layers.

## 2026-05-14 - Layer Isolation Controls

- Added real editor commands for isolating the current layer selection and restoring hidden layers.
- Added inspector controls for dense timeline review without changing layer order or deleting content.
- Isolate and show-all actions now flow through project history so users can undo visibility changes.

## 2026-05-14 - Timeline Density Controls

- Added zoom in, zoom out, and fit controls to the editor timeline.
- Added adjustable track height for denser or more readable timelines.
- Reworked timeline track sizing and drag calculations so wider timelines scroll horizontally and vertical drag movement follows the selected track density.

## 2026-05-14 - Media Bin Asset Removal

- Added media-bin remove controls for imported, generated, recorded, browser, and desktop media assets.
- Removing a media asset now removes linked timeline layers, clears stale selections, releases blob preview URLs, and resets project-only undo history to avoid resurrecting detached layers.
- Added linked-layer counts in the media library so destructive removals are visible before acting.

## 2026-05-14 - Collaboration Data Validation

- Review comments now only persist finite in-range timeline timestamps.
- Workspace member entries now require a valid email shape before saving.
- Invalid member entries now show a product-safe review workspace message.
- Added a lightweight collaboration data validation check to the focused verification suite.

## 2026-05-14 - Browser Export Download Reliability

- Browser exports now use an attached download link before clicking.
- Export object URLs are now revoked after the browser has started handling the download.
- Extended export-output checks to guard the safer download flow.

## 2026-05-14 - Browser Media Type Boundary

- Browser media imports now reject unsupported file types before metadata decoding or storage.
- Media type inference now falls back to known media extensions when the browser omits MIME metadata.
- Added a lightweight browser media validation check to the focused verification suite.

## 2026-05-14 - Generated Image Payload Resilience

- Generated image outputs now require bounded, decodable base64 image payloads before preview or import.
- AI image previews and imports now share the same base64 normalization path.
- Generated image filenames, prompts, models, and media types are now constrained by the AI output schema and client guards.

## 2026-05-14 - Timed Output Contract Tightening

- Project sync validation now rejects zero-length subtitle cues instead of accepting `end === start`.
- AI caption, transcript cleanup, repurpose, and smart-cut outputs now require finite forward-moving time ranges.
- Client-side AI result guards now reject blank and zero-length captions before applying them to the timeline.

## 2026-05-14 - Subtitle Format Resilience

- Subtitle imports now reject invalid time ranges and malformed timestamp segments.
- Caption exports now filter invalid or blank cues before writing SRT, VTT, or transcript files.
- Transcript export no longer mutates the active cue array while sorting.
- Text download URLs are now revoked after the browser has started the download flow.
- Added a lightweight subtitle format resilience check to the focused verification suite.

## 2026-05-14 - Project Sync Storage Resilience

- Signed-in project listing now skips corrupt stored project payloads instead of failing the whole library response.
- Opening a corrupt synced project now returns a product-safe recovery message.
- Added a lightweight project sync storage resilience check to the focused verification suite.

## 2026-05-14 - Manual Caption Cue Resilience

- Manual subtitle edits now parse cue timings through a typed helper instead of inline loose number matching.
- Malformed caption lines now fall back to finite cue timing and keep the line text editable.
- Added a lightweight manual caption cue resilience check to the focused verification suite.

## 2026-05-14 - Composite Cleanup Resilience

- Composite export now stops captured media tracks before closing the audio context.
- Temporary render media URLs are released even when layer preparation fails before recording starts.
- Image, audio, and video decode failures now release temporary render URLs instead of leaking them.
- Added a lightweight composite cleanup resilience check to the focused verification suite.

## 2026-05-14 - Async Rejection Guards

- Guarded initial dashboard library refresh against future unhandled promise rejections.
- Guarded composite-render audio context startup against ignored browser resume failures.
- Extended lightweight fire-and-forget checks to cover dashboard refresh and composite audio startup.

## 2026-05-14 - Media Object URL Lifecycle

- Replaced media assets now revoke stale blob preview URLs when reconnecting or restoring files.
- Creating or loading a project now releases previous local preview URLs before replacing the media library.
- Added a lightweight media object URL lifecycle check to the focused verification suite.

## 2026-05-14 - Editor State Transition Resilience

- Loaded projects now normalize duration so restored timelines always cover their layers.
- Undo and redo now clamp the playhead to the restored project duration.
- Layer selection now ignores stale layer IDs that are not present in the active project.
- Added a lightweight editor state transition resilience check to the focused verification suite.

## 2026-05-14 - Editor Store Duration Resilience

- Generic layer updates now clamp unsafe timing, playback, and track values before they reach project state.
- Inspector edits and caption imports now expand project duration consistently with timeline drag behavior.
- Added a lightweight editor store duration resilience check to the focused verification suite.

## 2026-05-14 - Inspector Number Resilience

- Inspector timing and transform number fields now ignore empty or non-finite input.
- Duration, speed, width, and height controls now clamp to safe minimum values before updating layer state.
- Added a lightweight inspector number resilience check to the focused verification suite.

## 2026-05-14 - Dashboard Action Resilience

- Added product-safe failure and success messages for dashboard local project actions.
- Added pending guards for dashboard local and signed-in project library actions.
- Replaced a fire-and-forget signed-in metadata save path with an awaited, product-safe action.
- Added a lightweight dashboard action resilience check to the focused verification suite.

## 2026-05-14 - Generated Image Import Resilience

- Generated image actions now keep successful local imports when another generated image fails to decode or save.
- Added product-safe generated image import status messages in the editor assistant panel.
- Added a lightweight generated image import resilience check to the focused verification suite.

## 2026-05-14 - Caption File Resilience

- Added clean subtitle import feedback for empty, unreadable, or invalid caption files.
- Added clean subtitle export feedback for SRT, VTT, and transcript downloads.
- Added a lightweight caption file resilience check to the focused verification suite.

## 2026-05-14 - Export Preparation Resilience

- Guarded export preparation so preflight/storage failures show a product-safe message before any job is queued.
- Disabled export retries while another export is preparing or rendering.
- Added a lightweight export preparation resilience check to the focused verification suite.

## 2026-05-14 - Recording Resilience

- Replaced raw browser recording errors with product-safe screen and camera permission messages.
- Guarded recording stop/save so empty captures and local save failures show clean errors and release media streams.
- Added a lightweight recording resilience check to the focused verification suite.

## 2026-05-14 - Review Workspace Resilience

- Added product-safe failure messages for review comments, folder assignment, share link creation, and workspace member actions.
- Disabled review workspace actions while another local collaboration action is running to avoid double-submits.
- Added a lightweight review workspace resilience check to the focused verification suite.

## 2026-05-14 - Media Import Resilience

- Browser media imports now keep successful files when another selected file fails.
- Media panel import, desktop import, and reconnect failures now share product-safe status messaging.
- Added a lightweight media import resilience check to the focused verification suite.

## 2026-05-14 - Editor Boot Resilience

- Added product-safe editor notices when a saved local project cannot be opened.
- Added product-safe editor notices when local media recovery leaves files missing.
- Added a lightweight editor boot resilience check to the focused verification suite.

## 2026-05-14 - Editor Playback And Save Wiring

- Added a real timeline playback clock so the play button advances the playhead and stops at project end.
- Synchronized preview video, audio, and subtitle rendering to timeline time.
- Replaced the decorative save indicator with a manual local save button and refreshed local project save timestamps.

## 2026-05-14 - Product Language Cleanup

- Removed vendor and implementation names from user-facing dashboard, settings, media import, AI panel, metadata, and auth app labels.
- Sanitized unexpected AI route failures so provider errors do not leak directly into the editor UI.
- Renamed product-facing surfaces to Essence Studio while keeping internal package and database identifiers stable.

## 2026-05-14 - Editor Command Hardening

- Added global editor shortcuts for playback, undo, redo, duplicate, delete, and local save.
- Made delete, duplicate, and split operate on all selected editable layers instead of only the last selected layer.
- Made locked layers resist timeline dragging, trimming, splitting, deletion, and duplication from shared commands.
- Disabled undo and redo controls when no matching history is available.

## 2026-05-14 - Missing Media Recovery

- Added one-shot media restore attempts so missing local assets do not trigger repeated restore loops.
- Added missing-media badges and a reconnect action in the media bin that preserves existing timeline asset IDs.
- Added missing-media canvas placeholders so broken assets are visible instead of silently rendering as normal layers.

## 2026-05-14 - Export Preflight Validation

- Added export preflight checks for visible layers, project duration, browser recording support, missing source media, and unavailable local media blobs.
- Blocked unsupported audio-only video/GIF exports before starting a render job.
- Added inline export readiness messages so users can fix issues before retrying a render.

## 2026-05-14 - Project Bundle Import

- Added local project bundle import from the dashboard so downloaded backups can be restored into the project library.
- Updated project bundle exports to use a `mediaAssets` payload and an Essence Studio filename while keeping import compatibility with older `assets` payloads.
- Imported bundles preserve timeline asset IDs so missing media can be reconnected without breaking layer references.

## 2026-05-14 - Browser Workflow Verification

- Verified browser upload, timeline add, local save, dashboard reopen, project-bundle export, bundle import, missing-media recovery visibility, account creation, and an authenticated AI edit-plan action.
- Fixed auth client routing so local and deployed auth calls use the current app origin instead of a stale configured host.

## 2026-05-14 - Durable Media Recovery Checks

- Extracted missing-media recovery selection and restore attempts into a reusable service shared by browser and desktop local-media sources.
- Added a lightweight media recovery scenario check that verifies restored browser media, unavailable desktop media, and duplicate-attempt suppression.

## 2026-05-14 - Composite Export Planning Checks

- Added a pure composite render manifest that centralizes output size, frame rate, layer ordering, visual/audio grouping, and missing-media detection for canvas exports.
- Added a lightweight multi-track export scenario check covering video, audio, text, subtitles, shapes, hidden layers, missing media, and single-media fallback planning.

## 2026-05-14 - Safe AI Usage Review

- Added a settings usage review that shows signed-in users recent AI actions, remaining limits, and retry status without exposing provider names, model IDs, or raw error details.
- Added a lightweight sanitization check that guards against leaking provider/model/error fields from AI usage review events.

## 2026-05-14 - Desktop Workflow Preflight

- Renamed the Tauri desktop app chrome to Essence Studio and replaced the default Tauri package description.
- Added a lightweight desktop workflow preflight that verifies Tauri static export settings, permissions, desktop import, media restore, and desktop media export wiring without launching or building the app.

## 2026-05-14 - Lightweight Verification Command

- Added `bun run check:light` to run focused recovery, export-planning, AI-usage, Tauri-workflow checks plus typecheck without build, lint, or formatting.

## 2026-05-14 - Desktop Media Import Hardening

- Extracted desktop media extension, filename, MIME, and safe-error helpers into a pure module shared by the Tauri import path and lightweight checks.
- Hardened desktop import to reject unsupported file paths before reading and to show safe user-facing import failures.
- Desktop imports now copy selected files into app-local storage and keep legacy absolute-path assets readable for older saved projects.
- Tauri permissions now explicitly allow recursive app-local media reads and writes needed for durable desktop projects.
- Tauri permissions now cover common user media and export folders so native import/export writes are not blocked by filesystem scope checks.
- Desktop batch imports now keep successful files when some selected files fail and show a safe partial-import message.
- Desktop imports now validate media metadata before copying files into durable storage, avoiding orphaned files from corrupt selections.

## 2026-05-14 - Product Language Guard

- Added a lightweight TSX UI text check that fails if visible product surfaces reintroduce vendor names or implementation labels.

## 2026-05-14 - Desktop Export Save Wiring

- Added a shared rendered-output saver that uses native Tauri save dialogs and filesystem writes in desktop while preserving browser downloads on the web.
- Added lightweight export-output checks for safe filenames, MIME types, save filters, and project bundle filenames.
- Rendered media exports now use the project title for filenames instead of generic output names.
- Export history rows now use the same safe filenames as the files being saved, including project bundles.
- Native save-dialog cancellation now marks the export job as cancelled instead of complete.

## 2026-05-14 - Static Export Safety

- Guarded the server-backed settings usage review during Tauri static frontend export so desktop packaging does not need a request session while rendering static pages.
- Added a lightweight static-export safety check for the settings page and Next.js export configuration.
- Added a client API origin guard so desktop-static AI, account, and signed-in project actions either call a configured web API or show a clean unavailable state.
- Added trusted CORS responses for auth, AI, and project sync APIs so configured desktop builds can call the deployed web API with credentials.
- Added behavioral CORS checks and sanitized client-side creative AI failures so network/parser errors do not leak into the editor UI.
- Moved desktop and online-service availability checks behind mounted runtime hooks to avoid static desktop hydration mismatches.
- Made online-service runtime hooks use deterministic first-render state before mounted desktop detection updates the UI.

## 2026-05-13

- Initialized `G:\Kapwing` as a git project.
- Scaffolded Essence Kapwing with Next.js 16, React 19, Bun, Tailwind CSS 4, shadcn/ui, and Tauri 2.
- Created the Turso database `essence-kapwing` through the WSL Turso CLI and wrote local credentials to ignored `.env.local`.
- Added Better Auth, Drizzle, Turso, Vercel AI SDK v6, FFmpeg/WASM, Dexie, Zustand, and Tauri desktop dependencies.
- Added the first production architecture: auth/db schema, local media storage, render planning, AI structured generation, and a local-first editor MVP.
- Generated and applied the initial Drizzle migration to the Turso database.
- Verified the current TypeScript surface with `bun run typecheck`.

## 2026-05-13 - Project Library And Capture

- Added a Dexie-backed local project library with autosave, dashboard search, sort, open, duplicate, and delete flows.
- Added browser screen and camera recording controls that save recordings into the editable media bin.
- Added SRT/VTT subtitle parsing and export utilities, plus caption import/export controls in the inspector.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Timeline Interaction Pass

- Added timeline drag-to-move, drag-to-trim-start, and drag-to-trim-end interactions with quarter-second snapping.
- Added shift-click multi-select and multi-layer timeline movement.
- Added transcript TXT export for subtitle layers beside SRT and VTT export.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Audio And Timeline Guides

- Added browser audio waveform extraction for imported audio assets.
- Added audio preview controls and waveform display in the media bin.
- Added waveform display on audio timeline clips.
- Added visible timeline snap/grid guides for quarter-second and one-second marks.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Authenticated Project Sync

- Added Better Auth session-gated project list, save, load, and delete API routes backed by Turso.
- Added project payload validation for editor projects and local media metadata.
- Added editor and dashboard controls to sync local projects to signed-in cloud metadata.
- Added dashboard cloud project refresh, open, metadata-local-save, and delete flows.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Templates And Brand Tools

- Added real editor template presets for meme captions, lower thirds, product spotlights, and split-screen layouts.
- Added reusable sticker presets that create editable timeline layers.
- Added persistent brand colors with apply-to-selected editing.
- Added canvas safe-zone overlays for action/title framing and thirds.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - AI Editing Actions

- Added AI transcript cleanup, smart cut suggestions, and brand-aware subtitle styling actions through the existing Vercel AI SDK route.
- Added brand colors and current project transcript context to editor AI requests.
- Added AI Elements message rendering for generated editor text instead of raw JSON output.
- Added apply-to-timeline behavior for generated captions and subtitle styles.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - AI Usage Controls

- Added authenticated AI usage logging for editor AI requests, including model, action, status, prompt size, output size, and errors.
- Added hourly and daily per-user AI usage limits with configurable `AI_HOURLY_LIMIT` and `AI_DAILY_LIMIT` environment overrides.
- Required signed-in sessions for editor AI requests.
- Generated and applied the Turso migration for `ai_usage_events`.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Export Presets And Controls

- Expanded export presets across MP4, WebM, GIF, compressed, vertical, square, and project-bundle outputs.
- Added trim-aware FFmpeg render arguments for single-media exports.
- Added FFmpeg progress updates, cancel support, and retry actions for failed or cancelled export jobs.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - Composite Browser Rendering

- Added a canvas-based composite renderer for layered projects with text, subtitles, shapes, stickers, images, videos, and audio/video media tracks.
- Added WebM recording through `MediaRecorder`, with MP4/GIF transcode through the existing FFmpeg/WASM path.
- Wired composite render plans into the export panel so layered projects can use the same export queue, progress, cancel, and retry flow.
- Verified the batch with `bun run typecheck`.

## 2026-05-13 - AI Image Assets

- Added an AI image action through Vercel AI SDK `generateImage` and AI Gateway image models.
- Returned generated image bytes from the editor AI route as validated media payloads.
- Saved generated images into the local browser media store and added them to the canvas as editable image layers.
- Added generated image previews to the AI result panel.

## 2026-05-13 - Meme Generator

- Added a meme generator in the creation panel with background media selection, top/bottom text, duration, and style controls.
- Added domain layer creation for meme scenes so generated memes become real editable background and text timeline layers.

## 2026-05-13 - Media Layout Tools

- Added collage, split-screen, slideshow, montage, and image-to-video creation modes for imported images and videos.
- Added a focused media layout panel with asset selection, layout mode selection, and per-clip duration controls.
- Split meme generation into its own component and kept the main creation panel small.

## 2026-05-13 - Collaboration Lite

- Added a review workspace dialog with timestamped comments, resolve states, project folder assignment, local review links, workspace members, and export history.
- Added a local collaboration metadata store backed by IndexedDB.
- Added editor support for opening local project review links with `?project=...` URLs.

## 2026-05-13 - Final Verification Pass

- Fixed lint findings in preview, media storage, composite rendering, and review workspace code.
- Verified the completed feature set with `bun run lint`, `bun run typecheck`, and one final `bun run build`.
- Deployed production with Vercel CLI at `https://essence-kapwing.vercel.app` after replacing BOM-contaminated env vars with clean values.
- Smoke-checked `/`, `/editor`, `/auth`, and `/dashboard` on the production alias.

## 2026-05-14 - Lightweight Error Pass

- Verified the TypeScript surface with `bun run typecheck`.
- Verified the Tauri Rust surface with `cargo check`.
- Added the generated Tauri `Cargo.lock` for reproducible desktop dependency resolution.

## 2026-05-14 - Tauri Static Frontend Path

- Added a desktop-only static export build path for Tauri using `TAURI_STATIC_EXPORT=1`.
- Updated Tauri packaging to consume Next's `out/` directory instead of the server-oriented `.next` directory.
- Left the normal Next/Vercel build path unchanged for API routes, Better Auth, Turso sync, and AI endpoints.

## 2026-05-14 - Tauri Media Import Reliability

- Fixed desktop media imports so file type detection uses extension-based MIME types instead of empty browser `File.type` values.
- Added object URL restoration for Tauri file assets when reopening local projects.
- Re-verified with `bun run typecheck` and `cargo check`.

## 2026-05-14 - Tauri Export Media Blobs

- Added duration, dimensions, and waveform metadata extraction for Tauri media imports.
- Fixed single-media FFmpeg exports so desktop file assets are read from the Tauri filesystem instead of only browser IndexedDB.
- Fixed composite canvas exports to recover missing desktop object URLs from Tauri filesystem storage.
- Kept the normal browser media export path unchanged.

## 2026-05-14 - Project Sync Ownership Guard

- Replaced project metadata upserts with owner-checked insert/update behavior.
- Added a 403 access response for project sync attempts against projects owned by another account.
- Scoped media metadata replacement by project and owner.

## 2026-05-14 - Auth Client Error Handling

- Fixed email/password auth feedback so Better Auth returned errors are shown instead of being treated as success.
- Removed the browser auth client's localhost fallback so deployed clients use the current origin unless `NEXT_PUBLIC_APP_URL` is set.

## 2026-05-14 - Auth Origin Hardening

- Made Better Auth server origin handling derive from `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and Vercel deployment URL envs.
- Kept localhost trusted for local development while avoiding a production-only dependency on `NEXT_PUBLIC_APP_URL`.

## 2026-05-14 - Local FFmpeg Core Assets

- Added a prepare script that copies FFmpeg core JS/WASM assets from `@ffmpeg/core` into `public/ffmpeg`.
- Updated browser rendering to load same-origin FFmpeg assets instead of depending on the public unpkg CDN at export time.
- Wired FFmpeg asset preparation into dev, Next build, and Tauri frontend build scripts.

## 2026-05-14 - Groq AI Default Provider

- Added the AI SDK Groq provider and made Groq the default for text-based editor AI actions when `GROQ_API_KEY` is set.
- Defaulted Groq text actions to `openai/gpt-oss-120b`, which is available on the configured account.
- Kept Vercel AI Gateway as the fallback text provider and the provider for image generation.
- Updated settings and environment docs for `GROQ_API_KEY`, `GROQ_MODEL`, and the remaining image-generation Gateway requirement.

## 2026-05-14 - AI Usage Logging Resilience

- Made AI usage logging retry without a project foreign key when editor requests come from local-only projects.
- Preserved per-user AI rate-limit accounting while avoiding failures for unsynced project ids.

## 2026-05-14 - Desktop Online Action Guards

- Mapped fast-click desktop online-action failures to product-safe unavailable messages before mounted runtime state settles.
- Expanded the focused runtime guard check across auth, sync, dashboard, and AI surfaces.

## 2026-05-14 - Starter Asset Cleanup

- Removed unused default scaffold SVG assets from the public bundle.

## 2026-05-14 - AI Result Contract Hardening

- Split AI result contracts and runtime guards out of the AI result view component.
- Rejected malformed generated caption chunks before they can be applied to the timeline.
- Added a lightweight AI result contract check to the focused verification suite.

## 2026-05-14 - Project Bundle Import Hardening

- Added a typed project bundle reader with JSON file and size validation before parsing.
- Routed dashboard bundle imports through the shared parser instead of parsing selected files inline.
- Added a lightweight project bundle import check to the focused verification suite.

## 2026-05-14 - Export Failure Hardening

- Added typed render errors for unsupported presets, missing source media, and render engine failures.
- Routed export job failures through product-safe failure messages instead of renderer implementation details.
- Extended the export helper check to cover sanitized render failure output.

## 2026-05-14 - Project Sync Response Hardening

- Added client-side response validation for signed-in project list, save, load, and delete operations.
- Converted malformed or non-JSON sync responses into safe project sync failures before local state is updated.
- Extended the client API guard check to cover the project sync response parser.

## 2026-05-14 - Project Schema Bounds

- Added finite bounds for synced project dimensions, timing, captions, layer transforms, media sizes, and waveform metadata.
- Rejected reversed caption ranges and oversized imported project payloads before they can be saved locally or synced.
- Added a lightweight project schema check to the focused verification suite.

## 2026-05-14 - API JSON Request Hardening

- Added a shared JSON request parser for API routes that accepts JSON bodies and converts malformed bodies into clean 400 responses.
- Routed AI editing and project sync POST handlers through the safe parser.
- Extended the API guard check to cover invalid JSON handling.

## 2026-05-14 - Project Route Id Hardening

- Added validation for signed-in project route ids before database access.
- Returned clean 400 responses for malformed project ids on load and delete routes.
- Extended the API guard check to cover project id validation.

## 2026-05-14 - Local Project Record Hardening

- Added a shared local project record schema for autosave, local library listing, project loading, and duplication.
- Stripped transient media object URLs before local project records are saved.
- Added a lightweight local project record check to the focused verification suite.

## 2026-05-14 - Desktop CSP Hardening

- Replaced the disabled Tauri CSP with a scoped policy for the static app shell.
- Allowed only the media, worker, FFmpeg WASM, and online API sources needed by the desktop editor.
- Extended the Tauri workflow preflight to keep the desktop CSP in place.

## 2026-05-14 - Secret Hygiene Guard

- Added a tracked-source secret hygiene check for common API keys and auth tokens.
- Added the secret guard to the lightweight verification suite so credentials do not quietly land in commits.

## 2026-05-14 - Safe Local Save Guard

- Added a safe local save wrapper for autosave, keyboard save, and cloud-summary metadata saves.
- Prevented fire-and-forget local persistence failures from becoming unhandled promise rejections.
- Added a lightweight safe local save check to the focused verification suite.

## 2026-05-14 - Fire-And-Forget Safety

- Guarded dashboard local-library refresh failures with a visible local-library message.
- Guarded audio preview playback rejections and paused preview audio on cleanup.
- Added a lightweight fire-and-forget safety check to the focused verification suite.
