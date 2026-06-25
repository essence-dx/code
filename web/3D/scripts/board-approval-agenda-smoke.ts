import { strict as assert } from "node:assert";
import { createBoardApprovalMeetingAgenda } from "@/features/projects/board-approval-agenda";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow } from "@/features/projects/executive-action-ownership";
import type { ReleaseControlRoomTimelineReport, ReleaseControlRoomTimelineRow } from "@/features/projects/release-control-room-timeline";
import type { ReleaseScenarioComparisonReport } from "@/features/projects/release-scenario-comparison";

const generatedAt = "2026-05-16T12:00:00.000Z";

const boardApprovalPacket: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:packet",
    sources: [
      {
        contentHash: "sha256:executive",
        id: "executive-release-intelligence",
        label: "Executive release intelligence",
        sourceRecordCount: 3,
        verified: true,
      },
    ],
  },
  criticalPath: [
    {
      action: "Repair public viewer smoke before approval.",
      evidence: "Smoke evidence failed for public viewer.",
      evidenceHash: "sha256:smoke",
      id: "executive:launch",
      label: "Launch promotion readiness",
      ownerName: "Release Owner",
      source: "executive",
      status: "blocked",
    },
    {
      action: "Attach verified webhook retry evidence.",
      evidence: "Retry evidence is pending.",
      evidenceHash: "sha256:webhook",
      id: "control-room:webhook",
      label: "Webhook retry evidence",
      ownerName: "Automation Owner",
      source: "control-room",
      status: "watch",
    },
  ],
  csvContent: "role,status,required,owner,due_at,evidence_hash,action\nlaunch,blocked,true,Release Owner,2026-05-16T13:00:00.000Z,sha256:smoke,Repair public viewer smoke before approval.\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-board-approval-packet.csv",
  executiveMemo: "Board approval is blocked by one launch sign-off gap.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-approval-packet.json",
  packetId: "board-approval-workspace-20260516",
  redactedSummary: "Approval status: blocked.",
  signOffs: [
    {
      action: "Repair public viewer smoke before approval.",
      dueAt: "2026-05-16T13:00:00.000Z",
      evidenceHash: "sha256:smoke",
      evidenceLinks: ["/projects?workspaceId=workspace-1#release-runbook"],
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      required: true,
      role: "launch",
      status: "blocked",
    },
    {
      action: "Attach verified webhook retry evidence.",
      dueAt: "2026-05-17T12:00:00.000Z",
      evidenceHash: "sha256:webhook",
      evidenceLinks: [],
      ownerEmail: null,
      ownerName: "Automation Owner",
      required: true,
      role: "automation",
      status: "watch",
    },
  ],
  summary: {
    approvalScore: 52,
    blockedSignOffCount: 1,
    checksumCount: 2,
    criticalPathCount: 2,
    nextAction: "Repair public viewer smoke before approval.",
    readySignOffCount: 0,
    redactionCount: 1,
    status: "blocked",
    watchSignOffCount: 1,
  },
};

function ownerRow(input: Partial<ExecutiveActionOwnershipRow> & Pick<ExecutiveActionOwnershipRow, "domain" | "id" | "ownerName" | "status">): ExecutiveActionOwnershipRow {
  return {
    action: `Complete ${input.domain} approval evidence.`,
    detail: `${input.domain} owner action detail.`,
    dueAt: "2026-05-16T13:00:00.000Z",
    dueWindowLabel: "Due in 1h",
    evidenceLinks: [],
    ownerEmail: null,
    ownerSource: "hint",
    projectName: "Launch scene",
    riskScore: input.status === "blocked" || input.status === "overdue" ? 35 : 70,
    signalLabel: `${input.domain} signal`,
    ...input,
  };
}

const executiveActionOwnership: ExecutiveActionOwnershipMatrix = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "ownership.csv",
  generatedAt,
  rows: [
    ownerRow({
      action: "Repair public viewer smoke before approval.",
      domain: "launch",
      id: "owner:launch",
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      status: "blocked",
    }),
    ownerRow({
      action: "Assign automation owner for webhook retry evidence.",
      domain: "automation",
      id: "owner:automation",
      ownerName: "Automation Owner",
      status: "watch",
    }),
  ],
  summary: {
    blockedCount: 1,
    dueSoonCount: 2,
    nextAction: "Clear launch smoke blocker.",
    overdueCount: 0,
    ownerCoveragePercent: 50,
    ownershipScore: 52,
    readyCount: 0,
    status: "blocked",
    totalCount: 2,
    unassignedCount: 1,
    watchCount: 1,
  },
};

function timelineRow(input: Partial<ReleaseControlRoomTimelineRow> & Pick<ReleaseControlRoomTimelineRow, "id" | "kind" | "status" | "title">): ReleaseControlRoomTimelineRow {
  return {
    detail: `${input.title} detail.`,
    evidence: `${input.title} evidence.`,
    href: "/projects?workspaceId=workspace-1#release-control-room",
    nextAction: `Resolve ${input.title}.`,
    occurredAt: generatedAt,
    ownerEmail: "release@example.com",
    ownerName: "Release Owner",
    projectName: "Launch scene",
    severity: input.status === "blocked" ? "critical" : "warning",
    sourceLabel: "Control room",
    ...input,
  };
}

const releaseControlRoomTimeline: ReleaseControlRoomTimelineReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "timeline.csv",
  generatedAt,
  rows: [
    timelineRow({ id: "deploy:smoke", kind: "deploy", status: "blocked", title: "Post-deploy smoke failed" }),
    timelineRow({ id: "owner-action:launch", kind: "owner-action", status: "blocked", title: "Launch owner action" }),
    timelineRow({ id: "webhook:retry", kind: "webhook", status: "watch", title: "Webhook retry evidence" }),
  ],
  summary: {
    blockedCount: 2,
    latestAt: generatedAt,
    nextAction: "Repair public viewer smoke.",
    ownerCount: 1,
    readyCount: 0,
    sourceCount: 3,
    status: "blocked",
    totalCount: 3,
    watchCount: 1,
  },
};

const releaseScenarioComparison: ReleaseScenarioComparisonReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "scenario.csv",
  generatedAt,
  recommendedScenario: {
    blockerCount: 1,
    costScore: 82,
    description: "Highest-visibility path for public launch approval.",
    evidence: [],
    id: "public-launch",
    label: "Public launch",
    nextAction: "Public launch: repair public viewer smoke.",
    ownerActions: [],
    ownerLoadScore: 52,
    readinessScore: 55,
    riskScore: 62,
    rollbackScore: 70,
    status: "blocked",
    warningCount: 1,
  },
  rows: [],
  summary: {
    blockedCount: 1,
    nextAction: "Public launch is blocked by public viewer smoke.",
    readyCount: 0,
    recommendedScenarioId: "public-launch",
    scenarioScore: 55,
    status: "blocked",
    totalCount: 1,
    watchCount: 0,
  },
};

const agenda = createBoardApprovalMeetingAgenda({
  boardApprovalPacket,
  executiveActionOwnership,
  generatedAt,
  releaseControlRoomTimeline,
  releaseScenarioComparison,
  workspaceId: "workspace-1",
});

assert.equal(agenda.summary.status, "blocked");
assert.equal(agenda.summary.requiredAttendeeCount >= 2, true);
assert.equal(agenda.summary.blockedItemCount >= 2, true);
assert.equal(agenda.summary.estimatedDurationMinutes >= 40, true);
assert.equal(agenda.items.some((item) => item.kind === "decision" && item.topic.includes("Launch approval")), true);
assert.equal(agenda.items.some((item) => item.kind === "timeline" && item.sourceLabel === "Control room"), true);
assert.equal(agenda.items.some((item) => item.kind === "scenario" && item.topic === "Approve recommended release path"), true);
assert.equal(agenda.attendees.some((attendee) => attendee.email === "release@example.com" && attendee.required), true);
assert.equal(agenda.csvContent.includes("kind,status,topic,owner,duration_minutes,decision_prompt,next_action"), true);
assert.match(agenda.csvDataUri, /^data:text\/csv/);
assert.equal(agenda.csvFileName, "workspace-1-board-approval-agenda.csv");
assert.match(agenda.openingMemo, /Board meeting is blocked/);

console.log("board approval agenda smoke passed");
