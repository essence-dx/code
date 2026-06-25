import { strict as assert } from "node:assert";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import { createProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { ReleaseDrillHistoryReport } from "@/features/projects/release-drill-history";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-05-16T19:00:00.000Z";

const incidentHistory: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["API helper: API helper returned 500."],
      id: "project-1:post-deploy-failure:2026-05-16T18:30:00.000Z",
      kind: "post-deploy-failure",
      message: "API helper failed after deployment.",
      occurredAt: "2026-05-16T18:30:00.000Z",
      projectId: "project-1",
      projectName: "Launch Scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
    {
      actionLabel: "Check export readiness",
      count: 2,
      details: ["GLB: Missing texture asset.", "USDZ: Unsupported material layer."],
      id: "project-2:failed-export:2026-05-16T18:15:00.000Z",
      kind: "failed-export",
      message: "GLB and USDZ need export review before handoff.",
      occurredAt: "2026-05-16T18:15:00.000Z",
      projectId: "project-2",
      projectName: "Catalog Scene",
      severity: "warning",
      source: "export-manifest",
      title: "Export review needed",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 1,
    failedExportCount: 1,
    impactedProjectCount: 2,
    postDeployFailureCount: 1,
    totalCount: 2,
    warningCount: 1,
  },
};

const postDeploySummary: PostDeploySyntheticDashboardSummary = {
  actionCommand: "bun run release:post-deploy:smoke -- --write-report",
  baseUrl: "https://essence-spline.example.com",
  checkRows: [],
  completionPercent: 75,
  currentPassStreak: 0,
  failedRunCount: 1,
  generatedAt,
  historyCount: 2,
  issueRows: [
    {
      durationMs: 90,
      httpStatus: 500,
      issues: ["API helper returned 500."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  latestFailedAt: generatedAt,
  latestPassedAt: "2026-05-16T17:00:00.000Z",
  passedRunCount: 1,
  projectId: "project-1",
  shareId: "share-1",
  status: "fail",
  statusLabel: "Failing",
  totalRunCount: 2,
};

const releaseDrillHistory: ReleaseDrillHistoryReport = {
  records: [
    {
      actor: {
        email: "release@example.com",
        name: "Release owner",
        userId: "user-1",
      },
      blockedCount: 0,
      contentHash: "sha256:test",
      createdAt: generatedAt,
      csvByteSize: 100,
      csvFileName: "drills.csv",
      drillId: "release-drills-workspace-1",
      drillRows: [
        {
          dueAt: "2026-05-23T19:00:00.000Z",
          evidence: "Latest deploy-smoke drill has a failure exercise.",
          evidenceLinks: [{ href: "/projects#post-deploy", label: "Post-deploy smoke" }],
          id: "deploy-smoke-failure",
          label: "Deploy smoke failure drill",
          lastRunAt: generatedAt,
          nextAction: "Pair failing route with an owner before the next promotion.",
          outcome: "watch",
          ownerName: "Web release owner",
          recoveryTargetMinutes: 20,
        },
        {
          dueAt: "2026-06-15T19:00:00.000Z",
          evidence: "Rollback target is known.",
          evidenceLinks: [{ href: "/projects#release-runbook", label: "Release runbook" }],
          id: "rollback",
          label: "Rollback rehearsal",
          lastRunAt: generatedAt,
          nextAction: "Keep rollback target current.",
          outcome: "ready",
          ownerName: "Release owner",
          recoveryTargetMinutes: 30,
        },
        {
          dueAt: "2026-05-23T19:00:00.000Z",
          evidence: "CAD worker exercise exists.",
          evidenceLinks: [{ href: "/projects#cad-workers", label: "CAD worker queue" }],
          id: "cad-worker-outage",
          label: "CAD worker outage drill",
          lastRunAt: generatedAt,
          nextAction: "Keep a representative failed export fixture.",
          outcome: "watch",
          ownerName: "CAD owner",
          recoveryTargetMinutes: 60,
        },
      ],
      id: "history-1",
      jsonByteSize: 200,
      jsonFileName: "drills.json",
      missingCount: 0,
      readyCount: 1,
      report: {
        generatedAt,
        rows: [],
        summary: {
          blockedCount: 0,
          missingCount: 0,
          readyCount: 1,
          score: 75,
          totalCount: 3,
          watchCount: 2,
          worstStatus: "watch",
        },
      },
      score: 75,
      totalCount: 3,
      watchCount: 2,
      workspaceId: "workspace-1",
      workspaceName: "Launch Workspace",
    },
  ],
  summary: {
    actorCount: 1,
    blockedRunCount: 0,
    latestContentHash: "sha256:test",
    latestSavedAt: generatedAt,
    readyRunCount: 1,
    totalDrillCount: 3,
    totalRecordCount: 1,
    watchRunCount: 2,
  },
};

const releaseRunbookReport: WorkspaceReleaseRunbookReport = {
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
      blockerCount: 0,
      checklistEvidence: ["API route owner assigned.", "Smoke rerun command captured."],
      comments: [],
      completedAt: "2026-05-16T18:45:00.000Z",
      detail: "Public API helper recovery was documented.",
      dueAt: "2026-05-16T19:00:00.000Z",
      milestoneId: "deploy-smoke",
      ownerEmail: "release@example.com",
      ownerName: "Release owner",
      ownerUserId: "user-1",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "post-deploy:api-helper",
      status: "complete",
      title: "API helper recovery",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "batch-1",
      blockerCount: 0,
      checklistEvidence: ["Reviewer handoff summary attached."],
      comments: [],
      completedAt: "2026-05-16T18:50:00.000Z",
      detail: "Workspace-level release summary complete.",
      dueAt: "2026-05-16T19:00:00.000Z",
      milestoneId: "workspace-summary",
      ownerEmail: "release@example.com",
      ownerName: "Release owner",
      ownerUserId: "user-1",
      projectId: null,
      projectName: null,
      sourceKey: "release:summary",
      status: "complete",
      title: "Release summary",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
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

const report = createProjectIncidentPostmortemReport({
  generatedAt,
  incidentHistory,
  postDeploySummary,
  releaseDrillHistory,
  releaseRunbookReport,
});

assert.equal(report.summary.templateCount, 2);
assert.equal(report.summary.failedSmokeCheckCount, 1);
assert.equal(report.summary.linkedDrillCount, 4);
assert.equal(report.summary.completedRemediationCount, 3);
assert.equal(report.summary.readyCount, 2);

const deployTemplate = report.templates.find((template) => template.incident.kind === "post-deploy-failure");
const exportTemplate = report.templates.find((template) => template.incident.kind === "failed-export");

assert.equal(deployTemplate?.status, "ready");
assert.equal(deployTemplate?.failedSmokeChecks[0]?.label, "API helper");
assert.ok(deployTemplate?.followUpActions.some((action) => action.includes("API helper returned 500")));
assert.equal(exportTemplate?.relatedReleaseDrills.some((drill) => drill.label === "CAD worker outage drill"), true);
assert.equal(exportTemplate?.completedRemediations.some((item) => item.title === "Release summary"), true);

const blockedReport = createProjectIncidentPostmortemReport({
  generatedAt,
  incidentHistory,
  postDeploySummary,
  releaseDrillHistory: null,
  releaseRunbookReport: {
    ...releaseRunbookReport,
    records: [],
    summary: {
      ...releaseRunbookReport.summary,
      completeCount: 0,
      totalCount: 0,
    },
  },
});

assert.equal(blockedReport.templates.find((template) => template.incident.kind === "post-deploy-failure")?.status, "blocked");
assert.equal(blockedReport.summary.blockedCount, 2);

console.log("project incident postmortem smoke passed");
