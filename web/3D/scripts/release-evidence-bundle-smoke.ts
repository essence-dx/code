import { strict as assert } from "node:assert";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectComplianceReport } from "@/features/projects/project-compliance-report";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import {
  createReleaseEvidenceBundle,
  createReleaseEvidenceBundleDownload,
  createReleaseEvidenceBundlePreview,
} from "@/features/projects/release-evidence-bundle";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-05-16T23:00:00.000Z";
const riskDigest: WorkspaceRiskDigestReport = {
  actionItems: [
    {
      detail: "Public viewer and signing blockers need release-owner review.",
      evidenceCount: 2,
      id: "release-blockers",
      label: "Resolve release blockers",
      priority: "high",
      source: "trust",
    },
  ],
  audit: {
    dangerCount: 1,
    newestAt: generatedAt,
    rows: [
      {
        action: "release.bundle_requested",
        actorEmail: "owner@example.com",
        actorName: "Owner",
        category: "releases",
        description: "Release evidence bundle was requested.",
        eventId: "audit-1",
        id: "project-1:audit-1",
        occurredAt: generatedAt,
        projectId: "project-1",
        projectName: "Launch Scene",
        resourceId: "bundle",
        resourceType: "releaseEvidenceBundle",
        status: "danger",
        title: "Bundle requested",
      },
    ],
    totalCount: 1,
    warningCount: 0,
  },
  generatedAt,
  incidents: {
    criticalCount: 1,
    incidents: [],
    totalCount: 1,
    warningCount: 0,
  },
  packetId: "risk-digest-workspace-20260516",
  publicHealth: {
    failedCount: 1,
    snapshotDiffCount: 0,
    snapshots: [],
    totalCount: 1,
    warningCount: 0,
  },
  riskLevel: "critical",
  runbook: {
    blockedCount: 1,
    nextDueAt: generatedAt,
    records: [],
    totalCount: 1,
  },
  schemaVersion: 1,
  score: 40,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 1,
    trustScore: 62,
  },
  workspace: {
    id: "workspace-1",
    name: "Launch Workspace",
    role: "owner",
  },
};
const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recentBatches: [],
    snapshotCount: 1,
  },
  snapshots: [
    {
      batchId: "batch-1",
      checkedAt: generatedAt,
      issues: ["Viewer returned 500."],
      label: "Public viewer",
      latencyMs: null,
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
      screenshotState: "unavailable",
      screenshotWidth: null,
      sourceKey: "project-1:viewer",
      sourceVersionId: "version-1",
      status: "fail",
      statusCode: 500,
      surface: "public-viewer",
      url: "https://example.test/share/launch",
    },
  ],
  summary: {
    apiPayloadCount: 0,
    appPackageCount: 0,
    embedCount: 0,
    failCount: 1,
    passCount: 0,
    publicViewerCount: 1,
    screenshotCapturedCount: 0,
    screenshotDiffCount: 0,
    screenshotPendingCount: 0,
    totalCount: 1,
    warnCount: 0,
  },
};
const runbookReport: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 1,
  },
  records: [
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "runbook-1",
      blockerCount: 1,
      checklistEvidence: ["Resolve viewer failure."],
      comments: [],
      completedAt: null,
      detail: "Public viewer must recover before launch.",
      dueAt: generatedAt,
      milestoneId: "milestone-1",
      ownerEmail: "owner@example.com",
      ownerName: "Owner",
      ownerUserId: "owner",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "project-1:viewer",
      status: "blocked",
      title: "Viewer handoff",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 0,
    inProgressCount: 0,
    nextDueAt: generatedAt,
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 1,
  },
};
const certificateReport: ProjectAppPackageCertificateReport = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 1,
    expiredCount: 0,
    expiringCount: 0,
    missingCount: 1,
    mismatchCount: 0,
    nativeBundleCount: 1,
    readyCount: 0,
    revokedCount: 0,
    totalRequiredCount: 1,
    validCount: 0,
  },
};
const cadConversionQueueReport: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 0,
    queuedCount: 0,
    retryableCount: 0,
    runningCount: 0,
    succeededCount: 0,
    totalCount: 0,
  },
};
const complianceReport = {
  generatedAt,
  project: {
    id: "project-1",
    name: "Launch Scene",
  },
  schemaVersion: 1,
} as ProjectComplianceReport;

const preview = createReleaseEvidenceBundlePreview({
  cadConversionQueueReport,
  certificateReport,
  complianceReportCount: 1,
  projectCount: 1,
  publicSurfaceHealthReport,
  riskDigest,
  runbookReport,
});

assert.equal(preview.fileCount, 7);
assert.equal(preview.certificateRecordCount, 1);
assert.equal(preview.releaseBlockerCount, 4);

const bundle = createReleaseEvidenceBundle({
  cadConversionQueueReport,
  certificateReport,
  complianceReports: [complianceReport],
  generatedAt,
  projectCount: 1,
  publicSurfaceHealthReport,
  riskDigest,
  runbookReport,
});

assert.equal(bundle.schemaVersion, 1);
assert.equal(bundle.summary.fileCount, 7);
assert.equal(bundle.summary.totalByteSize > 0, true);
assert.equal(bundle.files.every((file) => /^sha256:[a-f0-9]{64}$/.test(file.contentHash)), true);
assert.equal(bundle.files.some((file) => file.path === "risk/audit-events.csv" && file.body.includes("release.bundle_requested")), true);
assert.equal(bundle.files.some((file) => file.path.startsWith("compliance/project-1-")), true);

const download = createReleaseEvidenceBundleDownload(bundle);

assert.equal(download.fileName, "release-evidence-launch-workspace-workspace-1-20260516.json");
assert.match(download.body, /public-surface-health-snapshots/);
assert.match(download.contentHash, /^sha256:[a-f0-9]{64}$/);

console.log("release evidence bundle smoke passed");
