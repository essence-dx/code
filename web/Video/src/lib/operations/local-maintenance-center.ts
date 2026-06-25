import type { DesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import type { EditorProject, ExportJob, MediaAsset } from "@/lib/editor/types";
import { createMediaHealthReport, summarizeMissingMediaImpact } from "@/lib/media/media-health";
import type { ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import type { ProjectSyncConflictHistoryEntry } from "@/lib/projects/project-sync-conflict-history";

export type LocalMaintenanceStatus = "ready" | "attention" | "blocked";

export type LocalMaintenanceItemId = "stale-proof" | "unused-media" | "missing-sources" | "failed-exports" | "cloud-version-conflicts";

export interface LocalMaintenanceItem {
  id: LocalMaintenanceItemId;
  label: string;
  status: LocalMaintenanceStatus;
  count: number;
  detail: string;
  actionLabel?: string;
}

export interface LocalMaintenanceReport {
  score: number;
  status: LocalMaintenanceStatus;
  readyCount: number;
  attentionCount: number;
  blockedCount: number;
  items: LocalMaintenanceItem[];
}

export interface LocalMaintenanceReportInput {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  exportJobs: ExportJob[];
  releaseEvidenceSummary: ReleaseEvidenceSummary | null;
  desktopProofSummary: DesktopLaunchProofSummary | null;
  cloudConflicts: ProjectSyncConflictHistoryEntry[];
}

export function createLocalMaintenanceReport(input: LocalMaintenanceReportInput): LocalMaintenanceReport {
  const mediaHealth = createMediaHealthReport(input.project, input.mediaAssets);
  const items: LocalMaintenanceItem[] = [
    staleProofItem(input.releaseEvidenceSummary, input.desktopProofSummary),
    unusedMediaItem(mediaHealth.unusedAssets),
    missingSourcesItem(mediaHealth.reconnectRequiredAssets, summarizeMissingMediaImpact(mediaHealth)),
    failedExportsItem(input.exportJobs),
    cloudVersionConflictsItem(input.cloudConflicts),
  ];
  const readyCount = countItems(items, "ready");
  const attentionCount = countItems(items, "attention");
  const blockedCount = countItems(items, "blocked");
  const score = Math.round((items.reduce((total, item) => total + statusWeight(item.status), 0) / items.length) * 100);

  return {
    score,
    status: blockedCount > 0 ? "blocked" : attentionCount > 0 ? "attention" : "ready",
    readyCount,
    attentionCount,
    blockedCount,
    items,
  };
}

function staleProofItem(
  releaseEvidenceSummary: ReleaseEvidenceSummary | null,
  desktopProofSummary: DesktopLaunchProofSummary | null,
): LocalMaintenanceItem {
  const staleReleaseCount = releaseEvidenceSummary?.requirements.filter((requirement) => requirement.status === "stale").length ?? 0;
  const missingReleaseCount = releaseEvidenceSummary?.requirements.filter((requirement) => requirement.status === "missing").length ?? 0;
  const failedDesktopCount = desktopProofSummary?.failedCount ?? 0;
  const missingDesktopCount = desktopProofSummary?.missingCount ?? 0;
  const limitedDesktopCount = desktopProofSummary?.limitedCount ?? 0;
  const issueCount = staleReleaseCount + missingReleaseCount + failedDesktopCount + missingDesktopCount + limitedDesktopCount;

  if (failedDesktopCount > 0) {
    return {
      id: "stale-proof",
      label: "Proof freshness",
      status: "blocked",
      count: issueCount,
      detail: "Desktop proof has failed checks. Refresh desktop evidence before release handoff.",
      actionLabel: "Refresh proof",
    };
  }

  if (issueCount > 0) {
    return {
      id: "stale-proof",
      label: "Proof freshness",
      status: "attention",
      count: issueCount,
      detail: `${staleReleaseCount} stale, ${missingReleaseCount} missing, and ${missingDesktopCount + limitedDesktopCount} desktop proof items need attention.`,
      actionLabel: "Review proof",
    };
  }

  return {
    id: "stale-proof",
    label: "Proof freshness",
    status: "ready",
    count: 0,
    detail: "Release and desktop proof are current.",
  };
}

function unusedMediaItem(unusedAssetCount: number): LocalMaintenanceItem {
  if (unusedAssetCount > 0) {
    return {
      id: "unused-media",
      label: "Unused media",
      status: "attention",
      count: unusedAssetCount,
      detail: `${unusedAssetCount} media ${unusedAssetCount === 1 ? "asset is" : "assets are"} not used by the current timeline.`,
      actionLabel: "Remove unused",
    };
  }

  return {
    id: "unused-media",
    label: "Unused media",
    status: "ready",
    count: 0,
    detail: "Every imported media asset is used by the current timeline.",
  };
}

function missingSourcesItem(reconnectRequiredAssets: number, missingImpact: string | null): LocalMaintenanceItem {
  if (reconnectRequiredAssets > 0) {
    return {
      id: "missing-sources",
      label: "Missing sources",
      status: "blocked",
      count: reconnectRequiredAssets,
      detail: missingImpact ? `Reconnect media for ${missingImpact}.` : "Reconnect missing browser, desktop, or linked media sources.",
      actionLabel: "Open media bin",
    };
  }

  return {
    id: "missing-sources",
    label: "Missing sources",
    status: "ready",
    count: 0,
    detail: "No missing source files are blocking local exports.",
  };
}

function failedExportsItem(exportJobs: ExportJob[]): LocalMaintenanceItem {
  const failedJobs = exportJobs.filter((job) => job.status === "failed");

  if (failedJobs.length > 0) {
    return {
      id: "failed-exports",
      label: "Failed exports",
      status: "blocked",
      count: failedJobs.length,
      detail: `${failedJobs.length} export ${failedJobs.length === 1 ? "job needs" : "jobs need"} retry or cleanup.`,
      actionLabel: "Clear failed",
    };
  }

  return {
    id: "failed-exports",
    label: "Failed exports",
    status: "ready",
    count: 0,
    detail: "No failed exports are in the current queue.",
  };
}

function cloudVersionConflictsItem(conflicts: ProjectSyncConflictHistoryEntry[]): LocalMaintenanceItem {
  if (conflicts.length > 0) {
    const latest = conflicts[0];
    return {
      id: "cloud-version-conflicts",
      label: "Cloud conflicts",
      status: "blocked",
      count: conflicts.length,
      detail: `Latest conflict for project ${latest.projectId} was recorded ${latest.recordedAt}. Review versions before syncing again.`,
      actionLabel: "Clear reviewed",
    };
  }

  return {
    id: "cloud-version-conflicts",
    label: "Cloud conflicts",
    status: "ready",
    count: 0,
    detail: "No unresolved cloud-version conflicts are recorded locally.",
  };
}

function statusWeight(status: LocalMaintenanceStatus) {
  if (status === "ready") return 1;
  if (status === "attention") return 0.5;
  return 0;
}

function countItems(items: LocalMaintenanceItem[], status: LocalMaintenanceStatus) {
  return items.filter((item) => item.status === status).length;
}
