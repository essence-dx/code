import { strict as assert } from "node:assert";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import { createWorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = new Date("2026-05-16T18:00:00.000Z");
const releaseChecklist: ReleaseDeploymentChecklist = {
  blockerCount: 1,
  checks: [
    {
      category: "vercel",
      key: "project-linkage",
      message: "Linked project mismatch.",
      status: "fail",
      title: "Vercel project",
    },
  ],
  generatedAt: "2026-05-16T17:30:00.000Z",
  status: "fail",
  summary: "Release deployment checklist has release blockers.",
  target: "production",
  warningCount: 0,
};
const postDeploySummary: PostDeploySyntheticDashboardSummary = {
  actionCommand: "bun run release:post-deploy:smoke -- --write-report",
  baseUrl: "https://essence-spline.example.com",
  checkRows: [],
  completionPercent: 50,
  currentPassStreak: 0,
  failedRunCount: 1,
  generatedAt: "2026-05-16T17:45:00.000Z",
  historyCount: 1,
  issueRows: [
    {
      durationMs: 30,
      httpStatus: 500,
      issues: ["API helper returned 500."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  latestFailedAt: "2026-05-16T17:45:00.000Z",
  latestPassedAt: null,
  passedRunCount: 0,
  projectId: "project-1",
  shareId: "share-1",
  status: "fail",
  statusLabel: "Failing",
  totalRunCount: 1,
};
const approvedSettings = {
  ...defaultShareSettings,
  reviewWorkflow: {
    appPackage: { status: "approved" as const, updatedAt: "2026-05-16T15:00:00.000Z" },
    desktopRelease: { status: "approved" as const, updatedAt: "2026-05-16T15:00:00.000Z" },
    embed: { status: "approved" as const, updatedAt: "2026-05-16T15:00:00.000Z" },
    publicLink: { status: "approved" as const, updatedAt: "2026-05-16T15:00:00.000Z" },
  },
};
const blockedSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "desktopRelease", "changesRequested", {
    note: "Unsigned updater artifacts need review.",
    reviewerName: "Release lead",
    updatedAt: "2026-05-16T16:00:00.000Z",
  }),
};

const report = createWorkspaceReleaseCalendarReport({
  now,
  postDeploySummary,
  projects: [
    {
      archivedAt: null,
      id: "project-1",
      name: "Launch scene",
      publishedAt: "2026-05-16T10:00:00.000Z",
      shareSettings: blockedSettings,
      updatedAt: "2026-05-16T16:30:00.000Z",
    },
    {
      archivedAt: null,
      id: "project-2",
      name: "Healthy scene",
      publishedAt: null,
      shareSettings: approvedSettings,
      updatedAt: "2026-05-16T15:30:00.000Z",
    },
  ],
  releaseReadinessChecklist: releaseChecklist,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.reviewGateCount, 8);
assert.equal(report.summary.appPackageCount, 2);
assert.equal(report.summary.desktopChannelCount, 3);
assert.equal(report.summary.postDeployCount, 1);
assert.ok(report.summary.blockedCount >= 5);
assert.ok(report.milestones.some((milestone) => milestone.kind === "desktop-channel" && milestone.status === "blocked" && milestone.blockerCount === 2));
assert.ok(report.milestones.some((milestone) => milestone.kind === "app-package" && milestone.projectId === "project-2" && milestone.status === "done"));
assert.ok(report.milestones.some((milestone) => milestone.kind === "post-deploy" && milestone.status === "blocked" && milestone.blockerCount === 1));
assert.ok(report.milestones[0]?.status === "blocked");

const passingPostDeploy = createWorkspaceReleaseCalendarReport({
  now,
  postDeploySummary: {
    ...postDeploySummary,
    completionPercent: 100,
    currentPassStreak: 2,
    failedRunCount: 0,
    issueRows: [],
    latestFailedAt: null,
    latestPassedAt: "2026-05-16T17:50:00.000Z",
    passedRunCount: 2,
    status: "pass",
    statusLabel: "Passing",
  },
  projects: [],
  releaseReadinessChecklist: {
    ...releaseChecklist,
    blockerCount: 0,
    checks: [],
    status: "pass",
    summary: "Release deployment checklist passed.",
  },
  workspaceId: "workspace-1",
});

assert.ok(passingPostDeploy.milestones.some((milestone) => milestone.kind === "post-deploy" && milestone.status === "done"));
assert.ok(passingPostDeploy.milestones.filter((milestone) => milestone.kind === "desktop-channel").every((milestone) => milestone.status === "scheduled"));

console.log("workspace release calendar smoke passed");
