import assert from "node:assert/strict";
import type { BoardReleaseArchiveCustodyChainOfControlLedgerReport } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import { createBoardReleaseArchiveCustodyRetentionLockWorkflow } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";
import type { BoardReleaseArchiveVerificationFinalAcceptancePacketReport } from "@/features/projects/board-release-archive-verification-final-acceptance-packet";

const generatedAt = "2026-05-29T10:00:00.000Z";

const finalAcceptancePacket = {
  executiveRecommendation: "APPROVE archive verification acceptance for board release archive closeout.",
  rows: [
    {
      acceptanceHash: "sha256:distribution-row",
      evidenceHash: "sha256:distribution-proof",
      kind: "distribution-proof",
      status: "accepted",
    },
    {
      acceptanceHash: "sha256:timeline-row",
      evidenceHash: "sha256:readiness-timeline",
      kind: "readiness-timeline",
      status: "accepted",
    },
    {
      acceptanceHash: "sha256:recommendation-row",
      evidenceHash: "sha256:recommendation",
      kind: "executive-recommendation",
      status: "accepted",
    },
  ],
  summary: {
    acceptedCount: 5,
    blockedCount: 0,
    finalAcceptanceHash: "sha256:final-acceptance",
    finalAcceptanceScore: 100,
    nextAction: "Archive verification final acceptance packet is ready for board closeout.",
    rowCount: 5,
    status: "accepted",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationFinalAcceptancePacketReport;

const chainOfControlLedger = {
  summary: {
    brokenCount: 0,
    custodyScore: 100,
    ledgerHash: "sha256:custody-ledger",
    nextAction: "Archive custody chain-of-control ledger is sealed.",
    pendingCount: 0,
    rowCount: 4,
    sealedCount: 4,
    status: "sealed",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCustodyChainOfControlLedgerReport;

const workflow = createBoardReleaseArchiveCustodyRetentionLockWorkflow({
  chainOfControlLedger,
  finalAcceptancePacket,
  generatedAt,
  workspaceId: "workspace-board",
});

assert.equal(workflow.summary.status, "locked");
assert.equal(workflow.summary.rowCount, 4);
assert.equal(workflow.summary.lockedCount, 4);
assert.equal(workflow.summary.pendingCount, 0);
assert.equal(workflow.summary.blockedCount, 0);
assert.equal(workflow.summary.retentionScore, 100);
assert.equal(workflow.rows[0]?.artifact, "final acceptance packet");
assert.equal(workflow.rows[1]?.artifact, "distribution proof bundle");
assert.equal(workflow.rows[2]?.artifact, "readiness timeline export");
assert.equal(workflow.rows[3]?.artifact, "executive recommendation");
assert.equal(workflow.summary.retentionLockHash.startsWith("sha256:"), true);
assert.equal(workflow.csvFileName, "workspace-board-board-release-archive-custody-retention-lock-workflow-20260529.csv");
assert.equal(workflow.jsonFileName, "workspace-board-board-release-archive-custody-retention-lock-workflow-20260529.json");
assert.match(workflow.csvContent, /retention_lock_id,artifact,status,retention_until,evidence_hash/);
assert.match(workflow.jsonContent, /"retentionScore": 100/);

const blockedWorkflow = createBoardReleaseArchiveCustodyRetentionLockWorkflow({
  chainOfControlLedger: {
    ...chainOfControlLedger,
    summary: {
      ...chainOfControlLedger.summary,
      brokenCount: 1,
      custodyScore: 35,
      status: "broken",
    },
  } as BoardReleaseArchiveCustodyChainOfControlLedgerReport,
  finalAcceptancePacket,
  generatedAt,
  workspaceId: "workspace-board",
});

assert.equal(blockedWorkflow.summary.status, "blocked");
assert.equal(blockedWorkflow.summary.blockedCount, 4);
assert.match(blockedWorkflow.summary.nextAction, /Repair custody chain/);
assert.equal(blockedWorkflow.rows[0]?.status, "blocked");

console.log("board release archive custody retention lock workflow smoke passed");
