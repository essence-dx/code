import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDesktopReadinessReport } from "../src/lib/desktop/desktop-readiness";

const browserReport = createDesktopReadinessReport({ isDesktopRuntime: false, hasOnlineActions: true });
assert.equal(browserReport.runtimeLabel, "Browser");
assert.equal(browserReport.status, "limited");
assert.equal(browserReport.capabilities.find((capability) => capability.id === "local-import")?.status, "limited");
assert.equal(browserReport.capabilities.find((capability) => capability.id === "local-export")?.detail, "Exports download through the browser.");
assert.equal(browserReport.capabilities.find((capability) => capability.id === "render-handoff")?.status, "limited");
assert.equal(browserReport.capabilities.find((capability) => capability.id === "runtime-diagnostics")?.status, "limited");
assert.equal(browserReport.capabilities.find((capability) => capability.id === "online-actions")?.status, "ready");

const offlineDesktopReport = createDesktopReadinessReport({ isDesktopRuntime: true, hasOnlineActions: false });
assert.equal(offlineDesktopReport.runtimeLabel, "Desktop app");
assert.equal(offlineDesktopReport.status, "limited");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "local-import")?.status, "ready");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "local-export")?.status, "ready");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "media-recovery")?.status, "ready");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "render-handoff")?.status, "ready");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "runtime-diagnostics")?.status, "ready");
assert.equal(offlineDesktopReport.capabilities.find((capability) => capability.id === "online-actions")?.status, "limited");

const readyDesktopReport = createDesktopReadinessReport({ isDesktopRuntime: true, hasOnlineActions: true });
assert.equal(readyDesktopReport.status, "ready");
assert.equal(readyDesktopReport.summary, "Desktop import, export, recovery, render handoff, diagnostics, and online actions are ready.");

const settingsPage = readFileSync("src/app/settings/page.tsx", "utf8");
assert.match(settingsPage, /DesktopReadinessCard/);

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
assert.match(rootLayout, /DesktopProofAutopilot/);

const cardSource = readFileSync("src/features/settings/components/desktop-readiness-card.tsx", "utf8");
assert.match(cardSource, /createDesktopReadinessReport/);
assert.match(cardSource, /useIsDesktopRuntime/);
assert.match(cardSource, /useHasClientApiRuntime/);
assert.match(cardSource, /runDesktopVerification/);
assert.match(cardSource, /loadDesktopVerificationHistory/);
assert.match(cardSource, /saveDesktopVerificationReport/);
assert.match(cardSource, /importDesktopVerificationEvidencePacket/);
assert.match(cardSource, /readDesktopVerificationEvidenceEntries/);
assert.match(cardSource, /downloadDesktopVerificationEvidence/);
assert.match(cardSource, /auditDesktopVerificationEvidencePacket/);
assert.match(cardSource, /Evidence verifier/);
assert.match(cardSource, /desktopVerificationUpdatedEvent/);
assert.match(cardSource, /DesktopVerificationUpdatedEventDetail/);
assert.match(cardSource, /Desktop evidence saved to/);
assert.match(cardSource, /createDesktopLaunchProofSummary/);
assert.match(cardSource, /Run checks/);
assert.match(cardSource, /Import desktop evidence packet/);
assert.match(cardSource, /Last check/);
assert.match(cardSource, /Saved evidence/);
assert.match(cardSource, /Desktop launch proof/);
assert.match(cardSource, /Export/);
assert.doesNotMatch(cardSource, /Tauri|Drizzle|Better Auth|Vercel AI SDK/);

const launchProof = readFileSync("src/lib/desktop/desktop-launch-proof.ts", "utf8");
assert.match(launchProof, /desktopLaunchProofRequirements/);
assert.match(launchProof, /desktop-launch-session/);
assert.match(launchProof, /local-project-persistence/);
assert.match(launchProof, /file-backed-media/);
assert.match(launchProof, /native-export-output/);
assert.match(launchProof, /hasDesktopLaunchProofEntry/);

const verification = readFileSync("src/lib/desktop/desktop-verification.ts", "utf8");
assert.match(verification, /runDesktopVerification/);
assert.match(verification, /verifyDesktopLaunchSession/);
assert.match(verification, /runDesktopDiagnostics/);
assert.match(verification, /runDesktopWorkflowSmoke/);
assert.match(verification, /run_desktop_workflow_smoke/);
assert.match(verification, /saveLocalProject/);
assert.match(verification, /loadLocalProject/);
assert.match(verification, /deleteLocalProject/);
assert.match(verification, /permanentlyDeleteLocalProject/);
assert.match(verification, /local-project-persistence/);
assert.match(verification, /source: "workflow"/);

const launchSession = readFileSync("src/lib/desktop/desktop-launch-session.ts", "utf8");
assert.match(launchSession, /read_desktop_launch_session/);
assert.match(launchSession, /essence\.desktop\.launch-session\.v1/);
assert.match(launchSession, /Restart the desktop app and run checks again/);

const proofAutopilot = readFileSync("src/features/settings/components/desktop-proof-autopilot.tsx", "utf8");
assert.match(proofAutopilot, /ESSENCE_DESKTOP_AUTO_VERIFY|autoVerify/);
assert.match(proofAutopilot, /desktopProof/);
assert.match(proofAutopilot, /runDesktopVerification/);
assert.match(proofAutopilot, /saveDesktopVerificationReport/);
assert.match(proofAutopilot, /writeDesktopVerificationEvidenceToAppLocalData/);
assert.match(proofAutopilot, /evidenceFile/);
assert.match(proofAutopilot, /desktopVerificationUpdatedEvent/);

const history = readFileSync("src/lib/desktop/desktop-verification-history.ts", "utf8");
assert.match(history, /loadDesktopVerificationHistory/);
assert.match(history, /saveDesktopVerificationReport/);
assert.match(history, /importDesktopVerificationEvidencePacket/);
assert.match(history, /readDesktopVerificationEvidenceEntries/);
assert.match(history, /createDesktopVerificationEvidencePacket/);
assert.match(history, /downloadDesktopVerificationEvidence/);
assert.match(history, /writeDesktopVerificationEvidenceToAppLocalData/);
assert.match(history, /writeTextFile/);
assert.match(history, /BaseDirectory\.AppLocalData/);
assert.match(history, /desktop-verification/);
assert.match(history, /latest-desktop-evidence\.json/);
assert.match(history, /DesktopVerificationEvidencePacket/);
assert.match(history, /DesktopVerificationEvidenceFile/);
assert.match(history, /essence\.desktop\.verification\.history\.v1/);
assert.match(history, /maxHistoryEntries = 5/);
assert.match(history, /essence-desktop-evidence-/);
assert.match(history, /readyCount/);
assert.match(history, /failedCount/);

const diagnostics = readFileSync("src/lib/desktop/desktop-diagnostics.ts", "utf8");
assert.match(diagnostics, /runDesktopDiagnostics/);
assert.match(diagnostics, /run_desktop_diagnostics/);
assert.match(diagnostics, /desktop-runtime/);
assert.match(diagnostics, /local file storage, media recovery, and native export readiness/);

const desktopDiagnostics = readFileSync("src-tauri/src/desktop_diagnostics.rs", "utf8");
assert.match(desktopDiagnostics, /native_render_smoke_step/);
assert.match(desktopDiagnostics, /native-render-smoke/);
assert.match(desktopDiagnostics, /Desktop render smoke created media output/);
assert.match(desktopDiagnostics, /handoff manifest/);

const desktopLaunch = readFileSync("src-tauri/src/desktop_launch.rs", "utf8");
assert.match(desktopLaunch, /DesktopLaunchSession/);
assert.match(desktopLaunch, /read_desktop_launch_session/);
assert.match(desktopLaunch, /create_desktop_launch_session/);
assert.match(desktopLaunch, /ESSENCE_DESKTOP_AUTO_VERIFY/);

const desktopWorkflow = readFileSync("src-tauri/src/desktop_workflow.rs", "utf8");
assert.match(desktopWorkflow, /pub fn run_desktop_workflow_smoke/);
assert.match(desktopWorkflow, /file_backed_media_recovery_step/);
assert.match(desktopWorkflow, /native_export_output_step/);
assert.match(desktopWorkflow, /desktop-workflow-smoke/);
assert.match(desktopWorkflow, /run_native_render_smoke/);

const desktopCheck = readFileSync("scripts/check-tauri-workflow.ts", "utf8");
assert.match(desktopCheck, /frontendDist/);
assert.match(desktopCheck, /importTauriMedia/);
assert.match(desktopCheck, /restoreTauriMediaAssets/);
assert.match(desktopCheck, /loadTauriMediaBlob/);

const exportOutput = readFileSync("src/lib/render/export-output.ts", "utf8");
assert.match(exportOutput, /saveRenderedBlob/);

console.log("Desktop readiness workflow checks passed.");
