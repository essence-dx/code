import assert from "node:assert/strict";
import type { BoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";
import { createBoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

const generatedAt = "2026-05-22T10:00:00.000Z";

const currentGate = {
  releasePromotionId: "release-2026-05-20",
  summary: {
    blockerCount: 1,
    gateCount: 4,
    gateScore: 82,
    nextAction: "Resolve promotion blockers before release.",
    promotionAllowed: false,
    readyCount: 3,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleasePromotionGateReport;

const history = {
  records: [
    {
      archiveHash: "sha256:archive-hash",
      archivedAt: "2026-05-20T10:00:00.000Z",
      gateScore: 72,
      historyHash: "sha256:history-hash",
      historyId: "board-release-operations-history:workspace-board:release-2026-05-20:20260520",
      notificationEligibleRouteCount: 6,
      notificationSuppressedCount: 1,
      promotionAllowed: false,
      recordedAt: "2026-05-20T10:00:00.000Z",
      releasePromotionId: "release-2026-05-20",
      status: "blocked",
      varianceBlockerCount: 2,
      varianceCount: 4,
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedCount: 1,
    historyCount: 1,
    latestHistoryHash: "sha256:history-hash",
    latestReleasePromotionId: "release-2026-05-20",
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsHistoryReport;

const queue = {
  summary: {
    blockedCount: 1,
    inReviewCount: 0,
    nextAction: "Resolve blocked board release operations before promotion.",
    queueCount: 1,
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsReviewQueueReport;

const report = createBoardReleaseOperationsApprovalSnapshotReport({
  currentGate,
  generatedAt,
  history,
  queue,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.snapshotCount, 1);
assert.equal(report.summary.improvedCount, 1);
assert.equal(report.summary.regressedCount, 0);
assert.equal(report.summary.currentGateScore, 82);
assert.equal(report.snapshots[0]?.scoreDelta, 10);
assert.equal(report.snapshots[0]?.gateDrift, "improved");
assert.equal(report.snapshots[0]?.priorHistoryHash, "sha256:history-hash");
assert.equal(report.snapshots[0]?.approvalRecommendation, "hold");
assert.match(report.snapshots[0]?.snapshotHash ?? "", /^sha256:/);
assert.match(report.csvContent, /snapshot_id,release_promotion_id,status,gate_drift,current_score,prior_score,score_delta,recommendation,snapshot_hash,next_action/);
assert.match(report.jsonContent, /"gateDrift": "improved"/);
assert.equal(report.csvFileName, "workspace-board-board-release-operations-approval-snapshots-20260522.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-operations-approval-snapshots-20260522.json");

console.log("board release operations approval snapshots smoke passed");
