import assert from "node:assert/strict";
import { createBoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import type { BoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";

const generatedAt = "2026-05-20T10:00:00.000Z";

const acceptance: BoardAuditEvidenceAcceptanceWorkflow = {
  auditTrail: [
    {
      acknowledgedAt: "2026-05-20T09:00:00.000Z",
      ownerName: "Board Chair",
      status: "accepted",
      summary: "Board Chair accepted evidence for Decision replay.",
      taskId: "task-accepted",
    },
  ],
  csvContent: "task_id,status,owner,verification_status,rejection_reason,acknowledged_at,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,task_id",
  csvFileName: "acceptance.csv",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "acceptance.json",
  rows: [
    {
      acknowledgedAt: "2026-05-20T09:00:00.000Z",
      nextAction: "Keep reviewer acknowledgement with the board audit evidence packet.",
      note: "Accepted for promotion.",
      ownerEmail: "chair@example.com",
      ownerName: "Board Chair",
      rejectionReason: null,
      status: "accepted",
      taskId: "task-accepted",
      title: "Decision replay",
      verificationScore: 100,
      verificationStatus: "ready",
    },
    {
      acknowledgedAt: null,
      nextAction: "Collect reviewer acknowledgement for Packet export.",
      note: null,
      ownerEmail: "packet@example.com",
      ownerName: "Packet Owner",
      rejectionReason: null,
      status: "pending",
      taskId: "task-pending",
      title: "Packet export",
      verificationScore: 88,
      verificationStatus: "watch",
    },
    {
      acknowledgedAt: "2026-05-20T09:30:00.000Z",
      nextAction: "Missing refreshed packet evidence export.",
      note: "Rejected until file is refreshed.",
      ownerEmail: "ops@example.com",
      ownerName: "Ops Lead",
      rejectionReason: "Missing refreshed packet evidence export.",
      status: "rejected",
      taskId: "task-rejected",
      title: "Stale packet",
      verificationScore: 40,
      verificationStatus: "blocked",
    },
  ],
  summary: {
    acceptedCount: 1,
    acceptanceScore: 33,
    auditTrailCount: 1,
    blockedCount: 0,
    nextAction: "Missing refreshed packet evidence export.",
    pendingCount: 1,
    rejectedCount: 1,
    status: "blocked",
    taskCount: 3,
  },
  workspaceId: "workspace-board",
};

const lock = createBoardEvidencePacketLockReport({
  acceptance,
  generatedAt,
  lockActor: {
    email: "chair@example.com",
    name: "Board Chair",
    userId: "user-chair",
  },
  releasePromotionId: "release-2026-05-20",
  workspaceId: "workspace-board",
});

assert.equal(lock.summary.status, "blocked");
assert.equal(lock.summary.lockedCount, 1);
assert.equal(lock.summary.blockedCount, 2);
assert.equal(lock.summary.promotionBlocked, true);
assert.equal(lock.summary.lockScore, 33);
assert.match(lock.summary.nextAction, /Missing refreshed packet evidence export/);
assert.equal(lock.rows.find((row) => row.taskId === "task-accepted")?.lockState, "locked");
assert.equal(lock.rows.find((row) => row.taskId === "task-pending")?.lockState, "open");
assert.equal(lock.rows.find((row) => row.taskId === "task-rejected")?.lockState, "blocked");
assert.match(lock.rows.find((row) => row.taskId === "task-accepted")?.lockHash ?? "", /^sha256:/);
assert.match(lock.jsonContent, /"releasePromotionId": "release-2026-05-20"/);
assert.match(lock.csvContent, /task_id,lock_state,acceptance_status,owner,verification_status,lock_hash,next_action/);
assert.equal(lock.csvFileName, "workspace-board-board-evidence-packet-lock-20260520.csv");

console.log("board evidence packet lock smoke passed");
