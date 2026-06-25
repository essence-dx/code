import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import type { SelfHostedUploadEvidencePacket } from "../src/lib/media/self-hosted-upload-history";
import type { SelfHostedUploadProfileReadinessEvidencePacket } from "../src/lib/media/self-hosted-upload-profile-readiness";
import type { ReleaseEvidence } from "../src/lib/product/release-evidence";
import { createReleasePacketImportConflictPreview } from "../src/lib/product/release-packet-import-conflicts";

const currentEvidence = releaseEvidence("https://old.example", "C:\\proof\\old.png", "desktop-old", 1778916000000);
const incomingEvidence = releaseEvidence("https://new.example", "C:\\proof\\new.png", "desktop-new", 1778919600000);
const conflictPreview = createReleasePacketImportConflictPreview({
  currentEvidence,
  incomingEvidence,
  currentDesktopVerification: desktopEntry("desktop-old", 1778916000000),
  incomingDesktopVerification: desktopEntry("desktop-new", 1778919600000),
  currentUploadEvidence: uploadPacket(1778916000000, 1),
  incomingUploadEvidence: uploadPacket(1778919600000, 2),
  currentProfileReadinessEvidence: profilePacket(1778916000000, 1),
  incomingProfileReadinessEvidence: profilePacket(1778919600000, 2),
});
const clearPreview = createReleasePacketImportConflictPreview({
  currentEvidence,
  incomingEvidence: currentEvidence,
  currentDesktopVerification: desktopEntry("desktop-old", 1778916000000),
  incomingDesktopVerification: desktopEntry("desktop-old", 1778916000000),
  currentUploadEvidence: uploadPacket(1778916000000, 1),
  incomingUploadEvidence: uploadPacket(1778916000000, 1),
  currentProfileReadinessEvidence: profilePacket(1778916000000, 1),
  incomingProfileReadinessEvidence: profilePacket(1778916000000, 1),
});
const missingIncomingPreview = createReleasePacketImportConflictPreview({
  currentEvidence,
  incomingEvidence: releaseEvidence("", "", "", null),
  currentDesktopVerification: desktopEntry("desktop-old", 1778916000000),
  incomingDesktopVerification: null,
  currentUploadEvidence: uploadPacket(1778916000000, 1),
  incomingUploadEvidence: null,
  currentProfileReadinessEvidence: profilePacket(1778916000000, 1),
  incomingProfileReadinessEvidence: null,
});

assert.equal(conflictPreview.status, "conflict");
assert.equal(conflictPreview.conflictCount, 4);
assert.equal(conflictPreview.items.find((item) => item.id === "release-url-proof")?.status, "conflict");
assert.equal(conflictPreview.items.find((item) => item.id === "desktop-proof")?.status, "conflict");
assert.equal(conflictPreview.items.find((item) => item.id === "upload-verification-proof")?.status, "conflict");
assert.equal(conflictPreview.items.find((item) => item.id === "profile-readiness-proof")?.status, "conflict");
assert.equal(clearPreview.status, "clear");
assert.equal(clearPreview.sameCount, 4);
assert.equal(missingIncomingPreview.status, "conflict");
assert.equal(missingIncomingPreview.conflictCount, 2);

const conflictModule = read("src/lib/product/release-packet-import-conflicts.ts");
const previewComponent = read("src/features/settings/components/release-packet-import-preview.tsx");
const releaseCard = read("src/features/settings/components/release-readiness-card.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(conflictModule, /release-url-proof/);
assert.match(conflictModule, /desktop-proof/);
assert.match(conflictModule, /upload-verification-proof/);
assert.match(conflictModule, /profile-readiness-proof/);
assert.match(previewComponent, /Import conflict preview/);
assert.match(previewComponent, /Import anyway/);
assert.match(releaseCard, /pendingReleaseImport/);
assert.match(releaseCard, /createReleasePacketImportConflictPreview/);
assert.match(releaseCard, /Review the release proof import conflicts/);
assert.match(packageJson, /check:release-packet-import-conflicts-workflow/);
assert.match(lightweight, /check:release-packet-import-conflicts-workflow/);
assert.match(todo, /\[x\] Add release packet import conflict preview/);
assert.match(changelog, /Release Packet Import Conflict Preview/);

console.log("Release packet import conflict workflow checks passed.");

function releaseEvidence(
  deploymentUrl: string,
  deploymentScreenshotArtifact: string,
  desktopVerificationId: string,
  desktopVerificationCheckedAt: number | null,
): ReleaseEvidence {
  return {
    deploymentUrl,
    deploymentScreenshotUrl: "",
    deploymentScreenshotArtifact,
    desktopLaunchVerified: Boolean(desktopVerificationId && desktopVerificationCheckedAt),
    desktopVerificationId,
    desktopVerificationCheckedAt,
    desktopVerificationStepCount: desktopVerificationId ? 8 : 0,
    updatedAt: desktopVerificationCheckedAt,
  };
}

function desktopEntry(id: string, checkedAt: number): DesktopVerificationHistoryEntry {
  return {
    id,
    status: "ready",
    checkedAt,
    stepCount: 8,
    readyCount: 8,
    limitedCount: 0,
    failedCount: 0,
    steps: [],
  };
}

function uploadPacket(exportedAt: number, entryCount: number): SelfHostedUploadEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt,
    entryCount,
    verifiedCount: entryCount,
    limitedCount: 0,
    failedCount: 0,
    entries: [],
  };
}

function profilePacket(exportedAt: number, reportCount: number): SelfHostedUploadProfileReadinessEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt,
    reportCount,
    readyCount: reportCount,
    limitedCount: 0,
    failedCount: 0,
    reports: [],
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
