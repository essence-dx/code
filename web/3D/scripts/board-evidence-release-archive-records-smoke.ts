import assert from "node:assert/strict";
import type { BoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";
import { createBoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";

const generatedAt = "2026-05-20T10:00:00.000Z";

const closeout = {
  csvContent: "section_id,status\nlock,ready\n",
  csvFileName: "workspace-board-board-evidence-closeout-report-20260520.csv",
  generatedAt,
  jsonContent: JSON.stringify({
    sections: [{ id: "lock", score: 100, status: "ready" }],
    summary: { closeoutScore: 100, status: "ready" },
  }),
  jsonFileName: "workspace-board-board-evidence-closeout-report-20260520.json",
  sections: [
    {
      fileCount: 1,
      id: "lock",
      nextAction: "Board evidence packet is locked for release promotion.",
      recordCount: 1,
      score: 100,
      sourceHash: "sha256:packet-lock",
      status: "ready",
      title: "Packet lock",
    },
  ],
  summary: {
    attachmentFileCount: 1,
    auditTrailCount: 1,
    blockedSectionCount: 0,
    closeoutScore: 100,
    nextAction: "Board evidence closeout report is ready for export.",
    readySectionCount: 5,
    sectionCount: 5,
    status: "ready",
    verificationCheckCount: 0,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceCloseoutReport;

const promotionGate = {
  csvContent: "gate_id,status\ncloseout-export,ready\n",
  csvFileName: "workspace-board-board-evidence-release-promotion-gate-20260520.csv",
  gates: [
    {
      evidence: "workspace-board-board-evidence-closeout-report-20260520.csv; workspace-board-board-evidence-closeout-report-20260520.json",
      id: "closeout-export",
      nextAction: "Release promotion gate is open.",
      promotionBlocker: false,
      score: 100,
      status: "ready",
      title: "Closeout exports",
    },
  ],
  generatedAt,
  jsonContent: JSON.stringify({
    gates: [{ id: "closeout-export", status: "ready" }],
    summary: { promotionAllowed: true },
  }),
  jsonFileName: "workspace-board-board-evidence-release-promotion-gate-20260520.json",
  releasePromotionId: "release-2026-05-20",
  summary: {
    blockerCount: 0,
    gateCount: 4,
    gateScore: 100,
    nextAction: "Release promotion gate is open.",
    promotionAllowed: true,
    readyCount: 4,
    status: "ready",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleasePromotionGateReport;

const archive = createBoardEvidenceReleaseArchiveRecordReport({
  actor: {
    email: "owner@example.com",
    name: "Workspace Owner",
    userId: "user-owner",
  },
  closeout,
  generatedAt,
  promotionGate,
  workspaceId: "workspace-board",
});

assert.equal(archive.summary.status, "archived");
assert.equal(archive.summary.archiveCount, 1);
assert.equal(archive.summary.promotionAllowed, true);
assert.equal(archive.records[0]?.actorEmail, "owner@example.com");
assert.equal(archive.records[0]?.actorName, "Workspace Owner");
assert.equal(archive.records[0]?.closeoutStatus, "ready");
assert.equal(archive.records[0]?.promotionGateStatus, "ready");
assert.match(archive.records[0]?.closeoutHash ?? "", /^sha256:/);
assert.match(archive.records[0]?.promotionGateHash ?? "", /^sha256:/);
assert.match(archive.records[0]?.archiveHash ?? "", /^sha256:/);
assert.match(archive.csvContent, /archive_id,release_promotion_id,archived_at,actor,closeout_hash,promotion_gate_hash,archive_hash,promotion_allowed/);
assert.match(archive.jsonContent, /"archiveHash": "sha256:/);
assert.equal(archive.csvFileName, "workspace-board-board-evidence-release-archive-records-20260520.csv");
assert.equal(archive.jsonFileName, "workspace-board-board-evidence-release-archive-records-20260520.json");

console.log("board evidence release archive records smoke passed");
