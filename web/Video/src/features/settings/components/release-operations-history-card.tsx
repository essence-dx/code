"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLocalMaintenanceHistory } from "@/lib/operations/local-maintenance-history";
import { createReleaseEvidenceSummary, loadReleaseEvidence } from "@/lib/product/release-evidence";
import { loadReleaseEvidenceHistory, selectPinnedReleaseEvidenceHistoryEntry } from "@/lib/product/release-evidence-history";
import {
  createReleaseOperationsPacket,
  downloadReleaseOperationsPacket,
  filterReleaseOperationsHistory,
  loadReleaseOperationsHistory,
  releaseOperationsStatusLabel,
  saveReleaseOperationsHistoryEntry,
  type ReleaseOperationsHistoryEntry,
  type ReleaseOperationsHistoryFilter,
  type ReleaseOperationsPacket,
  type ReleaseOperationsStatus,
} from "@/lib/product/release-operations-history";
import { loadExportProofBundleHistory } from "@/lib/projects/export-proof-bundle-history";

export function ReleaseOperationsHistoryCard() {
  const [packet, setPacket] = useState<ReleaseOperationsPacket | null>(null);
  const [history, setHistory] = useState<ReleaseOperationsHistoryEntry[]>([]);
  const [filter, setFilter] = useState<ReleaseOperationsHistoryFilter>("all");
  const [message, setMessage] = useState("");
  const filteredHistory = useMemo(() => filterReleaseOperationsHistory(history, filter), [filter, history]);

  function refresh() {
    const nextPacket = createCurrentReleaseOperationsPacket();

    setPacket(nextPacket);
    setHistory(loadReleaseOperationsHistory());
    setMessage("Release operations snapshot refreshed.");
  }

  useEffect(() => {
    refresh();
  }, []);

  function saveSnapshot() {
    const nextPacket = packet ?? createCurrentReleaseOperationsPacket();
    const entries = saveReleaseOperationsHistoryEntry(nextPacket);
    setPacket(nextPacket);
    setHistory(entries);
    setMessage(`Saved ${releaseOperationsStatusLabel(nextPacket.status).toLowerCase()} release operations snapshot.`);
  }

  function exportPacket() {
    const nextPacket = packet ?? createCurrentReleaseOperationsPacket();
    setPacket(nextPacket);
    setMessage(downloadReleaseOperationsPacket(nextPacket) ? "Release operations packet exported." : "Release operations export is unavailable in this runtime.");
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="size-4 shrink-0" />
            Release operations
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={operationsBadgeVariant(packet?.status ?? "draft")}>{releaseOperationsStatusLabel(packet?.status ?? "draft")}</Badge>
            <Button type="button" size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <OperationMetric label="Release" value={packet ? `${packet.releaseEvidence.score}/100` : "Draft"} />
          <OperationMetric label="Deployment" value={packet?.deploymentProof.ready ? "Ready" : "Draft"} />
          <OperationMetric label="Maintenance" value={packet ? releaseOperationsStatusLabel(packet.maintenanceEvidence.status) : "Draft"} />
          <OperationMetric label="Review handoff" value={packet ? releaseOperationsStatusLabel(packet.reviewHandoff.status) : "Draft"} />
        </div>
        {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={saveSnapshot} aria-label="Save release operations snapshot">
            <Save className="size-3.5" />
            Save snapshot
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportPacket} aria-label="Export release operations packet">
            <Download className="size-3.5" />
            Export packet
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "ready", "draft", "blocked"] as const).map((nextFilter) => (
            <Button
              key={nextFilter}
              type="button"
              size="sm"
              variant={filter === nextFilter ? "default" : "outline"}
              aria-pressed={filter === nextFilter}
              onClick={() => setFilter(nextFilter)}
            >
              {nextFilter === "all" ? "All" : releaseOperationsStatusLabel(nextFilter)}
            </Button>
          ))}
        </div>
        <div className="grid gap-2">
          {filteredHistory.length > 0 ? (
            filteredHistory.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-md bg-muted/40 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant={operationsBadgeVariant(entry.status)}>{releaseOperationsStatusLabel(entry.status)}</Badge>
                    <span className="text-xs text-muted-foreground">{formatOperationsTime(entry.savedAt)}</span>
                  </div>
                  <Badge variant="outline">Release {entry.releaseScore}/100</Badge>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  Deployment {entry.deploymentReady ? "ready" : "draft"} / maintenance {releaseOperationsStatusLabel(entry.maintenanceStatus).toLowerCase()} / review{" "}
                  {releaseOperationsStatusLabel(entry.reviewHandoffStatus).toLowerCase()}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">No release operations snapshots match this filter.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function createCurrentReleaseOperationsPacket() {
  const releaseEvidence = loadReleaseEvidence();
  const releaseHistory = loadReleaseEvidenceHistory();

  return createReleaseOperationsPacket({
    releaseEvidence,
    releaseEvidenceSummary: createReleaseEvidenceSummary(releaseEvidence),
    releaseHistoryEntry: selectPinnedReleaseEvidenceHistoryEntry(releaseHistory),
    maintenanceHistoryEntry: loadLocalMaintenanceHistory()[0] ?? null,
    proofBundleEntry: loadExportProofBundleHistory()[0] ?? null,
  });
}

function OperationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function operationsBadgeVariant(status: ReleaseOperationsStatus) {
  if (status === "blocked") return "destructive";
  if (status === "ready") return "default";
  return "secondary";
}

function formatOperationsTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
