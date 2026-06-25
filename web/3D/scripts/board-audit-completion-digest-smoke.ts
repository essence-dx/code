import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
  createBoardAuditTaskPersistenceRecord,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditCompletionDigest } from "@/features/projects/board-audit-completion-digest";
import { createBoardAuditReminderRoutingReport } from "@/features/projects/board-audit-reminder-routing";

const firstGeneratedAt = "2026-05-17T15:00:00.000Z";
const generatedAt = "2026-05-20T10:00:00.000Z";

const baseReport = createBoardAuditFollowUpTasksReport({
  decisionLedger: {
    decisions: [
      {
        id: "decision-1",
        nextAction: "Resolve launch decision.",
        owner: "Board Chair",
        score: 30,
        source: "agenda-decision",
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
  freshnessMonitor: null,
  generatedAt: firstGeneratedAt,
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

const previous = applyBoardAuditTaskPersistence(baseReport, [
  {
    closedAt: null,
    closeoutNote: "Still blocked.",
    dueAt: "2026-05-18T08:00:00.000Z",
    ownerEmail: "ops@example.com",
    ownerName: "Operations Lead",
    ownerUserId: "user-ops",
    status: "blocked",
    taskId: "workload:unassigned",
    updatedAt: "2026-05-18T09:00:00.000Z",
  },
]);

const current = applyBoardAuditTaskPersistence(baseReport, [
  {
    closedAt: "2026-05-19T12:00:00.000Z",
    closeoutNote: "Control evidence refreshed.",
    dueAt: "2026-05-19T15:00:00.000Z",
    ownerEmail: "owner@example.com",
    ownerName: "Owner",
    ownerUserId: "user-owner",
    status: "closed",
    taskId: "control:control-score",
    updatedAt: generatedAt,
  },
  {
    closedAt: "2026-05-19T09:00:00.000Z",
    closeoutNote: "Decision resolved.",
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
    closeoutNote: "Needs named reviewer before export lock.",
    dueAt: "2026-05-18T08:00:00.000Z",
    ownerEmail: "ops@example.com",
    ownerName: "Operations Lead",
    ownerUserId: "user-ops",
    status: "blocked",
    taskId: "workload:unassigned",
    updatedAt: generatedAt,
  },
]);

const reminderRouting = createBoardAuditReminderRoutingReport({
  generatedAt,
  members: [
    {
      email: "owner@example.com",
      id: "member-owner",
      joinedAt: "2026-01-01T00:00:00.000Z",
      name: "Owner",
      role: "owner",
      userId: "user-owner",
    },
  ],
  report: current,
  workspaceId: "workspace-board",
});

const previousRecord = createBoardAuditTaskPersistenceRecord({
  actor: {
    email: "admin@example.com",
    name: "Admin",
    userId: "user-admin",
  },
  createdAt: "2026-05-18T09:00:00.000Z",
  id: "previous",
  persisted: previous,
  workspaceId: "workspace-board",
});
const currentRecord = createBoardAuditTaskPersistenceRecord({
  actor: {
    email: "admin@example.com",
    name: "Admin",
    userId: "user-admin",
  },
  createdAt: generatedAt,
  id: "current",
  persisted: current,
  workspaceId: "workspace-board",
});

const digest = createBoardAuditCompletionDigest({
  generatedAt,
  records: [previousRecord, currentRecord],
  reminderRouting,
  report: current,
  workspaceId: "workspace-board",
});

assert.equal(digest.summary.status, "blocked");
assert.equal(digest.summary.completionScore, 50);
assert.equal(digest.summary.closureScore, 67);
assert.equal(digest.summary.closedCount, 2);
assert.equal(digest.summary.unresolvedRiskCount, 1);
assert.equal(digest.summary.carryForwardCount, 1);
assert.equal(digest.summary.closureScoreDelta, 67);
assert.equal(digest.trends[0]?.metric, "Closure score");
assert.equal(digest.trends[0]?.delta, 67);
assert.equal(digest.carryForward[0]?.taskId, "workload:unassigned");
assert.match(digest.summary.nextAction, /Route critical overdue/);
assert.match(digest.csvContent, /metric,current,previous,delta,direction/);
assert.equal(digest.csvFileName, "workspace-board-board-audit-completion-digest-20260520.csv");

console.log("board audit completion digest smoke passed");
