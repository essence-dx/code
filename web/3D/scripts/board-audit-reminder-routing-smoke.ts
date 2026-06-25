import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditReminderRoutingReport } from "@/features/projects/board-audit-reminder-routing";

const generatedAt = "2026-05-17T15:00:00.000Z";
const routedAt = "2026-05-20T10:00:00.000Z";

const taskReport = createBoardAuditFollowUpTasksReport({
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

const persisted = applyBoardAuditTaskPersistence(taskReport, [
  {
    closedAt: "2026-05-19T12:00:00.000Z",
    closeoutNote: "Control evidence refreshed.",
    dueAt: "2026-05-19T15:00:00.000Z",
    ownerEmail: "owner@example.com",
    ownerName: "Owner",
    ownerUserId: "user-owner",
    status: "closed",
    taskId: "control:control-score",
    updatedAt: routedAt,
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
    updatedAt: routedAt,
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
    updatedAt: routedAt,
  },
]);

const report = createBoardAuditReminderRoutingReport({
  generatedAt: routedAt,
  members: [
    {
      email: "owner@example.com",
      id: "member-owner",
      joinedAt: "2026-01-01T00:00:00.000Z",
      name: "Owner",
      role: "owner",
      userId: "user-owner",
    },
    {
      email: "ops@example.com",
      id: "member-ops",
      joinedAt: "2026-01-01T00:00:00.000Z",
      name: "Operations Lead",
      role: "editor",
      userId: "user-ops",
    },
    {
      email: "viewer@example.com",
      id: "member-viewer",
      joinedAt: "2026-01-01T00:00:00.000Z",
      name: "Viewer",
      role: "viewer",
      userId: "user-viewer",
    },
  ],
  preferencesByUserId: new Map([
    [
      "user-owner",
      [
        {
          emailEnabled: false,
          inAppEnabled: true,
          topic: "review",
        },
      ],
    ],
    [
      "user-ops",
      [
        {
          emailEnabled: true,
          inAppEnabled: true,
          topic: "review",
        },
      ],
    ],
  ]),
  report: persisted,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.reminderCount, 1);
assert.equal(report.summary.overdueTaskCount, 1);
assert.equal(report.summary.eligibleRouteCount, 3);
assert.equal(report.summary.emailEligibleCount, 1);
assert.equal(report.summary.inAppEligibleCount, 2);
assert.equal(report.summary.suppressedByPreferenceCount, 1);
assert.equal(report.summary.suppressedByRoleCount, 2);
assert.equal(report.reminders[0]?.taskId, "workload:unassigned");
assert.equal(report.routes.find((route) => route.userId === "user-owner" && route.channel === "email")?.status, "suppressed-by-preference");
assert.equal(report.routes.find((route) => route.userId === "user-viewer" && route.channel === "in-app")?.status, "suppressed-by-role");
assert.match(report.routes.find((route) => route.userId === "user-ops" && route.channel === "email")?.dedupeKey ?? "", /board-audit-reminder/);
assert.match(report.csvContent, /reminder_id,task_id,severity,topic,title,eligible_routes,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-audit-reminder-routing-20260520.csv");

console.log("board audit reminder routing smoke passed");
