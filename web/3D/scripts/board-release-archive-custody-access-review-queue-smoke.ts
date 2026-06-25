import assert from "node:assert/strict";
import { createBoardReleaseArchiveCustodyAccessReviewQueue } from "@/features/projects/board-release-archive-custody-access-review-queue";
import type { BoardReleaseArchiveCustodyRetentionLockWorkflowReport } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

const generatedAt = "2026-05-29T10:00:00.000Z";

const retentionLockWorkflow = {
  summary: {
    blockedCount: 0,
    lockedCount: 4,
    nextAction: "Archive custody retention lock workflow is frozen.",
    pendingCount: 0,
    retentionLockHash: "sha256:retention-lock",
    retentionScore: 100,
    rowCount: 4,
    status: "locked",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCustodyRetentionLockWorkflowReport;

const queue = createBoardReleaseArchiveCustodyAccessReviewQueue({
  generatedAt,
  retentionLockWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(queue.summary.status, "approved");
assert.equal(queue.summary.rowCount, 4);
assert.equal(queue.summary.approvedCount, 4);
assert.equal(queue.summary.expiredCount, 0);
assert.equal(queue.summary.revokedCount, 0);
assert.equal(queue.summary.reviewScore, 100);
assert.deepEqual(
  queue.rows.map((row) => row.recipientType),
  ["board", "auditor", "partner", "internal"],
);
assert.equal(queue.rows[0]?.recipient, "Board archive chair");
assert.equal(queue.rows[1]?.recipient, "External audit lead");
assert.equal(queue.summary.accessReviewHash.startsWith("sha256:"), true);
assert.equal(queue.csvFileName, "workspace-board-board-release-archive-custody-access-review-queue-20260529.csv");
assert.equal(queue.jsonFileName, "workspace-board-board-release-archive-custody-access-review-queue-20260529.json");
assert.match(queue.csvContent, /access_review_id,recipient,recipient_type,status,access_expires_at/);
assert.match(queue.jsonContent, /"reviewScore": 100/);

const blockedQueue = createBoardReleaseArchiveCustodyAccessReviewQueue({
  generatedAt,
  recipients: [
    {
      accessExpiresAt: "2026-05-28T10:00:00.000Z",
      accessGrantHash: "sha256:expired-grant",
      recipient: "Partner release observer",
      recipientType: "partner",
      reviewEvidenceHash: null,
      revocationEvidenceHash: null,
    },
    {
      accessExpiresAt: "2026-06-05T10:00:00.000Z",
      accessGrantHash: "sha256:revoked-grant",
      recipient: "Internal incident reviewer",
      recipientType: "internal",
      reviewEvidenceHash: "sha256:review",
      revocationEvidenceHash: "sha256:revocation",
    },
  ],
  retentionLockWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(blockedQueue.summary.status, "blocked");
assert.equal(blockedQueue.summary.expiredCount, 1);
assert.equal(blockedQueue.summary.revokedCount, 1);
assert.equal(blockedQueue.rows[0]?.status, "expired");
assert.equal(blockedQueue.rows[1]?.status, "revoked");
assert.match(blockedQueue.summary.nextAction, /Renew access review evidence/);

console.log("board release archive custody access review queue smoke passed");
