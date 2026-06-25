import { strict as assert } from "node:assert";
import {
  createBoardApprovalPostApprovalActionHistoryReport,
  createBoardApprovalPostApprovalActionRecords,
} from "@/features/projects/board-approval-post-approval-history";
import type { BoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";

const generatedAt = "2026-05-16T14:00:00.000Z";
const refreshedAt = "2026-05-16T15:00:00.000Z";
const actor = {
  email: "release@example.com",
  name: "Release Director",
  userId: "user-release",
};

const tracker: BoardApprovalPostApprovalTrackerReport = {
  actions: [
    {
      action: "Repair public viewer smoke before board sign-off.",
      agendaItemId: "sign-off:launch",
      calendarSourceKey: "board-approval-signoff:launch",
      dueAt: "2026-05-16T15:00:00.000Z",
      evidence: ["Packet: board-approval-workspace-20260516.", "Sign-off evidence: sha256:launch-signoff."],
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
      agendaItemId: null,
      calendarSourceKey: "board-approval-signoff:governance",
      dueAt: "2026-05-17T10:00:00.000Z",
      evidence: ["Packet: board-approval-workspace-20260516.", "Sign-off evidence: sha256:governance-signoff."],
      id: "board-post-approval:governance",
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      role: "governance",
      runbookSourceKey: "board-approval-signoff:governance",
      source: "board-sign-off",
      status: "watch",
      title: "Close governance board sign-off",
    },
  ],
  calendarMilestones: [],
  csvContent: "role,status,owner,due_at,runbook_source_key,calendar_source_key,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-1-board-post-approval-actions.csv",
  generatedAt,
  runbookRecords: [],
  summary: {
    blockedActionCount: 1,
    calendarMilestoneCount: 2,
    existingCalendarMilestoneCount: 0,
    existingRunbookRecordCount: 0,
    nextAction: "Repair public viewer smoke before board sign-off.",
    readyActionCount: 0,
    runbookRecordCount: 2,
    status: "blocked",
    totalActionCount: 2,
    watchActionCount: 1,
  },
};

const firstRecords = createBoardApprovalPostApprovalActionRecords({
  actor,
  savedAt: generatedAt,
  tracker,
  workspaceId: "workspace-1",
});

assert.equal(firstRecords.length, 2);
assert.equal(firstRecords.every((record) => record.auditTrail[0]?.action === "created"), true);
assert.equal(new Set(firstRecords.map((record) => record.sourceKey)).size, 2);
assert.equal(firstRecords.find((record) => record.role === "launch")?.status, "blocked");

const refreshedTracker: BoardApprovalPostApprovalTrackerReport = {
  ...tracker,
  actions: tracker.actions.map((action) =>
    action.role === "governance"
      ? {
          ...action,
          action: "Escalate governance exception memo before approval.",
          status: "blocked",
        }
      : action,
  ),
  generatedAt: refreshedAt,
};

const refreshedRecords = createBoardApprovalPostApprovalActionRecords({
  actor,
  existingRecords: firstRecords,
  savedAt: refreshedAt,
  tracker: refreshedTracker,
  workspaceId: "workspace-1",
});

assert.equal(refreshedRecords.length, 2);
assert.equal(refreshedRecords.find((record) => record.role === "launch")?.id, firstRecords.find((record) => record.role === "launch")?.id);
assert.equal(refreshedRecords.find((record) => record.role === "governance")?.status, "blocked");
assert.equal(refreshedRecords.find((record) => record.role === "governance")?.refreshCount, 1);
assert.equal(refreshedRecords.find((record) => record.role === "governance")?.auditTrail.at(-1)?.action, "refreshed");
assert.equal(refreshedRecords.find((record) => record.role === "governance")?.createdAt, generatedAt);
assert.equal(refreshedRecords.find((record) => record.role === "governance")?.updatedAt, refreshedAt);

const history = createBoardApprovalPostApprovalActionHistoryReport(refreshedRecords);

assert.equal(history.summary.totalCount, 2);
assert.equal(history.summary.blockedActionCount, 2);
assert.equal(history.summary.watchActionCount, 0);
assert.equal(history.summary.actorCount, 1);
assert.equal(history.summary.refreshCount, 2);
assert.equal(history.summary.dedupedSourceKeyCount, 2);
assert.match(history.csvContent, /source_key,role,status,owner,due_at,refresh_count,updated_at,next_action/);
assert.match(history.csvDataUri, /^data:text\/csv/);
assert.match(history.csvFileName, /essence-spline-board-post-approval-actions-/);

console.log("board approval post approval history smoke passed");
