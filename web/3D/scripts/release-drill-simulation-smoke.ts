import { strict as assert } from "node:assert";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  createProjectCadConversionQueueReport,
  failProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";
import { createReleaseDrillSimulationReport } from "@/features/projects/release-drill-simulation";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T15:00:00.000Z";

const passingSmoke: PostDeploySyntheticDashboardSummary = {
  actionCommand: "bun run release:post-deploy:smoke -- --write-report",
  baseUrl: "https://essence-spline.example.com",
  checkRows: [],
  completionPercent: 100,
  currentPassStreak: 3,
  failedRunCount: 0,
  generatedAt,
  historyCount: 3,
  issueRows: [],
  latestFailedAt: null,
  latestPassedAt: generatedAt,
  passedRunCount: 3,
  projectId: "project-1",
  shareId: "share-1",
  status: "pass",
  statusLabel: "Passing",
  totalRunCount: 3,
};

const failingSmoke: PostDeploySyntheticDashboardSummary = {
  ...passingSmoke,
  checkRows: [
    {
      durationMs: 250,
      httpStatus: 500,
      issues: ["Public API helper failed."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  completionPercent: 75,
  currentPassStreak: 0,
  failedRunCount: 1,
  issueRows: [
    {
      durationMs: 250,
      httpStatus: 500,
      issues: ["Public API helper failed."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  latestFailedAt: generatedAt,
  latestPassedAt: "2026-05-16T14:00:00.000Z",
  passedRunCount: 2,
  status: "fail",
  statusLabel: "Failing",
};

const validCertificateReport: ProjectAppPackageCertificateReport = {
  generatedAt,
  rows: [
    {
      artifactId: "signed-tauri",
      certificate: {
        bundleIdentifier: "com.essence.spline",
        expiresAt: "2027-05-16T00:00:00.000Z",
        fingerprintSha256: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
        issuer: "Essence Test CA",
        metadata: null,
        platform: "windows",
        presetId: "signed-tauri",
        projectId: "project-1",
        revokedAt: null,
        serialNumber: "123",
        sourceArtifactId: "signed-tauri",
        subject: "Essence Spline",
        teamId: null,
        uploadedAt: generatedAt,
        validFrom: "2026-01-01T00:00:00.000Z",
        verifiedAt: generatedAt,
      },
      expiresAt: "2027-05-16T00:00:00.000Z",
      issue: null,
      label: "Signed Tauri",
      platform: "windows",
      presetId: "signed-tauri",
      presetLabel: "Signed Tauri",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "project-1:signed-app-bundle:signed-tauri",
      sourceVersionId: "version-1",
      status: "valid",
    },
  ],
  summary: {
    blockedCount: 0,
    expiredCount: 0,
    expiringCount: 0,
    missingCount: 0,
    mismatchCount: 0,
    nativeBundleCount: 1,
    readyCount: 1,
    revokedCount: 0,
    totalRequiredCount: 1,
    validCount: 1,
  },
};

const blockedCertificateReport: ProjectAppPackageCertificateReport = {
  ...validCertificateReport,
  rows: [
    {
      ...validCertificateReport.rows[0]!,
      certificate: null,
      expiresAt: null,
      issue: "No signing certificate has been ingested for this package/platform.",
      status: "missing",
    },
  ],
  summary: {
    ...validCertificateReport.summary,
    blockedCount: 1,
    missingCount: 1,
    readyCount: 0,
    validCount: 0,
  },
};

const readyCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Complete",
      blockerCount: 0,
      completedAt: generatedAt,
      detail: "Rollback owner and deploy smoke are verified.",
      dueAt: generatedAt,
      id: "rollback",
      kind: "post-deploy",
      projectId: "project-1",
      projectName: "Launch Scene",
      source: "post-deploy-smoke",
      sourceKey: "release:rollback",
      status: "done",
      title: "Rollback rehearsal",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 0,
    desktopChannelCount: 0,
    doneCount: 1,
    dueCount: 0,
    nextMilestoneAt: null,
    postDeployCount: 1,
    reviewGateCount: 0,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const blockedCalendar: WorkspaceReleaseCalendarReport = {
  ...readyCalendar,
  milestones: [
    {
      ...readyCalendar.milestones[0]!,
      actionLabel: "Resolve blocker",
      blockerCount: 1,
      completedAt: null,
      status: "blocked",
    },
  ],
  summary: {
    ...readyCalendar.summary,
    blockedCount: 1,
    doneCount: 0,
    nextMilestoneAt: generatedAt,
  },
};

const readyRunbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 1,
  },
  records: [
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "batch-1",
      blockerCount: 0,
      checklistEvidence: ["Rollback and smoke recovery path verified."],
      comments: [],
      completedAt: generatedAt,
      detail: "Release owner can pause and recover promotion.",
      dueAt: generatedAt,
      milestoneId: "rollback",
      ownerEmail: "release@example.com",
      ownerName: "Release owner",
      ownerUserId: "owner-1",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "release:rollback",
      status: "complete",
      title: "Rollback rehearsal",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 0,
    completeCount: 1,
    inProgressCount: 0,
    nextDueAt: null,
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const blockedRunbook: WorkspaceReleaseRunbookReport = {
  ...readyRunbook,
  records: [
    {
      ...readyRunbook.records[0]!,
      blockerCount: 1,
      completedAt: null,
      status: "blocked",
    },
  ],
  summary: {
    ...readyRunbook.summary,
    blockedCount: 1,
    completeCount: 0,
    nextDueAt: generatedAt,
  },
};

const queuedJob = createProjectCadConversionJob({
  generatedAt,
  projectId: "project-1",
  projectName: "Launch Scene",
  sourceBytes: 1024 * 1024,
  sourceFileName: "launch.step",
  target: "stl",
  workspaceId: "workspace-1",
});
assert.ok("job" in queuedJob);

const readyCadReport = createProjectCadConversionQueueReport(
  [
    completeProjectCadConversionJob({
      finishedAt: generatedAt,
      job: startProjectCadConversionJob(queuedJob.job, generatedAt),
      resultPath: "artifacts/launch.stl",
    }),
  ],
  generatedAt,
);

const blockedCadReport = createProjectCadConversionQueueReport(
  [
    failProjectCadConversionJob({
      failedAt: generatedAt,
      job: startProjectCadConversionJob(queuedJob.job, generatedAt),
      message: "FreeCAD worker unavailable.",
      retryable: true,
    }),
  ],
  generatedAt,
);

const readyReport = createReleaseDrillSimulationReport({
  cadConversionQueueReport: readyCadReport,
  certificateReport: validCertificateReport,
  generatedAt,
  postDeploySummary: passingSmoke,
  releaseCalendar: readyCalendar,
  releaseRunbook: readyRunbook,
});

assert.equal(readyReport.summary.totalCount, 4);
assert.equal(readyReport.summary.readyCount, 4);
assert.equal(readyReport.summary.score, 100);
assert.equal(readyReport.rows[0]?.status, "ready");

const blockedReport = createReleaseDrillSimulationReport({
  cadConversionQueueReport: blockedCadReport,
  certificateReport: blockedCertificateReport,
  generatedAt,
  postDeploySummary: failingSmoke,
  releaseCalendar: blockedCalendar,
  releaseRunbook: blockedRunbook,
});

assert.equal(blockedReport.summary.totalCount, 4);
assert.equal(blockedReport.summary.blockedCount, 4);
assert.equal(blockedReport.summary.score, 0);
assert.equal(blockedReport.summary.worstStatus, "blocked");
assert.ok(blockedReport.rows.some((row) => row.id === "deploy-smoke-failure" && row.nextAction.includes("rerun smoke")));

const missingReport = createReleaseDrillSimulationReport({
  cadConversionQueueReport: createProjectCadConversionQueueReport([], generatedAt),
  certificateReport: {
    ...validCertificateReport,
    rows: [],
    summary: {
      ...validCertificateReport.summary,
      nativeBundleCount: 0,
      readyCount: 0,
      totalRequiredCount: 0,
      validCount: 0,
    },
  },
  generatedAt,
  postDeploySummary: null,
  releaseCalendar: {
    ...readyCalendar,
    milestones: [],
    summary: {
      ...readyCalendar.summary,
      doneCount: 0,
      postDeployCount: 0,
      totalCount: 0,
    },
  },
  releaseRunbook: {
    ...readyRunbook,
    records: [],
    summary: {
      ...readyRunbook.summary,
      completeCount: 0,
      ownerCount: 0,
      totalCount: 0,
    },
  },
});

assert.equal(missingReport.summary.missingCount, 4);
assert.equal(missingReport.summary.score, 25);

console.log("release drill simulation smoke passed");
