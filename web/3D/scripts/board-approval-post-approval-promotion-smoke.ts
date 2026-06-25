import { strict as assert } from "node:assert";
import { createBoardApprovalPostApprovalPromotionReport } from "@/features/projects/board-approval-post-approval-promotion";
import type { BoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";

const promotedAt = "2026-05-16T16:00:00.000Z";
const tracker: BoardApprovalPostApprovalTrackerReport = {
  actions: [
    {
      action: "Repair public viewer smoke before board sign-off.",
      agendaItemId: "sign-off:launch",
      calendarSourceKey: "board-approval-signoff:launch",
      dueAt: "2026-05-16T18:00:00.000Z",
      evidence: ["Packet: board-approval-workspace-20260516.", "Current status: blocked."],
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
      dueAt: "2026-05-17T12:00:00.000Z",
      evidence: ["Packet: board-approval-workspace-20260516.", "Current status: watch."],
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
      action: "Duplicate launch action should not create another promoted row.",
      agendaItemId: "sign-off:launch",
      calendarSourceKey: "board-approval-signoff:launch",
      dueAt: "2026-05-16T19:00:00.000Z",
      evidence: ["Duplicate row."],
      id: "board-post-approval:launch-copy",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      role: "launch",
      runbookSourceKey: "board-approval-signoff:launch",
      source: "board-sign-off",
      status: "blocked",
      title: "Close launch board sign-off",
    },
  ],
  calendarMilestones: [
    {
      actionLabel: "Repair public viewer smoke before board sign-off.",
      blockerCount: 1,
      completedAt: null,
      detail: "Close launch board sign-off before board approval can close.",
      dueAt: "2026-05-16T18:00:00.000Z",
      id: "review-workflow:board-approval-signoff:launch",
      kind: "review-gate",
      projectId: null,
      projectName: null,
      source: "review-workflow",
      sourceKey: "board-approval-signoff:launch",
      status: "blocked",
      title: "Close launch board sign-off",
    },
    {
      actionLabel: "Attach governance exception memo before approval.",
      blockerCount: 0,
      completedAt: null,
      detail: "Close governance board sign-off before board approval can close.",
      dueAt: "2026-05-17T12:00:00.000Z",
      id: "review-workflow:board-approval-signoff:governance",
      kind: "review-gate",
      projectId: null,
      projectName: null,
      source: "review-workflow",
      sourceKey: "board-approval-signoff:governance",
      status: "due",
      title: "Close governance board sign-off",
    },
  ],
  csvContent: "role,status,owner,due_at,runbook_source_key,calendar_source_key,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-1-board-post-approval-actions.csv",
  generatedAt: "2026-05-16T14:00:00.000Z",
  runbookRecords: [
    {
      auditLogHref: "/projects?workspaceId=workspace-1&boardRole=launch#board-approval",
      attachments: [],
      batchId: "board-approval-post-20260516",
      blockerCount: 1,
      checklistEvidence: ["Packet: board-approval-workspace-20260516.", "Current status: blocked."],
      comments: [],
      completedAt: null,
      detail: "Close launch board sign-off: Repair public viewer smoke before board sign-off.",
      dueAt: "2026-05-16T18:00:00.000Z",
      milestoneId: "board-approval-signoff:launch",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      ownerUserId: null,
      projectId: null,
      projectName: null,
      sourceKey: "board-approval-signoff:launch",
      status: "blocked",
      title: "Close launch board sign-off",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      auditLogHref: "/projects?workspaceId=workspace-1&boardRole=governance#board-approval",
      attachments: [],
      batchId: "board-approval-post-20260516",
      blockerCount: 0,
      checklistEvidence: ["Packet: board-approval-workspace-20260516.", "Current status: watch."],
      comments: [],
      completedAt: null,
      detail: "Close governance board sign-off: Attach governance exception memo before approval.",
      dueAt: "2026-05-17T12:00:00.000Z",
      milestoneId: "board-approval-signoff:governance",
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      ownerUserId: null,
      projectId: null,
      projectName: null,
      sourceKey: "board-approval-signoff:governance",
      status: "in-progress",
      title: "Close governance board sign-off",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedActionCount: 1,
    calendarMilestoneCount: 2,
    existingCalendarMilestoneCount: 0,
    existingRunbookRecordCount: 0,
    nextAction: "Repair public viewer smoke before board sign-off.",
    readyActionCount: 0,
    runbookRecordCount: 2,
    status: "blocked",
    totalActionCount: 3,
    watchActionCount: 1,
  },
};

const promotion = createBoardApprovalPostApprovalPromotionReport({
  promotedAt,
  tracker,
  workspaceId: "workspace-1",
});

assert.equal(promotion.generatedAt, promotedAt);
assert.equal(promotion.summary.status, "blocked");
assert.equal(promotion.summary.totalActionCount, 2);
assert.equal(promotion.summary.uniqueSourceKeyCount, 2);
assert.equal(promotion.summary.blockedActionCount, 1);
assert.equal(promotion.summary.watchActionCount, 1);
assert.equal(promotion.summary.runbookRecordCount, 2);
assert.equal(promotion.summary.calendarMilestoneCount, 2);
assert.deepEqual(promotion.sourceKeys, ["board-approval-signoff:launch", "board-approval-signoff:governance"]);
assert.equal(new Set(promotion.runbookRecords.map((record) => record.sourceKey)).size, 2);
assert.equal(new Set(promotion.calendarMilestones.map((milestone) => milestone.sourceKey)).size, 2);
assert.equal(promotion.runbookReport.summary.totalCount, 2);
assert.equal(promotion.runbookReport.summary.blockedCount, 1);
assert.match(promotion.csvContent, /source_key,role,status,runbook_source_key,calendar_source_key,due_at,next_action/);
assert.match(promotion.csvDataUri, /^data:text\/csv/);
assert.equal(promotion.csvFileName, "workspace-1-board-post-approval-promotion.csv");

console.log("board approval post approval promotion smoke passed");
