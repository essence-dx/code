import assert from "node:assert/strict";
import type { BoardReleaseArchiveCustodyAccessReviewQueueReport } from "@/features/projects/board-release-archive-custody-access-review-queue";
import { createBoardReleaseArchiveCustodyRestoreRehearsalPacket } from "@/features/projects/board-release-archive-custody-restore-rehearsal-packet";
import type { BoardReleaseArchiveCustodyRetentionLockWorkflowReport } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

const generatedAt = "2026-05-29T10:00:00.000Z";

const retentionLockWorkflow = {
  rows: [
    {
      artifact: "final acceptance packet",
      evidenceHash: "sha256:final-acceptance",
      lockHash: "sha256:lock-final",
      status: "locked",
    },
    {
      artifact: "distribution proof bundle",
      evidenceHash: "sha256:distribution-proof",
      lockHash: "sha256:lock-distribution",
      status: "locked",
    },
    {
      artifact: "readiness timeline export",
      evidenceHash: "sha256:readiness-timeline",
      lockHash: "sha256:lock-timeline",
      status: "locked",
    },
    {
      artifact: "executive recommendation",
      evidenceHash: "sha256:recommendation",
      lockHash: "sha256:lock-recommendation",
      status: "locked",
    },
  ],
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

const accessReviewQueue = {
  summary: {
    accessReviewHash: "sha256:access-review",
    approvedCount: 4,
    expiredCount: 0,
    nextAction: "Archive custody access review queue is approved.",
    pendingCount: 0,
    reviewScore: 100,
    revokedCount: 0,
    rowCount: 4,
    status: "approved",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCustodyAccessReviewQueueReport;

const packet = createBoardReleaseArchiveCustodyRestoreRehearsalPacket({
  accessReviewQueue,
  generatedAt,
  retentionLockWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(packet.summary.status, "restored");
assert.equal(packet.summary.rowCount, 4);
assert.equal(packet.summary.restoredCount, 4);
assert.equal(packet.summary.missingCount, 0);
assert.equal(packet.summary.driftCount, 0);
assert.equal(packet.summary.restoreScore, 100);
assert.equal(packet.rows[0]?.artifact, "final acceptance packet");
assert.equal(packet.rows[0]?.status, "restored");
assert.equal(packet.rows[0]?.sourceHash, "sha256:final-acceptance");
assert.equal(packet.summary.restorePacketHash.startsWith("sha256:"), true);
assert.equal(packet.csvFileName, "workspace-board-board-release-archive-custody-restore-rehearsal-packet-20260529.csv");
assert.equal(packet.jsonFileName, "workspace-board-board-release-archive-custody-restore-rehearsal-packet-20260529.json");
assert.match(packet.csvContent, /restore_rehearsal_id,artifact,status,source_hash,reconstructed_hash/);
assert.match(packet.jsonContent, /"restoreScore": 100/);

const blockedPacket = createBoardReleaseArchiveCustodyRestoreRehearsalPacket({
  accessReviewQueue,
  generatedAt,
  retentionLockWorkflow,
  restoreEvidence: [
    {
      artifact: "final acceptance packet",
      reconstructedHash: "sha256:wrong-final-acceptance",
      sourceHash: "sha256:final-acceptance",
    },
    {
      artifact: "distribution proof bundle",
      reconstructedHash: null,
      sourceHash: "sha256:distribution-proof",
    },
  ],
  workspaceId: "workspace-board",
});

assert.equal(blockedPacket.summary.status, "blocked");
assert.equal(blockedPacket.summary.driftCount, 1);
assert.equal(blockedPacket.summary.missingCount, 1);
assert.equal(blockedPacket.rows[0]?.status, "drift");
assert.equal(blockedPacket.rows[1]?.status, "missing");
assert.match(blockedPacket.summary.nextAction, /Reconstruct missing archive custody evidence/);

console.log("board release archive custody restore rehearsal packet smoke passed");
