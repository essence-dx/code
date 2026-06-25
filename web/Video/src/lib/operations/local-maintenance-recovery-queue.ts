import type { ExportJob } from "@/lib/editor/types";
import type { MediaHealthReport } from "@/lib/media/media-health";
import type { LocalMaintenanceItemId, LocalMaintenanceReport, LocalMaintenanceStatus } from "@/lib/operations/local-maintenance-center";
import type { ProjectSyncConflictHistoryEntry } from "@/lib/projects/project-sync-conflict-history";

export type LocalMaintenanceRecoveryId = "refresh-proof" | "relink-media" | "retry-exports" | "review-cloud-conflicts";

export interface LocalMaintenanceRecoveryItem {
  id: LocalMaintenanceRecoveryId;
  sourceItemId: LocalMaintenanceItemId;
  label: string;
  status: LocalMaintenanceStatus;
  count: number;
  detail: string;
  actionLabel: string;
  targets: string[];
}

export interface LocalMaintenanceRecoveryQueueInput {
  report: LocalMaintenanceReport;
  mediaHealth: MediaHealthReport;
  exportJobs: ExportJob[];
  cloudConflicts: ProjectSyncConflictHistoryEntry[];
}

export function createLocalMaintenanceRecoveryQueue(input: LocalMaintenanceRecoveryQueueInput): LocalMaintenanceRecoveryItem[] {
  return [
    createProofRecovery(input.report),
    createMediaRecovery(input.report, input.mediaHealth),
    createExportRecovery(input.report, input.exportJobs),
    createCloudConflictRecovery(input.report, input.cloudConflicts),
  ].filter((item): item is LocalMaintenanceRecoveryItem => Boolean(item));
}

function createProofRecovery(report: LocalMaintenanceReport): LocalMaintenanceRecoveryItem | null {
  const source = report.items.find((item) => item.id === "stale-proof");
  if (!source || source.status === "ready") return null;

  return {
    id: "refresh-proof",
    sourceItemId: "stale-proof",
    label: "Refresh proof",
    status: source.status,
    count: source.count,
    detail: source.detail,
    actionLabel: "Refresh proof scan",
    targets: ["Release proof", "Desktop proof"],
  };
}

function createMediaRecovery(report: LocalMaintenanceReport, mediaHealth: MediaHealthReport): LocalMaintenanceRecoveryItem | null {
  const source = report.items.find((item) => item.id === "missing-sources");
  if (!source || source.status === "ready") return null;

  const missingAssets = mediaHealth.assets.filter((asset) => asset.needsReconnect).map((asset) => asset.asset.name);
  const missingReferences = mediaHealth.missingReferences.map((reference) => reference.assetId);
  const targets = [...missingAssets, ...missingReferences].slice(0, 6);

  return {
    id: "relink-media",
    sourceItemId: "missing-sources",
    label: "Relink media",
    status: source.status,
    count: source.count,
    detail: source.detail,
    actionLabel: "Open media relink",
    targets: targets.length > 0 ? targets : ["Missing timeline sources"],
  };
}

function createExportRecovery(report: LocalMaintenanceReport, exportJobs: ExportJob[]): LocalMaintenanceRecoveryItem | null {
  const source = report.items.find((item) => item.id === "failed-exports");
  if (!source || source.status === "ready") return null;

  const failedJobs = exportJobs.filter((job) => job.status === "failed");

  return {
    id: "retry-exports",
    sourceItemId: "failed-exports",
    label: "Retry failed exports",
    status: source.status,
    count: failedJobs.length || source.count,
    detail: source.detail,
    actionLabel: "Re-queue exports",
    targets: failedJobs.map((job) => job.outputName || `${job.preset}.${job.format}`).slice(0, 6),
  };
}

function createCloudConflictRecovery(
  report: LocalMaintenanceReport,
  cloudConflicts: ProjectSyncConflictHistoryEntry[],
): LocalMaintenanceRecoveryItem | null {
  const source = report.items.find((item) => item.id === "cloud-version-conflicts");
  if (!source || source.status === "ready") return null;

  return {
    id: "review-cloud-conflicts",
    sourceItemId: "cloud-version-conflicts",
    label: "Clear reviewed conflicts",
    status: source.status,
    count: cloudConflicts.length || source.count,
    detail: source.detail,
    actionLabel: "Clear reviewed",
    targets: cloudConflicts.map((conflict) => `${conflict.projectId} at ${conflict.recordedAt}`).slice(0, 6),
  };
}
