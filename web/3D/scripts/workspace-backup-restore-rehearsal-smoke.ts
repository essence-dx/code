import { strict as assert } from "node:assert";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createDefaultProjectAuditSearchFilters, type ProjectAuditSearchResult } from "@/features/projects/project-audit-search";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import { createWorkspaceBackupRestoreRehearsalReport } from "@/features/projects/workspace-backup-restore-rehearsal";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-05-16T18:00:00.000Z";

const artifactReport: ProjectArtifactRegistryReport = {
  entries: [],
  generatedAt,
  summary: {
    availableCount: 2,
    blockedCount: 0,
    complianceExportCount: 1,
    draftCount: 0,
    lineageSnapshotCount: 1,
    privateCount: 1,
    publicAssetCount: 1,
    publicCount: 1,
    signedBundleCount: 0,
    totalCount: 2,
  },
};

const auditResult: ProjectAuditSearchResult = {
  filters: createDefaultProjectAuditSearchFilters(),
  rows: [
    {
      action: "publish",
      actorEmail: "release@example.com",
      actorName: "Release owner",
      category: "publishing",
      description: "Public link published.",
      eventId: "event-1",
      id: "project-1:event-1",
      occurredAt: generatedAt,
      projectId: "project-1",
      projectName: "Launch Scene",
      resourceId: "share-1",
      resourceType: "share",
      status: "success",
      title: "Published scene",
    },
  ],
  summary: {
    categoryCounts: {
      comments: 0,
      exports: 0,
      permissions: 0,
      publishing: 1,
      releases: 0,
      versions: 0,
    },
    newestAt: generatedAt,
    oldestAt: generatedAt,
    projectCount: 1,
    statusCounts: {
      danger: 0,
      info: 0,
      success: 1,
      warning: 0,
    },
    total: 1,
  },
};

const runbookReport: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 1,
  },
  records: [],
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

const evidenceSummary: ReleaseEvidenceBundleSummary = {
  auditEventCount: 1,
  cadJobCount: 0,
  certificateRecordCount: 0,
  complianceReportCount: 1,
  fileCount: 7,
  highPriorityActionCount: 0,
  projectCount: 1,
  publicSurfaceSnapshotCount: 1,
  releaseBlockerCount: 0,
  riskLevel: "healthy",
  riskScore: 96,
  runbookRecordCount: 1,
  totalByteSize: 2048,
};

const readyReport = createWorkspaceBackupRestoreRehearsalReport({
  artifactRegistryReport: artifactReport,
  auditSearchResult: auditResult,
  generatedAt,
  projectCount: 1,
  releaseEvidenceBundleSummary: evidenceSummary,
  releaseRunbookReport: runbookReport,
  workspaceName: "Launch Workspace",
});

assert.equal(readyReport.summary.score, 100);
assert.equal(readyReport.summary.readyCount, 5);
assert.equal(readyReport.summary.worstStatus, "ready");
assert.equal(readyReport.rows.find((row) => row.id === "evidence-packets")?.sourceCount, 7);

const blockedReport = createWorkspaceBackupRestoreRehearsalReport({
  artifactRegistryReport: {
    ...artifactReport,
    summary: {
      ...artifactReport.summary,
      availableCount: 1,
      blockedCount: 1,
    },
  },
  auditSearchResult: {
    ...auditResult,
    summary: {
      ...auditResult.summary,
      statusCounts: {
        danger: 1,
        info: 0,
        success: 0,
        warning: 1,
      },
      total: 2,
    },
  },
  generatedAt,
  projectCount: 1,
  releaseEvidenceBundleSummary: {
    ...evidenceSummary,
    releaseBlockerCount: 2,
    riskLevel: "critical",
    riskScore: 42,
  },
  releaseRunbookReport: {
    ...runbookReport,
    summary: {
      ...runbookReport.summary,
      blockedCount: 1,
      completeCount: 0,
      nextDueAt: generatedAt,
    },
  },
  workspaceName: "Launch Workspace",
});

assert.equal(blockedReport.summary.blockedCount, 3);
assert.equal(blockedReport.summary.watchCount, 1);
assert.equal(blockedReport.summary.worstStatus, "blocked");
assert.equal(blockedReport.rows.find((row) => row.id === "audit-logs")?.status, "watch");
assert.equal(blockedReport.rows.find((row) => row.id === "assets")?.status, "blocked");

const missingEvidenceReport = createWorkspaceBackupRestoreRehearsalReport({
  artifactRegistryReport: artifactReport,
  auditSearchResult: {
    ...auditResult,
    rows: [],
    summary: {
      ...auditResult.summary,
      projectCount: 0,
      statusCounts: {
        danger: 0,
        info: 0,
        success: 0,
        warning: 0,
      },
      total: 0,
    },
  },
  generatedAt,
  projectCount: 0,
  releaseEvidenceBundleSummary: {
    ...evidenceSummary,
    fileCount: 0,
    projectCount: 0,
  },
  releaseRunbookReport: runbookReport,
  workspaceName: "Empty Workspace",
});

assert.equal(missingEvidenceReport.rows.find((row) => row.id === "projects")?.status, "watch");
assert.equal(missingEvidenceReport.rows.find((row) => row.id === "audit-logs")?.status, "blocked");
assert.equal(missingEvidenceReport.rows.find((row) => row.id === "evidence-packets")?.status, "watch");

console.log("workspace backup restore rehearsal smoke passed");
