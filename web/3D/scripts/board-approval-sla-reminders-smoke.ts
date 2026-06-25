import { strict as assert } from "node:assert";
import { createBoardApprovalSlaReminderReport } from "@/features/projects/board-approval-sla-reminders";
import type { BoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";
import { createWorkspaceNotificationEmailPlan } from "@/features/workspaces/notification-email-delivery";
import { summarizeProjectCollaborationInbox, type ProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import { summarizeProjectHealthNotifications, type ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";

const now = new Date("2026-05-16T16:00:00.000Z");
const tracker: BoardApprovalPostApprovalTrackerReport = {
  actions: [
    {
      action: "Repair public viewer smoke before board sign-off.",
      agendaItemId: "sign-off:launch",
      calendarSourceKey: "board-approval-signoff:launch",
      dueAt: "2026-05-16T15:00:00.000Z",
      evidence: ["Current status: blocked."],
      id: "board-post-approval:launch",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      role: "launch",
      runbookSourceKey: "board-approval-signoff:launch",
      source: "board-sign-off",
      status: "blocked",
      title: "Close launch board sign-off",
    },
    {
      action: "Attach governance exception memo before approval.",
      agendaItemId: "sign-off:governance",
      calendarSourceKey: "board-approval-signoff:governance",
      dueAt: "2026-05-16T20:00:00.000Z",
      evidence: ["Current status: watch."],
      id: "board-post-approval:governance",
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      role: "governance",
      runbookSourceKey: "board-approval-signoff:governance",
      source: "board-sign-off",
      status: "watch",
      title: "Close governance board sign-off",
    },
    {
      action: "Keep cost sign-off owner warm.",
      agendaItemId: "sign-off:cost",
      calendarSourceKey: "board-approval-signoff:cost",
      dueAt: "2026-05-18T16:00:00.000Z",
      evidence: ["Current status: watch."],
      id: "board-post-approval:cost",
      ownerEmail: null,
      ownerName: "Cost Owner",
      role: "cost",
      runbookSourceKey: "board-approval-signoff:cost",
      source: "board-sign-off",
      status: "watch",
      title: "Close cost board sign-off",
    },
  ],
  calendarMilestones: [],
  csvContent: "role,status,owner,due_at,runbook_source_key,calendar_source_key,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-1-board-post-approval-actions.csv",
  generatedAt: "2026-05-16T14:00:00.000Z",
  runbookRecords: [],
  summary: {
    blockedActionCount: 1,
    calendarMilestoneCount: 3,
    existingCalendarMilestoneCount: 0,
    existingRunbookRecordCount: 0,
    nextAction: "Repair public viewer smoke before board sign-off.",
    readyActionCount: 0,
    runbookRecordCount: 3,
    status: "blocked",
    totalActionCount: 3,
    watchActionCount: 2,
  },
};

const report = createBoardApprovalSlaReminderReport({
  now,
  tracker,
  workspaceId: "workspace-1",
});

assert.equal(report.generatedAt, now.toISOString());
assert.equal(report.summary.status, "critical");
assert.equal(report.summary.totalCount, 3);
assert.equal(report.summary.overdueCount, 1);
assert.equal(report.summary.dueSoonCount, 1);
assert.equal(report.summary.scheduledCount, 1);
assert.equal(report.summary.emailCandidateCount, 2);
assert.equal(report.notifications[0]?.sourceKey, "board-approval-signoff:launch");
assert.equal(report.notifications[0]?.slaStatus, "overdue");
assert.equal(report.notifications[0]?.severity, "critical");
assert.equal(report.notifications[1]?.slaStatus, "due-soon");
assert.match(report.csvContent, /source_key,role,sla_status,severity,owner,due_at,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);
assert.equal(report.csvFileName, "workspace-1-board-approval-sla-reminders.csv");

const inbox: ProjectCollaborationInbox = {
  generatedAt: now.toISOString(),
  notifications: [],
  summary: summarizeProjectCollaborationInbox([]),
};
const healthCenter: ProjectHealthNotificationCenter = {
  generatedAt: now.toISOString(),
  notifications: [],
  summary: summarizeProjectHealthNotifications([]),
};
const plan = createWorkspaceNotificationEmailPlan({
  boardApprovalSlaReminders: report,
  healthCenter,
  inbox,
  members: [
    { email: "owner@mail.com", name: "Owner", role: "owner", userId: "owner-1" },
    { email: "editor@mail.com", name: "Editor", role: "editor", userId: "editor-1" },
    { email: "viewer@mail.com", name: "Viewer", role: "viewer", userId: "viewer-1" },
  ],
  preferencesByUserId: new Map([
    ["owner-1", [{ emailEnabled: true, inAppEnabled: true, topic: "review" as const }]],
    ["editor-1", [{ emailEnabled: true, inAppEnabled: true, topic: "review" as const }]],
    ["viewer-1", [{ emailEnabled: true, inAppEnabled: true, topic: "review" as const }]],
  ]),
  workspaceId: "workspace-1",
});

assert.equal(plan.summary.candidateCount, 3);
assert.equal(plan.jobs.length, 6);
assert.equal(plan.jobs.every((job) => job.source === "board-approval-sla"), true);
assert.equal(plan.jobs.every((job) => job.topic === "review"), true);
assert.equal(plan.jobs.every((job) => job.projectId === null), true);
assert.ok(plan.jobs.some((job) => job.dedupeKey === "workspace-1:owner-1:board-approval-sla:board-sla:board-approval-signoff:launch"));

console.log("board approval SLA reminders smoke passed");
