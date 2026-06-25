import { strict as assert } from "node:assert";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import { createDeployPromotionDecisionBoard } from "@/features/projects/deploy-promotion-decision-board";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T22:00:00.000Z";

const failingSmoke: PostDeploySyntheticDashboardSummary = {
  actionCommand: "bun run release:post-deploy:smoke -- --write-report",
  baseUrl: "https://essence-spline.example.com",
  checkRows: [
    {
      durationMs: 130,
      httpStatus: 500,
      issues: ["API helper returned 500."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  completionPercent: 75,
  currentPassStreak: 0,
  failedRunCount: 1,
  generatedAt,
  historyCount: 4,
  issueRows: [
    {
      durationMs: 130,
      httpStatus: 500,
      issues: ["API helper returned 500."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  latestFailedAt: generatedAt,
  latestPassedAt: "2026-05-16T21:00:00.000Z",
  passedRunCount: 3,
  projectId: "project-1",
  shareId: "share-1",
  status: "fail",
  statusLabel: "Failing",
  totalRunCount: 4,
};

const passingSmoke: PostDeploySyntheticDashboardSummary = {
  ...failingSmoke,
  checkRows: [],
  completionPercent: 100,
  currentPassStreak: 3,
  failedRunCount: 0,
  issueRows: [],
  latestFailedAt: null,
  latestPassedAt: generatedAt,
  passedRunCount: 3,
  status: "pass",
  statusLabel: "Passing",
  totalRunCount: 3,
};

const baseRiskDigest: WorkspaceRiskDigestReport = {
  actionItems: [],
  audit: {
    dangerCount: 0,
    newestAt: generatedAt,
    rows: [],
    totalCount: 0,
    warningCount: 0,
  },
  generatedAt,
  incidents: {
    criticalCount: 0,
    incidents: [],
    totalCount: 0,
    warningCount: 0,
  },
  packetId: "risk-digest-workspace-20260516",
  publicHealth: {
    failedCount: 0,
    snapshotDiffCount: 0,
    snapshots: [],
    totalCount: 2,
    warningCount: 0,
  },
  riskLevel: "healthy",
  runbook: {
    blockedCount: 0,
    nextDueAt: null,
    records: [],
    totalCount: 2,
  },
  schemaVersion: 1,
  score: 94,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 0,
    trustScore: 96,
  },
  workspace: {
    id: "workspace-1",
    name: "Launch Workspace",
    role: "owner",
  },
};

const blockedRiskDigest: WorkspaceRiskDigestReport = {
  ...baseRiskDigest,
  actionItems: [
    {
      detail: "Desktop signing and API route smoke must recover before promotion.",
      evidenceCount: 2,
      id: "release-blockers",
      label: "Resolve launch blockers",
      priority: "high",
      source: "trust",
    },
  ],
  riskLevel: "watch",
  score: 72,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 1,
    trustScore: 81,
  },
};

const blockedCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Inspect failed checks",
      blockerCount: 1,
      completedAt: null,
      detail: "Post-deploy API helper is failing.",
      dueAt: generatedAt,
      id: "post-deploy-smoke:post-deploy",
      kind: "post-deploy",
      projectId: "project-1",
      projectName: "Launch scene",
      source: "post-deploy-smoke",
      sourceKey: "post-deploy:synthetic-smoke",
      status: "blocked",
      title: "Post-deploy synthetic checks",
    },
    {
      actionLabel: "Open review workflow",
      blockerCount: 0,
      completedAt: null,
      detail: "Desktop release review is waiting.",
      dueAt: "2026-05-17T10:00:00.000Z",
      id: "review-workflow:project-1:desktop",
      kind: "review-gate",
      projectId: "project-1",
      projectName: "Launch scene",
      source: "review-workflow",
      sourceKey: "project-1:review-gate:desktopRelease",
      status: "due",
      title: "Desktop release review",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 1,
    desktopChannelCount: 0,
    doneCount: 0,
    dueCount: 1,
    nextMilestoneAt: generatedAt,
    postDeployCount: 1,
    reviewGateCount: 1,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const readyCalendar: WorkspaceReleaseCalendarReport = {
  ...blockedCalendar,
  milestones: [
    {
      ...blockedCalendar.milestones[0]!,
      actionLabel: "Smoke passed",
      blockerCount: 0,
      completedAt: generatedAt,
      detail: "Latest deploy smoke passed.",
      status: "done",
    },
    {
      ...blockedCalendar.milestones[1]!,
      actionLabel: "Approved",
      completedAt: generatedAt,
      detail: "Desktop release review is approved.",
      status: "done",
    },
  ],
  summary: {
    ...blockedCalendar.summary,
    blockedCount: 0,
    doneCount: 2,
    dueCount: 0,
    nextMilestoneAt: null,
    scheduledCount: 0,
  },
};

const blockedRunbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 2,
  },
  records: [
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "batch-1",
      blockerCount: 1,
      checklistEvidence: ["Fix API helper smoke before deploy promotion."],
      comments: [],
      completedAt: null,
      detail: "Post-deploy smoke must pass.",
      dueAt: generatedAt,
      milestoneId: "post-deploy-smoke:post-deploy",
      ownerEmail: "release@example.com",
      ownerName: "Release owner",
      ownerUserId: "owner-1",
      projectId: "project-1",
      projectName: "Launch scene",
      sourceKey: "post-deploy:synthetic-smoke",
      status: "blocked",
      title: "Post-deploy synthetic checks",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "batch-1",
      blockerCount: 0,
      checklistEvidence: ["Desktop review is waiting."],
      comments: [],
      completedAt: null,
      detail: "Desktop review must be closed.",
      dueAt: "2026-05-17T10:00:00.000Z",
      milestoneId: "review-workflow:project-1:desktop",
      ownerEmail: "release@example.com",
      ownerName: "Release owner",
      ownerUserId: "owner-1",
      projectId: "project-1",
      projectName: "Launch scene",
      sourceKey: "project-1:review-gate:desktopRelease",
      status: "in-progress",
      title: "Desktop release review",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 0,
    inProgressCount: 1,
    nextDueAt: generatedAt,
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const readyRunbook: WorkspaceReleaseRunbookReport = {
  ...blockedRunbook,
  records: blockedRunbook.records.map((record) => ({
    ...record,
    completedAt: generatedAt,
    status: "complete",
  })),
  summary: {
    blockedCount: 0,
    completeCount: 2,
    inProgressCount: 0,
    nextDueAt: null,
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const blockedBoard = createDeployPromotionDecisionBoard({
  generatedAt,
  postDeploySummary: failingSmoke,
  releaseCalendar: blockedCalendar,
  riskDigest: blockedRiskDigest,
  runbook: blockedRunbook,
});

assert.equal(blockedBoard.decision, "blocked");
assert.equal(blockedBoard.blockerCount, 3);
assert.equal(blockedBoard.warningCount, 1);
assert.equal(blockedBoard.smokeIssueRows.length, 1);
assert.ok(blockedBoard.promotionScore < 60);
assert.ok(blockedBoard.milestoneFocus.some((milestone) => milestone.status === "blocked"));
assert.ok(blockedBoard.runbookFocus.some((record) => record.status === "blocked"));

const readyBoard = createDeployPromotionDecisionBoard({
  generatedAt,
  postDeploySummary: passingSmoke,
  releaseCalendar: readyCalendar,
  riskDigest: baseRiskDigest,
  runbook: readyRunbook,
});

assert.equal(readyBoard.decision, "ready");
assert.equal(readyBoard.blockerCount, 0);
assert.equal(readyBoard.warningCount, 0);
assert.equal(readyBoard.runbookCompletionPercent, 100);
assert.equal(readyBoard.milestoneFocus.length, 0);
assert.equal(readyBoard.runbookFocus.length, 0);

const missingSmokeBoard = createDeployPromotionDecisionBoard({
  generatedAt,
  postDeploySummary: null,
  releaseCalendar: readyCalendar,
  riskDigest: baseRiskDigest,
  runbook: readyRunbook,
});

assert.equal(missingSmokeBoard.decision, "blocked");
assert.equal(missingSmokeBoard.signals.some((signal) => signal.id === "post-deploy-smoke" && signal.status === "missing"), true);

console.log("deploy promotion decision board smoke passed");
