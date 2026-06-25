import { strict as assert } from "node:assert";
import { createBoardApprovalPostApprovalTracker } from "@/features/projects/board-approval-post-approval-tracker";
import type { BoardApprovalMeetingAgendaReport } from "@/features/projects/board-approval-agenda";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T14:00:00.000Z";

const boardApprovalPacket: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:board-packet",
    sources: [
      {
        contentHash: "sha256:executive",
        id: "executive-release-intelligence",
        label: "Executive release intelligence",
        sourceRecordCount: 4,
        verified: true,
      },
    ],
  },
  criticalPath: [
    {
      action: "Repair public viewer smoke before board sign-off.",
      evidence: "Smoke failed for public viewer route.",
      evidenceHash: "sha256:smoke",
      id: "critical:launch",
      label: "Public viewer smoke",
      ownerName: "Release Director",
      source: "control-room",
      status: "blocked",
    },
  ],
  csvContent: "role,status,required,owner,due_at,evidence_hash,action\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-board-approval-packet.csv",
  executiveMemo: "Board approval is blocked by launch and watched by evidence.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-approval-packet.json",
  packetId: "board-approval-workspace-20260516",
  redactedSummary: "Approval status: blocked.",
  signOffs: [
    {
      action: "Repair public viewer smoke before board sign-off.",
      dueAt: "2026-05-16T15:00:00.000Z",
      evidenceHash: "sha256:launch-signoff",
      evidenceLinks: ["/projects?workspaceId=workspace-1#release-runbook"],
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      required: true,
      role: "launch",
      status: "blocked",
    },
    {
      action: "Attach governance exception memo before approval.",
      dueAt: "2026-05-17T10:00:00.000Z",
      evidenceHash: "sha256:governance-signoff",
      evidenceLinks: ["/projects?workspaceId=workspace-1#governance"],
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      required: true,
      role: "governance",
      status: "watch",
    },
    {
      action: "Keep cost sign-off evidence attached.",
      dueAt: null,
      evidenceHash: "sha256:cost-signoff",
      evidenceLinks: [],
      ownerEmail: "cost@example.com",
      ownerName: "Cost Owner",
      required: false,
      role: "cost",
      status: "ready",
    },
  ],
  summary: {
    approvalScore: 54,
    blockedSignOffCount: 1,
    checksumCount: 2,
    criticalPathCount: 1,
    nextAction: "Repair public viewer smoke before board sign-off.",
    readySignOffCount: 1,
    redactionCount: 0,
    status: "blocked",
    watchSignOffCount: 1,
  },
};

const boardApprovalAgenda: BoardApprovalMeetingAgendaReport = {
  attendees: [
    {
      email: "release@example.com",
      itemCount: 1,
      name: "Release Director",
      required: true,
      role: "Sign-off owner",
    },
    {
      email: "governance@example.com",
      itemCount: 1,
      name: "Governance Owner",
      required: true,
      role: "Sign-off owner",
    },
  ],
  csvContent: "kind,status,topic,owner,duration_minutes,decision_prompt,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "workspace-board-approval-agenda.csv",
  generatedAt,
  items: [
    {
      decisionPrompt: "Can the board approve launch with this gap open?",
      dueAt: "2026-05-16T15:00:00.000Z",
      durationMinutes: 12,
      evidence: "sha256:launch-signoff",
      href: "/projects?workspaceId=workspace-1#release-runbook",
      id: "sign-off:launch",
      kind: "decision",
      nextAction: "Repair public viewer smoke before board sign-off.",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      priority: 0,
      sourceId: "launch",
      sourceLabel: "Board packet sign-off",
      status: "blocked",
      topic: "Launch approval sign-off",
    },
  ],
  openingMemo: "Board meeting is blocked by 1 agenda item.",
  summary: {
    blockedItemCount: 1,
    estimatedDurationMinutes: 12,
    readyItemCount: 0,
    requiredAttendeeCount: 2,
    sourceCount: 1,
    status: "blocked",
    topDecision: "Can the board approve launch with this gap open?",
    totalItemCount: 1,
    watchItemCount: 0,
  },
};

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Run deploy smoke",
      blockerCount: 0,
      completedAt: null,
      detail: "No post-deploy synthetic smoke report has been recorded.",
      dueAt: generatedAt,
      id: "post-deploy-smoke:synthetic",
      kind: "post-deploy",
      projectId: null,
      projectName: null,
      source: "post-deploy-smoke",
      sourceKey: "post-deploy:synthetic-smoke",
      status: "due",
      title: "Post-deploy synthetic checks",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 0,
    desktopChannelCount: 0,
    doneCount: 0,
    dueCount: 1,
    nextMilestoneAt: generatedAt,
    postDeployCount: 1,
    reviewGateCount: 0,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const releaseRunbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 1,
  },
  records: [
    {
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      attachments: [],
      batchId: "current",
      blockerCount: 0,
      checklistEvidence: ["Post-deploy smoke missing."],
      comments: [],
      completedAt: null,
      detail: "Run deploy smoke.",
      dueAt: generatedAt,
      milestoneId: "post-deploy-smoke:synthetic",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      ownerUserId: "user-release",
      projectId: null,
      projectName: null,
      sourceKey: "post-deploy:synthetic-smoke",
      status: "in-progress",
      title: "Post-deploy synthetic checks",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 0,
    completeCount: 0,
    inProgressCount: 1,
    nextDueAt: generatedAt,
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const tracker = createBoardApprovalPostApprovalTracker({
  boardApprovalAgenda,
  boardApprovalPacket,
  generatedAt,
  releaseCalendar,
  releaseRunbook,
  workspaceId: "workspace-1",
});

assert.equal(tracker.summary.status, "blocked");
assert.equal(tracker.summary.totalActionCount, 2);
assert.equal(tracker.summary.blockedActionCount, 1);
assert.equal(tracker.summary.watchActionCount, 1);
assert.equal(tracker.summary.runbookRecordCount, 2);
assert.equal(tracker.summary.calendarMilestoneCount, 2);
assert.equal(tracker.actions.every((action) => action.source === "board-sign-off"), true);
assert.equal(tracker.actions.some((action) => action.role === "launch" && action.status === "blocked"), true);
assert.equal(tracker.actions.some((action) => action.role === "governance" && action.status === "watch"), true);
assert.equal(tracker.runbookRecords.some((record) => record.sourceKey === "board-approval-signoff:launch" && record.status === "blocked"), true);
assert.equal(tracker.runbookRecords.some((record) => record.sourceKey === "board-approval-signoff:governance" && record.status === "in-progress"), true);
assert.equal(tracker.calendarMilestones.some((milestone) => milestone.sourceKey === "board-approval-signoff:launch" && milestone.status === "blocked"), true);
assert.equal(tracker.calendarMilestones.some((milestone) => milestone.sourceKey === "board-approval-signoff:governance" && milestone.status === "due"), true);
assert.equal(tracker.summary.nextAction, "Repair public viewer smoke before board sign-off.");
assert.match(tracker.csvContent, /role,status,owner,due_at,runbook_source_key,calendar_source_key,next_action/);
assert.match(tracker.csvDataUri, /^data:text\/csv/);
assert.equal(tracker.csvFileName, "workspace-1-board-post-approval-actions.csv");

console.log("board approval post approval tracker smoke passed");
