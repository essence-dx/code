import assert from "node:assert/strict";
import type { BoardEvidenceReleaseApprovalHandoffReport } from "@/features/projects/board-evidence-release-approval-handoff";
import { createBoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

const generatedAt = "2026-05-21T10:00:00.000Z";

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: generatedAt,
    name: "Workspace Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: generatedAt,
    name: "Release Admin",
    role: "admin",
    userId: "user-admin",
  },
  {
    email: "editor@example.com",
    id: "member-editor",
    joinedAt: generatedAt,
    name: "Evidence Owner",
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

const enabledReviewRelease: WorkspaceNotificationDeliveryPreference[] = [
  { emailEnabled: true, inAppEnabled: true, topic: "review" },
  { emailEnabled: true, inAppEnabled: true, topic: "release" },
];

const handoff = {
  releasePromotionId: "release-2026-05-20",
  signers: [
    {
      dependencyCount: 0,
      dueAt: "2026-05-23T10:00:00.000Z",
      email: "owner@example.com",
      id: "release-handoff:accountable:user-owner",
      name: "Workspace Owner",
      nextAction: "Sign release approval handoff.",
      role: "accountable",
      status: "ready",
      userId: "user-owner",
    },
    {
      dependencyCount: 1,
      dueAt: "2026-05-22T10:00:00.000Z",
      email: "editor@example.com",
      id: "release-handoff:packet-owner:user-editor",
      name: "Evidence Owner",
      nextAction: "Review variance before closeout.",
      role: "packet-owner",
      status: "watch",
      userId: "user-editor",
    },
  ],
  summary: {
    nextAction: "Release approval handoff is ready for signer circulation.",
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseApprovalHandoffReport;

const variance = {
  summary: {
    blockerCount: 0,
    currentReadinessScore: 92,
    nextAction: "Review closeout hash drift before relying on the archived release evidence.",
    status: "watch",
    varianceCount: 1,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseVarianceReport;

const report = createBoardEvidenceReleaseCloseoutNotificationReport({
  generatedAt,
  handoff,
  members,
  preferencesByUserId: new Map([
    ["user-owner", enabledReviewRelease],
    ["user-admin", enabledReviewRelease],
    ["user-editor", enabledReviewRelease],
    ["user-viewer", enabledReviewRelease],
  ]),
  variance,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.candidateCount, 3);
assert.equal(report.summary.eligibleRouteCount, 6);
assert.equal(report.summary.emailEligibleCount, 3);
assert.equal(report.summary.inAppEligibleCount, 3);
assert.equal(report.summary.suppressedByRoleCount, 0);
assert.equal(report.notifications.find((notification) => notification.recipientRole === "admin")?.topic, "release");
assert.equal(report.notifications.find((notification) => notification.reason === "packet-owner")?.topic, "review");
assert.match(report.csvContent, /notification_id,recipient,role,reason,topic,channel,status,dedupe_key,next_action/);
assert.match(report.jsonContent, /"varianceCount": 1/);
assert.equal(report.csvFileName, "workspace-board-board-evidence-release-closeout-notifications-20260521.csv");
assert.equal(report.jsonFileName, "workspace-board-board-evidence-release-closeout-notifications-20260521.json");

console.log("board evidence release closeout notifications smoke passed");
