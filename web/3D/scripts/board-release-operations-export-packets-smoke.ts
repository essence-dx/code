import assert from "node:assert/strict";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import type { BoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import { createBoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

const generatedAt = "2026-05-22T10:00:00.000Z";

const archive = {
  jsonContent: JSON.stringify({ records: [{ archiveHash: "sha256:archive-hash" }] }),
  jsonFileName: "workspace-board-board-evidence-release-archive-records-20260522.json",
  records: [
    {
      actorName: "Ava Admin",
      archiveHash: "sha256:archive-hash",
      releasePromotionId: "release-2026-05-20",
    },
  ],
  summary: {
    latestArchiveHash: "sha256:archive-hash",
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseArchiveRecordReport;

const history = {
  jsonContent: JSON.stringify({ records: [{ historyHash: "sha256:history-hash" }] }),
  jsonFileName: "workspace-board-board-release-operations-history-20260522.json",
  records: [
    {
      historyId: "board-release-operations-history:workspace-board:release-2026-05-20:20260522",
      releasePromotionId: "release-2026-05-20",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    latestReleasePromotionId: "release-2026-05-20",
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsHistoryReport;

const queue = {
  items: [
    {
      queueId: "board-release-operations-review:release-2026-05-20",
    },
  ],
  jsonContent: JSON.stringify({ items: [{ queueId: "board-release-operations-review:release-2026-05-20" }] }),
  jsonFileName: "workspace-board-board-release-operations-review-queue-20260522.json",
  summary: {
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsReviewQueueReport;

const approvalSnapshots = {
  jsonContent: JSON.stringify({ snapshots: [{ snapshotHash: "sha256:snapshot-hash" }] }),
  jsonFileName: "workspace-board-board-release-operations-approval-snapshots-20260522.json",
  snapshots: [
    {
      releasePromotionId: "release-2026-05-20",
      snapshotHash: "sha256:snapshot-hash",
    },
  ],
  summary: {
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsApprovalSnapshotReport;

const notifications = {
  jsonContent: JSON.stringify({ notifications: [{ notificationId: "route-1" }] }),
  jsonFileName: "workspace-board-board-evidence-release-closeout-notifications-20260522.json",
  notifications: [
    {
      notificationId: "route-1",
    },
    {
      notificationId: "route-2",
    },
  ],
  summary: {
    eligibleRouteCount: 6,
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseCloseoutNotificationReport;

const variance = {
  jsonContent: JSON.stringify({ variances: [{ id: "readiness-score" }] }),
  jsonFileName: "workspace-board-board-evidence-release-variance-20260522.json",
  summary: {
    blockerCount: 2,
    varianceCount: 4,
    watchCount: 1,
  },
  variances: [
    {
      id: "readiness-score",
    },
    {
      id: "unresolved-risk",
    },
  ],
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseVarianceReport;

const report = createBoardReleaseOperationsExportPacketReport({
  approvalSnapshots,
  archive,
  generatedAt,
  history,
  notifications,
  queue,
  signerName: "Ava Admin",
  variance,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.packetCount, 1);
assert.equal(report.summary.exportFileCount, 6);
assert.equal(report.summary.signedPacketCount, 1);
assert.equal(report.summary.varianceCount, 4);
assert.equal(report.summary.varianceBlockerCount, 2);
assert.equal(report.files[0]?.fileKind, "archive");
assert.equal(report.packets[0]?.releasePromotionId, "release-2026-05-20");
assert.equal(report.packets[0]?.notificationEligibleRouteCount, 6);
assert.equal(report.packets[0]?.signerName, "Ava Admin");
assert.match(report.packets[0]?.manifestHash ?? "", /^sha256:/);
assert.match(report.packets[0]?.packetHash ?? "", /^sha256:/);
assert.match(report.packets[0]?.signatureHash ?? "", /^sha256:/);
assert.match(report.csvContent, /packet_id,release_promotion_id,status,archive_hash,manifest_hash,packet_hash,signature_hash,notification_routes,variance_count,variance_blockers,files/);
assert.match(report.jsonContent, /"fileKind": "notification"/);
assert.equal(report.csvFileName, "workspace-board-board-release-operations-export-packets-20260522.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-operations-export-packets-20260522.json");

console.log("board release operations export packets smoke passed");
