import assert from "node:assert/strict";
import type { BoardReleaseArchiveEvidenceRetentionVaultStatus } from "@/features/projects/board-release-archive-evidence-retention-vault";
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
  executiveMemo: "BLOCKED archive intelligence packet: 5 evidence sections.",
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

const report = createBoardReleaseArchiveEvidenceRetentionVaultReport({
  approvalWorkflow,
  automationDigest,
  commandCenter,
  generatedAt,
  notificationRouting,
  packet,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status satisfies BoardReleaseArchiveEvidenceRetentionVaultStatus, "sealed");
assert.equal(report.summary.manifestCount, 5);
assert.equal(report.summary.sealedCount, 5);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.watchCount, 0);
assert.equal(report.summary.vaultScore, 100);
assert.equal(report.manifests[0]?.kind, "packet");
assert.equal(report.manifests.every((manifest) => manifest.vaultHash.startsWith("sha256:")), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-evidence-retention-vault-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-evidence-retention-vault-20260529.json");
assert.match(report.csvContent, /manifest_id,kind,title,status,retention_class,record_count,byte_size,file_name,evidence_hash,vault_hash,next_action/);
assert.match(report.jsonContent, /"manifestCount": 5/);

console.log("board release archive evidence retention vault smoke passed");
