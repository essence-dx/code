import assert from "node:assert/strict";
import type { BoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import { createBoardReleaseOperationsDashboardFilterReport } from "@/features/projects/board-release-operations-dashboard-filters";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

const generatedAt = "2026-05-22T10:00:00.000Z";

const history = {
  records: [
    {
      gateScore: 72,
      historyHash: "sha256:blocked-history",
      historyId: "history-blocked",
      releasePromotionId: "release-blocked",
      status: "blocked",
      workspaceId: "workspace-board",
    },
    {
      gateScore: 96,
      historyHash: "sha256:archived-history",
      historyId: "history-archived",
      releasePromotionId: "release-archived",
      status: "archived",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsHistoryReport;

const queue = {
  items: [
    {
      historyHash: "sha256:queue-history",
      nextAction: "Review watched board release operations before closeout.",
      ownerName: "Ava Admin",
      queueId: "queue-watch",
      releasePromotionId: "release-watch",
      status: "in-review",
      workspaceId: "workspace-board",
    },
    {
      historyHash: "sha256:queue-ready-history",
      nextAction: "Approve release operations closeout.",
      ownerName: "Ray Reviewer",
      queueId: "queue-ready",
      releasePromotionId: "release-ready",
      status: "ready",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsReviewQueueReport;

const approvalSnapshots = {
  snapshots: [
    {
      currentGateScore: 82,
      nextAction: "Resolve promotion blockers before release.",
      releasePromotionId: "release-blocked",
      snapshotHash: "sha256:snapshot-hash",
      snapshotId: "snapshot-blocked",
      status: "blocked",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsApprovalSnapshotReport;

const exportPackets = {
  packets: [
    {
      packetHash: "sha256:packet-ready",
      packetId: "packet-ready",
      releasePromotionId: "release-ready",
      signerName: "Ava Admin",
      status: "ready",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const report = createBoardReleaseOperationsDashboardFilterReport({
  approvalSnapshots,
  exportPackets,
  generatedAt,
  history,
  queue,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.entryCount, 6);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.summary.archivedCount, 1);
assert.equal(report.buckets.find((bucket) => bucket.status === "blocked")?.entries.length, 2);
assert.equal(report.buckets.find((bucket) => bucket.status === "watch")?.entries[0]?.source, "review-queue");
assert.equal(report.buckets.find((bucket) => bucket.status === "archived")?.entries[0]?.sourceId, "history-archived");
assert.match(report.csvContent, /source,source_id,release_promotion_id,filter_status,owner,score,evidence_hash,next_action/);
assert.match(report.jsonContent, /"filterStatus": "archived"/);
assert.equal(report.csvFileName, "workspace-board-board-release-operations-dashboard-filters-20260522.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-operations-dashboard-filters-20260522.json");

console.log("board release operations dashboard filters smoke passed");
