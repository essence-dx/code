import { strict as assert } from "node:assert";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import { createProjectCadConversionQueueReport, type ProjectCadConversionJobRecord } from "@/features/projects/cad-conversion-worker";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ProjectPublicSurfaceHealthReport, ProjectPublicSurfaceHealthSnapshot } from "@/features/projects/public-surface-health";
import { createProjectRegressionWatchlist } from "@/features/projects/regression-watchlist";

const generatedAt = "2026-05-16T22:45:00.000Z";

function publicSnapshot(input: Partial<ProjectPublicSurfaceHealthSnapshot> & Pick<ProjectPublicSurfaceHealthSnapshot, "batchId" | "checkedAt" | "sourceKey">): ProjectPublicSurfaceHealthSnapshot {
  return {
    batchId: input.batchId,
    checkedAt: input.checkedAt,
    issues: input.issues ?? [],
    label: input.label ?? "Public API helper",
    latencyMs: input.latencyMs ?? 120,
    path: input.path ?? "/api/public/scenes/share-watch/code",
    projectId: input.projectId ?? "project-watch",
    projectName: input.projectName ?? "Watch scene",
    screenshotArtifactId: input.screenshotArtifactId ?? null,
    screenshotByteSize: input.screenshotByteSize ?? null,
    screenshotCapturedAt: input.screenshotCapturedAt ?? null,
    screenshotDiffScore: input.screenshotDiffScore ?? null,
    screenshotDiffSummary: input.screenshotDiffSummary ?? null,
    screenshotHash: input.screenshotHash ?? null,
    screenshotHeight: input.screenshotHeight ?? null,
    screenshotPath: input.screenshotPath ?? null,
    screenshotState: input.screenshotState ?? "not-applicable",
    screenshotWidth: input.screenshotWidth ?? null,
    sourceKey: input.sourceKey,
    sourceVersionId: input.sourceVersionId ?? "version-watch",
    status: input.status ?? "fail",
    statusCode: input.statusCode ?? 500,
    surface: input.surface ?? "api-payload",
    url: input.url ?? "https://essence-spline.example.com/api/public/scenes/share-watch/code",
    workspaceId: input.workspaceId ?? "workspace-watch",
  };
}

const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 2,
    recentBatches: [],
    snapshotCount: 2,
  },
  snapshots: [
    publicSnapshot({
      batchId: "batch-1",
      checkedAt: "2026-05-16T22:20:00.000Z",
      issues: ["API helper returned 500."],
      sourceKey: "project-watch:api:helper:1",
    }),
    publicSnapshot({
      batchId: "batch-2",
      checkedAt: "2026-05-16T22:40:00.000Z",
      issues: ["API helper returned 500 again."],
      sourceKey: "project-watch:api:helper:2",
    }),
  ],
  summary: {
    apiPayloadCount: 2,
    appPackageCount: 0,
    embedCount: 0,
    failCount: 2,
    passCount: 0,
    publicViewerCount: 0,
    screenshotCapturedCount: 0,
    screenshotDiffCount: 0,
    screenshotPendingCount: 0,
    totalCount: 2,
    warnCount: 0,
  },
};

const cadJob: ProjectCadConversionJobRecord = {
  adapterId: "freecad",
  attempts: 2,
  command: "freecadcmd .\\scripts\\cad\\freecad-mesh-export.py gearbox.step gearbox.stl",
  diagnostics: {} as ProjectCadConversionJobRecord["diagnostics"],
  errorMessage: "FreeCAD exited before writing the STL output.",
  finishedAt: "2026-05-16T22:38:00.000Z",
  id: "cad-job-watch",
  logs: [
    {
      at: "2026-05-16T22:21:00.000Z",
      level: "warning",
      message: "Retryable worker startup failure.",
    },
    {
      at: "2026-05-16T22:38:00.000Z",
      level: "error",
      message: "FreeCAD exited before writing the STL output.",
    },
  ],
  maxAttempts: 2,
  metadata: null,
  nextAttemptAt: null,
  outputFileName: "gearbox.stl",
  projectId: "project-watch",
  projectName: "Watch scene",
  queuedAt: "2026-05-16T22:20:00.000Z",
  resultPath: null,
  sourceBytes: 4_200_000,
  sourceFileName: "gearbox.step",
  sourceKind: "native-cad",
  startedAt: "2026-05-16T22:35:00.000Z",
  status: "failed",
  target: "stl",
  updatedAt: "2026-05-16T22:38:00.000Z",
  workspaceId: "workspace-watch",
};

const certificateReport: ProjectAppPackageCertificateReport = {
  generatedAt,
  rows: [
    {
      artifactId: "artifact-windows",
      certificate: null,
      expiresAt: null,
      issue: "No signing certificate has been ingested for this package/platform.",
      label: "Windows installer",
      platform: "windows",
      presetId: "signed-tauri",
      presetLabel: "Signed Tauri desktop app",
      projectId: "project-watch",
      projectName: "Watch scene",
      sourceKey: "signed-tauri:windows",
      sourceVersionId: "version-watch",
      status: "missing",
    },
    {
      artifactId: "artifact-android",
      certificate: null,
      expiresAt: "2026-05-25T00:00:00.000Z",
      issue: "Certificate expires within 30 days.",
      label: "Android AAB",
      platform: "android",
      presetId: "android-aab",
      presetLabel: "Android AAB",
      projectId: "project-watch",
      projectName: "Watch scene",
      sourceKey: "android-aab:android",
      sourceVersionId: "version-watch",
      status: "expiring",
    },
    {
      artifactId: "artifact-vision",
      certificate: null,
      expiresAt: "2026-05-01T00:00:00.000Z",
      issue: "Certificate has expired.",
      label: "visionOS preview",
      platform: "visionos",
      presetId: "visionos-preview",
      presetLabel: "visionOS preview",
      projectId: "project-watch",
      projectName: "Watch scene",
      sourceKey: "visionos-preview:visionos",
      sourceVersionId: "version-watch",
      status: "expired",
    },
  ],
  summary: {
    blockedCount: 2,
    expiredCount: 1,
    expiringCount: 1,
    missingCount: 1,
    mismatchCount: 0,
    nativeBundleCount: 3,
    readyCount: 1,
    revokedCount: 0,
    totalRequiredCount: 3,
    validCount: 0,
  },
};

const incidentHistory: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["Viewer route returned 500."],
      id: "incident-1",
      kind: "post-deploy-failure",
      message: "Viewer route failed after deployment.",
      occurredAt: "2026-05-16T22:18:00.000Z",
      projectId: "project-watch",
      projectName: "Watch scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["Viewer route returned 502."],
      id: "incident-2",
      kind: "post-deploy-failure",
      message: "Viewer route failed again after deployment.",
      occurredAt: "2026-05-16T22:42:00.000Z",
      projectId: "project-watch",
      projectName: "Watch scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 2,
    failedExportCount: 0,
    impactedProjectCount: 1,
    postDeployFailureCount: 2,
    totalCount: 2,
    warningCount: 0,
  },
};

const report = createProjectRegressionWatchlist({
  cadConversionQueueReport: createProjectCadConversionQueueReport([cadJob], generatedAt),
  certificateReport,
  generatedAt,
  incidentHistory,
  publicSurfaceHealthReport,
});

assert.equal(report.summary.totalCount, 6);
assert.equal(report.summary.publicSurfaceCount, 1);
assert.equal(report.summary.cadConversionCount, 1);
assert.equal(report.summary.signingCount, 3);
assert.equal(report.summary.incidentCount, 1);
assert.equal(report.summary.affectedProjectCount, 1);
assert.equal(report.summary.recurringCount, 3);
assert.equal(report.summary.watchCount, 1);
assert.ok(report.summary.criticalCount >= 3);
assert.equal(report.items[0]?.severity, "critical");
assert.equal(report.items.some((item) => item.source === "public-surface" && item.trend === "recurring"), true);
assert.equal(report.items.some((item) => item.source === "cad-conversion" && item.severity === "critical"), true);
assert.equal(report.items.some((item) => item.source === "signing" && item.trend === "watch"), true);

console.log("regression watchlist smoke passed");
