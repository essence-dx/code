import assert from "node:assert/strict";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import { createBoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";

const generatedAt = "2026-05-22T10:00:00.000Z";

const promotionGate = {
  releasePromotionId: "release-2026-05-20",
  summary: {
    blockerCount: 1,
    gateCount: 4,
    gateScore: 72,
    nextAction: "Resolve promotion blockers before release.",
    promotionAllowed: false,
    readyCount: 3,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleasePromotionGateReport;

const archive = {
  records: [
    {
      archiveHash: "sha256:archive-hash",
      archiveId: "board-evidence-release-archive:workspace-board:release-2026-05-20:20260520",
      archivedAt: "2026-05-20T10:00:00.000Z",
      closeoutHash: "sha256:closeout-hash",
      promotionAllowed: false,
      promotionGateHash: "sha256:gate-hash",
      releasePromotionId: "release-2026-05-20",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    archiveCount: 1,
    latestArchiveHash: "sha256:archive-hash",
    promotionAllowed: false,
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseArchiveRecordReport;

const variance = {
  summary: {
    blockerCount: 2,
    currentReadinessScore: 68,
    nextAction: "Review release variance before promotion.",
    status: "changed",
    varianceCount: 4,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseVarianceReport;

const notifications = {
  summary: {
    candidateCount: 3,
    eligibleRouteCount: 6,
    emailEligibleCount: 3,
    inAppEligibleCount: 3,
    nextAction: "Notify signers before closeout.",
    status: "watch",
    suppressedByPreferenceCount: 1,
    suppressedByRoleCount: 0,
    totalRouteCount: 8,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseCloseoutNotificationReport;

const report = createBoardReleaseOperationsHistoryReport({
  archive,
  generatedAt,
  notifications,
  promotionGate,
  variance,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.historyCount, 1);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.latestReleasePromotionId, "release-2026-05-20");
assert.equal(report.records[0]?.archiveHash, "sha256:archive-hash");
assert.equal(report.records[0]?.gateScore, 72);
assert.equal(report.records[0]?.notificationEligibleRouteCount, 6);
assert.equal(report.records[0]?.varianceCount, 4);
assert.equal(report.records[0]?.varianceBlockerCount, 2);
assert.match(report.records[0]?.historyHash ?? "", /^sha256:/);
assert.match(report.csvContent, /history_id,release_promotion_id,status,gate_score,archive_hash,variance_count,notification_routes,history_hash,next_action/);
assert.match(report.jsonContent, /"notificationEligibleRouteCount": 6/);
assert.equal(report.csvFileName, "workspace-board-board-release-operations-history-20260522.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-operations-history-20260522.json");

console.log("board release operations history smoke passed");
