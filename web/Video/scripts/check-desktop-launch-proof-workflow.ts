import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import { readDesktopVerificationEvidenceEntries } from "../src/lib/desktop/desktop-verification-history";
import {
  createDesktopLaunchProofSummary,
  desktopLaunchProofRequirements,
  hasDesktopLaunchProofEntry,
} from "../src/lib/desktop/desktop-launch-proof";
import { createReleaseDesktopProof, selectReadyDesktopVerificationEntry } from "../src/lib/product/release-evidence";

const readyEntry = createEntry("desktop_verification_ready", "ready", desktopLaunchProofRequirements.map((requirement) => requirement.id));
const missingExportEntry = createEntry(
  "desktop_verification_missing",
  "ready",
  desktopLaunchProofRequirements.filter((requirement) => requirement.id !== "native-export-output").map((requirement) => requirement.id),
);
const limitedEntry = createEntry("desktop_verification_limited", "limited", desktopLaunchProofRequirements.map((requirement) => requirement.id), [
  "native-media-engine",
]);

assert.equal(createDesktopLaunchProofSummary(null).status, "missing");
assert.equal(createDesktopLaunchProofSummary(readyEntry).status, "ready");
assert.equal(createDesktopLaunchProofSummary(readyEntry).readyCount, desktopLaunchProofRequirements.length);
assert.equal(hasDesktopLaunchProofEntry(readyEntry), true);
assert.equal(createDesktopLaunchProofSummary(missingExportEntry).status, "missing");
assert.equal(hasDesktopLaunchProofEntry(missingExportEntry), false);
assert.equal(createDesktopLaunchProofSummary(limitedEntry).status, "limited");
assert.equal(hasDesktopLaunchProofEntry(limitedEntry), false);
assert.equal(createReleaseDesktopProof(readyEntry).desktopLaunchVerified, true);
assert.equal(createReleaseDesktopProof(missingExportEntry).desktopLaunchVerified, false);
assert.equal(
  selectReadyDesktopVerificationEntry({
    schemaVersion: 1,
    exportedAt: Date.now(),
    entryCount: 2,
    entries: [missingExportEntry, readyEntry],
  })?.id,
  readyEntry.id,
);
assert.equal(selectReadyDesktopVerificationEntry({ schemaVersion: 1, exportedAt: Date.now(), entryCount: 1, entries: [missingExportEntry] }), null);
assert.equal(
  readDesktopVerificationEvidenceEntries({
    schemaVersion: 1,
    exportedAt: Date.now(),
    entryCount: 2,
    entries: [missingExportEntry, readyEntry],
  }).length,
  2,
);

const packageJson = read("package.json");
const desktopCard = read("src/features/settings/components/desktop-readiness-card.tsx");
const proofModule = read("src/lib/desktop/desktop-launch-proof.ts");
const releaseEvidence = read("src/lib/product/release-evidence.ts");
const readinessCheck = read("scripts/check-desktop-readiness-workflow.ts");
const proofDevRunner = read("scripts/run-desktop-proof-dev.ts");

assert.match(packageJson, /check:desktop-launch-proof-workflow/);
assert.match(packageJson, /desktop:proof:dev/);
assert.match(packageJson, /desktop:proof:refresh/);
assert.match(desktopCard, /createDesktopLaunchProofSummary/);
assert.match(desktopCard, /Desktop launch proof/);
assert.match(desktopCard, /Proof freshness/);
assert.match(desktopCard, /Import desktop evidence packet/);
assert.match(desktopCard, /proofBadgeVariant/);
assert.match(proofModule, /local-project-persistence/);
assert.match(proofModule, /desktop-launch-session/);
assert.match(proofModule, /desktop-storage/);
assert.match(proofModule, /media-library/);
assert.match(proofModule, /render-spool/);
assert.match(proofModule, /native-media-engine/);
assert.match(proofModule, /native-render-smoke/);
assert.match(proofModule, /file-backed-media/);
assert.match(proofModule, /native-export-output/);
assert.match(releaseEvidence, /hasDesktopLaunchProofEntry/);
assert.match(releaseEvidence, /filter\(\(entry\) => hasDesktopLaunchProofEntry\(entry\)\)/);
assert.match(readinessCheck, /Desktop launch proof/);
assert.match(read("src/lib/desktop/desktop-launch-session.ts"), /verifyDesktopLaunchSession/);
assert.match(read("src-tauri/src/desktop_launch.rs"), /read_desktop_launch_session/);
assert.match(read("src/features/settings/components/desktop-proof-autopilot.tsx"), /saveDesktopVerificationReport/);
assert.match(read("src/features/settings/components/desktop-proof-autopilot.tsx"), /writeDesktopVerificationEvidenceToAppLocalData/);
assert.match(read("src/features/settings/components/desktop-proof-autopilot.tsx"), /evidenceFile/);
assert.match(read("src/app/layout.tsx"), /DesktopProofAutopilot/);
assert.match(proofDevRunner, /ESSENCE_DESKTOP_AUTO_VERIFY/);
assert.match(proofDevRunner, /tauri:dev/);
assert.match(proofDevRunner, /latest-desktop-evidence\.json/);
assert.match(proofDevRunner, /auditDesktopVerificationEvidencePacket/);
assert.match(proofDevRunner, /\\uFEFF/);
assert.match(proofDevRunner, /RUSTFLAGS/);
assert.match(proofDevRunner, /\/PDB:NONE/);
assert.match(proofDevRunner, /debugTauriBinaryPath/);
assert.match(proofDevRunner, /force-tauri-dev/);
assert.match(proofDevRunner, /existing-binary-only/);
assert.match(proofDevRunner, /existing-binary/);
assert.match(proofDevRunner, /waitForDevServer/);
assert.match(proofDevRunner, /http:\/\/localhost:3000/);
assert.match(proofDevRunner, /minimumProofRunFreeBytes/);
assert.match(proofDevRunner, /minimumExistingBinaryProofFreeBytes/);
assert.match(proofDevRunner, /Get-PSDrive/);
assert.match(proofDevRunner, /Free disk space or remove stale build artifacts/);
assert.match(proofDevRunner, /taskkill/);

console.log("Desktop launch proof workflow checks passed.");

function createEntry(
  id: string,
  status: DesktopVerificationHistoryEntry["status"],
  readyStepIds: string[],
  limitedStepIds: string[] = [],
): DesktopVerificationHistoryEntry {
  const steps = readyStepIds.map((stepId) => ({
    id: stepId,
    label: stepId,
    source: stepId === "local-project-persistence" ? ("project" as const) : stepId.startsWith("native-") || stepId.includes("storage") || stepId === "media-library" || stepId === "render-spool" ? ("runtime" as const) : ("workflow" as const),
    status: limitedStepIds.includes(stepId) ? ("limited" as const) : ("ready" as const),
    detail: `${stepId} checked.`,
  }));

  return {
    id,
    status,
    checkedAt: 1,
    stepCount: steps.length,
    readyCount: steps.filter((step) => step.status === "ready").length,
    limitedCount: steps.filter((step) => step.status === "limited").length,
    failedCount: 0,
    steps,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
