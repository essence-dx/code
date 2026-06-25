import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import { createBoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";

const generatedAt = "2026-05-20T10:00:00.000Z";

const taskReport = applyBoardAuditTaskPersistence(
  createBoardAuditFollowUpTasksReport({
    decisionLedger: {
      decisions: [
        {
          id: "decision-1",
          nextAction: "Resolve launch decision.",
          owner: "Board Chair",
          score: 30,
          source: "replay-audit",
          sourceHash: "sha256:decision-source",
          sourceId: "replay-row-1",
          status: "blocked",
          title: "Launch decision",
        },
      ],
    },
    executiveDigest: null,
    freshnessMonitor: {
      rows: [
        {
          ageDays: 9,
          id: "packet:old",
          kind: "packet",
          nextAction: "Refresh stale board packet evidence.",
          owner: "Packet owner",
          score: 35,
          sourceHash: "sha256:packet-source",
          sourceId: "approval-history",
          status: "stale",
          title: "Active board packet",
        },
      ],
    },
    generatedAt,
    reviewerWorkload: null,
    workspaceId: "workspace-board",
  }),
  [
    {
      closedAt: "2026-05-20T09:00:00.000Z",
      closeoutNote: "Decision source attached to replay export.",
      dueAt: "2026-05-19T15:00:00.000Z",
      ownerEmail: "chair@example.com",
      ownerName: "Board Chair",
      ownerUserId: "user-chair",
      status: "closed",
      taskId: "decision:decision-1",
      updatedAt: generatedAt,
    },
    {
      closedAt: null,
      closeoutNote: "Packet still needs refreshed evidence file.",
      dueAt: "2026-05-19T15:00:00.000Z",
      ownerEmail: "packet@example.com",
      ownerName: "Packet owner",
      ownerUserId: "user-packet",
      status: "blocked",
      taskId: "evidence:packet:old",
      updatedAt: generatedAt,
    },
  ],
);

const manifest = createBoardAuditEvidenceAttachmentManifest({
  evidenceFiles: [
    {
      byteSize: 1200,
      contentHash: "sha256:replay-export",
      kind: "replay-audit",
      label: "Board decision replay audit",
      path: "replay/board-decision-replay-audit.json",
      status: "ready",
    },
    {
      byteSize: 1200,
      contentHash: "sha256:replay-export",
      kind: "replay-snapshots",
      label: "Duplicate replay snapshot",
      path: "replay/duplicate.json",
      status: "ready",
    },
  ],
  generatedAt,
  report: taskReport,
  workspaceId: "workspace-board",
});

const report = createBoardAuditEvidenceVerificationReport({
  generatedAt,
  manifest,
  signedPacketVerification: {
    rows: [
      {
        contentHash: "sha256:replay-export",
        status: "blocked",
        verificationState: "missing-signature",
      },
    ],
  },
  sourceFreshness: new Map([
    ["evidence:packet:old", "stale"],
    ["decision:decision-1", "fresh"],
  ]),
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.verificationScore, 38);
assert.equal(report.summary.missingFileCount, 1);
assert.equal(report.summary.staleHashCount, 1);
assert.equal(report.summary.duplicateAttachmentCount, 2);
assert.equal(report.summary.unsignedExportCount, 2);
assert.equal(report.rows.find((row) => row.taskId === "evidence:packet:old")?.checks.some((check) => check.kind === "missing-file"), true);
assert.equal(report.rows.find((row) => row.taskId === "decision:decision-1")?.checks.some((check) => check.kind === "unsigned-export"), true);
assert.match(report.summary.nextAction, /missing-signature/);
assert.match(report.csvContent, /task_id,status,score,missing_files,stale_hashes,duplicates,unsigned_exports,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-audit-evidence-verification-20260520.csv");

console.log("board audit evidence verification smoke passed");
