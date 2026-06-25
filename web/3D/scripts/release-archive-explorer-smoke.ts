import { strict as assert } from "node:assert";
import { createReleaseArchiveExplorerReport } from "@/features/projects/release-archive-explorer";
import type { FreeTierResourceMonitorReport } from "@/features/projects/free-tier-resource-monitor";
import type { ProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { ReleaseDrillHistoryReport } from "@/features/projects/release-drill-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceBackupRestoreRehearsalReport } from "@/features/projects/workspace-backup-restore-rehearsal";

const generatedAt = "2026-05-16T06:30:00.000Z";

const releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary = {
  auditEventCount: 20,
  cadJobCount: 2,
  certificateRecordCount: 3,
  complianceReportCount: 4,
  fileCount: 10,
  highPriorityActionCount: 0,
  projectCount: 4,
  publicSurfaceSnapshotCount: 5,
  releaseBlockerCount: 0,
  riskLevel: "healthy",
  riskScore: 92,
  runbookRecordCount: 6,
  totalByteSize: 20480,
};

const incidentPostmortemReport: ProjectIncidentPostmortemReport = {
  generatedAt,
  summary: {
    blockedCount: 0,
    completedRemediationCount: 3,
    criticalTemplateCount: 1,
    failedSmokeCheckCount: 1,
    linkedDrillCount: 2,
    readyCount: 2,
    templateCount: 2,
    watchCount: 0,
  },
  templates: [],
};

const releaseDrillHistory: ReleaseDrillHistoryReport = {
  records: [],
  summary: {
    actorCount: 2,
    blockedRunCount: 0,
    latestContentHash: "sha256:drill-history",
    latestSavedAt: "2026-05-16T06:00:00.000Z",
    readyRunCount: 7,
    totalDrillCount: 8,
    totalRecordCount: 2,
    watchRunCount: 1,
  },
};

const backupRestoreRehearsal: WorkspaceBackupRestoreRehearsalReport = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 0,
    readyCount: 5,
    score: 100,
    totalCount: 5,
    watchCount: 0,
    worstStatus: "ready",
  },
  workspaceName: "Design Ops",
};

const freeTierResourceMonitor: FreeTierResourceMonitorReport = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 0,
    readyCount: 4,
    totalCount: 5,
    watchCount: 1,
    weightedUsagePercent: 44,
    worstStatus: "watch",
  },
};

const readyReport = createReleaseArchiveExplorerReport({
  backupRestoreRehearsal,
  freeTierResourceMonitor,
  generatedAt,
  hasReleaseEvidenceBundleDownload: true,
  incidentPostmortemReport,
  releaseDrillHistory,
  releaseEvidenceBundleSummary,
  workspaceId: "workspace-1",
});

assert.equal(readyReport.summary.totalCount, 5);
assert.equal(readyReport.summary.readyCount, 3);
assert.equal(readyReport.summary.watchCount, 2);
assert.equal(readyReport.summary.blockedCount, 0);
assert.equal(readyReport.summary.worstStatus, "watch");
assert.equal(readyReport.summary.governanceScore, 86);
assert.equal(readyReport.summary.downloadableCount, 2);
assert.equal(readyReport.summary.latestActivityAt, "2026-05-16T06:30:00.000Z");
assert.equal(readyReport.rows.find((row) => row.id === "release-evidence-bundles")?.downloadHref, "/api/workspaces/workspace-1/release-evidence-bundle");
assert.equal(readyReport.rows.find((row) => row.id === "release-drill-history")?.downloadHref, "/api/workspaces/workspace-1/release-drill-history");

const blockedReport = createReleaseArchiveExplorerReport({
  backupRestoreRehearsal: {
    ...backupRestoreRehearsal,
    summary: {
      ...backupRestoreRehearsal.summary,
      blockedCount: 1,
      score: 80,
      worstStatus: "blocked",
    },
  },
  freeTierResourceMonitor: {
    ...freeTierResourceMonitor,
    summary: {
      ...freeTierResourceMonitor.summary,
      blockedCount: 1,
      worstStatus: "blocked",
    },
  },
  generatedAt,
  hasReleaseEvidenceBundleDownload: false,
  incidentPostmortemReport: {
    ...incidentPostmortemReport,
    summary: {
      ...incidentPostmortemReport.summary,
      blockedCount: 1,
      readyCount: 1,
    },
  },
  releaseDrillHistory: {
    ...releaseDrillHistory,
    summary: {
      ...releaseDrillHistory.summary,
      blockedRunCount: 1,
    },
  },
  releaseEvidenceBundleSummary: {
    ...releaseEvidenceBundleSummary,
    releaseBlockerCount: 2,
  },
  workspaceId: "workspace-1",
});

assert.equal(blockedReport.summary.blockedCount, 5);
assert.equal(blockedReport.summary.readyCount, 0);
assert.equal(blockedReport.summary.watchCount, 0);
assert.equal(blockedReport.summary.worstStatus, "blocked");
assert.equal(blockedReport.summary.governanceScore, 0);
assert.equal(blockedReport.summary.downloadableCount, 1);
assert.match(blockedReport.rows.find((row) => row.id === "release-evidence-bundles")?.nextAction ?? "", /Reduce release blockers/);

const missingDrillReport = createReleaseArchiveExplorerReport({
  backupRestoreRehearsal,
  freeTierResourceMonitor,
  generatedAt,
  hasReleaseEvidenceBundleDownload: true,
  incidentPostmortemReport,
  releaseDrillHistory: null,
  releaseEvidenceBundleSummary,
  workspaceId: "workspace-1",
});

assert.equal(missingDrillReport.rows.find((row) => row.id === "release-drill-history")?.status, "watch");
assert.equal(missingDrillReport.rows.find((row) => row.id === "release-drill-history")?.recordCount, 0);
assert.equal(missingDrillReport.summary.watchCount, 2);

console.log("release archive explorer smoke passed");
