import { strict as assert } from "node:assert";
import { createWorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import { createWorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = new Date("2026-05-17T01:00:00.000Z");
const reviewWorkflow = updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "changesRequested", {
  updatedAt: "2026-05-17T01:01:00.000Z",
});
const releaseCalendar = createWorkspaceReleaseCalendarReport({
  now,
  postDeploySummary: null,
  projects: [
    {
      archivedAt: null,
      id: "project-runbook",
      name: "Runbook Scene",
      publishedAt: null,
      shareSettings: {
        ...defaultShareSettings,
        reviewWorkflow,
      },
      updatedAt: "2026-05-17T01:02:00.000Z",
    },
  ],
  releaseReadinessChecklist: null,
  workspaceId: "workspace-runbook",
});
const report = createWorkspaceReleaseRunbookReport({
  batchId: "batch-runbook",
  generatedAt: "2026-05-17T01:03:00.000Z",
  members: [
    {
      email: "owner@example.com",
      id: "member-owner",
      joinedAt: "2026-05-17T01:04:00.000Z",
      name: "Owner",
      role: "owner",
      userId: "user-owner",
    },
    {
      email: "editor@example.com",
      id: "member-editor",
      joinedAt: "2026-05-17T01:05:00.000Z",
      name: "Editor",
      role: "editor",
      userId: "user-editor",
    },
  ],
  releaseCalendar,
  workspaceId: "workspace-runbook",
});

assert.equal(report.history.batchCount, 1);
assert.equal(report.summary.totalCount, releaseCalendar.summary.totalCount);
assert.ok(report.summary.blockedCount > 0);
assert.ok(report.summary.ownerCount > 0);
assert.ok(report.summary.nextDueAt);
assert.equal(report.records.some((record) => record.ownerName === "Editor"), true);
assert.equal(report.records.every((record) => record.auditLogHref.includes("workspaceId=workspace-runbook")), true);
assert.equal(report.records.every((record) => record.checklistEvidence.length >= 4), true);
assert.equal(report.records.some((record) => record.status === "blocked" && record.blockerCount > 0), true);

console.log("workspace release runbook smoke passed");
