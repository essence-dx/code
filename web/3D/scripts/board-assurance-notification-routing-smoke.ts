import { strict as assert } from "node:assert";
import type { BoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import { createBoardAssuranceNotificationRoutingReport } from "@/features/projects/board-assurance-notification-routing";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import type { BoardReleaseVarianceDashboard } from "@/features/projects/board-release-variance-dashboard";
import type { WorkspaceNotificationDeliveryPreference, WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-01-15T12:00:00.000Z";

const replayAudit = {
  csvContent: "approval_id,packet_id,recipient_purpose,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,approval_id",
  csvFileName: "replay.csv",
  generatedAt,
  rows: [
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-10T09:00:00.000Z",
      baselineValue: "92/100 approval",
      currentValue: "critical post-deploy-failure",
      delta: 1,
      detail: "Viewer failed after board approval.",
      id: "incident:approval-1:project-1",
      kind: "incident",
      nextAction: "Attach remediation to the replay packet.",
      occurredAt: "2026-01-14T10:00:00.000Z",
      packetId: "packet-approval-1",
      recipientPurpose: "board launch approval",
      status: "blocked",
      title: "Viewer smoke failed",
    },
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-10T09:00:00.000Z",
      baselineValue: "0 blocked runbook rows",
      currentValue: "1 incomplete runbook row",
      delta: 1,
      detail: "Runbook follow-through still needs proof.",
      id: "runbook:approval-1",
      kind: "runbook-outcome",
      nextAction: "Finish or exception open runbook rows before release closure.",
      occurredAt: generatedAt,
      packetId: "packet-approval-1",
      recipientPurpose: "board launch approval",
      status: "watch",
      title: "Release runbook outcome",
    },
  ],
  summary: {
    activeApprovalCount: 1,
    blockedRowCount: 1,
    latestApprovalAt: "2026-01-10T09:00:00.000Z",
    laterIncidentCount: 1,
    nextAction: "Attach remediation to the replay packet.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 0,
    replayScore: 72,
    rowCount: 2,
    runbookBlockedCount: 0,
    runbookIncompleteCount: 1,
    status: "blocked",
    watchRowCount: 1,
  },
  workspaceId: "workspace-1",
} as BoardDecisionReplayAuditReport;

const exceptionWorkflow = {
  csvContent: "scope_id,replay_status,exception_status\n",
  csvDataUri: "data:text/csv;charset=utf-8,scope_id",
  csvFileName: "exceptions.csv",
  generatedAt,
  rows: [
    {
      approverNote: "Accepted after smoke proof is attached.",
      approverSignoff: "approved",
      blockedReleaseGateCount: 0,
      checkedReleaseGateCount: 1,
      dueReleaseGateCount: 0,
      evidence: "Viewer failed after board approval.",
      exceptionId: "exception-1",
      expiresAt: "2026-01-17T12:00:00.000Z",
      expiresInDays: 2,
      id: "exception:incident:approval-1:project-1",
      nextAction: "Keep the signed exception with the assurance packet.",
      ownerNote: "Accept launch while smoke recovery is verified.",
      releaseGateLabels: ["Post-deploy synthetic checks"],
      releaseGateSourceKeys: ["post-deploy:synthetic-smoke"],
      releaseGateStatus: "clear",
      replayKind: "incident",
      replayStatus: "blocked",
      requestedAt: "2026-01-15T10:00:00.000Z",
      requestedBy: "Release Owner",
      scopeId: "incident:approval-1:project-1",
      signedOffAt: "2026-01-15T11:00:00.000Z",
      signedOffBy: "Board Reviewer",
      status: "approved",
      title: "Viewer smoke failed",
    },
  ],
  summary: {
    approvedCount: 1,
    expiredCount: 0,
    expiringSoonCount: 1,
    nextAction: "Keep the signed exception with the assurance packet.",
    pendingCount: 0,
    rejectedCount: 0,
    releaseGateBlockedCount: 0,
    requestNeededCount: 0,
    status: "approved",
    totalCount: 1,
    workflowScore: 100,
  },
  workspaceId: "workspace-1",
} as BoardAssuranceExceptionWorkflowReport;

const evidenceBundle = {
  bundleId: "board-assurance-evidence-workspace-1-20260115",
  csvContent: "kind,label,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "evidence.csv",
  files: [],
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "evidence.json",
  schemaVersion: 1,
  summary: {
    approvalRecordCount: 1,
    blockedEvidenceCount: 2,
    completedRunbookCount: 1,
    evidenceScore: 65,
    exceptionCount: 1,
    fileCount: 7,
    incidentPostmortemCount: 1,
    nextAction: "Clear blocked evidence before board closure.",
    readyEvidenceCount: 3,
    replayRowCount: 2,
    replaySnapshotCount: 1,
    status: "blocked",
    totalByteSize: 8192,
    totalRunbookCount: 2,
    watchEvidenceCount: 2,
  },
  workspaceId: "workspace-1",
} as BoardAssuranceEvidenceBundleReport;

const varianceDashboard = {
  csvContent: "metric,status,current,previous,delta,direction,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,metric",
  csvFileName: "variance.csv",
  generatedAt,
  rows: [],
  summary: {
    approvalScoreDelta: -10,
    blockedCount: 2,
    blockerDrift: 3,
    incidentRecurrenceDelta: 1,
    nextAction: "Resolve blocker drift before release.",
    readyCount: 1,
    rowCount: 4,
    runbookFollowThroughDelta: -50,
    status: "blocked",
    trendPointCount: 2,
    varianceScore: 61,
    watchCount: 1,
  },
  trendPoints: [],
  workspaceId: "workspace-1",
} as BoardReleaseVarianceDashboard;

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: generatedAt,
    name: "Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: generatedAt,
    name: "Admin",
    role: "admin",
    userId: "user-admin",
  },
  {
    email: "editor@example.com",
    id: "member-editor",
    joinedAt: generatedAt,
    name: "Editor",
    role: "editor",
    userId: "user-editor",
  },
  {
    email: "viewer@example.com",
    id: "member-viewer",
    joinedAt: generatedAt,
    name: "Viewer",
    role: "viewer",
    userId: "user-viewer",
  },
];

const ownerPreferences: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
];
const editorPreferences: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
];
const viewerPreferences: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
];

const report = createBoardAssuranceNotificationRoutingReport({
  evidenceBundle,
  exceptionWorkflow,
  generatedAt,
  members,
  preferencesByUserId: new Map([
    ["user-owner", ownerPreferences],
    ["user-editor", editorPreferences],
    ["user-viewer", viewerPreferences],
  ]),
  replayAudit,
  varianceDashboard,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.notificationCount, 4);
assert.equal(report.summary.criticalCount, 2);
assert.equal(report.summary.warningCount, 2);
assert.equal(report.summary.routeCount, 32);
assert.equal(report.summary.eligibleRouteCount, 14);
assert.equal(report.summary.emailEligibleCount, 5);
assert.equal(report.summary.inAppEligibleCount, 9);
assert.equal(report.summary.suppressedByRoleCount, 14);
assert.equal(report.summary.suppressedByPreferenceCount, 4);
assert.match(report.summary.nextAction, /Route critical board assurance notifications/);

assert.ok(report.notifications.some((notification) => notification.kind === "replay-blocker" && notification.severity === "critical"));
assert.ok(report.notifications.some((notification) => notification.kind === "exception-expiry" && notification.severity === "warning"));
assert.ok(report.notifications.some((notification) => notification.kind === "evidence-readiness" && notification.severity === "critical"));

const ownerReplayEmail = report.routes.find((route) => route.candidateId === "board-assurance:replay:incident:approval-1:project-1" && route.channel === "email" && route.userId === "user-owner");
assert.equal(ownerReplayEmail?.status, "eligible");
assert.match(ownerReplayEmail?.dedupeKey ?? "", /board-assurance:replay/);

const editorReplayEmail = report.routes.find((route) => route.candidateId === "board-assurance:replay:incident:approval-1:project-1" && route.channel === "email" && route.userId === "user-editor");
assert.equal(editorReplayEmail?.status, "suppressed-by-role");

const editorExceptionEmail = report.routes.find((route) => route.candidateId === "board-assurance:exception:incident:approval-1:project-1" && route.channel === "email" && route.userId === "user-editor");
assert.equal(editorExceptionEmail?.status, "eligible");

const adminEvidenceEmail = report.routes.find((route) => route.candidateId === "board-assurance:evidence:board-assurance-evidence-workspace-1-20260115" && route.channel === "email" && route.userId === "user-admin");
assert.equal(adminEvidenceEmail?.status, "suppressed-by-preference");

assert.match(report.csvContent, /notification_id,kind,severity,topic,title,eligible_routes,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);

console.log("board assurance notification routing smoke passed");
