"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, RefreshCw, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalMaintenanceHistoryPanel } from "@/features/settings/components/local-maintenance-history-panel";
import { LocalMaintenanceRecoveryQueue } from "@/features/settings/components/local-maintenance-recovery-queue";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { createDesktopLaunchProofSummary, type DesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import { loadDesktopVerificationHistory } from "@/lib/desktop/desktop-verification-history";
import { createMediaHealthReport } from "@/lib/media/media-health";
import { createLocalMaintenanceReport, type LocalMaintenanceItem, type LocalMaintenanceStatus } from "@/lib/operations/local-maintenance-center";
import {
  createLocalMaintenanceEvidencePacket,
  downloadLocalMaintenanceEvidencePacket,
  loadLocalMaintenanceHistory,
  saveLocalMaintenanceHistoryEntry,
  type LocalMaintenanceHistoryEntry,
  type LocalMaintenanceHistoryFilter,
} from "@/lib/operations/local-maintenance-history";
import { createLocalMaintenanceRecoveryQueue } from "@/lib/operations/local-maintenance-recovery-queue";
import { createReleaseEvidenceSummary, loadReleaseEvidence, type ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import {
  clearProjectSyncConflictHistory,
  loadProjectSyncConflictHistory,
  type ProjectSyncConflictHistoryEntry,
} from "@/lib/projects/project-sync-conflict-history";

export function LocalMaintenanceCenterCard() {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const exportJobs = useEditorStore((state) => state.exportJobs);
  const removeMediaAsset = useEditorStore((state) => state.removeMediaAsset);
  const removeExportJob = useEditorStore((state) => state.removeExportJob);
  const updateExportJob = useEditorStore((state) => state.updateExportJob);
  const [releaseEvidenceSummary, setReleaseEvidenceSummary] = useState<ReleaseEvidenceSummary | null>(null);
  const [desktopProofSummary, setDesktopProofSummary] = useState<DesktopLaunchProofSummary | null>(null);
  const [cloudConflicts, setCloudConflicts] = useState<ProjectSyncConflictHistoryEntry[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<LocalMaintenanceHistoryEntry[]>([]);
  const [maintenanceHistoryFilter, setMaintenanceHistoryFilter] = useState<LocalMaintenanceHistoryFilter>("all");
  const [message, setMessage] = useState("");
  const mediaHealth = useMemo(() => createMediaHealthReport(project, mediaAssets), [project, mediaAssets]);
  const report = useMemo(
    () =>
      createLocalMaintenanceReport({
        project,
        mediaAssets,
        exportJobs,
        releaseEvidenceSummary,
        desktopProofSummary,
        cloudConflicts,
      }),
    [cloudConflicts, desktopProofSummary, exportJobs, mediaAssets, project, releaseEvidenceSummary],
  );
  const recoveryQueue = useMemo(
    () =>
      createLocalMaintenanceRecoveryQueue({
        report,
        mediaHealth,
        exportJobs,
        cloudConflicts,
      }),
    [cloudConflicts, exportJobs, mediaHealth, report],
  );

  const refreshScan = useCallback((silent = false) => {
    setReleaseEvidenceSummary(createReleaseEvidenceSummary(loadReleaseEvidence()));
    setDesktopProofSummary(createDesktopLaunchProofSummary(loadDesktopVerificationHistory()[0] ?? null));
    setCloudConflicts(loadProjectSyncConflictHistory());
    setMaintenanceHistory(loadLocalMaintenanceHistory());
    if (!silent) setMessage("Maintenance scan refreshed.");
  }, []);

  useEffect(() => {
    refreshScan(true);
  }, [refreshScan]);

  function removeUnusedMedia() {
    const unusedAssets = mediaHealth.assets.filter((item) => item.linkedLayerCount === 0).map((item) => item.asset);
    let removedCount = 0;

    for (const asset of unusedAssets) {
      if (removeMediaAsset(asset.id).removedAsset) removedCount += 1;
    }

    setMessage(removedCount > 0 ? `${removedCount} unused ${removedCount === 1 ? "asset" : "assets"} removed.` : "No unused media to remove.");
  }

  function clearFailedExports() {
    const failedJobs = exportJobs.filter((job) => job.status === "failed");

    for (const job of failedJobs) {
      removeExportJob(job.id);
    }

    setMessage(failedJobs.length > 0 ? `${failedJobs.length} failed ${failedJobs.length === 1 ? "export" : "exports"} cleared.` : "No failed exports to clear.");
  }

  function clearCloudConflicts() {
    setCloudConflicts(clearProjectSyncConflictHistory());
    setMessage("Reviewed cloud conflict records cleared.");
  }

  function retryFailedExports() {
    const failedJobs = exportJobs.filter((job) => job.status === "failed");

    for (const job of failedJobs) {
      updateExportJob(job.id, { status: "queued", progress: 0, error: undefined });
    }

    setMessage(
      failedJobs.length > 0
        ? `${failedJobs.length} failed ${failedJobs.length === 1 ? "export was" : "exports were"} re-queued. Open the export panel to render again.`
        : "No failed exports need retrying.",
    );
  }

  function saveMaintenanceSnapshot() {
    const packet = createLocalMaintenanceEvidencePacket(project, report, new Date().toISOString(), {
      mediaAssetCount: mediaAssets.length,
      exportJobCount: exportJobs.length,
    });
    const entries = saveLocalMaintenanceHistoryEntry(packet);
    setMaintenanceHistory(entries);
    setMessage(`Saved ${report.status === "ready" ? "ready" : report.blockedCount > 0 ? "blocked" : "draft"} maintenance snapshot.`);
  }

  function exportMaintenancePacket() {
    const downloaded = downloadLocalMaintenanceEvidencePacket(project, report, {
      mediaAssetCount: mediaAssets.length,
      exportJobCount: exportJobs.length,
    });
    setMessage(downloaded ? "Maintenance evidence packet exported." : "Maintenance evidence export is unavailable in this runtime.");
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <Wrench className="size-4 shrink-0" />
            Local maintenance
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={maintenanceBadgeVariant(report.status)}>{report.score}/100</Badge>
            <Button type="button" size="sm" variant="outline" onClick={() => refreshScan()}>
              <RefreshCw className="size-4" />
              Scan
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {report.status === "ready" ? "Local proof, media, export queue, and sync handoff are clean." : "Resolve local delivery blockers before the next handoff."}
        </p>
        {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {report.items.map((item) => {
            const Icon = item.status === "ready" ? ShieldCheck : CircleAlert;
            return (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${item.status === "blocked" ? "text-destructive" : item.status === "attention" ? "text-amber-300" : "text-primary"}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                    </div>
                  </div>
                  <Badge variant={maintenanceBadgeVariant(item.status)}>{item.count || maintenanceStatusLabel(item.status)}</Badge>
                </div>
                {item.status !== "ready" ? <div className="mt-3">{maintenanceAction(item, { clearCloudConflicts, clearFailedExports, refreshScan, removeUnusedMedia })}</div> : null}
              </div>
            );
          })}
        </div>
        <LocalMaintenanceRecoveryQueue
          items={recoveryQueue}
          onClearCloudConflicts={clearCloudConflicts}
          onRefreshProof={refreshScan}
          onRetryFailedExports={retryFailedExports}
        />
        <LocalMaintenanceHistoryPanel
          entries={maintenanceHistory}
          filter={maintenanceHistoryFilter}
          onDownloadPacket={exportMaintenancePacket}
          onFilterChange={setMaintenanceHistoryFilter}
          onSaveSnapshot={saveMaintenanceSnapshot}
        />
      </CardContent>
    </Card>
  );
}

function maintenanceAction(
  item: LocalMaintenanceItem,
  actions: {
    clearCloudConflicts: () => void;
    clearFailedExports: () => void;
    refreshScan: () => void;
    removeUnusedMedia: () => void;
  },
) {
  if (item.id === "unused-media") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={actions.removeUnusedMedia}>
        <Trash2 className="size-4" />
        Remove unused
      </Button>
    );
  }

  if (item.id === "failed-exports") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={actions.clearFailedExports}>
        <Trash2 className="size-4" />
        Clear failed
      </Button>
    );
  }

  if (item.id === "cloud-version-conflicts") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={actions.clearCloudConflicts}>
        Clear reviewed
      </Button>
    );
  }

  if (item.id === "missing-sources") {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/editor">Open editor</Link>
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={actions.refreshScan}>
      Refresh proof scan
    </Button>
  );
}

function maintenanceStatusLabel(status: LocalMaintenanceStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "attention") return "Review";
  return "Ready";
}

function maintenanceBadgeVariant(status: LocalMaintenanceStatus) {
  if (status === "blocked") return "destructive";
  if (status === "attention") return "secondary";
  return "default";
}
