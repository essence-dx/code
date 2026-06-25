import { strict as assert } from "node:assert";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import {
  createRuntimeReleaseAutomationNotificationRouting,
  type RuntimeReleaseAutomationNotificationRoutingReport,
} from "@/features/projects/runtime-release-automation-notification-routing";
import type { RuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";
import type { RuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

const generatedAt = "2026-05-17T18:00:00.000Z";

const operatorQueue = {
  releaseCandidateId: "runtime-2026-05-17",
  rows: [
    {
      dueAt: "2026-05-17T16:00:00.000Z",
      evidenceHash: "sha256:overdue-evidence",
      gateId: "runtime-performance-budget",
      gateLabel: "Runtime performance budget",
      nextAction: "Escalate Runtime performance budget to Release Owner and attach fresh evidence.",
      ownerEmail: "owner@example.com",
      ownerName: "Release Owner",
      queueRowHash: "sha256:overdue-row",
      status: "overdue",
    },
    {
      dueAt: "2026-05-18T16:00:00.000Z",
      evidenceHash: "sha256:ready-evidence",
      gateId: "runtime-replay",
      gateLabel: "Runtime replay",
      nextAction: "Runtime replay is ready.",
      ownerEmail: "owner@example.com",
      ownerName: "Release Owner",
      queueRowHash: "sha256:ready-row",
      status: "ready",
    },
  ],
  summary: {
    overdueCount: 1,
    queueHash: "sha256:operator-queue",
    queueScore: 50,
    status: "overdue",
  },
  workspaceId: "Essence Runtime",
} as unknown as RuntimeReleaseOperatorQueue;

const approvalChecklist = {
  expiresAt: "2026-05-17T17:00:00.000Z",
  releaseCandidateId: "runtime-2026-05-17",
  summary: {
    approvalHash: "sha256:approval",
    approvalScore: 65,
    expirationStatus: "expired",
    nextAction: "Renew runtime release approval before production handoff.",
    reviewerEmail: "reviewer@example.com",
    reviewerName: "Release Reviewer",
    status: "expired",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseApprovalChecklist;

const candidateComparison = {
  currentReleaseCandidateId: "runtime-2026-05-17",
  rows: [
    {
      change: "regressed",
      currentHash: "sha256:current-regression",
      currentScore: 60,
      currentStatus: "blocked",
      id: "release-gate-score",
      label: "Release gate score",
      lastApprovedHash: "sha256:last-approved",
      lastApprovedScore: 100,
      lastApprovedStatus: "ready",
      nextAction: "Review Release gate score regression before approving this release candidate.",
      rowHash: "sha256:regression-row",
    },
    {
      change: "unchanged",
      currentHash: "sha256:current-unchanged",
      currentScore: 100,
      currentStatus: "ready",
      id: "approval-score",
      label: "Approval score",
      lastApprovedHash: "sha256:last-unchanged",
      lastApprovedScore: 100,
      lastApprovedStatus: "ready",
      nextAction: "Approval score matches the last approved release evidence.",
      rowHash: "sha256:unchanged-row",
    },
  ],
  summary: {
    comparisonHash: "sha256:comparison",
    comparisonScore: 50,
    regressionCount: 1,
    status: "blocked",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseCandidateComparison;

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

const report: RuntimeReleaseAutomationNotificationRoutingReport = createRuntimeReleaseAutomationNotificationRouting({
  approvalChecklist,
  candidateComparison,
  generatedAt,
  members,
  operatorQueue,
  preferencesByUserId: new Map([
    ["user-owner", ownerPreferences],
    ["user-editor", editorPreferences],
  ]),
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "critical");
assert.equal(report.summary.notificationCount, 3);
assert.equal(report.summary.criticalCount, 3);
assert.equal(report.summary.warningCount, 0);
assert.equal(report.summary.routeCount, 24);
assert.equal(report.summary.eligibleRouteCount, 11);
assert.equal(report.summary.emailEligibleCount, 4);
assert.equal(report.summary.inAppEligibleCount, 7);
assert.equal(report.summary.suppressedByRoleCount, 10);
assert.equal(report.summary.suppressedByPreferenceCount, 3);
assert.ok(report.summary.routingHash.startsWith("sha256:"));
assert.match(report.summary.nextAction, /Route critical runtime release automation notifications/);

assert.ok(report.notifications.some((notification) => notification.kind === "overdue-queue-row" && notification.severity === "critical"));
assert.ok(report.notifications.some((notification) => notification.kind === "stale-approval" && notification.topic === "review"));
assert.ok(report.notifications.some((notification) => notification.kind === "comparison-regression" && notification.sourceHash === "sha256:regression-row"));

const ownerOverdueEmail = report.routes.find(
  (route) => route.candidateId === "runtime-release-automation:queue:runtime-performance-budget" && route.channel === "email" && route.userId === "user-owner",
);
assert.equal(ownerOverdueEmail?.status, "eligible");
assert.match(ownerOverdueEmail?.dedupeKey ?? "", /runtime-release-automation/);

const editorOverdueEmail = report.routes.find(
  (route) => route.candidateId === "runtime-release-automation:queue:runtime-performance-budget" && route.channel === "email" && route.userId === "user-editor",
);
assert.equal(editorOverdueEmail?.status, "suppressed-by-role");

const editorApprovalEmail = report.routes.find(
  (route) => route.candidateId === "runtime-release-automation:approval:runtime-2026-05-17" && route.channel === "email" && route.userId === "user-editor",
);
assert.equal(editorApprovalEmail?.status, "eligible");

const adminRegressionEmail = report.routes.find(
  (route) => route.candidateId === "runtime-release-automation:comparison:release-gate-score" && route.channel === "email" && route.userId === "user-admin",
);
assert.equal(adminRegressionEmail?.status, "suppressed-by-preference");

assert.match(report.csvContent, /^notification_id,kind,severity,topic,title,eligible_routes,source_hash,next_action/);
assert.ok(report.jsonContent.includes("comparison-regression"));
assert.equal(report.csvFileName, "essence-runtime-runtime-release-automation-notification-routing-20260517.csv");
assert.equal(report.jsonFileName, "essence-runtime-runtime-release-automation-notification-routing-20260517.json");
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

console.log("runtime release automation notification routing smoke passed");
