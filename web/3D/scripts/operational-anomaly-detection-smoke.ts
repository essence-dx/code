import { strict as assert } from "node:assert";
import { createOperationalAnomalyDetectionReport } from "@/features/projects/operational-anomaly-detection";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { ReleaseReadinessWebhookHistoryReport } from "@/features/projects/release-readiness-webhook-history";
import type { ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";
import type { WorkspaceSloDashboard } from "@/features/projects/workspace-slo-dashboard";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

const generatedAt = "2026-05-16T18:00:00.000Z";

const workspaceSloDashboard: WorkspaceSloDashboard = {
  generatedAt,
  rows: [
    {
      detail: "6 operation batches, 2 remote review signals, WebSocket endpoint configured.",
      errorBudgetUsedPct: 120,
      failingCount: 3,
      id: "collaboration-runtime",
      label: "Collaboration runtime",
      lastObservedAt: "2026-05-16T17:59:00.000Z",
      nextAction: "Inspect collaboration transport health and review-gated remote batches.",
      observedPct: 75,
      pendingCount: 2,
      sampleCount: 12,
      status: "breach",
      targetPct: 99.5,
    },
  ],
  summary: {
    breachCount: 1,
    healthyCount: 0,
    noDataCount: 0,
    overallScore: 75,
    watchCount: 0,
    worstStatus: "breach",
  },
};

const releaseReadinessWebhooks: ReleaseReadinessWebhookReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "webhooks.csv",
  generatedAt,
  rows: [
    {
      dedupeKey: "brevo:delivery.failed:auditor@example.com",
      eventType: "delivery.failed",
      evidence: "Brevo delivery failed for auditor@example.com; webhook trust is untrusted.",
      nextAction: "Verify Brevo sender, retry delivery, and rotate webhook secret if needed.",
      payloadDigest: "sha256:brevo",
      provider: "brevo",
      receivedAt: "2026-05-16T17:55:00.000Z",
      severity: "critical",
      signatureState: "untrusted",
      status: "blocked",
      subject: "auditor@example.com",
      surface: "email",
    },
  ],
  summary: {
    blockedCount: 1,
    missingProviderCount: 1,
    providerCoverage: {
      brevo: 1,
      "desktop-updater": 0,
      turso: 0,
      vercel: 0,
    },
    readinessScore: 25,
    readyCount: 0,
    status: "blocked",
    totalCount: 1,
    watchCount: 0,
  },
};

const webhookHistory: ReleaseReadinessWebhookHistoryReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "webhook-history.csv",
  entries: [],
  generatedAt,
  releaseReadiness: releaseReadinessWebhooks,
  summary: {
    acceptedCount: 1,
    exhaustedRetryCount: 1,
    providerRetryEvidence: {
      brevo: {
        acceptedCount: 1,
        exhaustedRetryCount: 1,
        latestReceivedAt: "2026-05-16T17:55:00.000Z",
        replayRejectedCount: 1,
        retryingCount: 2,
        totalCount: 4,
      },
      "desktop-updater": {
        acceptedCount: 0,
        exhaustedRetryCount: 0,
        latestReceivedAt: null,
        replayRejectedCount: 0,
        retryingCount: 0,
        totalCount: 0,
      },
      turso: {
        acceptedCount: 0,
        exhaustedRetryCount: 0,
        latestReceivedAt: null,
        replayRejectedCount: 0,
        retryingCount: 0,
        totalCount: 0,
      },
      vercel: {
        acceptedCount: 0,
        exhaustedRetryCount: 0,
        latestReceivedAt: null,
        replayRejectedCount: 0,
        retryingCount: 0,
        totalCount: 0,
      },
    },
    readinessStatus: "blocked",
    replayRejectedCount: 1,
    retryingCount: 2,
    totalCount: 4,
    trustedSignatureCount: 0,
  },
};

const emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport = {
  attempts: [
    {
      attemptedAt: "2026-05-16T17:50:00.000Z",
      attemptNumber: 3,
      deliveryId: "email-1",
      error: "Brevo rejected sender identity.",
      id: "attempt-1",
      providerMessageId: null,
      status: "failed",
    },
  ],
  generatedAt,
  jobs: [
    {
      attempts: 3,
      createdAt: "2026-05-16T17:00:00.000Z",
      id: "email-1",
      lastError: "Brevo rejected sender identity.",
      nextAttemptAt: null,
      notificationId: "notification-1",
      projectId: "project-1",
      recipientEmail: "auditor@example.com",
      recipientName: "Auditor",
      recipientRole: "admin",
      sentAt: null,
      source: "project-health",
      status: "failed",
      subject: "Project health alert",
      topic: "health",
      updatedAt: "2026-05-16T17:50:00.000Z",
    },
  ],
  summary: {
    failedCount: 1,
    pendingCount: 3,
    sentCount: 5,
    skippedCount: 0,
    totalCount: 9,
  },
};

const cadConversionQueueReport: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 1,
    queuedCount: 2,
    retryableCount: 1,
    runningCount: 1,
    succeededCount: 4,
    totalCount: 9,
  },
};

const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 2,
    recentBatches: [],
    snapshotCount: 3,
  },
  snapshots: [
    {
      batchId: "batch-1",
      checkedAt: "2026-05-16T17:40:00.000Z",
      id: "surface-1",
      issues: ["Embed returned 500."],
      label: "Public embed",
      latencyMs: 3200,
      path: "/embed/project-1",
      projectId: "project-1",
      projectName: "Launch scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "unavailable",
      screenshotWidth: null,
      sourceKey: "embed:project-1",
      sourceVersionId: "version-1",
      status: "fail",
      statusCode: 500,
      surface: "embed",
      url: "https://essence-spline.example/embed/project-1",
      workspaceId: "workspace-1",
    },
    {
      batchId: "batch-1",
      checkedAt: "2026-05-16T17:41:00.000Z",
      id: "surface-2",
      issues: ["Screenshot is still pending."],
      label: "App package",
      latencyMs: 900,
      path: "/app/project-1",
      projectId: "project-1",
      projectName: "Launch scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "pending",
      screenshotWidth: null,
      sourceKey: "app-package:project-1",
      sourceVersionId: "version-1",
      status: "warn",
      statusCode: 200,
      surface: "app-package",
      url: "https://essence-spline.example/app/project-1",
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    apiPayloadCount: 0,
    appPackageCount: 1,
    embedCount: 1,
    failCount: 1,
    passCount: 0,
    publicViewerCount: 0,
    screenshotCapturedCount: 0,
    screenshotDiffCount: 0,
    screenshotPendingCount: 1,
    totalCount: 2,
    warnCount: 1,
  },
};

const report = createOperationalAnomalyDetectionReport({
  cadConversionQueueReport,
  emailDeliveryReport,
  generatedAt,
  publicSurfaceHealthReport,
  releaseReadinessWebhookHistory: webhookHistory,
  releaseReadinessWebhooks,
  workspaceId: "workspace-1",
  workspaceSloDashboard,
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.sourceCoverage.length, 6);
assert.equal(report.rows.some((row) => row.id === "collaboration-runtime:slo-breach"), true);
assert.equal(report.rows.some((row) => row.id === "email-delivery:failed-jobs"), true);
assert.equal(report.rows.some((row) => row.id === "cad-workers:failed-jobs"), true);
assert.equal(report.rows.some((row) => row.id === "public-surfaces:failed-checks"), true);
assert.equal(report.rows.some((row) => row.id === "webhook-delivery:retry-evidence"), true);
assert.equal(report.rows.some((row) => row.id === "correlation:email-webhook-delivery"), true);
assert.ok(report.summary.criticalCount >= 5);
assert.ok(report.summary.anomalyScore < 60);
assert.match(report.csvContent, /anomaly_id,source,severity,label,affected_count,confidence,observed_at,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);
assert.equal(report.csvFileName, "workspace-1-operational-anomalies.csv");

console.log("operational anomaly detection smoke passed");
