import type { ProductCapability } from "@/lib/product/capability-types";

export const desktopCapabilities = [
  {
    id: "desktop-runtime",
    area: "desktop",
    label: "Desktop app runtime",
    userValue: "The desktop app has static export wiring, file permissions, local media import, native export paths, in-app diagnostics, desktop relaunch markers, proof autopilot support, a local project persistence roundtrip self-test, file-backed media and export smoke checks, saved verification evidence, an exportable evidence packet, a strict evidence verifier, freshness reminders, a no-rebuild proof refresh command, and a captured ready Tauri relaunch proof packet.",
    status: "ready",
    priority: "p0",
    ownerPath: "src-tauri, src/lib/media/tauri-media.ts, src/lib/desktop/desktop-diagnostics.ts, src/lib/desktop/desktop-verification.ts, src/lib/desktop/desktop-verification-history.ts, src/lib/desktop/desktop-evidence-audit.ts, src/lib/desktop/desktop-proof-freshness.ts, src/features/settings/components/desktop-readiness-card.tsx, scripts/verify-desktop-evidence-packet.ts, scripts/run-desktop-proof-dev.ts",
    evidence: ["Static export preflight", "Tauri permissions", "desktop media adapter", "desktop diagnostics command", "desktop workflow smoke command", "desktop launch session marker", "desktop proof autopilot", "native render smoke check", "file-backed media smoke check", "native export output smoke check", "local project persistence roundtrip", "saved verification evidence", "exportable evidence packet", "strict evidence packet verifier", "proof freshness reminder", "no-rebuild refresh command", "settings self-test UI", "ready desktop evidence packet"],
    nextStep: "Repeat proof after native workflow changes and attach the refreshed packet to release notes.",
  },
  {
    id: "desktop-render-pipeline",
    area: "desktop",
    label: "Long-project desktop render pipeline",
    userValue: "Long, file-backed, and high-layer-budget projects are routed toward the desktop renderer so creators avoid unsafe browser render attempts, with native render smoke and export output verified in a real desktop proof packet.",
    status: "ready",
    priority: "p1",
    ownerPath: "src-tauri/src, src/lib/render",
    evidence: ["render-handoff planner", "export-panel route badge", "desktop readiness report", "desktop diagnostics", "native render smoke check", "native render adapter", "typed progress and cancellation", "native compositor manifest", "typed native render graph", "native FFmpeg execution path", "native FFmpeg text and shape overlays", "native media inputs and audio mixing", "required desktop routing for heavy timelines", "ready native export output proof"],
    nextStep: "Expand release QA coverage for larger sample projects and multi-track creator scenarios.",
  },
] satisfies ProductCapability[];
