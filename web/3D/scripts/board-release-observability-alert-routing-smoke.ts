import assert from "node:assert/strict";
import { createBoardReleaseObservabilityAlertRoutingReport } from "@/features/projects/board-release-observability-alert-routing";
import type { BoardReleaseObservabilityIncidentNotesReport } from "@/features/projects/board-release-observability-incident-notes";
import type { BoardReleaseObservabilityTrendSnapshotReport } from "@/features/projects/board-release-observability-trend-snapshots";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

const generatedAt = "2026-05-29T10:00:00.000Z";

const incidentNotes = {
  generatedAt,
  notes: [
    {
      dueAt: "2026-05-30T10:00:00.000Z",
      evidenceHash: "sha256:ack",
      noteHash: "sha256:note-ack",
      noteId: "note-ack",
      ownerEmail: "board-secretary@essence.local",
      ownerRole: "Board secretary",
      releasePromotionId: "release-2026-05-20",
      severity: "critical",
      source: "stuck-acknowledgement",
      status: "blocked",
      summary: "Repair blocked acknowledgement routes before closeout.",
      title: "Acknowledgement progress",
      workspaceId: "workspace-board",
    },
    {
      dueAt: "2026-06-01T10:00:00.000Z",
      evidenceHash: "sha256:packet",
      noteHash: "sha256:note-packet",
      noteId: "note-packet",
      ownerEmail: "evidence-owner@essence.local",
      ownerRole: "Evidence owner",
      releasePromotionId: "release-2026-05-20",
      severity: "warning",
      source: "stale-packet",
      status: "watch",
      summary: "Refresh signed packet evidence before closeout.",
      title: "Signed packet freshness",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedCount: 1,
    criticalCount: 1,
    dueSoonCount: 1,
    nextAction: "Board secretary: Repair blocked acknowledgement routes before closeout.",
    noteCount: 2,
    openCount: 0,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityIncidentNotesReport;

const trendSnapshots = {
  generatedAt,
  snapshots: [
    {
      currentValue: 72,
      delta: -14,
      direction: "declining",
      metric: "readiness-score",
      nextAction: "Resolve blocked delivery routes before distribution closeout.",
      previousValue: 86,
      snapshotHash: "sha256:trend-score",
      status: "blocked",
      title: "Readiness score",
      workspaceId: "workspace-board",
    },
    {
      currentValue: 50,
      delta: 8,
      direction: "improving",
      metric: "timeline-closure",
      nextAction: "Timeline closure is improving.",
      previousValue: 42,
      snapshotHash: "sha256:trend-timeline",
      status: "ready",
      title: "Timeline closure",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedCount: 1,
    decliningCount: 1,
    improvingCount: 1,
    nextAction: "Resolve blocked delivery routes before distribution closeout.",
    readinessScoreDelta: -14,
    snapshotCount: 2,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityTrendSnapshotReport;

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

const releaseEnabled: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "health" },
];
const healthOnly: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: false, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "health" },
];

const report = createBoardReleaseObservabilityAlertRoutingReport({
  generatedAt,
  incidentNotes,
  members,
  preferencesByUserId: new Map([
    ["user-owner", releaseEnabled],
    ["user-admin", healthOnly],
    ["user-editor", releaseEnabled],
    ["user-viewer", releaseEnabled],
  ]),
  trendSnapshots,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.notificationCount, 3);
assert.equal(report.summary.criticalCount, 2);
assert.equal(report.summary.warningCount, 1);
assert.equal(report.summary.routeCount, 24);
assert.equal(report.summary.eligibleRouteCount, 12);
assert.equal(report.summary.emailEligibleCount, 5);
assert.equal(report.summary.inAppEligibleCount, 7);
assert.equal(report.summary.suppressedByPreferenceCount, 2);
assert.equal(report.summary.suppressedByRoleCount, 10);
assert.match(report.summary.nextAction, /Route critical board release observability alerts/);

const ownerReleaseEmail = report.routes.find((route) => route.candidateId === "board-release-observability:incident-note:note-ack" && route.channel === "email" && route.userId === "user-owner");
assert.equal(ownerReleaseEmail?.status, "eligible");
assert.match(ownerReleaseEmail?.routeHash ?? "", /^sha256:/);

const adminReleaseEmail = report.routes.find((route) => route.candidateId === "board-release-observability:incident-note:note-ack" && route.channel === "email" && route.userId === "user-admin");
assert.equal(adminReleaseEmail?.status, "suppressed-by-preference");

const editorReleaseEmail = report.routes.find((route) => route.candidateId === "board-release-observability:incident-note:note-ack" && route.channel === "email" && route.userId === "user-editor");
assert.equal(editorReleaseEmail?.status, "suppressed-by-role");

assert.ok(report.notifications.some((notification) => notification.kind === "trend-decline" && notification.severity === "critical"));
assert.match(report.csvContent, /notification_id,kind,severity,topic,title,eligible_routes,next_action/);
assert.match(report.jsonContent, /"routeHash": "sha256:/);
assert.equal(report.csvFileName, "workspace-board-board-release-observability-alert-routing-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-observability-alert-routing-20260529.json");

console.log("board release observability alert routing smoke passed");
