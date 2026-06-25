import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveCustodyExecutiveCloseoutDigest } from "@/features/projects/board-release-archive-custody-executive-closeout-digest";
import type { BoardReleaseArchiveCustodyAccessReviewQueueReport } from "@/features/projects/board-release-archive-custody-access-review-queue";
import type { BoardReleaseArchiveCustodyChainOfControlLedgerReport } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import type { BoardReleaseArchiveCustodyRestoreRehearsalPacketReport } from "@/features/projects/board-release-archive-custody-restore-rehearsal-packet";
import type { BoardReleaseArchiveCustodyRetentionLockWorkflowReport } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function chainOfControl(status: BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"]["status"]): BoardReleaseArchiveCustodyChainOfControlLedgerReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      brokenCount: status === "broken" ? 1 : 0,
      custodyScore: status === "sealed" ? 100 : status === "pending" ? 72 : 34,
      ledgerHash: "sha256:custody-ledger",
      nextAction: "Keep chain-of-control sealed.",
      pendingCount: status === "pending" ? 1 : 0,
      rowCount: 4,
      sealedCount: status === "sealed" ? 4 : 3,
      status,
    },
    workspaceId,
  };
}

function retentionLock(status: BoardReleaseArchiveCustodyRetentionLockWorkflowReport["summary"]["status"]): BoardReleaseArchiveCustodyRetentionLockWorkflowReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      lockedCount: status === "locked" ? 4 : 3,
      nextAction: "Keep retention lock frozen.",
      pendingCount: status === "pending" ? 1 : 0,
      retentionLockHash: "sha256:retention-lock",
      retentionScore: status === "locked" ? 100 : status === "pending" ? 72 : 30,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

function accessReview(status: BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"]["status"]): BoardReleaseArchiveCustodyAccessReviewQueueReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      accessReviewHash: "sha256:access-review",
      approvedCount: status === "approved" ? 4 : 2,
      expiredCount: status === "blocked" ? 1 : 0,
      nextAction: "Keep access review approved.",
      pendingCount: status === "watch" ? 1 : 0,
      reviewScore: status === "approved" ? 100 : status === "watch" ? 78 : 42,
      revokedCount: status === "blocked" ? 1 : 0,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

function restorePacket(status: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"]["status"]): BoardReleaseArchiveCustodyRestoreRehearsalPacketReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      driftCount: status === "watch" ? 1 : 0,
      missingCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive custody restore rehearsal packet is reconstructed.",
      restorePacketHash: "sha256:restore-packet",
      restoreScore: status === "restored" ? 100 : status === "watch" ? 80 : 45,
      restoredCount: status === "restored" ? 4 : 3,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveCustodyExecutiveCloseoutDigest({
  accessReviewQueue: accessReview("approved"),
  chainOfControlLedger: chainOfControl("sealed"),
  generatedAt,
  restoreRehearsalPacket: restorePacket("restored"),
  retentionLockWorkflow: retentionLock("locked"),
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 5);
assert.equal(approved.summary.approvedCount, 5);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.closeoutScore, 100);
assert.match(approved.summary.executiveRecommendation, /^APPROVE archive custody closeout/);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["chain-of-control", "retention-lock", "access-review", "restore-rehearsal", "release-recommendation"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-custody-executive-closeout-digest-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-custody-executive-closeout-digest-20260529.json");
assert.match(approved.csvContent, /^closeout_id,kind,title,status,score,evidence_hash/);

const blocked = createBoardReleaseArchiveCustodyExecutiveCloseoutDigest({
  accessReviewQueue: accessReview("blocked"),
  chainOfControlLedger: chainOfControl("sealed"),
  generatedAt,
  restoreRehearsalPacket: restorePacket("blocked"),
  retentionLockWorkflow: retentionLock("locked"),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.executiveRecommendation, /^BLOCK archive custody closeout/);

const watch = createBoardReleaseArchiveCustodyExecutiveCloseoutDigest({
  accessReviewQueue: accessReview("watch"),
  chainOfControlLedger: chainOfControl("sealed"),
  generatedAt,
  restoreRehearsalPacket: restorePacket("restored"),
  retentionLockWorkflow: retentionLock("locked"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive custody executive closeout digest smoke passed");
