import { strict as assert } from "node:assert";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createFreeTierResourceMonitorReport } from "@/features/projects/free-tier-resource-monitor";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

const generatedAt = "2026-05-16T21:00:00.000Z";

const releaseChecklist: ReleaseDeploymentChecklist = {
  blockerCount: 0,
  checks: [
    {
      category: "vercel",
      key: "vercel-project-id",
      message: "Linked Vercel project id is present.",
      status: "pass",
      title: "Vercel project id",
    },
    {
      category: "vercel",
      key: "vercel-org-id",
      message: "Linked Vercel scope id is present.",
      status: "pass",
      title: "Vercel team or user id",
    },
    {
      category: "database",
      key: "database-url",
      message: "Database URL is present.",
      status: "pass",
      title: "Turso database URL",
    },
    {
      category: "database",
      key: "turso-connectivity",
      message: "Turso query succeeded.",
      status: "pass",
      title: "Turso connectivity",
    },
  ],
  generatedAt,
  status: "pass",
  summary: "Release deployment checklist passed.",
  target: "production",
  warningCount: 0,
};

const postDeploySummary: PostDeploySyntheticDashboardSummary = {
  actionCommand: "bun run release:post-deploy:smoke -- --write-report",
  baseUrl: "https://essence-spline.example.com",
  checkRows: [],
  completionPercent: 100,
  currentPassStreak: 2,
  failedRunCount: 0,
  generatedAt,
  historyCount: 2,
  issueRows: [],
  latestFailedAt: null,
  latestPassedAt: generatedAt,
  passedRunCount: 2,
  projectId: "project-1",
  shareId: "share-1",
  status: "pass",
  statusLabel: "Passing",
  totalRunCount: 2,
};

const emailReport: WorkspaceNotificationEmailDeliveryReport = {
  attempts: [],
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 0,
    pendingCount: 2,
    sentCount: 10,
    skippedCount: 0,
    totalCount: 12,
  },
};

const artifactReport: ProjectArtifactRegistryReport = {
  entries: [],
  generatedAt,
  summary: {
    availableCount: 20,
    blockedCount: 0,
    complianceExportCount: 5,
    draftCount: 2,
    lineageSnapshotCount: 5,
    privateCount: 12,
    publicAssetCount: 10,
    publicCount: 8,
    signedBundleCount: 0,
    totalCount: 22,
  },
};

const workerQueueReport: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 0,
    queuedCount: 2,
    retryableCount: 0,
    runningCount: 1,
    succeededCount: 8,
    totalCount: 11,
  },
};

const readyReport = createFreeTierResourceMonitorReport({
  artifactRegistryReport: artifactReport,
  budgets: {
    dailyEmailJobGuardrail: 100,
    storageArtifactGuardrail: 100,
    workerQueueGuardrail: 20,
  },
  cadConversionQueueReport: workerQueueReport,
  emailDeliveryReport: emailReport,
  generatedAt,
  postDeploySummary,
  releaseDeploymentChecklist: releaseChecklist,
});

assert.equal(readyReport.summary.totalCount, 5);
assert.equal(readyReport.summary.readyCount, 5);
assert.equal(readyReport.summary.blockedCount, 0);
assert.equal(readyReport.rows.find((row) => row.id === "brevo-email")?.usagePercent, 12);
assert.equal(readyReport.rows.find((row) => row.id === "worker-queue")?.usagePercent, 15);

const watchReport = createFreeTierResourceMonitorReport({
  artifactRegistryReport: {
    ...artifactReport,
    summary: {
      ...artifactReport.summary,
      draftCount: 45,
      totalCount: 82,
    },
  },
  budgets: {
    dailyEmailJobGuardrail: 100,
    storageArtifactGuardrail: 100,
    workerQueueGuardrail: 20,
  },
  cadConversionQueueReport: {
    ...workerQueueReport,
    summary: {
      ...workerQueueReport.summary,
      queuedCount: 17,
      retryableCount: 1,
      runningCount: 0,
    },
  },
  emailDeliveryReport: {
    ...emailReport,
    summary: {
      ...emailReport.summary,
      pendingCount: 25,
      sentCount: 60,
      totalCount: 85,
    },
  },
  generatedAt,
  postDeploySummary: null,
  releaseDeploymentChecklist: releaseChecklist,
});

assert.equal(watchReport.rows.find((row) => row.id === "vercel-deployment")?.status, "watch");
assert.equal(watchReport.rows.find((row) => row.id === "brevo-email")?.status, "watch");
assert.equal(watchReport.rows.find((row) => row.id === "storage-artifacts")?.status, "watch");
assert.equal(watchReport.rows.find((row) => row.id === "worker-queue")?.status, "watch");

const blockedReport = createFreeTierResourceMonitorReport({
  artifactRegistryReport: {
    ...artifactReport,
    summary: {
      ...artifactReport.summary,
      blockedCount: 1,
    },
  },
  budgets: {
    dailyEmailJobGuardrail: 100,
    storageArtifactGuardrail: 100,
    workerQueueGuardrail: 20,
  },
  cadConversionQueueReport: {
    ...workerQueueReport,
    summary: {
      ...workerQueueReport.summary,
      failedCount: 1,
    },
  },
  emailDeliveryReport: {
    ...emailReport,
    summary: {
      ...emailReport.summary,
      failedCount: 1,
    },
  },
  generatedAt,
  postDeploySummary: {
    ...postDeploySummary,
    status: "fail",
    statusLabel: "Failing",
  },
  releaseDeploymentChecklist: {
    ...releaseChecklist,
    blockerCount: 2,
    checks: releaseChecklist.checks.map((check) => (check.category === "database" ? { ...check, status: "fail" } : check)),
    status: "fail",
  },
});

assert.equal(blockedReport.summary.blockedCount, 5);
assert.equal(blockedReport.summary.worstStatus, "blocked");
assert.equal(blockedReport.rows.every((row) => row.status === "blocked"), true);

console.log("free tier resource monitor smoke passed");
