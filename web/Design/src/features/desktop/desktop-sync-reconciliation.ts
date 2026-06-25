import {
  createDesktopSyncConflictDiffs,
  createDesktopSyncStaleAssetRepairs,
} from "@/features/desktop/desktop-sync-reconciliation-diffs";
import { createDesktopSyncReconciliationPacket } from "@/features/desktop/desktop-sync-reconciliation-packet";
import {
  createDesktopSyncAuditTrail,
  createDesktopSyncNextActions,
  createDesktopSyncRecoveryChoices,
} from "@/features/desktop/desktop-sync-reconciliation-recovery";
import type {
  CreateDesktopSyncReconciliationCenterInput,
  DesktopSyncReconciliationCenter,
} from "@/features/desktop/desktop-sync-reconciliation-types";
import {
  aggregateDesktopSyncStatus,
  createOfflineConflictProjectIds,
  createProjectManifestRecordMap,
  normalizeDesktopSyncNow,
  scoreDesktopSyncReconciliation,
  uniqueDesktopSyncValues,
} from "@/features/desktop/desktop-sync-reconciliation-utils";
import {
  createLatestCompletedExportMap,
  createLatestVersionMap,
  groupExportFailures,
  latestTimestamp,
} from "@/features/operations/workspace-backup-restore-utils";

export type {
  CreateDesktopSyncReconciliationCenterInput,
  DesktopSyncAuditTrailItem,
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoice,
  DesktopSyncRecoveryChoiceKind,
  DesktopSyncReconciliationCenter,
  DesktopSyncReconciliationPacket,
  DesktopSyncReconciliationStatus,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation-types";

export function createDesktopSyncReconciliationCenter(
  input: CreateDesktopSyncReconciliationCenterInput,
): DesktopSyncReconciliationCenter {
  const now = normalizeDesktopSyncNow(input.now);
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const latestVersions = createLatestVersionMap(input.projectVersions);
  const latestCompletedExports = createLatestCompletedExportMap(
    input.serverExportJobs,
  );
  const failedExports = groupExportFailures(input.serverExportJobs);
  const manifestRecords = createProjectManifestRecordMap(input.assetAudit);
  const offlineConflictIds = createOfflineConflictProjectIds(
    input.offlineSyncCenter.queue,
  );
  const conflictDiffs = createDesktopSyncConflictDiffs({
    projects: activeProjects,
    latestVersions,
    latestCompletedExports,
    failedExports,
    manifestRecords,
    offlineConflictIds,
  });
  const staleAssetRepairs = createDesktopSyncStaleAssetRepairs({
    projects: activeProjects,
    manifestRecords,
  });
  const auditTrail = createDesktopSyncAuditTrail({
    auditLogs: input.auditLogs,
    affectedProjectIds: uniqueDesktopSyncValues([
      ...conflictDiffs.map((diff) => diff.projectId),
      ...staleAssetRepairs.map((repair) => repair.projectId),
      ...input.serverExportJobs
        .filter((job) => job.status === "failed")
        .map((job) => job.projectId),
    ]),
  });
  const recoveryChoices = createDesktopSyncRecoveryChoices({
    conflictDiffs,
    staleAssetRepairs,
    failedExports: input.serverExportJobs.filter(
      (job) => job.status === "failed",
    ),
    auditTrail,
    activeProjectCount: activeProjects.length,
    offlineSyncCenter: input.offlineSyncCenter,
  });
  const totals = {
    activeProjects: activeProjects.length,
    conflictDiffs: conflictDiffs.length,
    recoveryChoices: recoveryChoices.length,
    staleAssetRepairs: staleAssetRepairs.length,
    auditTrail: auditTrail.length,
    failedExports: input.serverExportJobs.filter(
      (job) => job.status === "failed",
    ).length,
    missingVersions: activeProjects.filter(
      (project) => !latestVersions.has(project.id),
    ).length,
    missingExports: activeProjects.filter(
      (project) => !latestCompletedExports.has(project.id),
    ).length,
    offlineQueueItems: input.offlineSyncCenter.totals.queueItems,
  };
  const status = aggregateDesktopSyncStatus([
    ...conflictDiffs,
    ...staleAssetRepairs,
    ...recoveryChoices,
    {
      status:
        input.offlineSyncCenter.status === "blocked"
          ? "blocked"
          : input.offlineSyncCenter.status === "attention"
            ? "review"
            : "ready",
    },
  ]);
  const score = scoreDesktopSyncReconciliation({
    status,
    conflictDiffs,
    staleAssetRepairs,
    recoveryChoices,
    failedExportCount: totals.failedExports,
    offlineScore: input.offlineSyncCenter.score,
    hasAuditTrail: auditTrail.length > 0 || activeProjects.length === 0,
  });
  const generatedAt = latestTimestamp([
    now.toISOString(),
    ...activeProjects.map((project) => project.updatedAt),
    ...input.projectVersions.map((version) => version.createdAt),
    ...input.serverExportJobs.map((job) => job.updatedAt),
    ...input.serverExportJobs.map((job) => job.completedAt),
    ...input.assetAudit.records.map((record) => record.updatedAt),
    ...input.auditLogs.map((log) => log.createdAt),
  ]);
  const nextActions = createDesktopSyncNextActions(recoveryChoices);
  const packet = createDesktopSyncReconciliationPacket({
    generatedAt,
    status,
    score,
    totals,
    conflictDiffs,
    recoveryChoices,
    staleAssetRepairs,
    auditTrail,
  });

  return {
    status,
    score,
    generatedAt,
    conflictDiffs,
    recoveryChoices,
    staleAssetRepairs,
    auditTrail,
    packet,
    nextActions,
    totals,
  };
}
