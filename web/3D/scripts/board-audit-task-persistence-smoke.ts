import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
  createBoardAuditTaskPersistenceRecord,
  getBoardAuditTaskPersistenceDownload,
} from "@/features/projects/board-audit-follow-up-tasks";

const generatedAt = "2026-05-17T15:00:00.000Z";
const updatedAt = "2026-05-18T09:30:00.000Z";

const report = createBoardAuditFollowUpTasksReport({
  decisionLedger: {
    decisions: [
      {
        id: "decision-1",
        nextAction: "Resolve launch decision.",
        owner: "Board Chair",
        score: 30,
        source: "agenda-decision",
        sourceHash: "sha256:decision",
        sourceId: "agenda-1",
        status: "blocked",
        title: "Launch decision",
      },
    ],
  },
  executiveDigest: {
    rows: [
      {
        id: "control-score",
        kind: "control-score",
        metric: "53/100 control score",
        nextAction: "Close blocked audit export sections.",
        score: 53,
        status: "blocked",
        title: "Board control score",
      },
    ],
    summary: {
      nextAction: "Close blocked audit export sections.",
      status: "blocked",
    },
  },
  freshnessMonitor: {
    rows: [
      {
        ageDays: 9,
        id: "packet:old",
        kind: "packet",
        nextAction: "Refresh stale board packet evidence.",
        owner: "Packet owner",
        score: 35,
        sourceId: "packet-old",
        status: "stale",
        title: "Active board packet",
      },
    ],
  },
  generatedAt,
  reviewerWorkload: {
    rows: [
      {
        nextAction: "Assign unowned board review work.",
        reviewerEmail: null,
        reviewerName: "Unassigned",
        status: "blocked",
        workloadPoints: 0,
      },
    ],
  },
  workspaceId: "workspace-board",
});

const persisted = applyBoardAuditTaskPersistence(report, [
  {
    closeoutNote: "Control evidence refreshed and attached.",
    closedAt: "2026-05-18T09:00:00.000Z",
    dueAt: "2026-05-20T12:00:00.000Z",
    ownerEmail: "chair@example.com",
    ownerName: "Board Chair",
    ownerUserId: "user-chair",
    status: "closed",
    taskId: "control:control-score",
    updatedAt,
  },
  {
    closedAt: null,
    closeoutNote: "Needs named reviewer before export lock.",
    dueAt: "2026-05-18T08:00:00.000Z",
    ownerEmail: "ops@example.com",
    ownerName: "Operations Lead",
    ownerUserId: "user-ops",
    status: "blocked",
    taskId: "workload:unassigned",
    updatedAt,
  },
]);

assert.equal(persisted.summary.persistedCount, 2);
assert.equal(persisted.summary.assignedCount, 2);
assert.equal(persisted.summary.closedCount, 1);
assert.equal(persisted.summary.overdueCount, 1);
assert.equal(persisted.summary.closureScore, 25);
assert.equal(persisted.tasks.find((task) => task.id === "control:control-score")?.closeout.status, "closed");
assert.equal(persisted.tasks.find((task) => task.id === "control:control-score")?.ownerEmail, "chair@example.com");
assert.equal(persisted.tasks.find((task) => task.id === "workload:unassigned")?.dueAt, "2026-05-18T08:00:00.000Z");
assert.match(persisted.csvContent, /closeout_status/);
assert.match(persisted.csvContent, /closeout_note,closed_at/);
assert.match(persisted.jsonContent, /"closeoutNote": "Control evidence refreshed and attached."/);
assert.equal(persisted.jsonFileName, "workspace-board-board-audit-follow-up-tasks-20260517.json");

const record = createBoardAuditTaskPersistenceRecord({
  actor: {
    email: "admin@example.com",
    name: "Admin",
    userId: "user-admin",
  },
  createdAt: updatedAt,
  id: "record-1",
  persisted,
  workspaceId: "workspace-board",
});

assert.equal(record.id, "record-1");
assert.equal(record.taskCount, 4);
assert.equal(record.closedCount, 1);
assert.equal(record.assignedCount, 2);
assert.equal(record.overdueCount, 1);
assert.match(record.contentHash, /^sha256:/);

const jsonDownload = getBoardAuditTaskPersistenceDownload(record, "json");
const csvDownload = getBoardAuditTaskPersistenceDownload(record, "csv");

assert.equal(jsonDownload.mimeType, "application/json;charset=utf-8");
assert.equal(csvDownload.mimeType, "text/csv;charset=utf-8");
assert.match(jsonDownload.body, /"workspaceId": "workspace-board"/);
assert.match(csvDownload.body, /Operations Lead/);

console.log("board audit task persistence smoke passed");
