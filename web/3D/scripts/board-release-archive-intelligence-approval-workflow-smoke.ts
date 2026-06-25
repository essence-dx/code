import assert from "node:assert/strict";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import { createBoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import { createBoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

const generatedAt = "2026-05-29T10:00:00.000Z";
const packetHash = "sha256:packet";

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
    packetHash,
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
];

const allEnabled: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
];

const notificationRouting = createBoardReleaseArchiveIntelligenceNotificationRoutingReport({
  generatedAt,
  members,
  packet,
  preferencesByUserId: new Map([
    ["user-owner", allEnabled],
    ["user-admin", allEnabled],
  ]),
  workspaceId: "workspace-board",
});

const report = createBoardReleaseArchiveIntelligenceApprovalWorkflowReport({
  approvalRecords: [
    {
      acknowledgedAt: generatedAt,
      acknowledgement: "acknowledged",
      exceptionNote: "Approve under remediation exception EX-1.",
      recommendationId: "recommendation-anomaly",
      reviewerUserId: "user-owner",
      signedOffAt: generatedAt,
      signedPacketHash: packetHash,
    },
    {
      acknowledgedAt: generatedAt,
      acknowledgement: "acknowledged",
      exceptionNote: null,
      recommendationId: "recommendation-trend",
      reviewerUserId: "user-owner",
      signedOffAt: generatedAt,
      signedPacketHash: packetHash,
    },
    {
      acknowledgedAt: generatedAt,
      acknowledgement: "acknowledged",
      exceptionNote: "Stale hash should block closure.",
      recommendationId: "recommendation-replay",
      reviewerUserId: "user-owner",
      signedOffAt: generatedAt,
      signedPacketHash: "sha256:old-packet",
    },
    {
      acknowledgedAt: null,
      acknowledgement: "pending",
      exceptionNote: null,
      recommendationId: "recommendation-governance",
      reviewerUserId: "user-owner",
      signedOffAt: null,
      signedPacketHash: null,
    },
  ],
  generatedAt,
  members,
  notificationRouting,
  packet,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.totalCount, 4);
assert.equal(report.summary.approvedCount, 1);
assert.equal(report.summary.exceptionNeededCount, 1);
assert.equal(report.summary.hashMismatchCount, 1);
assert.equal(report.summary.pendingCount, 1);
assert.equal(report.summary.rejectedCount, 0);
assert.equal(report.summary.status, "hash-mismatch");
assert.equal(report.summary.workflowScore, 50);
assert.equal(report.rows[0]?.recommendationId, "recommendation-replay");
assert.equal(report.rows[1]?.recommendationId, "recommendation-trend");
assert.equal(report.rows.find((row) => row.recommendationId === "recommendation-anomaly")?.status, "approved");
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-approval-workflow-20260529.csv");
assert.match(report.csvContent, /recommendation_id,reviewer_email,status,acknowledgement,exception_note,packet_hash,signed_packet_hash,approval_hash,next_action/);

console.log("board release archive intelligence approval workflow smoke passed");
