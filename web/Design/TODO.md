# Essence Studio TODO

Current date: 2026-05-19

## Current Status

Completed advanced creation, image, vector, print, editing, data, publishing depth, production readiness, desktop, workflow scale, operational hardening, team scale, marketplace depth, collaboration, automation, enterprise polish, visual suite parity, template scale, enterprise publishing and asset operations, advanced interactive creation and marketplace growth, professional studio scale and ecosystem depth, advanced creator operations and quality scale, advanced platform reliability and marketplace intelligence, enterprise admin scale and workflow governance, advanced enterprise workflow intelligence and platform depth, advanced creative operations and collaboration runtime depth, advanced creative platform intelligence and production depth, advanced production execution and offline-first scale, advanced data-backed creation and distribution scale, advanced pro workflow and insight depth, advanced extensibility and production collaboration depth, advanced production studio governance and automation scale, and advanced creation assistance and delivery workflow scale milestone status: 100/100. Current active advanced studio asset creation and publishing utility milestone status: 16/100.

Essence Studio has a deployed, usable web foundation with real auth, dashboard, editor, assets, brand kit, collaboration, imports, exports, publishing, email, whiteboard, presentation, media, data, localization, desktop-shell, and architecture-simplification work in place. The compact capability matrix now lives in `FEATURES.md`; this TODO should stay focused on missing Canva-level gaps and the next implementation work.

It does not yet have full Canva parity. The previous 100/100 scores were milestone scores, not full Canva feature parity. `FEATURES.md` summarizes what is real versus partial; this file remains the roadmap for what must be built next.

## Sources Checked

- Canva Visual Suite: https://www.canva.com/visual-suite/
- Canva features index: https://www.canva.com/features/
- Canva create index: https://www.canva.com/create/
- Canva Create 2025 / Visual Suite 2.0: https://www.canva.com/newsroom/news/canva-create-2025/

## Completed 100-Point Feature Set: Template And Campaign Systems

Status: 100/100.

- [x] Build a larger first-party template taxonomy across social, website, presentation, document, email, print, and whiteboard formats; first pass now ships searchable original starter templates across the major formats and creates real editable projects from them.
- [x] Add searchable template preview/detail pages with tags, dimensions, usage notes, and related templates; first pass now adds routed starter detail pages, metadata panels, related templates, and use-template creation from detail pages.
- [x] Add campaign boards that connect one brief, one brand kit, and multiple deliverables; first pass now persists campaign boards with brief, launch date, brand-kit snapshot, and deliverables linked to existing projects.
- [x] Add derivative management so source designs can spawn tracked variants with refreshable source metadata; first pass now surfaces dashboard derivative boards, refreshes stored source metadata for resized variants, and bulk-generates missing campaign variants from campaign board sources.
- [x] Add template locking rules for brand-safe editable regions; first pass now applies structural locks to generated catalog templates, records lock summary metadata, and shows lock counts/rules on template detail pages.
- [x] Add template collections, campaign starter packs, and recommended multi-format paths; first pass now ships routed starter-pack collections with dashboard recommendations and per-template pack links.

## Completed 100-Point Feature Set: Review, Approval, And Publishing Workflows

Status: 100/100.

- [x] Add assigned tasks from comments with owner, due date, status, and dashboard task views; first pass now creates review tasks from editor comments, stores owner/due/status metadata, shows task badges in comments, and adds a dashboard task view with status updates.
- [x] Add review and approval states for designs, templates, and campaign deliverables; first pass now stores approval status on projects, saved templates, and campaign deliverables with dashboard update controls and status badges.
- [x] Add calendar drag/drop rescheduling for planned publishing items; first pass now ships a persisted publishing calendar with native drag/drop day moves and a compact manual reschedule control.
- [x] Add bulk schedule and bulk download workflows across selected campaign deliverables; first pass now lets selected deliverables schedule into the content planner with cadence and download a campaign handoff ZIP with manifest, CSV, and thumbnails when available.
- [x] Add workspace audit logs for key project, campaign, team, publishing, and auth actions; first pass now persists activity records and shows recent workspace changes in the dashboard.
- [x] Add Slack or Microsoft Teams notification hooks for review requests and publishing changes; first pass now sends env-gated Slack and Teams webhook messages for review updates plus publishing schedule/status changes.

## Completed 100-Point Feature Set: Advanced Creation, Image, Vector, And Print Production

Status: 100/100.

- [x] Add browser-local foreground cutout and background mask editing for uploaded images; first pass now applies a real client-side color-key alpha cutout from selected image layers, stores reversible original sources, and exposes tolerance, feather, invert, and restore controls.
- [x] Add freehand draw, pen, highlighter, and eraser tools with editable stroke layers; first pass now adds toolbar draw modes, pointer-captured canvas stroke creation, SVG-rendered editable draw layers, highlighter/eraser presets, layer labels, and stroke property controls.
- [x] Add Bezier path editing for custom vector shapes; first pass now adds editable Bezier path layers with curve/blob/wave geometry, create-panel and command-palette insertion, SVG rendering, fill/stroke controls, closed/open mode, and numeric start/control/end point editing.
- [x] Add advanced gradients, pattern fills, and reusable texture fills; first pass now gives shape and Bezier path layers solid, linear-gradient, radial-gradient, pattern, and texture fill modes with reusable property controls and SVG/CSS rendering.
- [x] Add print product proof previews for cards, labels, posters, stickers, and packaging-style flat mockups; first pass now opens a real editor proof sheet that renders the active page into card, label, poster, sticker, and packaging flat previews.
- [x] Add print preflight checks for DPI, safe area, bleed, transparent backgrounds, and export readiness; first pass now scores print readiness for the active proof page with resolution, safe-area, bleed, background, and export checks.

## Completed 100-Point Feature Set: Advanced Editing, Data, And Publishing Depth

Status: 100/100.

- [x] Add boolean shape operations for union, subtract, intersect, and exclude across selected shape/path layers; first pass now replaces selected closed shape/path layers with a reusable boolean vector result, preserves source path metadata, supports mask-rendered subtract/intersect, and exposes command-palette actions.
- [x] Add browser-local object erase, clone, and heal tools for uploaded images without AI dependencies; first pass now applies canvas-based erase, clone, and heal retouches to selected image layers with target/source controls, brush sizing, softness, reversible restore, and focused pixel tests.
- [x] Add richer document editing with flowing text blocks, headings, columns, page breaks, document outline, and comments; first pass now adds editable document layers with block-level headings, subheadings, paragraphs, quotes, page breaks, outline, per-block comments, column controls, brand-kit awareness, translation-pack support, and DOCX export.
- [x] Add multi-sheet spreadsheet grids with cross-sheet formulas and sheet tabs; first pass now adds workbook tabs to table layers, active-sheet switching, add/copy/rename/remove sheet controls, cross-sheet formulas such as `Data!A1` and `'Raw Data'!B2`, focused workbook tests, and XLSX import/export preservation for sheet-backed tables.
- [x] Add email-client QA checks, hosted image handling, and reusable email content blocks; first pass now adds reusable email block packs, hosted asset URLs for data-url design images, preview-side QA scoring, and focused email tests.
- [x] Add workshop reactions, facilitator controls, participant summaries, and session analytics; first pass now persists page-level workshop session state, reaction counts, spotlight focus, facilitator notes, participant count, derived summaries, canvas signal badges, and focused workshop analytics tests.

## Completed 100-Point Feature Set: Production Readiness, Desktop, And Workflow Scale

Status: 100/100.

- [x] Add browser-local autosave recovery, offline draft snapshots, and conflict restore for unsaved editor work; first pass now writes dirty editor snapshots to browser storage, detects reloadable unsaved drafts, warns when the server base changed, restores local drafts into the editor, and clears stale snapshots after successful saves.
- [x] Add Tauri desktop file-bridge workflows for open/save-as, recent projects, and offline asset cache; first pass now adds Rust desktop bridge commands for local design files, recent-file persistence, and data-url offline asset caching, plus an editor desktop dialog that is only exposed inside the Tauri runtime.
- [x] Add project asset manifest storage with image/data-url dedupe, size limits, and hosted export reuse; first pass now stores compact deduped project asset manifests on saves/syncs/templates/desktop files, serves reusable hosted project asset URLs, and reuses stable asset IDs for email exports.
- [x] Add export job history with progress, retry, downloadable artifacts, and failure diagnostics; first pass now tracks project-scoped browser export jobs, shows progress and failed counts in the editor toolbar, opens a shadcn export-jobs sheet, stores recent jobs locally, and lets completed/failed jobs run again.
- [x] Add large-document performance improvements for layer lists, page thumbnails, and workshop/media panels; first pass now renders bounded panel windows by default, keeps selected/active items visible, and lets users expand/collapse full layer, page, workshop, and media clip lists.
- [x] Add production security and permission audits for share links, public assets, email assets, and workspace actions; first pass now validates public/edit share tokens before lookup, hardens public asset and audience response headers, rejects unsafe public asset identifiers, and validates edit-share write access before workspace mutations.

## Completed 100-Point Feature Set: Operational Hardening, Team Scale, And Marketplace Depth

Status: 100/100.

- [x] Add asset quota dashboards, storage cleanup, and duplicate cleanup workflows for user, brand, and project assets; first pass now audits uploads, brand logos, and saved project asset manifests, shows quota/scope/duplicate/largest-asset panels in the dashboard, deletes individual upload/logo duplicates, and runs duplicate cleanup with audit logging.
- [x] Add durable server export jobs with stored artifacts, resumable status polling, and dashboard access beyond browser-local history; first pass now persists export jobs in Turso, syncs browser export progress/failure/completion through API routes, stores small downloadable artifacts under a database safety cap, and shows durable export history in the dashboard.
- [x] Add first-party template marketplace/admin workflows with draft, review, publish, seasonal collections, and usage analytics; first pass now stores marketplace status, collection, season, review notes, publish timestamps, and use/view counters on saved templates, adds admin curation controls, and increments usage when templates create designs.
- [x] Add project-level roles and permission presets for owner, editor, commenter, viewer, and public/audience access; first pass now defines owner/editor/commenter/viewer/audience presets, upgrades private share links to viewer/commenter/editor permissions, allows comments/presence for commenter and editor links, and keeps document writes edit-only.
- [x] Add an operational health center for database, auth, email, storage, Vercel deployment, and Tauri desktop checks; first pass now adds an admin health tab with grouped database, auth, email, storage, Vercel runtime, and Tauri source checks, pure scoring helpers, and targeted tests.
- [x] Add project audit center for accessibility, SEO, brand guardrails, print readiness, email QA, and website readiness in one route; first pass now audits active projects across six production dimensions, reuses existing audit engines, and shows a dashboard readiness panel with per-project scores.

## Completed 100-Point Feature Set: Collaboration, Automation, And Enterprise Polish

Status: 100/100.

- [x] Add project handoff packets with export bundles, readiness reports, stakeholder notes, and approval history; first pass now derives dashboard handoff packets from active projects, audit scores, durable export jobs, stakeholder comments/tasks, and approval audit events with downloadable JSON packet artifacts.
- [x] Add team member management with role changes, invite revocation, workspace ownership transfer, and member activity views; first pass now shows workspace members, pending invites, recent team audit activity, owner-only member role changes, invite revocation, and ownership transfer actions.
- [x] Add reusable automation recipes for scheduled exports, content publishing reminders, review nudges, and recurring campaign tasks; first pass now ships a dashboard recipe center that queues PDF handoff export requests, creates publishing reminder planner items, sends review nudge notifications, and bulk-schedules campaign deliverables with cadence controls.
- [x] Add template marketplace discovery upgrades with featured collections, creator attribution, install/save analytics, and quality gates; first pass now ranks published templates, shows collection rails, attributes creators, tracks marketplace views, reuses install/use counts, and surfaces release quality gates.
- [x] Add organization-level design governance with reusable brand rules, locked template regions, approval policies, and audit trails; first pass now scores brand colors, typography, logo coverage, governed templates, lock rules, project/template approvals, and governance audit events in the team workspace.
- [x] Add production observability views for slow exports, failed email sends, publish errors, storage growth, and collaboration conflicts; first pass now aggregates durable export job health, transactional email delivery, website publishing/domain errors, storage growth, and collaboration task pressure in one dashboard panel.

## Completed 100-Point Feature Set: Visual Suite Parity And Template Scale

Status: 100/100.

- [x] Add mixed-format project orchestration with page-type aware readiness for docs, sheets, whiteboards, presentations, social posts, videos, websites, email, and print pages in one project; first pass now reads actual project documents, classifies page types, scores readiness, shows visual-suite coverage, and suggests next actions for mixed-format projects.
- [x] Expand the first-party template marketplace with deeper category, industry, season, platform, and format discovery plus original asset provenance notes; first pass now adds industry/season/platform filters, catalog discovery facets, provenance coverage, and original asset notes on catalog cards and detail pages.
- [x] Add PDF-to-editable-document conversion for text blocks, images, page sections, and reconstructed document outlines without AI dependencies; first pass now keeps each PDF page as a locked visual reference image, extracts readable PDF text into editable text layers, reconstructs heading-sized outline notes, and reports text/image/outline counts after import.
- [x] Add spreadsheet UX depth with larger-grid navigation, range selection, fill handles, formula browser, and sheet-level validation; first pass now raises workbook table limits, adds range selection with fill-down/fill-right/clear actions, ships a formula browser with insertable examples, and scores sheet validation for headers, formulas, filters, workbook sheets, and grid size.
- [x] Add video and motion timeline production controls with scene transitions, captions, audio ducking, and export readiness checks; first pass now scores media timelines for clips, video, captions, transitions, audio ducking, and timeline structure, adds one-click audio ducking keyframes, and includes readiness metadata in media sequence exports.
- [x] Add reusable workspace integration surfaces for import/export handoffs, template installation shelves, and production review queues; first pass now combines handoff packets, durable export jobs, marketplace/team/brand template shelves, audit failures, review tasks, and template approvals into one dashboard integration surface with next actions.

## Completed 100-Point Feature Set: Enterprise Publishing And Asset Operations

Status: 100/100.

- [x] Add deeper asset library operations with collections, license/usage tracking, project references, bulk moves, and reusable asset shelves; first pass now exposes audited asset records, derives collection coverage, license review queues, project reference hot spots, bulk-safe move groups, and reusable brand/template/published shelves in the dashboard.
- [x] Add multi-brand workspace controls with brand-kit switching, brand approval gates, and brand-specific template visibility; first pass now derives workspace, team, and published brand kits from saved brand assets, projects, audits, and templates, adds brand approval gates, template visibility rules, kit switching, and dashboard next actions.
- [x] Add publishing channel depth for social, website, email, and campaign deliverables with reusable channel presets and analytics rollups; first pass now derives social, website, email, and campaign rollups from planner items, campaign deliverables, published sites, website analytics, and form submissions, adds reusable channel presets, readiness checks, queue views, and dashboard next actions.
- [x] Add reviewer and collaborator role depth with review-only links, approval queues, assignment filters, and workspace-level review reporting; first pass now derives review-only link coverage, editable-share risks, project/template/campaign approval queues, assignee workload filters, overdue task pressure, recent review audit activity, and dashboard next actions.
- [x] Add admin operations for template, asset, domain, email, and export moderation with bulk actions and audit-safe activity trails; first pass now derives template, asset, domain, email, and export moderation queues, exposes duplicate-asset cleanup and domain verify/attach/refresh action cards, summarizes guided template/email/export moderation plans, and shows area-specific audit trails.
- [x] Add desktop/offline sync queues with conflict resolution, resumable uploads, and local-to-cloud handoff diagnostics; first pass now derives dashboard sync queues from active projects, editable-share conflict risk, project asset manifests, skipped asset references, durable export jobs, and audit activity, with diagnostics for local-to-cloud manifests, resumable uploads, conflict guards, export handoff, and audit visibility.

## Completed 100-Point Feature Set: Advanced Interactive Creation And Marketplace Growth

Status: 100/100.

- [x] Add an advanced animation/keyframe editor with reusable motion presets, easing controls, timeline grouping, and export readiness diagnostics; first pass now ships reusable motion packs, pack-aware keyframe generation, motion group IDs, staggered group update helpers, page-level motion readiness scoring, export readiness diagnostics in the media timeline, and motion readiness metadata in media sequence exports.
- [x] Add richer photo selection and batch-edit workflows with browser-local magic brush refinement, color range selection, object bounding regions, and non-destructive presets; first pass now ships selection metadata for image layers, reusable non-destructive photo presets, browser-local magic brush alpha refinement, color range selection helpers, object region framing, batch preset update helpers, and focused pixel tests.
- [x] Add deeper whiteboard facilitation packs with reusable workshop boards, facilitator scripts, breakout sections, timed agenda blocks, and exportable session summaries; first pass now ships saved facilitation pack metadata, original workshop board generators, agenda and breakout structures, recap capture, markdown session summary downloads, and focused workshop pack tests.
- [x] Add marketplace growth features with favorites, saved creators, rating/review signals, install history, offline template packs, and quality moderation dashboards; first pass now adds a local marketplace growth center with favorite shelves, saved creators, derived ratings/review signals, install history, downloadable offline pack manifests, and moderation queues.
- [x] Add brand-safe remix workflows that can swap formats, themes, colors, and content slots without AI services while preserving locked template rules; first pass now adds deterministic starter remix options, format/theme/content-slot swaps, lock-safe remixed document creation, remix metadata, and detail-page remix forms.
- [x] Add pro data visualization depth with dashboard templates, reusable chart themes, live data refresh diagnostics, and publish-ready report handoff bundles; first pass now adds generated dashboard/report templates, chart theme controls, data refresh diagnostics, and downloadable report handoff bundles.

## Completed 100-Point Feature Set: Professional Studio Scale And Ecosystem Depth

Status: 100/100.

- [x] Add project knowledge packs with reusable briefs, audience profiles, constraints, references, and decision logs that attach to designs without external AI services; first pass now stores typed knowledge packs in design metadata, exposes a shadcn editor panel with reusable templates and structured editing, scores handoff readiness, and exports markdown packets.
- [x] Add advanced asset provenance and licensing review with source lineage, expiration reminders, usage impact, and export-safe warnings; first pass now carries source/license metadata through asset audits, scores export-safe provenance, surfaces attribution/missing-source/review-due/skipped-reference warnings, and adds a dashboard provenance review panel.
- [x] Add editor command automation with reusable macros for batch layer edits, export preparation, publishing setup, and QA checks; first pass now adds command-palette macros for layer tidying, export prep, publishing metadata setup, and production QA checks with persisted run history and issue metadata.
- [x] Add deeper publishing analytics workspaces with multi-channel goals, performance snapshots, anomaly notes, and stakeholder-ready review packets; first pass now derives channel goals, performance snapshots, anomaly notes, and stakeholder review packets from the real publishing channel center.
- [x] Add workspace package/version operations with project bundles, reusable component kits, dependency health, and import/export migration checks; first pass now lists workspace project snapshots, scores package bundles, reusable template kits, source/version/export dependencies, and migration runway checks in a dashboard operations panel.
- [x] Add production-grade accessibility and localization finishing tools with page-level issue routing, copy-length checks, translation QA, and handoff exports; first pass now scores saved project documents for page issues, long copy, translation-pack readiness, and downloadable finishing packets in the dashboard.

## Completed 100-Point Feature Set: Advanced Creator Operations And Quality Scale

Status: 100/100.

- [x] Add client portal rooms with approval-safe project views, scoped comments, handoff packet downloads, and reviewer activity history; first pass now derives client rooms from real project share links, approval state, review tasks, handoff packets, and audit history in the team dashboard.
- [x] Add template and component package registry depth with semantic versions, changelogs, install/update/rollback checks, and workspace package dependency views; first pass now derives template package releases, changelog activity, dependency mappings, and install/update/rollback readiness from real templates, projects, versions, and audit logs.
- [x] Add workspace-wide search and command center across projects, assets, templates, comments, tasks, exports, and saved filters; first pass now indexes real workspace entities, supports useful query filtering, provides saved filter chips, and surfaces recommended review/recovery commands in the studio dashboard.
- [x] Add analytics attribution and experiment views for websites, email, publishing channels, campaigns, and reusable content variants; first pass now extends the publishing analytics workspace with attribution sources, website/email/campaign experiments, and reusable variant experiment views.
- [x] Add compliance and privacy operations with consent capture, export/delete account data packets, audit retention settings, and public-form safety checks; first pass now adds a security-tab privacy operations center with downloadable account packets, consent scoring, sensitive field checks, and audit retention review.
- [x] Add desktop production queue depth with offline batch exports, watched folders, resumable cloud sync, and local file integrity diagnostics; first pass now expands the desktop sync queue with batch export gaps, watched-folder coverage, resumable upload visibility, and local file integrity checks.

## Completed 100-Point Feature Set: Advanced Platform Reliability And Marketplace Intelligence

Status: 100/100.

- [x] Add release readiness gates with route coverage, environment checks, migration drift, seeded account verification, and Vercel deployment confidence packets; first pass now adds a dashboard release gate center with route smoke data requirements, admin health checks, snapshot/export drift, seeded admin verification, and downloadable Vercel confidence packets.
- [x] Add marketplace intelligence dashboards with template demand signals, creator quality trends, collection gaps, moderation SLA views, and install cohort analytics; first pass now derives those signals from real template marketplace metadata and workspace audit logs, adds focused model tests, and surfaces the intelligence center in the studio dashboard.
- [x] Add project dependency graph explorer across source designs, variants, packages, exports, websites, campaigns, and public links; first pass now derives typed dependency nodes, edges, clusters, risks, and next actions from project/template/export/website/campaign/share data and surfaces the graph in the studio dashboard.
- [x] Add workspace backup and restore operations with export manifests, integrity checks, dry-run restore reports, and rollback playbooks; first pass now creates a downloadable workspace backup manifest, runs snapshot/export/domain/campaign/asset/audit integrity checks, classifies dry-run restore readiness, and surfaces rollback playbooks in the studio dashboard.
- [x] Add advanced notification preference routing with quiet hours, channel subscriptions, digest previews, and failed-delivery recovery; first pass now classifies workspace notifications by topic, applies quiet-hour routing, exposes channel subscription plans, previews digest items, detects Slack/Teams delivery recovery needs, and surfaces the routing center in the team dashboard.
- [x] Add production support desk views with user-reported issues, affected project links, audit context, reproduction notes, and resolution packets; first pass now derives support queues from review tasks, export failures, domain errors, project audits, and handoff packets, links affected projects, surfaces audit/reproduction context, and downloads resolution packet JSON from the studio dashboard.

## Completed 100-Point Feature Set: Enterprise Admin Scale And Workflow Governance

Status: 100/100.

- [x] Add workspace role policy simulation with effective permissions, share-link previews, denial explanations, and audit-safe remediation plans; first pass now derives member, invite, public-link, and edit-link principals from real workspace/project data, explains denied operations, flags risky external edit access, and surfaces remediation plans in the team dashboard.
- [x] Add organization usage and quota governance with storage, export, publish, email, automation, and team-seat pressure views; first pass now combines asset quota, export jobs, published sites/domains, form submissions, transactional emails, automation recipes, and team seats into quota pressure areas with remediation plans in the team dashboard.
- [x] Add automation run history with retries, failure diagnostics, recipe ownership, schedule visibility, and audit-backed recovery packets; first pass now derives runs from workspace audit logs, links export and schedule diagnostics, exposes real retry actions, and downloads recovery packet JSON from the studio dashboard.
- [x] Add project archival, retention, and legal-hold workflows with restore previews and compliance-safe deletion packets; first pass now derives archive candidates, active legal holds, restore previews, and deletion packets from project, version, export, website, review, and audit data, exposes legal-hold/release audit actions, and blocks permanent deletion while a hold is active.
- [x] Add multi-workspace command and audit federation for admins managing several workspaces from one operations surface; first pass now derives federated workspace scopes, admin command queues, cross-workspace audit streams, and downloadable command packets from team workspace management plus workspace audit logs in the team dashboard.
- [x] Add enterprise approval workflow templates with stage owners, escalation rules, reviewer SLAs, and dashboard governance reporting; first pass now derives project, template, and campaign approval templates from real approvals, review tasks, team owners, and audit logs, surfaces escalation/SLA governance in the team dashboard, and downloads an enterprise approval workflow packet.

## Completed 100-Point Feature Set: Advanced Enterprise Workflow Intelligence And Platform Depth

Status: 100/100.

- [x] Add cross-workspace approval analytics with trend baselines, bottleneck detection, reviewer load forecasting, and downloadable executive governance packets; first pass now derives per-workspace approval trend baselines, approval bottlenecks, reviewer load forecasts, next actions, and downloadable executive analytics packets from real audit, approval, team, and review-task data in the team dashboard.
- [x] Add enterprise SSO and SCIM readiness center with provider configuration checks, role mapping previews, domain capture planning, and audit-safe rollout packets; first pass now derives identity provider metadata checks, SCIM provisioning gaps, domain capture plans, provider group to workspace-role previews, MFA/audit guardrails, and downloadable rollout packets in the security dashboard.
- [x] Add policy-as-code governance rules for sharing, publishing, assets, approvals, and retention with dry-run enforcement reports; first pass now evaluates five typed policy domains, detects release-blocking and review-only exceptions, builds dry-run remediation reports, and downloads enforcement packets from the team dashboard without mutating workspace data.
- [x] Add workspace data residency and export controls with region policy previews, restricted asset checks, and compliance evidence packets; first pass now previews export and custom-domain regions, flags restricted or incomplete asset evidence, reports completed export control status, and downloads compliance evidence packets in the security dashboard.
- [x] Add advanced admin automation recipes for bulk remediation, approval follow-ups, retention sweeps, and audit packet generation; first pass now composes policy dry-runs, approval analytics, retention packets, automation recovery packets, and audit logs into four admin recipes plus a downloadable audit packet in the team dashboard.
- [x] Add enterprise incident response command center with severity routing, owner assignment, timeline evidence, and recovery playbooks; first pass now routes support, observability, release-readiness, and admin automation signals into SEV queues with owner assignments, audit timelines, recovery playbooks, and downloadable response packets in the studio dashboard.

## Completed 100-Point Feature Set: Advanced Creative Operations And Collaboration Runtime Depth

Status: 100/100.

- [x] Add live collaboration session reconciliation with participant presence history, reconnect recovery, cursor conflict queues, and session evidence packets; first pass now aggregates workspace project presence into dashboard session reports with stale participant recovery steps, cursor conflict detection, audit-backed evidence packets, and focused coverage.
- [x] Add publish and export release gates that connect policy-as-code decisions to real publish/export readiness, override requests, and auditable approvals; first pass now combines policy dry-runs, export jobs, website/template publishing surfaces, override request audit logs, approval evidence, and downloadable release gate packets in the studio dashboard.
- [x] Add creative asset intelligence with duplicate/license/usage recommendations, batch cleanup previews, dependency impact simulation, and remediation packets; first pass now turns asset audits, duplicate groups, license evidence, project manifests, exports, websites, and templates into ranked recommendations, safe cleanup previews, dependency simulations, and downloadable remediation packets in the studio dashboard.
- [x] Add template quality QA center with accessibility, localization, marketplace readiness, moderation routing, and creator-facing fix plans; first pass now combines template gates, related project audits, accessibility/localization finish queues, moderation age, creator fix plans, route queues, and downloadable QA packets in the studio dashboard.
- [x] Add cross-format campaign launch rooms with stakeholder signoff, channel readiness, rollout timelines, and launch command packets; first pass now derives launch rooms from real campaign boards, planner items, review tasks, project audits, approval logs, and publishing rollups with downloadable command packets in the studio dashboard.
- [x] Add desktop/offline project sync reconciliation with conflict diffs, local/cloud recovery choices, stale asset repair, and audit trails; first pass now compares project metadata, version history, durable exports, asset manifests, offline queue diagnostics, and audit logs into conflict diffs, recovery choices, stale asset repairs, and downloadable reconciliation packets in the studio dashboard.

## Completed 100-Point Feature Set: Advanced Creative Platform Intelligence And Production Depth

Status: 100/100.

- [x] Add design system and component intelligence with reusable component definitions, token drift detection, usage maps, and refactor packets; first pass now derives component definitions from saved templates, maps usage across active projects, detects brand token and project brand-audit drift, creates downloadable refactor packets, and surfaces the center in the studio dashboard.
- [x] Add import repair operations for PDF, PPTX, DOCX, XLSX, SVG, and media conversions with mapping diffs, retry strategies, and conversion evidence packets; first pass now derives six format repair lanes from the real importer limits, links workspace evidence from projects, mixed-format readiness, audits, versions, and audit logs, creates mapping diffs, retry plans, and downloadable conversion evidence packets, and surfaces the center in the studio dashboard.
- [x] Add export certification workspaces for PDF, video, email, website, and print artifacts with QA matrices, stakeholder signoff, and certification packets; first pass now derives artifact-specific certification workspaces from completed exports, website publishes, project audits, handoff packets, review tasks, approval audit logs, and downloadable certification packets in the studio dashboard.
- [x] Add marketplace creator operations with versioned submissions, trust scoring, licensing evidence, install rollback, and moderation task routing; first pass now derives creator submissions from real templates, project dependencies, versions, audits, review tasks, and audit logs with trust/license/rollback scoring, moderation queues, downloadable operation packets, and a studio dashboard panel.
- [x] Add deterministic production command runner for staged batch actions, dry-run/apply plans, rollback notes, and audit-safe execution reports; first pass now composes policy, release, automation recovery, admin automation, backup/restore, and marketplace moderation signals into staged dry-run/apply command batches with rollback notes, evidence links, downloadable execution reports, focused tests, and a studio dashboard panel.
- [x] Add desktop packaging and update readiness with Tauri signing checks, release channels, installer QA evidence, and production release notes; first pass now composes the Tauri package source snapshot, signing/updater gaps, stable/beta/canary channels, installer target/icon/metadata checks, desktop QA evidence, downloadable readiness packets, markdown release notes, focused tests, and a studio dashboard panel.

## Completed 100-Point Feature Set: Advanced Production Execution And Offline-First Scale

Status: 100/100.

- [x] Add direct publish/export enforcement hooks that consume policy-as-code, release gates, and production command runner decisions before mutating public surfaces or export artifacts; first pass now creates a target-scoped enforcement decision packet, audits blocked mutations, and wires the guard into website publishing, export job creation, scheduled export automation, and export artifact completion.
- [x] Add offline-first desktop project storage with local project databases, queued mutations, resumable asset references, and deterministic conflict replay; first pass now persists local project database snapshots, queues document-save mutations before network sync, classifies asset references as ready/resumable/blocked, builds deterministic conflict replay plans, and marks editor sync mutations synced, failed, or conflicted.
- [x] Add signed desktop auto-update delivery execution with artifact feed publishing, channel promotion controls, rollback windows, and release audit packets; first pass now creates signed channel feed packets, evaluates promotion blockers against packaging readiness, opens rollback windows from previous artifacts, emits an auto-update audit packet, and surfaces the execution center in the studio dashboard.
- [x] Add live SSO enforcement and SCIM provisioning endpoints with group-to-workspace-role sync, deprovisioning safety, and admin rollout evidence; first pass now adds bearer-token guarded SCIM Users and Groups routes, normalizes SCIM payloads, creates group-to-workspace-role sync decisions, blocks unsafe owner deprovisioning behind transfer holds, emits admin rollout evidence packets, and surfaces enforcement status in the security dashboard.
- [x] Expand the original first-party template library with larger industry packs, componentized starter systems, QA gates, and marketplace curation workflows; first pass now doubles the original catalog with restaurant, healthcare, nonprofit, and real-estate starters, derives industry pack coverage, builds componentized starter systems, runs provenance/editability/coverage QA gates, and surfaces marketplace curation lanes with downloadable library packets in the studio dashboard.
- [x] Add real multi-user editing sessions with operation-level merge history, reviewer locks, recoverable cursor conflicts, and session replay packets; first pass now sends editor sync/save operation IDs and revisions, records merged or conflicted collaboration operations into workspace audit history, derives operation merge history, reviewer locks, cursor recovery steps, and downloadable replay packets in the live collaboration dashboard, and keeps stale operations recoverable instead of silently overwriting remote work.

## Completed 100-Point Feature Set: Advanced Data-Backed Creation And Distribution Scale

Status: 100/100.

- [x] Add reusable content databases for brand-approved copy, product catalogs, pricing tables, people bios, event details, and campaign variables that can populate text, table, website, email, and social templates without duplicating source data; first pass now derives traceable reusable records from brand kits, templates, projects, campaign boards, content schedules, and website publishes, deduplicates repeated values, maps bindings across text/table/website/email/social surfaces, scores coverage, and exports a downloadable content database packet from the studio dashboard.
- [x] Add rule-based multi-format campaign generation from a brief, brand kit, content database, and starter pack, with reviewable variants, source traceability, and no paid AI dependency; first pass now selects the best starter pack from campaign brief evidence, resolves reusable content variables from the content database and brand snapshot, generates deterministic social, website, email, presentation, and video variants, attaches review checks and source traces for every variant, exports a campaign generation packet, and surfaces the no-paid-AI generation center in the studio dashboard.
- [x] Add advanced batch asset operations with bulk resize/crop/format conversion, alt-text and license metadata queues, project usage impact previews, and reversible cleanup packets; first pass now derives transform plans for WebP conversion, oversized raster resizing, aspect-aware crops, and delivery video derivatives from the asset audit, queues reusable alt text and missing source/author/license metadata, previews public project and skipped-reference impact before replacements, exports reversible duplicate cleanup packets with rollback steps, and surfaces the batch operation center in the studio dashboard.
- [x] Add website and email rendering QA matrices with viewport/client checks, link validation, form routing diagnostics, accessibility evidence, and downloadable release reports; first pass now derives website mobile/tablet/desktop viewport matrices from published sites and project audits, builds Gmail/Outlook/Apple Mail checks from email QA evidence and completed HTML exports, validates published slugs, custom domains, and email export artifacts, diagnoses website form routing from captured submissions, attaches accessibility evidence per website/email surface, exports a release QA packet, and surfaces the matrix in the website and email dashboard tabs.
- [x] Add template and design release channels with staged rollout, deprecation notices, migration suggestions, dependency impact analysis, and rollback-safe update packets; first pass now assigns templates to stable/beta/canary channels, derives rollout percentages from approval and marketplace evidence, emits deprecation notices for archived or change-held templates, suggests approved replacements, analyzes dependent designs and public surfaces, creates rollback-safe update packets, and surfaces the release center in the templates dashboard.
- [x] Add production distribution analytics that connect campaign variants, website/email/social publishes, export artifacts, audience forms, and content database sources into one attribution dashboard; first pass now builds a production attribution center that links generated variants, reusable content records, planner publishes, website analytics, completed export artifacts, and form responses into funnel stages, campaign attribution rows, channel attribution, source influence, downloadable attribution packets, and a studio dashboard panel.

## Completed 100-Point Feature Set: Advanced Pro Workflow And Insight Depth

Status: 100/100.

- [x] Add component/template instance propagation with update previews, breaking-change detection, selective accept/reject, and rollback packets across projects and campaigns; first pass now derives template instance groups from real projects and campaign deliverables, creates accept/hold/reject update previews, flags blocking dimension/source/review/campaign/rollback risks, exports rollback packets for safe updates, and surfaces the propagation center in the studio dashboard.
- [x] Add data-connected report dashboards with reusable chart blocks, refresh plans, stale-source warnings, and export-ready executive packets; first pass now composes report dashboards from content database, production analytics, publishing channels, and schedule evidence, creates reusable chart/KPI blocks, tracks refresh cadence and stale-source warnings, exports executive report packets, and surfaces the report center in the studio dashboard.
- [x] Add social distribution command center with platform crop previews, approval queues, caption/version history, and scheduled-post recovery packets; first pass now derives platform crop previews from real social schedule items and campaign deliverables, queues approval/caption blockers, reconstructs caption history from schedules, audit logs, and project versions, exports blocked scheduled-post recovery packets, and surfaces the command center in the studio dashboard.
- [x] Add client-facing analytics and handoff rooms with stakeholder-safe views, approval context, delivery timelines, and downloadable evidence bundles; first pass now layers stakeholder-safe analytics rooms on top of client portal rooms, redacts internal actor emails and raw audit metadata from bundles, connects production analytics and report dashboards, summarizes approval context and delivery timelines, exports client evidence bundles, and surfaces the handoff room center in the team dashboard.
- [x] Add editor command macros and workflow automation with repeatable multi-step actions, dry-run previews, permission checks, and undo-safe execution logs; first pass now builds project-scoped macro runbooks from the real editor command macro catalog, sequences QA, publishing metadata, and export-prep dry-runs, checks approval/share/restore permissions, records undo-safety and macro execution evidence, exports an automation packet, and surfaces the workflow automation center in the studio dashboard.
- [x] Add large-workspace performance intelligence with document size budgets, slow-surface diagnostics, recovery recommendations, and production telemetry packets; first pass now derives project performance budgets from dimensions, asset manifests, version history, export artifacts, and audits, diagnoses slow editor/export/manifest/version surfaces, recommends recovery actions for heavy workspaces, exports telemetry packets, and surfaces the performance intelligence center in the studio dashboard.

## Completed 100-Point Feature Set: Advanced Extensibility And Production Collaboration Depth

Status: 100/100.

- [x] Add first-party extension runtime with safe manifest validation, command registration, scoped permissions, and install/remove audit trails; first pass now validates signed internal manifests, registers commands only for installed safe extensions, maps scoped permission grants, records install/remove server actions into workspace audit logs, exports runtime packets, and surfaces the extension center in the studio dashboard.
- [x] Add reusable workflow template marketplace for internal teams with versioned recipes, dependency checks, rollback notes, and adoption analytics; first pass now ships versioned internal workflow templates, validates recipe/team-role/workspace dependencies, records template installs into workspace audit logs, derives adoption from install and automation-run evidence, exports marketplace and rollback packets, and surfaces the marketplace in the team dashboard.
- [x] Add live production collaboration rooms with session goals, role handoffs, conflict ownership, async updates, and downloadable collaboration evidence; first pass now turns live session reconciliation into goal-led production rooms with named handoffs, conflict owners, async audit/task timelines, downloadable evidence bundles, focused tests, and a team dashboard panel.
- [x] Add advanced design system release governance with token migration plans, component adoption gates, breaking-change previews, and downstream impact packets; first pass now consumes design-system intelligence to create token migration plans, component adoption gates, breaking-change previews, downstream impact packets, focused tests, and a studio dashboard panel.
- [x] Add enterprise content operations calendar with campaign capacity planning, dependency heatmaps, staffing signals, and recovery playbooks; first pass now derives campaign capacity plans, publishing dependency heatmaps, staffing pressure signals, downloadable recovery packets, focused tests, and a studio dashboard panel from real campaigns, planner items, review tasks, team state, and audit logs.
- [x] Add workspace intelligence briefings with executive summaries, anomaly explanations, recommended actions, and scheduled digest packets; first pass now synthesizes publishing, content operations, performance, design-system release, observability, notification, and audit-log evidence into executive summaries, explainable anomalies, ranked actions, scheduled downloadable digest packets, focused tests, and a studio dashboard panel.

## Next 100-Point Feature Set: Advanced Production Studio Governance And Automation Scale

Status: 100/100.

- [x] Add workspace portfolio planning with goals, owners, health scoring, dependency maps, and campaign/project outcome tracking; first pass now derives campaign and standalone project portfolio goals, owner lanes, health scores, dependency maps, outcome tracks, next actions, focused tests, and a studio dashboard panel from real projects, campaigns, tasks, schedules, team state, dependency graph evidence, and audit logs.
- [x] Add a no-code automation builder with typed triggers, conditions, actions, dry-run simulation, rollback notes, and audit-backed execution plans; first pass now creates typed builder flows from automation recipes and workflow templates, simulates dry-runs, records blockers and warnings, carries rollback notes, exports audit-backed execution plan packets, includes focused tests, and surfaces the builder in the team dashboard.
- [x] Add advanced brand compliance approvals with exception requests, legal-review packets, campaign enforcement, and reusable rule libraries; first pass now composes design governance, policy-as-code, enterprise approvals, campaigns, and audit logs into reusable compliance rule libraries, exception requests, downloadable legal review packets, campaign enforcement decisions, focused tests, and a team dashboard panel.
- [x] Add asset lifecycle governance with rights-expiry renewals, replacement propagation, bulk relinking, usage impact previews, and signed evidence packets; first pass now composes asset audit, provenance review, batch operations, creative asset intelligence, and audit logs into rights-expiry renewals, replacement propagation plans, bulk relinking plans, usage impact previews, signed evidence packets, focused tests, and a studio dashboard panel.
- [x] Add production capacity forecasting across teams, campaigns, export queues, publishing queues, and scenario recovery plans; first pass now derives campaign deadline pressure, team load forecasts, export queue forecasts, publishing queue forecasts, scenario recovery packets, focused tests, and a studio dashboard panel from real campaigns, planner items, durable export jobs, review tasks, team state, and audit logs.
- [x] Add stakeholder reporting subscriptions with role-safe dashboards, recurring signed packets, delivery history, and digest failure recovery; first pass now composes report dashboards, client handoff rooms, workspace intelligence digests, notification routing, team roles, and audit logs into role-safe subscriptions, signed report packets, delivery history, digest recovery plans, focused tests, and a team dashboard panel.

## Next 100-Point Feature Set: Advanced Creation Assistance And Delivery Workflow Scale

Status: 100/100.

- [x] Add rule-based layout intelligence with spacing audits, hierarchy checks, responsive format suggestions, and one-click repair plans; first pass now analyzes real project pages and layers into spacing audits, hierarchy checks, responsive format suggestions, downloadable one-click repair plans, focused tests, and a studio dashboard panel.
- [x] Add professional typography systems with reusable type scales, font pairing guidance, readability checks, and brand-safe text repair packets; first pass now derives brand-backed and fallback type-scale tokens, font pairing guidance, readability checks, downloadable brand-safe text repair packets, focused tests, and a studio dashboard panel from real project text layers and saved brand fonts.
- [x] Add collaborative proofing compare rooms with visual change snapshots, annotated decision trails, signed approval snapshots, and revision rollback packets; first pass now derives proofing rooms from real project versions, review tasks, handoff packets, and audit logs with visual compare snapshots, annotated decision trails, signed approval snapshots, downloadable rollback packets, focused tests, and a team dashboard panel.
- [x] Add print/vendor production handoff with dieline specs, proof sheets, finishing notes, SKU/package metadata, and vendor-ready delivery packets; first pass now derives vendor handoffs from real projects, print audit evidence, durable print exports, approvals, and project handoff packets with dieline specs, proof sheets, finishing notes, SKU/package metadata, downloadable vendor packets, focused tests, and a studio dashboard panel.
- [x] Add media brand delivery kits with lower-thirds, bumper/outro presets, audio loudness checks, timeline QA, and export-ready media packets; first pass now derives media delivery kits from real saved project timelines, brand colors/fonts/logos, durable media exports, approvals, and project handoff packets with reusable lower-thirds, bumper/outro presets, loudness checks, timeline QA, downloadable media packets, focused tests, and a studio dashboard panel.
- [x] Add project coaching mode with contextual editing recipes, checklist progress, production-readiness coaching, and reusable learning dashboards; first pass now derives coaching sessions from layout intelligence, typography systems, project audits, handoff packets, print/vendor handoffs, media delivery kits, approvals, and review tasks with contextual recipes, checklist progress, production readiness cards, reusable learning tracks, downloadable coaching packets, focused tests, and a studio dashboard panel.

## Next 100-Point Feature Set: Advanced Studio Asset Creation And Publishing Utility

Status: 16/100.

- [x] Add reusable component and section libraries with versioned variants, dependency-aware updates, and design-system-safe inserts; first pass now derives reusable component libraries and grouped section libraries from real design-system intelligence, release governance gates, template instance propagation, project versions, templates, and active projects with versioned variants, dependency update plans, safe insert gates, downloadable component/section insert packets, focused tests, and a studio dashboard panel.
- [ ] Add brand package import/export with validation, conflict previews, and shareable workspace brand bundles.
- [ ] Add advanced presentation delivery mode with rehearsal notes, timed presenter flow, audience handout packets, and recording/export readiness.
- [ ] Add website launch utility with sitemap, redirect, form, domain, and deployment QA plus stakeholder release packets.
- [ ] Add data report automation with chart snapshot refreshes, scheduled evidence packets, validation warnings, and reusable report dashboards.
- [ ] Add localization adaptation workflows with locale-specific overflow checks, translated template variants, and approval-safe locale packets.

## Keep The Project Simple

- [x] Split `src/features/editor/components/properties-panel.tsx` into focused property panels by element type.
- [x] Extract connector property controls into `src/features/editor/components/connector-property-controls.tsx`.
- [x] Move the full text property stack into `src/features/editor/components/text-property-controls.tsx`.
- [x] Move the full image property stack into `src/features/editor/components/image-property-controls.tsx`.
- [x] Move the media property dispatch into `src/features/editor/components/media-property-controls.tsx`.
- [x] Move selected-layer property routing into `src/features/editor/components/selected-layer-property-controls.tsx`.
- [x] Move page background and brand color controls into `src/features/editor/components/page-property-controls.tsx`.
- [x] Split `src/features/editor/components/editor-workspace.tsx` into editor shell, toolbar wiring, canvas wiring, persistence wiring, and collaboration wiring.
- [x] Extract editor public/edit share-link wiring into `src/features/editor/use-editor-sharing.ts`.
- [x] Extract editor keyboard shortcut wiring into `src/features/editor/use-editor-keyboard-shortcuts.ts`.
- [x] Extract editor comment action wiring into `src/features/editor/use-editor-comments.ts`.
- [x] Extract editor document action wiring into `src/features/editor/use-editor-document-actions.ts`.
- [x] Extract editor canvas and timeline interaction wiring into `src/features/editor/use-editor-canvas-interactions.ts`.
- [x] Extract editor page and import wiring into `src/features/editor/use-editor-page-actions.ts`.
- [x] Extract editor shell UI state into `src/features/editor/use-editor-shell-ui.ts`.
- [x] Split `src/features/editor/components/asset-panel.tsx` into upload, stock, brand assets, vector packs, and import panels.
- [x] Split `src/db/schema.ts` into feature-owned schema modules with one exported combined schema.
  - [x] Move auth, session, account, verification, auth email, and two-factor table definitions into `src/db/schema/auth.ts`.
  - [x] Move team workspace and notification table definitions into `src/db/schema/team.ts` and `src/db/schema/notifications.ts`.
  - [x] Move brand kit and uploaded asset table definitions into `src/db/schema/brand.ts` and `src/db/schema/assets.ts`.
  - [x] Move project, folder, template, version, comment, reaction, and presence table definitions into `src/db/schema/projects.ts`.
  - [x] Move content planner, website publishing, and presentation table definitions into `src/db/schema/content.ts`, `src/db/schema/website.ts`, and `src/db/schema/presentation.ts`.
- [x] Split `src/app/designs/actions.ts` into project, team, account, security, notification, and planner action files.
- [x] Add a small `FEATURES.md` capability matrix so TODO stays short.
- [x] Keep docs honest: no 100/100 parity claim unless every major feature family below is complete and verified.

## Verified Foundations We Have

- [x] Email/password accounts with verification code flow.
- [x] Seeded admin account support.
- [x] Project dashboard with admin/user/auth management tables.
- [x] Saved projects, folders, trash, favorites, thumbnails, and search/sort/filter.
- [x] Browser-local autosave recovery for unsaved editor work with conflict-aware restore prompts.
- [x] Tauri desktop file bridge for local design open/save-as, recent files, and offline data-url asset cache.
- [x] Project asset manifests with deduped data-url references, size limits, reusable hosted project asset URLs, and email-hosted asset reuse.
- [x] Basic canvas editor with text, document, shapes, sticky notes, connectors, images, SVG, PDF, video, audio, QR, table, chart, form, embed, and timer layers.
- [x] Multi-page documents, page thumbnails, notes, duplicate/reorder/delete pages.
- [x] Basic layer editing: select, drag, resize, rotate, lock, hide, group, align, distribute, opacity, links, undo/redo, copy/paste.
- [x] Brand kit basics: colors, logos, fonts, templates, and guardrail scoring.
- [x] Team workspace basics: roles, invites, notifications, team templates.
- [x] Sharing basics: public view links, authenticated edit links, comments, mentions, reactions, presence, cursors.
- [x] Imports: image, SVG, PDF page import, PPTX import, DOCX import, XLSX sheet import, CSV to table/bulk pages.
- [x] Exports: PNG, transparent PNG, JPG, WebP, SVG, PDF, multipage PDF, print PDF, DOCX, XLSX, GIF, MP4, static HTML, timeline-aware GIF/MP4 page durations, and frame-composited timeline GIF/MP4 captures.
- [x] Export job history with progress states, local recent-job storage, failure diagnostics, and retry/download-again actions for editor exports.
- [x] Basic resize variants: source designs can create editable social, presentation, print, website, and email-sized copies with source/variant tracking.
- [x] Hosted website publishing with responsive public pages, SEO metadata, SEO readiness checks, explicit section SEO and navigation controls, nested menu groups, selectable section navigation styles, editable link-button blocks, preview widths, clickable linked layers, link-in-bio starter pages, custom-domain verification, platform routing records, environment-gated Vercel domain attachment and status refresh, stored form submissions, and persisted view/click analytics.
- [x] Basic email builder: saved designs can become email-safe block models with preview, HTML export, test email delivery, reusable email block packs, hosted design-image URLs, and preview-side QA scoring.
- [x] Whiteboard diagram primitives: sticky notes, connector arrows, solid/dashed/dotted connector line styles, connector label positioning/readability boxes, editable flowchart presets, and org-chart starters.
- [x] Workshop facilitation basics: page timers, persisted vote counts, reactions, spotlight focus, facilitator notes, participant count, signal badges, participant summaries, and session analytics.
- [x] Whiteboard workspace mode with expanded scrollable board margins and visible off-page content.
- [x] Presentation speaker notes import/export with Markdown round-tripping and slide outline previews.
- [x] Presentation page transitions with editable per-slide transition settings and speaker-view playback.
- [x] Presentation transcript and WebVTT caption export from slide text and speaker notes.
- [x] Public presentation audience participation with slide-level polls, quizzes, Q&A, response storage, and speaker-side summaries.
- [x] Server-backed presentation remote pairing with time-limited phone control links and speaker-side command polling.
- [x] Basic media timeline with separate video/audio tracks, snapped timing, playhead splitting, drag-to-move clips, pointer trim handles, trimmed clip preview playback, trim fields, volume/fade/keyframe controls, multi-clip sequencing, waveform previews, track reorder controls, and sequence JSON export.
- [x] Large-document side-panel windowing for layer lists, page thumbnails, workshop vote targets, and media timeline clips.
- [x] Basic sheet formulas in table cells with arithmetic, cell references, ranges, cross-sheet references, formula validation, canvas rendering, and XLSX formula preservation.
- [x] Table data views with non-destructive filtering, sorting, frozen headers, formula-aware canvas rendering, DOCX visible-view export, and XLSX frozen/sorted sheet metadata.
- [x] Per-cell table formatting for fill, text color, bold weight, alignment, canvas rendering, and DOCX/XLSX export.
- [x] CSV URL table source syncing with stored sync metadata.
- [x] JSON URL table source syncing for public analytics, CRM, and database-style record exports.
- [x] Session-only bearer-token table syncing for protected CSV/JSON endpoints without persisting secrets.
- [x] Session-only custom-header table syncing for API key based CSV/JSON endpoints without persisting secrets.
- [x] Connector presets for Airtable, Supabase, Hasura, Stripe, and Google Analytics style endpoints.
- [x] Persisted non-secret connector preset and header-name metadata without saving tokens or API keys.
- [x] Public Google Sheets URL table syncing through CSV export endpoints.
- [x] Interactive charts connected to table label/value columns with formula-aware sorted/filtered rows and DOCX/XLSX export support.
- [x] Dashboard-style data story starter with refreshable source table and linked charts.
- [x] First-pass production route hardening for share IDs, edit-share mutation access, audience responses, public project assets, and email asset headers.
- [x] Deployed production web app on Vercel.

## Missing Canva-Level Features

### Visual Suite And Document Model

- [ ] One project containing mixed page types: docs, sheets, whiteboards, presentations, social posts, videos, websites, email, and print pages in a single design; pages now have first-pass format metadata and preset size switching.
- [ ] Full per-page dimensions inside one project instead of one fixed document size; active-page editing, editor canvas, thumbnails, public viewer, speaker preview, export capture, and media sequence metadata have first-pass support.
- [ ] Cross-format campaign builder that links one brief, one brand kit, and many deliverables; first pass now adds dashboard campaign boards backed by persisted campaign and deliverable records.
- [ ] Campaign-level derivative management with bulk variant generation, variant boards, and live source-to-variant updates; first pass now adds project-level derivative boards with source-change review badges, metadata refresh, and bulk generation from campaign board source deliverables.

### Templates And Content Marketplace

- [ ] Large first-party template library by category, industry, season, platform, and format.
- [ ] Template preview pages with metadata, tags, dimensions, and related templates.
- [ ] Creator/template marketplace workflow.
- [ ] Template locking rules for brand-safe editable regions; first pass now locks generated catalog template structure while leaving content layers editable.
- [ ] Template collections, campaigns, and recommended starter packs; first pass now ships curated multi-format starter packs with routed collection pages and dashboard recommendations.

### Website Builder

- [x] Responsive website sections, breakpoints, and mobile preview.
- [x] Real hosted publishing instead of only static HTML download.
- [x] Custom domains and domain verification; first pass stores custom domains, generates TXT verification records, verifies DNS ownership, renders verified domains at the app root, shows the Vercel-compatible platform routing record needed after verification, attaches verified domains to the configured Vercel project when `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` are available, and refreshes platform attachment status from the Vercel project-domain API.
- [x] Website forms with stored submissions.
- [ ] Advanced navigation menus, button/link blocks, link-in-bio pages, and per-section SEO controls; first pass now makes saved layer links clickable on hosted websites, adds editable primary/outline link-button blocks, adds a mobile link-in-bio starter design, maps page names/notes into semantic section SEO anchors, lets publishers choose top, pill, side-rail, or hidden navigation, adds explicit per-section SEO title/description controls, adds section navigation labels plus hide-from-navigation controls, adds first-pass nested menu groups, and adds publish-time SEO readiness checks for website pages.
- [x] Website analytics for views and clicks.

### Email Designer

- [x] Basic email-safe layout engine with text, images, buttons, dividers, spacers, and inline styles.
- [x] Send test email for a designed email.
- [x] Inline-styled HTML email export.
- [ ] Major-client QA, hosted image asset handling, and stricter email-client compatibility checks; first pass now adds preview-side QA scoring and hosted design-image URLs, while full client rendering matrix checks remain.
- [ ] Email template categories and reusable content blocks; first pass now adds reusable email-safe block packs, while larger category libraries remain.

### Docs

- [ ] Real rich document editor with flowing text, headings, tables, columns, page breaks, comments, and document outline; first pass now covers editable document layers with headings, subheadings, paragraphs, quotes, page breaks, outline, block comments, columns, translation packs, brand-kit styling, and DOCX export, while embedded tables and deeper document authoring remain.
- [x] DOCX export for document-like designs.
- [x] DOCX import into editable document blocks.
- [ ] PDF-to-editable-document conversion beyond page images; first pass now imports locked visual reference images plus editable text layers and reconstructed outline notes, while deeper vector/table/image-object extraction remains.
- [ ] Document translator and text summarizer are missing; keep them deferred while AI is out of scope.

### Sheets And Data

- [ ] Real spreadsheet grid with multiple editable sheets; first pass now gives table layers workbook tabs, active-sheet editing, add/copy/rename/remove controls, cross-sheet formulas, and XLSX import/export preservation, while larger grid navigation and full spreadsheet UX remain.
- [x] Per-cell table formatting with fill, text color, bold, alignment, and Office export support.
- [x] Formula library and formula validation.
- [x] Table-level sorting, filtering, frozen headers, and formula-aware data views.
- [x] CSV URL table syncing.
- [x] Public JSON URL syncing for analytics, CRM, and database-style exports.
- [x] Public Google Sheets URL syncing.
- [x] Session-only bearer-token syncing for protected CSV/JSON analytics, CRM, or database exports.
- [x] Session-only custom-header syncing for API-key based analytics, CRM, or database exports.
- [x] App/API connector presets for common analytics, CRM, and database REST endpoints.
- [x] Persisted non-secret connector setup for repeat syncs.
- [ ] OAuth/app-native live connectors for analytics, CRM, or databases.
- [x] Interactive charts connected to live sheet/table ranges.
- [x] Dashboard-style data stories with refreshable charts.

### Whiteboards And Diagrams

- [x] Scroll-pannable whiteboard canvas mode with off-page workspace margins.
- [ ] True unbounded canvas with minimap, anchored object navigation, and viewport persistence; first pass now has dynamic object-aware board bounds, minimap viewport preview, minimap object jump, and per-page remembered viewport center.
- [x] Sticky notes, connector arrows, flowchart starters, and org-chart starters.
- [ ] Cards, mind maps, anchored connectors, and advanced diagram editing; first pass now includes editable mind-map and card-board starters with grouped nodes, sticky cards, connector paths, anchored connector endpoints that stay attached during move/nudge edits, a command-palette action to connect two selected layers, properties-panel controls to retarget or detach connector endpoints, and quick actions to swap or detach connector endpoints.
- [x] Basic voting and workshop timer controls.
- [ ] Reactions, participant facilitation, and advanced workshop controls; first pass now adds saved reactions, facilitator controls, spotlight focus, participant summaries, and session analytics while richer templates and multi-participant live sessions remain.
- [ ] Mermaid or diagram import/export; first pass now imports common flowchart/graph syntax into editable grouped nodes/connectors and exports the current page back to Mermaid flowchart syntax.

### Presentations

- [x] Presentation transitions and page animations.
- [x] Polls, quizzes, audience Q&A, and Canva-Live-style participation.
- [x] Presenter captions and transcript export.
- [x] Speaker notes import/export and slide outline view.
- [x] Remote control pairing hardened for production sessions.

### Video And Motion

- [x] Basic timeline with tracks, clip splitting, snapped timing, trim fields, and multi-clip sequencing.
- [x] Pointer-based trim handles and drag-to-move timeline clips.
- [x] Trimmed clip preview playback in the timeline panel.
- [x] Sequence-aware media timeline JSON export.
- [x] Timeline reorder controls that move clips earlier/later and repack track timing.
- [x] Timeline-aware GIF/MP4 page durations from media track end times.
- [x] Audio waveform view for decoded audio clips.
- [x] Audio fade-in/fade-out controls with preview playback volume ramping.
- [x] Audio volume keyframes with interpolated preview/canvas playback.
- [x] Captions/subtitles editor with SRT/VTT import and export.
- [x] Layer motion presets with start, duration, easing, live preview, and sequence export metadata.
- [x] Layer motion keyframes that capture position, size, rotation, opacity, and sequence export metadata.
- [x] Audio beat sync markers with timeline controls, visual markers, and sequence export metadata.
- [x] Lottie import and animation playback with layer controls.
- [x] Background music/SFX library with licensing metadata.
- [x] Automatic beat detection and generated sync suggestions.
- [x] Video clip transitions with preview playback and sequence export metadata.
- [x] Full MP4/GIF media clip compositing from timeline playback.
- [x] Frame-composited motion playback inside final GIF/MP4 exports.

### Photo Editing

- [ ] Background remover or foreground cutout; first pass now has browser-local color-key foreground cutout/background mask editing for uploaded image layers.
- [x] Object erase/clone/heal tools; first pass now supports browser-local canvas retouching with erase, clone, and heal modes.
- [ ] Advanced adjustments: curves, levels, HSL, vignette, shadows/highlights.
- [ ] Batch photo editor.
- [ ] Image upscale/enhance.
- [ ] Background generator is missing; keep AI-only version deferred.

### Drawing And Vector Editing

- [ ] Freehand draw, pen, pencil, highlighter, and eraser tools; first pass now supports pen, highlighter, and page-color eraser stroke layers from live canvas drawing.
- [ ] Bezier path editing and custom vector shapes; first pass now supports editable Bezier path layers with numeric control-handle editing.
- [x] Boolean shape operations; first pass now supports command-palette union, subtract, intersect, and exclude for selected closed shape/path layers.
- [x] Advanced gradients, pattern fills, and texture fills; first pass now supports reusable fill modes on shape and Bezier path layers.
- [ ] 3D text/object effects and depth controls.

### Print Products

- [ ] Product-specific print previews for cards, shirts, mugs, stickers, labels, calendars, invitations, packaging, and signage; first pass now covers cards, labels, posters, stickers, and packaging flat proofs from the active design.
- [ ] CMYK/PDF-X/preflight checks; first pass now covers editor-side preflight scoring but not CMYK/PDF-X conversion.
- [x] DPI warnings, safe-area validation, and print proofing; first pass now checks resolution, safe-area risk, bleed coverage, transparent backgrounds, and export readiness.
- [ ] Print ordering, shipping, payments, and fulfillment partner workflow.
- [ ] Product mockup generator with realistic surfaces and perspective.

### Publishing And Social

- [ ] Direct posting to social accounts.
- [ ] OAuth account connections for Instagram, Facebook, LinkedIn, Pinterest, TikTok, YouTube, and X.
- [ ] Calendar drag/drop rescheduling; first pass now persists planned-item day moves from the dashboard calendar.
- [ ] Approval workflow before publishing; first pass now provides enterprise approval workflow templates and governance reporting, but direct publish gates still need channel-level enforcement.
- [ ] Bulk schedule and bulk download; first pass now supports selected campaign deliverable scheduling and handoff ZIP packages.
- [ ] Link shortener and click tracking.

### Collaboration, Teams, And Enterprise

- [ ] Assigned tasks from comments; first pass now creates persisted review tasks from comments with owner, due date, status, comment badges, and dashboard task views.
- [ ] Review/approval states for designs and templates; first pass now adds persisted approval states for designs, saved templates, and campaign deliverables with dashboard controls.
- [ ] Workspace content management with admin-controlled folders and retention.
- [ ] Audit logs; first pass now records recent workspace activity for project, campaign, team, publishing, content, approval, and security actions.
- [ ] SSO/SAML, SCIM, domain capture, and enterprise policy controls; first pass now adds readiness checks, role mapping previews, domain capture plans, rollout packets, bearer-token guarded SCIM Users and Groups routes, group-to-workspace-role sync decisions, deprovisioning holds, and admin rollout evidence packets; production IdP credential setup and persisted automatic account mutation remain.
- [ ] Slack and Microsoft Teams notifications; first pass now sends env-gated webhook messages for review updates and publishing changes.
- [ ] Granular roles beyond owner/admin/member.

### Apps And Integrations

- [ ] App marketplace/plugin architecture.
- [ ] Google Drive import.
- [ ] Google Photos import.
- [ ] YouTube search/embed integration.
- [ ] Slack integration; first pass now supports outbound webhook notifications.
- [ ] Microsoft Teams integration; first pass now supports outbound webhook notifications.
- [ ] Cloud storage export targets.
- [ ] Public developer API for design, folder, asset, and export automation.

### Import And Export

- [x] DOCX export for document-like designs.
- [x] DOCX import into editable document blocks.
- [x] XLSX import/export.
- [ ] Editable PDF conversion with text/vector extraction.
- [ ] AI/PSD/INDD-style professional design import is missing and may need open-source alternatives only.
- [ ] Bulk download multiple designs and assets.
- [ ] Export presets per platform and print vendor.
- [ ] Packaged project archive export/import for self-hosted backups.

### Mobile, Desktop, And Offline

- [ ] Verify Tauri dev run.
- [ ] Verify Tauri production build.
- [ ] Offline-capable desktop editing with local project cache; now promoted into the active production readiness feature set.
- [ ] iOS app.
- [ ] Android app.
- [ ] Touch-first editor controls.

### Accessibility And Localization

- [x] Text contrast checker and accessible color suggestions.
- [x] Alt-text workflow for images with quality status.
- [x] Keyboard-only editor selection workflow audit and first-pass fixes.
- [ ] Multi-language UI across all product surfaces; auth landing/sign-in/sign-up, email verification, password reset, two-factor challenge, editor toolbar, command palette, Pages panel, dashboard shell, templates panel, project library, team workspace panel, notifications panel, account/security panel, website publisher, content planner, stock library, email builder, admin control room, admin table controls, public/private share viewers, public audience participation, and speaker-side audience results locale coverage is started.
- [x] Manual translation pack workflow for editable design/document text.

### AI Features, Deferred

- [ ] Canva-style assistant.
- [ ] Magic Write-style copy generation.
- [ ] Magic Design-style design generation.
- [ ] Magic Resize/Switch-style layout-aware conversion.
- [ ] Translate.
- [ ] Text-to-image and background generation.
- [ ] AI data insights and formula generation.
- [ ] AI quiz/summarizer tools.

## Next Work Queue

### Milestone 1: Simplify Editor Architecture

- [x] Extract text property controls.
- [x] Extract image and media property controls.
- [x] Extract shape/vector property controls.
- [x] Extract data/form/embed/timer property controls.
- [x] Extract editor persistence hook.
- [x] Extract editor export hook.
- [x] Extract editor collaboration hook.
- [x] Run `bun run typecheck`.

### Milestone 2: Real Magic Switch Without AI

- [x] Add design resize profiles for common social, presentation, print, website, and email formats.
- [x] Add duplicate-as-size action from project dashboard.
- [x] Add layout scaling rules for each element type.
- [x] Add side-by-side preview before creating resized variants.
- [x] Store source/variant relationships.
- [x] Run `bun run typecheck`.

### Milestone 3: Real Website Builder

- [x] Add website section model separate from flat canvas pages.
- [x] Add responsive preview widths.
- [x] Add hosted publish records.
- [x] Add public website route with SEO metadata.
- [x] Add form submission storage.
- [x] Run `bun run typecheck`.

### Milestone 4: Real Email Builder

- [x] Add email-safe block model.
- [x] Add email preview route.
- [x] Add send-test-email action using existing mail delivery.
- [x] Add email HTML export with inline styles.
- [x] Run `bun run typecheck`.

### Milestone 5: Whiteboard And Diagrams

- [x] Add infinite canvas mode.
- [x] Add sticky notes and connector elements.
- [x] Add flowchart/org-chart presets.
- [x] Add workshop timer and voting.
- [x] Run `bun run typecheck`.

### Milestone 6: Presentation Tooling

- [x] Add speaker notes import/export.
- [x] Add slide outline view.
- [x] Add slide transitions and page animations.
- [x] Add audience polls, quizzes, and Q&A.
- [x] Add captions/transcript export.
- [x] Harden remote control pairing.
- [x] Run `bun run typecheck`.

### Milestone 7: Video And Motion

- [x] Add video/audio timeline tracks.
- [x] Add snapped timing controls.
- [x] Add playhead-based clip splitting.
- [x] Add pointer trim handles and draggable clips.
- [x] Add trimmed clip preview playback.
- [x] Add sequence-aware media timeline export.
- [x] Add timeline reorder controls.
- [x] Add timeline-aware GIF/MP4 page durations.
- [x] Add audio waveform view.
- [x] Add audio fade controls.
- [x] Add audio volume keyframes.
- [x] Add captions/subtitles import/export.
- [x] Add layer motion presets and easing metadata.
- [x] Add layer motion keyframes.
- [x] Add audio beat sync markers.
- [x] Add video clip transitions with preview and sequence metadata.
- [x] Add frame-composited motion playback to final GIF/MP4 exports.
- [x] Run `bun run typecheck`.

### Milestone 8: Office Import And Export

- [x] Add DOCX export for document-like designs.
- [x] Add DOCX import into editable text/table blocks.
- [x] Add XLSX import into editable sheet/table blocks.
- [x] Add XLSX export for table and sheet-style designs.
- [x] Run `bun run typecheck`.

### Milestone 9: Sheet Formula Basics

- [x] Add safe table formula evaluation for arithmetic, references, ranges, and common functions.
- [x] Render formula results on the canvas while keeping raw formulas editable in table controls.
- [x] Add formula validation and function library feedback to table controls.
- [x] Preserve imported and exported XLSX formulas.
- [x] Run `bun run typecheck`.

### Milestone 10: Table Data Views

- [x] Add non-destructive row filtering for table layers.
- [x] Add formula-aware row sorting controls for table layers.
- [x] Add frozen header behavior for rendered tables and XLSX export metadata.
- [x] Export DOCX tables using the visible sorted/filtered table view.
- [x] Run `bun run typecheck`.

### Milestone 11: Table Cell Formatting

- [x] Add per-cell fill, text color, bold, and alignment metadata.
- [x] Add focused cell-format controls without changing raw table cell editing.
- [x] Render per-cell formatting on the canvas with formula and sorted/filtered views.
- [x] Preserve per-cell formatting in DOCX and XLSX exports.
- [x] Run `bun run typecheck`.

### Milestone 12: Live Table-Backed Charts

- [x] Add chart source metadata for table label/value columns.
- [x] Resolve chart data from formula-aware table views on canvas, previews, public pages, speaker view, and export surfaces.
- [x] Add chart controls for manual data versus linked table columns.
- [x] Preserve linked chart values in DOCX and XLSX exports.
- [x] Run `bun run typecheck`.

### Milestone 13: CSV URL Table Sync

- [x] Add table metadata for CSV URL sources and last sync status.
- [x] Add browser-side CSV URL fetch, size limits, parsing, validation, and CORS-aware error messaging.
- [x] Add table controls to sync and clear CSV URL sources.
- [x] Refresh table cells while preserving compatible styling and linked chart behavior.
- [x] Run `bun run typecheck`.

### Milestone 14: Public Google Sheets Sync

- [x] Detect Google Sheets share and published-sheet URLs in table data sources.
- [x] Convert recognized Sheets URLs into CSV export endpoints with `gid` preservation.
- [x] Store Google Sheets as a distinct table source kind and show it in sync status.
- [x] Reuse the existing table refresh pipeline so formulas, filters, formatting, and linked charts keep working.
- [x] Run `bun run typecheck`.

### Milestone 15: Refreshable Data Story Starter

- [x] Add a data-story element factory with a source table and three linked chart cards.
- [x] Seed the source table with editable dashboard-style sample data.
- [x] Wire the starter into the Asset panel.
- [x] Wire the starter into the command palette.
- [x] Run `bun run typecheck`.

### Milestone 16: JSON URL Table Sync

- [x] Detect JSON URL sources by extension, content type, and JSON-shaped responses.
- [x] Convert JSON arrays, object records, and common wrapped result arrays into editable table rows.
- [x] Keep JSON data sources inside the same refresh pipeline as CSV and public Google Sheets.
- [x] Update table controls to label JSON sync status and accept JSON URLs.
- [x] Run `bun run typecheck`.

### Milestone 17: Session-Only Authenticated Data Sync

- [x] Add optional bearer-token support to table URL sync requests.
- [x] Keep bearer tokens in component state only so they are not saved into designs.
- [x] Update table controls with a password-style token input for protected CSV/JSON endpoints.
- [x] Preserve the existing table refresh pipeline for authenticated responses.
- [x] Run `bun run typecheck`.

### Milestone 18: Session-Only Custom Header Sync

- [x] Add optional custom request-header support to table URL sync requests.
- [x] Validate custom header names before sending browser fetch requests.
- [x] Keep custom header names and values in component state only so API keys are not saved into designs.
- [x] Update table controls with custom header name/value fields for API-key based endpoints.
- [x] Run `bun run typecheck`.

### Milestone 19: App Connector Presets

- [x] Add connector presets for generic CSV/JSON, Airtable, Supabase, Hasura, Stripe, and Google Analytics style endpoints.
- [x] Use presets to provide URL, token, and custom-header placeholders in table controls.
- [x] Pre-fill API-key header names for Supabase and Hasura style endpoints without saving secrets.
- [x] Keep presets in a small editor data-source module.
- [x] Run `bun run typecheck`.

### Milestone 20: Persisted Non-Secret Connector Setup

- [x] Persist table connector preset IDs in table element metadata.
- [x] Persist custom header names while keeping header values session-only.
- [x] Restore saved connector preset and header-name metadata when editing a table.
- [x] Include non-secret connector metadata in sync success and error updates.
- [x] Run `bun run typecheck`.

### Milestone 21: Image Alt Text Workflow

- [x] Add a focused image alt-text control with multiline editing.
- [x] Add reusable alt-text quality status for missing, generic, short, and ready states.
- [x] Surface alt-text status in image properties without changing renderer output.
- [x] Keep image renderer alt attributes connected to edited alt text.
- [x] Run `bun run typecheck`.

### Milestone 22: Text Contrast Checker

- [x] Add reusable WCAG-style contrast ratio checks for text colors.
- [x] Check solid text colors and gradient endpoints against the page background.
- [x] Surface AA pass/low-contrast status in text properties.
- [x] Add one-click black/white accessible color suggestions.
- [x] Run `bun run typecheck`.

### Milestone 23: Keyboard-Only Selection Workflow

- [x] Select canvas layers when keyboard focus lands on them.
- [x] Add keyboard select-all for visible page layers.
- [x] Add keyboard previous/next layer walking.
- [x] Add keyboard clear-selection behavior.
- [x] Add descriptive layer accessibility labels.
- [x] Run `bun run typecheck`.

### Milestone 24: Editor Locale Foundation

- [x] Add a typed editor locale registry.
- [x] Add toolbar copy dictionaries for English, Bangla, Spanish, French, and Hindi.
- [x] Persist the selected editor locale in document metadata.
- [x] Localize high-traffic editor toolbar labels, statuses, and aria labels.
- [x] Run `bun run typecheck`.

### Milestone 25: Manual Translation Packs

- [x] Export editable design text, page names, speaker notes, alt text, table cells, chart labels, and form copy into a JSON translation pack.
- [x] Import completed translation packs back into the current design.
- [x] Skip empty translations and stale entries whose source text changed after export.
- [x] Surface applied/skipped translation counts in the Pages panel.
- [x] Run `bun run typecheck`.

### Milestone 26: Editor Workflow Localization

- [x] Localize command palette title, search, groups, commands, and empty state from the saved editor locale.
- [x] Localize Pages panel headings, page controls, transition labels, import/export buttons, and accessibility labels.
- [x] Localize CSV, speaker-note, and translation-pack success/error messages returned by editor workspace actions.
- [x] Keep app-wide dashboard/public/admin localization open for future passes.
- [x] Run `bun run typecheck`.

### Milestone 27: Dashboard Shell Localization

- [x] Add a persisted dashboard language selector backed by the shared locale registry.
- [x] Localize dashboard navigation, KPI labels, tab labels, website launcher copy, and the new-design panel.
- [x] Keep the dashboard localization copy in a focused feature-owned module.
- [x] Run `bun run typecheck`.

### Milestone 28: Dashboard Library Localization

- [x] Pass the saved dashboard locale into the Templates and Projects panels.
- [x] Localize template search, filters, badges, empty state, and create-from-template controls.
- [x] Localize project library search, filters, trash workflow, resize dialog, rename dialog, and destructive-action confirmation copy.
- [x] Keep Templates and Projects copy in feature-owned localization modules.
- [x] Run `bun run typecheck`.

### Milestone 29: Dashboard Team Localization

- [x] Pass the saved dashboard locale into the Team workspace and Notifications panels.
- [x] Localize team workspace creation, pending invites, role labels, invite controls, and empty states.
- [x] Localize notifications headings, unread actions, open links, per-notification read actions, and empty states.
- [x] Keep Team and Notifications copy in feature-owned localization modules.
- [x] Run `bun run typecheck`.

### Milestone 30: Dashboard Account Localization

- [x] Pass the saved dashboard locale into the Account settings panel.
- [x] Localize account profile, email security, email verification history, two-factor controls, active sessions, and delete-account copy.
- [x] Keep account/security copy in a feature-owned localization module.
- [x] Run `bun run typecheck`.

### Milestone 31: Dashboard Website Localization

- [x] Pass the saved dashboard locale into the Website publisher, Content planner, and Stock library panels.
- [x] Localize website publishing forms, preview controls, publish status labels, empty states, unpublish action, and form-submission headings.
- [x] Localize content planner scheduling, status labels, copy/open/publish/remove actions, and manual-upload guidance.
- [x] Localize stock search, search/import result messages, license fallback, and import controls.
- [x] Keep Website, Content planner, and Stock copy in feature-owned localization modules.
- [x] Run `bun run typecheck`.

### Milestone 32: Dashboard Email And Admin Localization

- [x] Pass the saved dashboard locale into the Email builder and Admin control room panels.
- [x] Localize email builder labels, placeholders, preview/export links, and test-send actions.
- [x] Localize admin tabs, table columns, status badges, search placeholders, empty states, sort/hide menu labels, and pagination labels.
- [x] Keep Email and Admin copy in focused feature-owned localization modules.
- [x] Run `bun run typecheck`.

### Milestone 33: Auth Entry Localization

- [x] Add a persisted auth language selector shared with the dashboard locale preference.
- [x] Localize the public auth landing, sign-in/sign-up card, labels, tabs, errors, and forgot-password link.
- [x] Localize email verification, forgot-password, reset-password, and two-factor challenge cards.
- [x] Keep auth copy and locale controls in focused auth-owned modules.
- [x] Run `bun run typecheck`.

### Milestone 34: Public Share And Audience Localization

- [x] Add a shared locale preference module for auth and public-facing surfaces.
- [x] Localize public and private share-view headers and primary actions.
- [x] Localize public audience participation labels, placeholders, statuses, and empty states.
- [x] Localize speaker-side audience result empty states and correct-answer labels.
- [x] Run `bun run typecheck`.

### Milestone 35: Per-Page Dimensions First Pass

- [x] Add typed optional page-level width and height metadata with document-size fallback.
- [x] Add active-page width and height controls in the Pages panel.
- [x] Render page-specific sizes in the editor canvas, page thumbnails, public viewer, speaker preview, and hidden export capture surfaces.
- [x] Include page-specific dimensions in media sequence export metadata.
- [x] Run `bun run typecheck`.

### Milestone 36: Mixed Page Format First Pass

- [x] Add page-level format metadata for social, presentation, document, whiteboard, website, video, email, print, and custom pages.
- [x] Add an active-page format selector in the Pages panel using existing design presets.
- [x] Apply preset dimensions when switching page formats and mark manual size edits as custom.
- [x] Treat page-level whiteboard format as a scrollable whiteboard canvas.
- [x] Include page format metadata in media sequence export.
- [x] Run `bun run typecheck`.

### Milestone 37: Whiteboard Minimap And Viewport First Pass

- [x] Add shared canvas bounds helpers that expand whiteboard workspace bounds from visible object positions.
- [x] Add a whiteboard minimap with page, object, selection, and current viewport indicators.
- [x] Let minimap clicks jump the whiteboard viewport and object clicks select and center layers.
- [x] Persist the whiteboard viewport center per page in local browser storage.
- [x] Run `bun run typecheck`.

### Milestone 38: Mermaid Diagram Import Export First Pass

- [x] Add a Mermaid flowchart parser for common `flowchart` and `graph` node/edge syntax.
- [x] Convert Mermaid nodes into editable grouped shape/text diagram nodes and connector layers.
- [x] Add an Asset panel Mermaid import/export surface with editable source text.
- [x] Export the current page's diagram-like layers back to Mermaid flowchart syntax.
- [x] Run `bun run typecheck`.

### Milestone 39: Card And Mind Map Diagram Starters

- [x] Add an editable mind-map starter with a central topic, branch nodes, notes, and connector paths.
- [x] Add an editable card-board starter with workflow columns, sticky cards, and connector paths.
- [x] Expose the new starters through the existing diagram preset list in the Create panel.
- [x] Keep the new preset logic in a focused diagram-card factory file.
- [x] Run `bun run typecheck`.

### Milestone 40: Anchored Diagram Connectors

- [x] Add typed optional connector endpoint anchors for start/end element attachment.
- [x] Resolve anchored connector geometry when elements are added, moved, nudged, edited, duplicated, or deleted.
- [x] Render anchored straight and elbow connectors from real element anchor points instead of static box-only line paths.
- [x] Add anchor-side controls for connected connector layers.
- [x] Update the mind-map and card-board starters to use anchored connectors.
- [x] Run `bun run typecheck`.

### Milestone 41: Selected Layer Quick Connect

- [x] Add a reusable selection helper that collapses grouped layer selections into connector anchor candidates.
- [x] Add a domain factory for creating an anchored connector between two selected layers.
- [x] Add a localized command-palette action for connecting exactly two selected layers.
- [x] Select the newly created connector so its line, label, marker, and anchor controls are immediately editable.
- [x] Run `bun run typecheck`.

### Milestone 42: Connector Endpoint Management

- [x] Pass page layer context into connector property controls.
- [x] Add start/end layer selectors for connector endpoints.
- [x] Add a free-point option so connected endpoints can be detached without deleting the connector.
- [x] Prevent choosing the same target layer for both connector endpoints.
- [x] Keep endpoint option labels readable by reusing existing layer accessibility labels.
- [x] Run `bun run typecheck`.

### Milestone 43: Connector Endpoint Quick Actions

- [x] Add icon-only connector endpoint action buttons with tooltips and accessible labels.
- [x] Add a swap-endpoints action that reverses attached start/end layers, anchors, and markers together.
- [x] Add a detach-endpoints action that turns an attached connector back into a free-position connector.
- [x] Disable endpoint actions when the connector state does not support them.
- [x] Run `bun run typecheck`.

### Milestone 44: Connector Line Style Controls

- [x] Add a typed connector stroke-style model for solid, dashed, and dotted lines.
- [x] Render dashed and dotted connector paths using the connector stroke width.
- [x] Add a connector property control for switching line style.
- [x] Keep existing documents compatible by treating missing line style as solid.
- [x] Run `bun run typecheck`.

### Milestone 45: Connector Label Position Controls

- [x] Add a typed connector label-position model for start, middle, and end placement.
- [x] Render connector labels along the actual straight or elbow connector path.
- [x] Add a connector property control for switching label position.
- [x] Keep existing documents compatible by treating missing label position as middle.
- [x] Run `bun run typecheck`.

### Milestone 46: Connector Label Readability Boxes

- [x] Add a typed connector label-background model for none, paper, and line-tint boxes.
- [x] Render optional SVG label boxes sized from label length and font size.
- [x] Add a connector property control for switching label box style.
- [x] Preserve existing documents by keeping label boxes disabled by default.
- [x] Run `bun run typecheck`.

### Milestone 47: Connector Property Panel Extraction

- [x] Move connector-specific controls and endpoint helpers into a focused component module.
- [x] Keep sticky-note diagram controls in the original diagram controls module.
- [x] Update the main properties panel to import connector controls from the focused module.
- [x] Preserve connector UI behavior while reducing mixed responsibilities in `diagram-property-controls.tsx`.
- [x] Run `bun run typecheck`.

### Milestone 48: Text Property Panel Extraction

- [x] Move the complete text editing stack into the existing text property-controls module.
- [x] Keep font family, brand font, list, find/replace, spacing, alignment, fill, curve, and effects behavior together.
- [x] Reduce `properties-panel.tsx` to dispatching selected text layers into `TextControls`.
- [x] Remove text-only imports and constants from the main properties panel.
- [x] Run `bun run typecheck`.

### Milestone 49: Image Property Panel Extraction

- [x] Move the complete image editing stack into the existing image property-controls module.
- [x] Keep alt text, crop, frame, adjustment, and duotone behavior together.
- [x] Reduce `properties-panel.tsx` to dispatching selected image layers into `ImageControls`.
- [x] Remove image-only imports and wrapper markup from the main properties panel.
- [x] Run `bun run typecheck`.

### Milestone 50: Media Property Dispatch Extraction

- [x] Add a media property dispatcher for video, audio, PDF, SVG, and Lottie layers.
- [x] Keep the existing media-specific controls in the media property-controls module.
- [x] Reduce `properties-panel.tsx` to a single `MediaControls` call for media layers.
- [x] Remove media-only imports and repeated element-type checks from the main properties panel.
- [x] Run `bun run typecheck`.

### Milestone 51: Selected Layer Property Routing Extraction

- [x] Add a focused selected-layer property routing component.
- [x] Move selected-layer geometry, alignment, link, motion, type-specific controls, media routing, and data controls out of the main properties panel.
- [x] Keep page background, brand color capture, empty state, and action bar ownership in the main properties panel.
- [x] Reduce selected-layer imports from `properties-panel.tsx`.
- [x] Run `bun run typecheck`.

### Milestone 52: Page Property Controls Extraction

- [x] Add a focused page property controls component.
- [x] Move page background color controls and palette selection out of the main properties panel.
- [x] Move selected-color brand swatch capture into the page property controls module.
- [x] Keep palette composition colocated with page property controls.
- [x] Run `bun run typecheck`.

### Milestone 53: Properties Panel Split Completion

- [x] Confirm `properties-panel.tsx` now works as a thin shell around focused page and selected-layer modules.
- [x] Keep the empty layer state local to the shell without creating unnecessary file sprawl.
- [x] Mark the properties-panel split complete after connector, text, image, media, selected-layer, and page controls were extracted.
- [x] Run `bun run typecheck`.

### Milestone 54: Editor Sharing Wiring Extraction

- [x] Move public share and private edit-share state out of `editor-workspace.tsx`.
- [x] Move share URL building, clipboard copy, opening, and API toggle behavior into `use-editor-sharing.ts`.
- [x] Keep the toolbar API unchanged while reducing `editor-workspace.tsx` from 1,233 lines to 1,115 lines.
- [x] Run `bun run typecheck`.

### Milestone 55: Editor Keyboard Shortcut Wiring Extraction

- [x] Move global editor keyboard shortcut registration out of `editor-workspace.tsx`.
- [x] Keep copy/paste clipboard scratch state private to `use-editor-keyboard-shortcuts.ts`.
- [x] Preserve save, undo/redo, duplicate, group/ungroup, copy/paste, select-all, layer walk, delete, and nudge shortcuts.
- [x] Reduce `editor-workspace.tsx` from 1,115 lines to 984 lines.
- [x] Run `bun run typecheck`.

### Milestone 56: Editor Comment Wiring Extraction

- [x] Move editor comment state, open-count derivation, creation, resolving, and reaction toggles out of `editor-workspace.tsx`.
- [x] Keep shared edit-link authorization payloads inside the comment hook so collaboration API details are not mixed into the editor shell.
- [x] Preserve the existing Comments sheet API while reducing `editor-workspace.tsx` from 984 lines to 900 lines.
- [x] Run `bun run typecheck`.

### Milestone 57: Editor Document Action Wiring Extraction

- [x] Move dirty-state marking, document commits, selection-aware element actions, grouping, distribution, locale updates, brand/style application, imported page insertion, and presenter handoff into `use-editor-document-actions.ts`.
- [x] Keep toolbar, command palette, asset panel, pages panel, layers panel, workshop panel, canvas, and properties panel APIs intact while reducing `editor-workspace.tsx` to 793 lines.
- [x] Run `bun run typecheck`.

### Milestone 58: Editor Canvas And Timeline Interaction Extraction

- [x] Move canvas drag preview/commit behavior, timeline element preview/commit behavior, timeline splitting, and shared update-element helpers into `use-editor-canvas-interactions.ts`.
- [x] Preserve the existing Workshop, Media Timeline, Canvas, and Properties panel APIs while reducing `editor-workspace.tsx` to 719 lines.
- [x] Run `bun run typecheck`.

### Milestone 59: Editor Page And Import Wiring Extraction

- [x] Move page creation, selection, rename, notes, transitions, format, size, audience interaction, duplicate, delete, reorder, CSV bulk-create, speaker-notes import, and translation-pack import wiring into `use-editor-page-actions.ts`.
- [x] Preserve the existing Pages panel API while reducing `editor-workspace.tsx` to 606 lines.
- [x] Run `bun run typecheck`.

### Milestone 60: Editor Shell UI State Extraction

- [x] Move zoom, command palette, version history, comments sheet, grid, guides, and print-mark UI state into `use-editor-shell-ui.ts`.
- [x] Preserve the TopToolbar, EditorCommandPalette, VersionHistorySheet, CommentsSheet, and CanvasStage APIs while reducing `editor-workspace.tsx` to 601 lines.
- [x] Mark the editor-workspace split complete after sharing, collaboration, persistence, keyboard, comment, document-action, canvas/timeline, page/import, and shell UI wiring were extracted into feature-owned hooks.
- [x] Run `bun run typecheck`.

### Milestone 61: Workshop Facilitation Depth

- [x] Add persisted page-level workshop session state for stage, voting, reactions, participant count, facilitator note, and spotlight focus.
- [x] Add insight, question, and concern reaction counts on workshop targets.
- [x] Add participant summary and session analytics helpers with top targets, quiet targets, reaction totals, and signals per participant.
- [x] Surface votes, reactions, and spotlight focus in the canvas and workshop panel.
- [x] Run targeted workshop analytics tests and `bun run typecheck`.

### Milestone 62: Browser Autosave Recovery

- [x] Add project-scoped browser-local editor snapshots for dirty unsaved work.
- [x] Detect reloadable local drafts and ignore stale snapshots that already match the saved project.
- [x] Surface a conflict-aware recovery banner when the local draft was based on an older server version.
- [x] Restore local snapshots into the editor document/name state and clear snapshots after successful manual saves or accepted remote updates.
- [x] Run targeted editor autosave tests and `bun run typecheck`.

### Milestone 63: Tauri Desktop File Bridge

- [x] Add Tauri commands for saving and opening portable Essence design JSON files.
- [x] Persist recent local design files in the desktop app data directory.
- [x] Add desktop-side offline asset caching for data-url image, video, audio, and PDF layer sources with per-file size limits.
- [x] Add an editor desktop-files dialog with save-as, open, recent-file, and cache-assets actions that only appears in the Tauri runtime.
- [x] Add focused desktop bridge tests, run `cargo test`, and run `bun run typecheck`.

### Milestone 64: Project Asset Manifest Storage

- [x] Add reusable data-url asset scanning and stable asset IDs shared by desktop, email, and project exports.
- [x] Store compact project asset manifests on manual saves, collaboration syncs, saved templates, and desktop design files.
- [x] Deduplicate repeated image/media data URLs, track layer references, and skip assets that exceed per-entry, entry-count, or total manifest limits.
- [x] Add a hosted project asset route that serves manifest-backed data-url assets through reusable project asset URLs.
- [x] Reuse stable hosted project asset URLs in email model exports instead of element-specific email asset paths.
- [x] Run targeted asset/email/desktop tests, `bun run typecheck`, and `git diff --check`.

### Milestone 65: Export Job History

- [x] Add project-scoped export job records for every editor export request.
- [x] Track queued, running, completed, and failed export states with progress and artifact names.
- [x] Persist recent export jobs in local browser storage with normalization and history caps.
- [x] Add an editor export-jobs sheet with status badges, progress bars, failure diagnostics, clear history, retry, and download-again actions.
- [x] Surface active export progress and failed job counts from the editor toolbar.
- [x] Run targeted export-job tests, `bun run typecheck`, and `git diff --check`.

### Milestone 66: Large-Document Panel Windowing

- [x] Add a shared panel-window helper that caps rendered rows while preserving selected or active items.
- [x] Window the layer list by default for large pages and keep selected layers visible.
- [x] Window page thumbnails by default for large projects and keep the active page visible.
- [x] Window workshop vote target rows while preserving selected and spotlighted targets.
- [x] Window media timeline track rows while preserving selected clips.
- [x] Run targeted panel-window tests, `bun run typecheck`, and `git diff --check`.

### Milestone 67: Public Access And Permission Hardening

- [x] Add shared validators for public share IDs, edit share IDs, project route IDs, project asset IDs, and legacy element asset tokens.
- [x] Add noindex, noarchive, no-referrer, and nosniff headers for public asset responses.
- [x] Add no-store and nosniff headers for public audience JSON responses and invalid public route errors.
- [x] Validate public and audience share IDs before project lookups.
- [x] Validate edit-share IDs before private edit-page lookups and edit-share write access checks.
- [x] Validate hosted project asset and legacy email asset route tokens before asset lookup.
- [x] Run targeted public-access security tests, `bun run typecheck`, and `git diff --check`.
