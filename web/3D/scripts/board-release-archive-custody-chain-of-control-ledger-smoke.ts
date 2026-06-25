import assert from "node:assert/strict";
import { createBoardReleaseArchiveCustodyChainOfControlLedger } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import type { BoardReleaseArchiveVerificationFinalAcceptancePacketReport } from "@/features/projects/board-release-archive-verification-final-acceptance-packet";

const generatedAt = "2026-05-29T10:00:00.000Z";

const finalAcceptancePacket = {
  executiveRecommendation: "APPROVE archive verification acceptance for board release archive closeout.",
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

const ledger = createBoardReleaseArchiveCustodyChainOfControlLedger({
  finalAcceptancePacket,
  generatedAt,
  workspaceId: "workspace-board",
});

assert.equal(ledger.summary.status, "sealed");
assert.equal(ledger.summary.rowCount, 4);
assert.equal(ledger.summary.sealedCount, 4);
assert.equal(ledger.summary.pendingCount, 0);
assert.equal(ledger.summary.brokenCount, 0);
assert.equal(ledger.summary.custodyScore, 100);
assert.equal(ledger.rows[0]?.owner, "board secretary");
assert.equal(ledger.rows[0]?.fromOwner, "archive verification workflow");
assert.equal(ledger.rows.at(-1)?.toOwner, "archive vault");
assert.equal(ledger.summary.ledgerHash.startsWith("sha256:"), true);
assert.equal(ledger.csvFileName, "workspace-board-board-release-archive-custody-chain-of-control-ledger-20260529.csv");
assert.equal(ledger.jsonFileName, "workspace-board-board-release-archive-custody-chain-of-control-ledger-20260529.json");
assert.match(ledger.csvContent, /custody_id,sequence,artifact,owner,from_owner,to_owner,status/);
assert.match(ledger.jsonContent, /"custodyScore": 100/);

const blockedLedger = createBoardReleaseArchiveCustodyChainOfControlLedger({
  finalAcceptancePacket: {
    ...finalAcceptancePacket,
    summary: {
      ...finalAcceptancePacket.summary,
      blockedCount: 2,
      finalAcceptanceScore: 45,
      status: "blocked",
    },
  } as BoardReleaseArchiveVerificationFinalAcceptancePacketReport,
  generatedAt,
  handoffs: [
    {
      artifact: "final acceptance packet",
      evidenceHash: "sha256:final-acceptance",
      fromOwner: "archive verification workflow",
      handedOffAt: generatedAt,
      owner: "board secretary",
      toOwner: "archive vault",
    },
  ],
  workspaceId: "workspace-board",
});

assert.equal(blockedLedger.summary.status, "broken");
assert.equal(blockedLedger.summary.brokenCount, 1);
assert.match(blockedLedger.summary.nextAction, /Resolve final acceptance blockers/);
assert.equal(blockedLedger.rows[0]?.status, "broken");

console.log("board release archive custody chain-of-control ledger smoke passed");
