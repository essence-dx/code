import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { LocalMaintenanceHistoryEntry } from "../src/lib/operations/local-maintenance-history";
import type { ReleaseEvidence } from "../src/lib/product/release-evidence";
import { createReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import type { ReleaseEvidenceHistoryEntry } from "../src/lib/product/release-evidence-history";
import {
  createReleaseOperationsHistoryEntry,
  createReleaseOperationsPacket,
  filterReleaseOperationsHistory,
  releaseOperationsStatusLabel,
  saveReleaseOperationsHistoryEntry,
} from "../src/lib/product/release-operations-history";
import type { ExportProofBundle } from "../src/lib/projects/export-proof-bundle";
import type { ExportProofBundleHistoryEntry } from "../src/lib/projects/export-proof-bundle-history";

const exportedAt = "2026-05-16T06:15:00.000Z";
const now = Date.parse(exportedAt);
const releaseEvidence: ReleaseEvidence = {
  deploymentUrl: "https://essence-kapwing.example",
  deploymentScreenshotUrl: "https://essence-kapwing.example/screenshot.png",
  deploymentScreenshotArtifact: "",
  desktopLaunchVerified: true,
  desktopVerificationId: "desktop-proof-ready",
  desktopVerificationCheckedAt: now,
  desktopVerificationStepCount: 9,
  updatedAt: now,
};
const releaseEvidenceSummary = createReleaseEvidenceSummary(releaseEvidence, now);
const releaseHistoryEntry = {
  id: "release-history-ready",
  auditStatus: "ready",
  savedAt: now,
} satisfies Pick<ReleaseEvidenceHistoryEntry, "id" | "auditStatus" | "savedAt">;
const maintenanceHistoryEntry = {
  id: "maintenance-ready",
  savedAt: exportedAt,
  label: "Ready",
  score: 100,
  readyCount: 5,
  attentionCount: 0,
  blockedCount: 0,
  projectId: "project-1",
  projectTitle: "Release project",
  packet: {
    schemaVersion: 1,
    exportedAt,
    project: {
      id: "project-1",
      title: "Release project",
      updatedAt: exportedAt,
      aspectRatio: "16:9",
      duration: 12,
      layerCount: 3,
      mediaAssetCount: 2,
      exportJobCount: 1,
    },
    report: {
      score: 100,
      status: "ready",
      readyCount: 5,
      attentionCount: 0,
      blockedCount: 0,
      items: [{ id: "stale-proof", label: "Proof freshness", status: "ready", count: 0, detail: "Proof is current." }],
    },
  },
} satisfies LocalMaintenanceHistoryEntry;
const proofBundle: ExportProofBundle = {
  schemaVersion: 1,
  id: "proof-ready",
  reviewId: "review-1",
  projectId: "project-1",
  exportJobId: "export-1",
  outputName: "creator-export.mp4",
  format: "mp4",
  preset: "YouTube 1080p",
  generatedAt: exportedAt,
  status: "ready",
  readyCount: 6,
  reviewCount: 0,
  blockedCount: 0,
  downloadCount: 1,
  downloadBytes: 4_200_000,
  sections: [
    {
      id: "export-qa",
      label: "Export QA",
      status: "ready",
      summary: "Ready",
      detail: "Export QA passed.",
      evidenceCount: 6,
    },
  ],
};
const proofBundleEntry = {
  id: "proof-import-ready",
  importedAt: exportedAt,
  bundle: proofBundle,
} satisfies Pick<ExportProofBundleHistoryEntry, "id" | "importedAt" | "bundle">;

assert.equal(releaseEvidenceSummary.status, "ready");

const readyPacket = createReleaseOperationsPacket({
  releaseEvidence,
  releaseEvidenceSummary,
  releaseHistoryEntry,
  maintenanceHistoryEntry,
  proofBundleEntry,
  exportedAt,
});
const draftPacket = createReleaseOperationsPacket({
  releaseEvidence,
  releaseEvidenceSummary,
  releaseHistoryEntry,
  maintenanceHistoryEntry: null,
  proofBundleEntry: null,
  exportedAt,
});
const blockedPacket = createReleaseOperationsPacket({
  releaseEvidence,
  releaseEvidenceSummary,
  releaseHistoryEntry,
  maintenanceHistoryEntry: { ...maintenanceHistoryEntry, label: "Blocked", blockedCount: 1 },
  proofBundleEntry: { ...proofBundleEntry, bundle: { ...proofBundle, status: "blocked", blockedCount: 1, readyCount: 5 } },
  exportedAt,
});

assert.equal(readyPacket.status, "ready");
assert.equal(readyPacket.releaseEvidence.score, 100);
assert.equal(readyPacket.deploymentProof.ready, true);
assert.equal(readyPacket.maintenanceEvidence.status, "ready");
assert.equal(readyPacket.reviewHandoff.status, "ready");
assert.equal(draftPacket.status, "draft");
assert.equal(blockedPacket.status, "blocked");

const readyEntry = createReleaseOperationsHistoryEntry(readyPacket, exportedAt);
const draftEntry = createReleaseOperationsHistoryEntry(draftPacket, "2026-05-16T06:16:00.000Z");
const blockedEntry = createReleaseOperationsHistoryEntry(blockedPacket, "2026-05-16T06:17:00.000Z");

assert.equal(filterReleaseOperationsHistory([readyEntry, draftEntry, blockedEntry], "ready")[0]?.id, readyEntry.id);
assert.equal(filterReleaseOperationsHistory([readyEntry, draftEntry, blockedEntry], "draft")[0]?.id, draftEntry.id);
assert.equal(filterReleaseOperationsHistory([readyEntry, draftEntry, blockedEntry], "blocked")[0]?.id, blockedEntry.id);
assert.equal(filterReleaseOperationsHistory([readyEntry, draftEntry, blockedEntry], "all").length, 3);
assert.equal(releaseOperationsStatusLabel("ready"), "Ready");
assert.equal(saveReleaseOperationsHistoryEntry(readyPacket, exportedAt)[0]?.packet.status, "ready");

const operationsModule = read("src/lib/product/release-operations-history.ts");
const settingsCard = read("src/features/settings/components/release-operations-history-card.tsx");
const settingsPage = read("src/app/settings/page.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(operationsModule, /createReleaseOperationsPacket/);
assert.match(operationsModule, /downloadReleaseOperationsPacket/);
assert.match(operationsModule, /essence\.release\.operations\.history\.v1/);
assert.match(settingsCard, /Release operations/);
assert.match(settingsCard, /Save snapshot/);
assert.match(settingsCard, /Export packet/);
assert.match(settingsPage, /ReleaseOperationsHistoryCard/);
assert.match(packageJson, /check:release-operations-history-workflow/);
assert.match(lightweight, /check:release-operations-history-workflow/);
assert.match(todo, /\[x\] Add Settings release operations history/);
assert.match(changelog, /Release Operations History/);

console.log("Release operations history workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
