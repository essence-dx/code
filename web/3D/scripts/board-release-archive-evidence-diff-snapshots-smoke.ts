import assert from "node:assert/strict";
import { createBoardReleaseArchiveEvidenceDiffSnapshotReport } from "@/features/projects/board-release-archive-evidence-diff-snapshots";
import type { BoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import { createBoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveIntelligenceAutomationDigestReport } from "@/features/projects/board-release-archive-intelligence-automation-digest";
import type { BoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";

const generatedAt = "2026-05-29T10:00:00.000Z";
const packetHash = "sha256:packet";

const packet = {
  csvContent: "record_type,id,kind,title,status,score_or_priority,evidence_hash,record_hash,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,record_type",
  csvFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.csv",
  executiveMemo: "READY archive intelligence packet: 5 evidence sections.",
  generatedAt,
  jsonContent: JSON.stringify({ packetHash }),
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.json",
  recommendations: [],
  sections: [],
  summary: {
    blockedRecommendationCount: 0,
    blockedSectionCount: 0,
    governanceUpdateCount: 1,
    nextAction: "Archive intelligence packet is ready for board governance review.",
    packetHash,
    packetScore: 94,
    recommendationCount: 0,
    sectionCount: 5,
    status: "ready",
    watchRecommendationCount: 0,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveIntelligencePacketReport;

const automationDigest = {
  jsonContent: JSON.stringify({ digest: true }),
  jsonFileName: "workspace-board-board-release-archive-intelligence-automation-digest-20260529.json",
  summary: {
    blockedCount: 0,
    digestHash: "sha256:digest",
    digestScore: 91,
    followThroughCount: 0,
    nextAction: "Archive the final archive intelligence automation digest.",
    packetHash,
    readyCount: 4,
    rowCount: 4,
    status: "ready",
    watchCount: 0,
  },
} as BoardReleaseArchiveIntelligenceAutomationDigestReport;

const approvalWorkflow = {
  csvContent: "recommendation_id,reviewer_email,status\n",
  csvFileName: "workspace-board-board-release-archive-intelligence-approval-workflow-20260529.csv",
  summary: {
    approvedCount: 2,
    exceptionNeededCount: 0,
    hashMismatchCount: 0,
    nextAction: "Keep reviewer acknowledgement, exception notes, and packet hash sign-off with the archive automation record.",
    packetHash,
    pendingCount: 0,
    rejectedCount: 0,
    status: "approved",
    totalCount: 2,
    workflowScore: 100,
  },
} as BoardReleaseArchiveIntelligenceApprovalWorkflowReport;

const notificationRouting = {
  csvContent: "notification_id,recommendation_id,severity\n",
  csvFileName: "workspace-board-board-release-archive-intelligence-notification-routing-20260529.csv",
  summary: {
    criticalCount: 0,
    eligibleRouteCount: 4,
    emailEligibleCount: 2,
    inAppEligibleCount: 2,
    nextAction: "No blocked archive intelligence recommendations need routing.",
    notificationCount: 0,
    routeCount: 4,
    routingScore: 100,
    status: "info",
    suppressedByPreferenceCount: 0,
    suppressedByRoleCount: 0,
    warningCount: 0,
  },
} as BoardReleaseArchiveIntelligenceNotificationRoutingReport;

const commandCenter = {
  csvContent: "row_id,label,status\n",
  csvFileName: "workspace-board-board-release-archive-intelligence-command-center-20260529.csv",
  summary: {
    blockedCount: 0,
    commandScore: 100,
    nextAction: "Archive the command center with the final archive intelligence automation record.",
    packetHash,
    readyCount: 4,
    remediationWorkCount: 0,
    rowCount: 4,
    status: "ready",
    watchCount: 0,
  },
} as BoardReleaseArchiveIntelligenceCommandCenterReport;

const currentVault = createBoardReleaseArchiveEvidenceRetentionVaultReport({
  approvalWorkflow,
  automationDigest,
  commandCenter,
  generatedAt,
  notificationRouting,
  packet,
  workspaceId: "workspace-board",
});

const previousVault = {
  ...currentVault,
  generatedAt: "2026-05-28T10:00:00.000Z",
  manifests: currentVault.manifests
    .filter((manifest) => manifest.kind !== "command-center")
    .map((manifest) =>
      manifest.kind === "digest"
        ? {
            ...manifest,
            byteSize: manifest.byteSize - 16,
            evidenceHash: "sha256:previous-digest",
            recordCount: manifest.recordCount - 1,
            vaultHash: "sha256:previous-digest-vault",
          }
        : manifest,
    ),
  summary: {
    ...currentVault.summary,
    vaultHash: "sha256:previous-vault",
  },
} satisfies BoardReleaseArchiveEvidenceRetentionVaultReport;

const report = createBoardReleaseArchiveEvidenceDiffSnapshotReport({
  currentVault,
  generatedAt,
  previousVault,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.totalCount, 5);
assert.equal(report.summary.changedCount, 1);
assert.equal(report.summary.addedCount, 1);
assert.equal(report.summary.missingCount, 0);
assert.equal(report.summary.unchangedCount, 3);
assert.equal(report.rows.some((row) => row.kind === "digest" && row.change === "changed" && row.recordDelta === 1), true);
assert.equal(report.rows.some((row) => row.kind === "command-center" && row.change === "added"), true);
assert.equal(report.summary.snapshotHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-evidence-diff-snapshots-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-evidence-diff-snapshots-20260529.json");
assert.match(report.csvContent, /snapshot_id,kind,title,change,status,current_status,previous_status,record_delta,byte_delta/);
assert.match(report.jsonContent, /"changedCount": 1/);

const baselineReport = createBoardReleaseArchiveEvidenceDiffSnapshotReport({
  currentVault,
  generatedAt,
  previousVault: null,
  workspaceId: "workspace-board",
});

assert.equal(baselineReport.summary.status, "watch");
assert.equal(baselineReport.summary.addedCount, 5);
assert.equal(baselineReport.summary.previousVaultHash, null);

console.log("board release archive evidence diff snapshots smoke passed");
