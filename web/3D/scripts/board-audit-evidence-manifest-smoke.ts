import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";

const generatedAt = "2026-05-20T10:00:00.000Z";

const tasks = applyBoardAuditTaskPersistence(
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
      byteSize: 980,
      contentHash: "sha256:approval-export",
      kind: "approval-history",
      label: "Board approval history",
      path: "approvals/board-approval-history.json",
      status: "watch",
    },
  ],
  generatedAt,
  report: tasks,
  workspaceId: "workspace-board",
});

assert.equal(manifest.summary.status, "blocked");
assert.equal(manifest.summary.taskCount, 2);
assert.equal(manifest.summary.attachmentCount, 5);
assert.equal(manifest.summary.linkedFileCount, 1);
assert.equal(manifest.summary.closeoutNoteCount, 2);
assert.equal(manifest.summary.missingEvidenceCount, 1);
assert.equal(manifest.rows[0]?.taskId, "evidence:packet:old");
assert.equal(manifest.rows[0]?.status, "blocked");
assert.match(manifest.rows[0]?.attachments.map((attachment) => attachment.kind).join(","), /closeout-note/);
assert.match(manifest.rows[0]?.nextAction, /Attach exported evidence file/);
assert.equal(manifest.rows.find((row) => row.taskId === "decision:decision-1")?.linkedFileCount, 1);
assert.match(manifest.jsonContent, /"contentHash": "sha256:replay-export"/);
assert.match(manifest.csvContent, /task_id,status,owner,source_hash,attachment_count,linked_file_count,next_action/);
assert.equal(manifest.csvFileName, "workspace-board-board-audit-evidence-manifest-20260520.csv");

console.log("board audit evidence manifest smoke passed");
