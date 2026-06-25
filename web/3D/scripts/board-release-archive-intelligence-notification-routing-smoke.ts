import assert from "node:assert/strict";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import { createBoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

const generatedAt = "2026-05-29T10:00:00.000Z";

const packet = {
  csvContent: "record_type,id,kind,title,status,score_or_priority,evidence_hash,record_hash,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,record_type",
  csvFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.csv",
  executiveMemo: "BLOCKED archive intelligence packet: 5 evidence sections.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.json",
  recommendations: [
    {
      action: "Assign owners to critical archive anomaly findings.",
      evidenceHash: "sha256:anomaly",
      priority: "high",
      recommendationHash: "sha256:recommendation-anomaly",
      recommendationId: "recommendation-anomaly",
      recommendationKind: "remediate-anomaly",
      status: "blocked",
      title: "Critical anomaly remediation",
      workspaceId: "workspace-board",
    },
    {
      action: "Add a closeout score decline threshold.",
      evidenceHash: "sha256:trend",
      priority: "high",
      recommendationHash: "sha256:recommendation-trend",
      recommendationId: "recommendation-trend",
      recommendationKind: "stabilize-trend",
      status: "blocked",
      title: "Closeout trend threshold",
      workspaceId: "workspace-board",
    },
    {
      action: "Require replay simulator sign-off.",
      evidenceHash: "sha256:replay",
      priority: "high",
      recommendationHash: "sha256:recommendation-replay",
      recommendationId: "recommendation-replay",
      recommendationKind: "decision-control",
      status: "blocked",
      title: "Replay sign-off control",
      workspaceId: "workspace-board",
    },
    {
      action: "Package hashes into one immutable archive intelligence packet.",
      evidenceHash: "sha256:packet",
      priority: "medium",
      recommendationHash: "sha256:recommendation-governance",
      recommendationId: "recommendation-governance",
      recommendationKind: "governance-update",
      status: "watch",
      title: "Immutable intelligence packet",
      workspaceId: "workspace-board",
    },
  ],
  sections: [],
  summary: {
    blockedRecommendationCount: 3,
    blockedSectionCount: 5,
    governanceUpdateCount: 1,
    nextAction: "Assign owners to critical archive anomaly findings.",
    packetHash: "sha256:packet",
    packetScore: 34,
    recommendationCount: 4,
    sectionCount: 5,
    status: "blocked",
    watchRecommendationCount: 1,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveIntelligencePacketReport;

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

const allEnabled: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
];

const report = createBoardReleaseArchiveIntelligenceNotificationRoutingReport({
  generatedAt,
  members,
  packet,
  preferencesByUserId: new Map([
    ["user-owner", allEnabled],
    ["user-editor", allEnabled],
    ["user-viewer", allEnabled],
  ]),
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.notificationCount, 4);
assert.equal(report.summary.criticalCount, 3);
assert.equal(report.summary.warningCount, 1);
assert.equal(report.summary.routeCount, 32);
assert.equal(report.summary.eligibleRouteCount, 18);
assert.equal(report.summary.emailEligibleCount, 7);
assert.equal(report.summary.inAppEligibleCount, 11);
assert.equal(report.summary.suppressedByPreferenceCount, 4);
assert.equal(report.summary.suppressedByRoleCount, 10);
assert.equal(report.summary.routingScore, 56);
assert.equal(report.notifications[0]?.recommendationId, "recommendation-trend");
assert.equal(report.notifications.find((notification) => notification.recommendationId === "recommendation-trend")?.topic, "release");
const anomalyNotification = report.notifications.find((notification) => notification.recommendationId === "recommendation-anomaly");
assert.equal(report.routes.filter((route) => route.candidateId === anomalyNotification?.id && route.status === "eligible").length, 5);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-notification-routing-20260529.csv");
assert.match(report.csvContent, /notification_id,recommendation_id,severity,topic,title,eligible_routes,source_hash,next_action/);

console.log("board release archive intelligence notification routing smoke passed");
