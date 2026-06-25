import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type { DesktopOfflineSyncQueueItem } from "@/features/desktop/desktop-offline-sync-center";
import type {
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoice,
  DesktopSyncReconciliationStatus,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation-types";
import { timestamp } from "@/features/operations/workspace-backup-restore-utils";

export const desktopSyncDriftToleranceMs = 60 * 1000;
export const desktopSyncCloudRestoreToleranceMs = 15 * 60 * 1000;
export const desktopSyncLargeManifestBytes = 32 * 1024 * 1024;

export function createProjectManifestRecordMap(audit: AssetLibraryAudit) {
  const records = new Map<string, AssetAuditRecord>();

  for (const record of audit.records) {
    if (record.scope === "projects") {
      records.set(record.id, record);
    }
  }

  return records;
}

export function createOfflineConflictProjectIds(
  queue: DesktopOfflineSyncQueueItem[],
) {
  const projectIds = new Set<string>();

  for (const item of queue) {
    if (item.kind !== "conflict-resolution") continue;

    const hrefId = item.href?.split("/editor/")[1]?.split(/[/?#]/)[0];
    const id = hrefId || item.id.replace(/^conflict-/, "");

    if (id) projectIds.add(id);
  }

  return projectIds;
}

export function aggregateDesktopSyncStatus(
  items: Array<{ status: DesktopSyncReconciliationStatus }>,
): DesktopSyncReconciliationStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

export function scoreDesktopSyncReconciliation(input: {
  status: DesktopSyncReconciliationStatus;
  conflictDiffs: DesktopSyncConflictDiff[];
  staleAssetRepairs: DesktopSyncStaleAssetRepair[];
  recoveryChoices: DesktopSyncRecoveryChoice[];
  failedExportCount: number;
  offlineScore: number;
  hasAuditTrail: boolean;
}) {
  const blockedCount = [
    ...input.conflictDiffs,
    ...input.staleAssetRepairs,
    ...input.recoveryChoices,
  ].filter((item) => item.status === "blocked").length;
  const reviewCount = [
    ...input.conflictDiffs,
    ...input.staleAssetRepairs,
    ...input.recoveryChoices,
  ].filter((item) => item.status === "review").length;
  const offlinePenalty =
    input.offlineScore < 80 ? Math.round((80 - input.offlineScore) / 2) : 0;
  const auditPenalty = input.hasAuditTrail ? 0 : 8;
  const statusFloor =
    input.status === "blocked" ? 20 : input.status === "review" ? 55 : 90;
  const score =
    100 -
    blockedCount * 14 -
    reviewCount * 6 -
    input.failedExportCount * 8 -
    offlinePenalty -
    auditPenalty;

  return Math.max(0, Math.min(100, Math.max(statusFloor, Math.round(score))));
}

export function sortByDesktopSyncStatusThenNewest<
  T extends { status: DesktopSyncReconciliationStatus },
>(items: T[], getFallbackDate?: (item: T) => string) {
  return [...items].sort((left, right) => {
    const statusDifference =
      statusWeight(right.status) - statusWeight(left.status);

    if (statusDifference) return statusDifference;

    const leftDate =
      "updatedAt" in left && typeof left.updatedAt === "string"
        ? left.updatedAt
        : getFallbackDate?.(left);
    const rightDate =
      "updatedAt" in right && typeof right.updatedAt === "string"
        ? right.updatedAt
        : getFallbackDate?.(right);

    return timestamp(rightDate) - timestamp(leftDate);
  });
}

export function riskFromDesktopSyncStatus(
  status: DesktopSyncReconciliationStatus,
) {
  if (status === "blocked") return "high";
  if (status === "review") return "medium";

  return "low";
}

export function normalizeDesktopSyncNow(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date();
}

export function formatDesktopSyncTimestamp(value: string | null | undefined) {
  if (!value) return "not recorded";

  return value.slice(0, 16).replace("T", " ");
}

export function isDesktopSyncAuditAction(action: string) {
  return (
    action.startsWith("project.") ||
    action.startsWith("asset.") ||
    action.startsWith("automation.") ||
    action.startsWith("release.") ||
    action === "approval.updated"
  );
}

export function uniqueDesktopSyncValues(values: string[]) {
  return [...new Set(values)];
}

function statusWeight(status: DesktopSyncReconciliationStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}
