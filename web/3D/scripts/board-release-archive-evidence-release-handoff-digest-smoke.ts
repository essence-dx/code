import assert from "node:assert/strict";
import { createBoardReleaseArchiveEvidenceReleaseHandoffDigest } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";
import type { BoardReleaseArchiveEvidenceDiffSnapshotReport } from "@/features/projects/board-release-archive-evidence-diff-snapshots";
import type { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import type { BoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const retentionVault = {
  generatedAt,
  manifests: [],
  summary: {
    blockedCount: 0,
    manifestCount: 5,
    nextAction: "Archive evidence retention vault is sealed for board release archive evidence.",
    packetHash: "sha256:packet",
    sealedCount: 5,
    status: "sealed",
    totalByteSize: 400,
    vaultHash: "sha256:vault",
    vaultScore: 100,
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveEvidenceRetentionVaultReport;

const diffSnapshots = {
  generatedAt,
  rows: [],
  summary: {
    addedCount: 1,
    blockedCount: 0,
    changedCount: 1,
    currentVaultHash: "sha256:vault",
    missingCount: 0,
    nextAction: "Review changed, added, or missing archive evidence bundles before release archive closeout.",
    previousVaultHash: "sha256:previous-vault",
    snapshotHash: "sha256:diff",
    snapshotScore: 81,
    status: "watch",
    totalCount: 5,
    unchangedCount: 3,
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveEvidenceDiffSnapshotReport;

const reviewerPackets = {
  generatedAt,
  packets: [],
  summary: {
    acknowledgementRequiredCount: 4,
    blockedCount: 0,
    externalPacketCount: 3,
    nextAction: "Collect reviewer acknowledgements.",
    packetCount: 4,
    readyCount: 1,
    reviewerPacketHash: "sha256:reviewers",
    reviewerScore: 84,
    status: "watch",
    totalRedactionCount: 20,
    watchCount: 3,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveEvidenceReviewerPacketReport;

const exceptionRenewals = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 0,
    dueSoonCount: 1,
    nextAction: "Schedule renewal confirmation.",
    overdueCount: 0,
    renewalHash: "sha256:renewal",
    renewalScore: 92,
    rowCount: 4,
    scheduledCount: 3,
    status: "due-soon",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;

const report = createBoardReleaseArchiveEvidenceReleaseHandoffDigest({
  diffSnapshots,
  exceptionRenewals,
  generatedAt,
  retentionVault,
  reviewerPackets,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.readyCount, 1);
assert.equal(report.summary.watchCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.rows[0]?.area, "diffs");
assert.equal(report.rows.some((row) => row.area === "vault" && row.status === "ready"), true);
assert.equal(report.summary.digestHash.startsWith("sha256:"), true);
assert.match(report.executiveMemo, /WATCH archive evidence handoff/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-evidence-handoff-digest-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-evidence-handoff-digest-20260529.json");
assert.match(report.csvContent, /handoff_id,area,title,status,score,metric,value,evidence_hash,next_action/);
assert.match(report.jsonContent, /"digestScore"/);

console.log("board release archive evidence release handoff digest smoke passed");
