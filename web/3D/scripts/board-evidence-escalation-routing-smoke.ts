import assert from "node:assert/strict";
import { createBoardEvidenceEscalationRoutingReport } from "@/features/projects/board-evidence-escalation-routing";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";

const generatedAt = "2026-05-20T10:00:00.000Z";

const readiness: BoardAuditEvidenceReadinessDigest = {
  csvContent: "task_id,status,owner,readiness_score,risk_level,recommendation\n",
  csvDataUri: "data:text/csv;charset=utf-8,task_id",
  csvFileName: "readiness.csv",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "readiness.json",
  recommendations: [
    {
      ownerName: "Packet Owner",
      recommendation: "Packet Owner: Attach refreshed packet export.",
      taskId: "task-packet",
      title: "Packet evidence",
    },
  ],
  risks: [
    {
      nextAction: "Attach refreshed packet export.",
      ownerName: "Packet Owner",
      readinessScore: 42,
      riskLevel: "critical",
      status: "blocked",
      taskId: "task-packet",
      title: "Packet evidence",
    },
    {
      nextAction: "Keep accepted replay evidence.",
      ownerName: "Board Chair",
      readinessScore: 95,
      riskLevel: "low",
      status: "ready",
      taskId: "task-ready",
      title: "Replay evidence",
    },
  ],
  summary: {
    carryForwardCount: 1,
    nextAction: "Attach refreshed packet export.",
    readinessScore: 62,
    scoreDelta: 8,
    status: "blocked",
    taskCount: 2,
    trendPointCount: 2,
    unresolvedAttachmentRiskCount: 1,
  },
  trend: [
    {
      generatedAt: "2026-05-19T10:00:00.000Z",
      readinessScore: 54,
    },
    {
      generatedAt,
      readinessScore: 62,
    },
  ],
  workspaceId: "workspace-board",
};

const report = createBoardEvidenceEscalationRoutingReport({
  generatedAt,
  members: [
    {
      email: "owner@example.com",
      id: "member-owner",
      joinedAt: "2026-05-01T00:00:00.000Z",
      name: "Packet Owner",
      role: "editor",
      userId: "user-owner",
    },
    {
      email: "admin@example.com",
      id: "member-admin",
      joinedAt: "2026-05-01T00:00:00.000Z",
      name: "Release Admin",
      role: "admin",
      userId: "user-admin",
    },
    {
      email: "viewer@example.com",
      id: "member-viewer",
      joinedAt: "2026-05-01T00:00:00.000Z",
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
          emailEnabled: true,
          inAppEnabled: true,
          topic: "review",
        },
      ],
    ],
    [
      "user-admin",
      [
        {
          emailEnabled: false,
          inAppEnabled: true,
          topic: "review",
        },
      ],
    ],
  ]),
  readiness,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.escalationCount, 1);
assert.equal(report.summary.criticalCount, 1);
assert.equal(report.summary.routeCount, 6);
assert.equal(report.summary.eligibleRouteCount, 3);
assert.equal(report.summary.emailEligibleCount, 1);
assert.equal(report.summary.inAppEligibleCount, 2);
assert.equal(report.summary.suppressedByRoleCount, 2);
assert.equal(report.summary.suppressedByPreferenceCount, 1);
assert.equal(report.escalations[0]?.taskId, "task-packet");
assert.equal(report.routes.find((route) => route.userId === "user-owner" && route.channel === "email")?.status, "eligible");
assert.equal(report.routes.find((route) => route.userId === "user-admin" && route.channel === "email")?.status, "suppressed-by-preference");
assert.equal(report.routes.find((route) => route.userId === "user-viewer" && route.channel === "in-app")?.status, "suppressed-by-role");
assert.match(report.summary.nextAction, /Route critical board evidence escalations/);
assert.match(report.csvContent, /escalation_id,task_id,severity,owner,eligible_routes,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-evidence-escalation-routing-20260520.csv");

console.log("board evidence escalation routing smoke passed");
