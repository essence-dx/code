import { strict as assert } from "node:assert";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import { createWorkspaceSloDashboard } from "@/features/projects/workspace-slo-dashboard";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

const generatedAt = "2026-05-16T12:00:00.000Z";

const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recentBatches: [],
    snapshotCount: 4,
  },
  snapshots: [
    {
      batchId: "public-slo",
      checkedAt: generatedAt,
      issues: [],
      label: "Public viewer",
      latencyMs: 120,
      path: "/share/launch",
      projectId: "project-1",
      projectName: "Launch Scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "captured",
      screenshotWidth: null,
      sourceKey: "project-1:viewer",
      sourceVersionId: "version-1",
      status: "pass",
      statusCode: 200,
      surface: "public-viewer",
      url: "https://example.test/share/launch",
    },
  ],
  summary: {
    apiPayloadCount: 1,
    appPackageCount: 1,
    embedCount: 1,
    failCount: 1,
    passCount: 3,
    publicViewerCount: 1,
    screenshotCapturedCount: 1,
    screenshotDiffCount: 0,
    screenshotPendingCount: 1,
    totalCount: 4,
    warnCount: 0,
  },
};

const collaborationInbox: ProjectCollaborationInbox = {
  generatedAt,
  notifications: [],
  summary: {
    mentionCount: 0,
    remoteConflictCount: 0,
    resolvedCommentCount: 0,
    reviewRequestCount: 0,
    totalCount: 0,
    urgentCount: 0,
    warningCount: 1,
  },
};

const emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport = {
  attempts: [],
  generatedAt,
  jobs: [
    {
      attempts: 1,
      createdAt: generatedAt,
      id: "email-1",
      lastError: null,
      nextAttemptAt: null,
      notificationId: "notification-1",
      projectId: "project-1",
      recipientEmail: "owner@example.com",
      recipientName: "Owner",
      recipientRole: "owner",
      sentAt: generatedAt,
      source: "project-health",
      status: "sent",
      subject: "Launch Scene: Health",
      topic: "health",
      updatedAt: generatedAt,
    },
    {
      attempts: 0,
      createdAt: generatedAt,
      id: "email-2",
      lastError: null,
      nextAttemptAt: generatedAt,
      notificationId: "notification-2",
      projectId: "project-1",
      recipientEmail: "admin@example.com",
      recipientName: "Admin",
      recipientRole: "admin",
      sentAt: null,
      source: "collaboration-inbox",
      status: "pending",
      subject: "Launch Scene: Review",
      topic: "review",
      updatedAt: generatedAt,
    },
  ],
  summary: {
    failedCount: 0,
    pendingCount: 1,
    sentCount: 1,
    skippedCount: 0,
    totalCount: 2,
  },
};

const cadConversionQueueReport: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 0,
    queuedCount: 1,
    retryableCount: 0,
    runningCount: 0,
    succeededCount: 3,
    totalCount: 4,
  },
};

const dashboard = createWorkspaceSloDashboard({
  cadConversionQueueReport,
  collaborationInbox,
  collaborationOperationBatches: [
    {
      batchId: "batch-1",
      createdAt: generatedAt,
      operationCount: 4,
      projectId: "project-1",
      userEmail: "editor@example.com",
      userId: "editor",
      userName: "Editor",
    },
    {
      batchId: "batch-2",
      createdAt: generatedAt,
      operationCount: 2,
      projectId: "project-1",
      userEmail: "owner@example.com",
      userId: "owner",
      userName: "Owner",
    },
  ],
  collaborationRuntimeHealth: {
    activeProjectCount: 1,
    activeSocketCount: 1,
    broadcastMessagesSent: 4,
    closedSocketCount: 0,
    config: {
      activeFanOutMs: 25,
      activeFanOutRefreshes: 2,
      idleFanOutMs: 100,
      port: 4321,
    },
    directMessagesSent: 2,
    fanOutBatchRefreshCount: 1,
    fanOutRefreshCount: 1,
    lastError: null,
    openedSocketCount: 2,
    operationBatchesSent: 2,
    operationBatchMessagesSent: 2,
    projects: [{ projectId: "project-1", socketCount: 1 }],
    rejectedSocketCount: 0,
    startedAt: generatedAt,
    status: "ready",
    uptimeMs: 12000,
  },
  collaborationWebSocketConfigured: true,
  emailDeliveryReport,
  generatedAt,
  publicSurfaceHealthReport,
});

assert.equal(dashboard.rows.length, 4);
assert.equal(dashboard.summary.breachCount, 1);
assert.equal(dashboard.summary.watchCount, 2);
assert.equal(dashboard.summary.healthyCount, 1);
assert.equal(dashboard.summary.worstStatus, "breach");
assert.equal(dashboard.rows[0]?.id, "public-surfaces");

const publicRow = dashboard.rows.find((row) => row.id === "public-surfaces");
const collaborationRow = dashboard.rows.find((row) => row.id === "collaboration-runtime");
const emailRow = dashboard.rows.find((row) => row.id === "email-delivery");
const cadRow = dashboard.rows.find((row) => row.id === "cad-workers");

assert.equal(publicRow?.observedPct, 75);
assert.equal(publicRow?.status, "breach");
assert.equal(collaborationRow?.status, "healthy");
assert.equal(emailRow?.status, "watch");
assert.equal(cadRow?.status, "watch");
assert.equal(cadRow?.observedPct, 100);

const noDataDashboard = createWorkspaceSloDashboard({
  cadConversionQueueReport: {
    ...cadConversionQueueReport,
    summary: {
      failedCount: 0,
      queuedCount: 0,
      retryableCount: 0,
      runningCount: 0,
      succeededCount: 0,
      totalCount: 0,
    },
  },
  collaborationInbox: {
    ...collaborationInbox,
    summary: {
      mentionCount: 0,
      remoteConflictCount: 0,
      resolvedCommentCount: 0,
      reviewRequestCount: 0,
      totalCount: 0,
      urgentCount: 0,
      warningCount: 0,
    },
  },
  collaborationOperationBatches: [],
  emailDeliveryReport: {
    ...emailDeliveryReport,
    jobs: [],
    summary: {
      failedCount: 0,
      pendingCount: 0,
      sentCount: 0,
      skippedCount: 0,
      totalCount: 0,
    },
  },
  generatedAt,
  publicSurfaceHealthReport: {
    ...publicSurfaceHealthReport,
    snapshots: [],
    summary: {
      apiPayloadCount: 0,
      appPackageCount: 0,
      embedCount: 0,
      failCount: 0,
      passCount: 0,
      publicViewerCount: 0,
      screenshotCapturedCount: 0,
      screenshotDiffCount: 0,
      screenshotPendingCount: 0,
      totalCount: 0,
      warnCount: 0,
    },
  },
});

assert.equal(noDataDashboard.summary.noDataCount, 4);
assert.equal(noDataDashboard.summary.overallScore, 0);

console.log("workspace slo dashboard smoke passed");
