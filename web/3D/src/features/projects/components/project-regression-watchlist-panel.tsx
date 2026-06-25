"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, CheckCircle2, Clock3, Download, ExternalLink, FileCog, FileJson2, History, KeyRound, Loader2, Radar, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectRegressionWatchlistSnapshotHistoryReport } from "@/features/projects/regression-watchlist-history";
import {
  createProjectRegressionWatchlistCsv,
  createProjectRegressionWatchlistFileName,
  filterActiveProjectRegressionWatchlistItems,
  summarizeProjectRegressionWatchlistTriage,
  type ProjectRegressionWatchlistItem,
  type ProjectRegressionWatchlistItemTriageState,
  type ProjectRegressionWatchlistReport,
  type ProjectRegressionWatchlistSeverity,
  type ProjectRegressionWatchlistSource,
  type ProjectRegressionWatchlistTriageStatus,
  type ProjectRegressionWatchlistTrend,
} from "@/features/projects/regression-watchlist";

function severityVariant(severity: ProjectRegressionWatchlistSeverity) {
  if (severity === "critical" || severity === "high") {
    return "destructive" as const;
  }

  return severity === "medium" ? "secondary" : "outline";
}

function trendVariant(trend: ProjectRegressionWatchlistTrend) {
  if (trend === "recurring") {
    return "destructive" as const;
  }

  return trend === "active" ? "secondary" : "outline";
}

function stateVariant(status: ProjectRegressionWatchlistTriageStatus) {
  if (status === "resolved") {
    return "outline" as const;
  }

  return status === "snoozed" ? "secondary" : status === "watching" ? "default" : "destructive";
}

function sourceLabel(source: ProjectRegressionWatchlistSource) {
  switch (source) {
    case "cad-conversion":
      return "CAD";
    case "incident":
      return "Incident";
    case "public-surface":
      return "Public surface";
    case "signing":
      return "Signing";
  }
}

function sourceIcon(source: ProjectRegressionWatchlistSource) {
  switch (source) {
    case "cad-conversion":
      return <FileCog className="size-3.5" />;
    case "incident":
      return <History className="size-3.5" />;
    case "public-surface":
      return <Activity className="size-3.5" />;
    case "signing":
      return <KeyRound className="size-3.5" />;
  }
}

function severityIcon(severity: ProjectRegressionWatchlistSeverity) {
  if (severity === "critical" || severity === "high") {
    return <TriangleAlert className="size-3.5" />;
  }

  return severity === "medium" ? <Radar className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
}

function downloadTextFile(fileName: string, body: string, mimeType: string) {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function WatchlistRow({
  canPersist,
  item,
  onStateChange,
  pendingAction,
  state,
}: {
  canPersist: boolean;
  item: ProjectRegressionWatchlistItem;
  onStateChange: (item: ProjectRegressionWatchlistItem, status: ProjectRegressionWatchlistTriageStatus) => void;
  pendingAction: string | null;
  state?: ProjectRegressionWatchlistItemTriageState;
}) {
  const status = state?.status ?? "open";
  const isPending = pendingAction?.startsWith(`${item.id}:`);

  return (
    <TableRow>
      <TableCell className="max-w-[420px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{sourceIcon(item.source)}</span>
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
            {item.evidence[0] ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.evidence[0]}</p> : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="gap-1 rounded-md" variant="outline">
            {sourceIcon(item.source)}
            {sourceLabel(item.source)}
          </Badge>
          <Badge className="gap-1 rounded-md" variant={severityVariant(item.severity)}>
            {severityIcon(item.severity)}
            {item.severity}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="rounded-md" variant={trendVariant(item.trend)}>
            {item.trend}
          </Badge>
          <Badge className="rounded-md" variant={stateVariant(status)}>
            {status}
          </Badge>
        </div>
        {state?.ownerName || state?.ownerEmail ? <p className="mt-1 truncate text-xs text-muted-foreground">{state.ownerName ?? state.ownerEmail}</p> : null}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{item.evidenceCount} evidence row{item.evidenceCount === 1 ? "" : "s"}</p>
        <p>{formatDate(item.lastSeenAt)}</p>
        {state?.snoozedUntil ? <p>Snoozed until {formatDate(state.snoozedUntil)}</p> : null}
      </TableCell>
      <TableCell className="max-w-[230px] whitespace-normal text-xs text-muted-foreground">{item.nextAction}</TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/?projectId=${encodeURIComponent(item.projectId)}`}>
            Open
            <ExternalLink className="size-3.5" />
          </Link>
          {canPersist ? (
            <>
              <Button disabled={isPending} onClick={() => onStateChange(item, status === "resolved" ? "open" : "watching")} size="sm" type="button" variant="outline">
                {status === "resolved" ? "Reopen" : "Watch"}
              </Button>
              <Button disabled={isPending} onClick={() => onStateChange(item, "snoozed")} size="sm" type="button" variant="outline">
                <Clock3 className="size-3.5" />
                24h
              </Button>
              {status !== "resolved" ? (
                <Button disabled={isPending} onClick={() => onStateChange(item, "resolved")} size="sm" type="button" variant="secondary">
                  Resolve
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SummaryTile({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ProjectRegressionWatchlistPanel({
  canPersist,
  history,
  itemStates,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: ProjectRegressionWatchlistSnapshotHistoryReport | null;
  itemStates?: ProjectRegressionWatchlistItemTriageState[];
  report: ProjectRegressionWatchlistReport;
  workspaceId: string;
}) {
  const [states, setStates] = useState(itemStates ?? []);
  const [snapshotHistory, setSnapshotHistory] = useState(history ?? null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const stateByItemId = useMemo(() => new Map(states.map((state) => [state.itemId, state])), [states]);
  const activeItems = useMemo(() => filterActiveProjectRegressionWatchlistItems({ items: report.items, states }), [report.items, states]);
  const triageSummary = useMemo(() => summarizeProjectRegressionWatchlistTriage(states), [states]);
  const visibleItems = report.items.slice(0, 10);

  function exportCurrentCsv() {
    downloadTextFile(createProjectRegressionWatchlistFileName(report, "csv"), createProjectRegressionWatchlistCsv(report, states), "text/csv;charset=utf-8");
  }

  async function saveSnapshot() {
    if (!canPersist || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/regression-watchlist-snapshots`, {
        body: JSON.stringify({ report, states }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Regression watchlist snapshot could not be saved.");
      }

      const historyResponse = await fetch(`/api/workspaces/${workspaceId}/regression-watchlist-snapshots`, { cache: "no-store" });
      const historyPayload = (await historyResponse.json().catch(() => null)) as { history?: ProjectRegressionWatchlistSnapshotHistoryReport; error?: string } | null;

      if (!historyResponse.ok || !historyPayload?.history) {
        throw new Error(historyPayload?.error ?? "Snapshot was saved, but history refresh failed.");
      }

      setSnapshotHistory(historyPayload.history);
      toast.success("Regression watchlist snapshot saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Regression watchlist snapshot could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateState(item: ProjectRegressionWatchlistItem, status: ProjectRegressionWatchlistTriageStatus) {
    const snoozedUntil = status === "snoozed" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    setPendingAction(`${item.id}:${status}`);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/regression-watchlist-state`, {
        body: JSON.stringify({
          itemId: item.id,
          note: status === "resolved" ? "Resolved from the regression watchlist." : null,
          projectId: item.projectId,
          snoozedUntil,
          status,
          title: item.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; state?: ProjectRegressionWatchlistItemTriageState } | null;

      if (!response.ok || !payload?.state) {
        throw new Error(payload?.error ?? "Watchlist state could not be updated.");
      }

      setStates((current) => [...current.filter((entry) => entry.itemId !== item.id), payload.state!]);
      toast.success(status === "snoozed" ? "Watchlist item snoozed" : status === "resolved" ? "Watchlist item resolved" : "Watchlist item updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Watchlist state could not be updated.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Regression watchlist
            </CardTitle>
            <CardDescription>Persisted launch risks with owner triage states, snooze windows, and CSV handoff exports.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.criticalCount + report.summary.highCount > 0 ? "destructive" : "outline"}>
              {report.summary.criticalCount + report.summary.highCount} severe
            </Badge>
            <Badge className="rounded-md" variant={report.summary.recurringCount > 0 ? "destructive" : "outline"}>
              {report.summary.recurringCount} recurring
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {activeItems.length} active
            </Badge>
            <Button className="h-8 gap-2" onClick={exportCurrentCsv} size="sm" type="button" variant="secondary">
              <Download className="size-4" />
              CSV
            </Button>
            {canPersist ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={saveSnapshot} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save snapshot
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            detail={`${triageSummary.watchingCount} watching, ${triageSummary.resolvedCount} resolved`}
            icon={<ShieldAlert className="size-4" />}
            label="Triage"
            value={`${triageSummary.openCount + triageSummary.watchingCount} open`}
          />
          <SummaryTile
            detail={`${report.summary.publicSurfaceCount} public, ${report.summary.incidentCount} incident`}
            icon={<Activity className="size-4" />}
            label="Surface signals"
            value={`${report.summary.publicSurfaceCount + report.summary.incidentCount}`}
          />
          <SummaryTile
            detail={`${report.summary.cadConversionCount} CAD, ${report.summary.signingCount} signing`}
            icon={<FileCog className="size-4" />}
            label="Artifact signals"
            value={`${report.summary.cadConversionCount + report.summary.signingCount}`}
          />
          <SummaryTile detail={`${triageSummary.snoozedCount} snoozed, last seen ${formatDate(report.summary.latestSeenAt)}`} icon={<Radar className="size-4" />} label="Recurrence" value={`${report.summary.recurringCount}`} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Regression</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Triage</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <WatchlistRow
                  canPersist={Boolean(canPersist)}
                  item={item}
                  key={item.id}
                  onStateChange={updateState}
                  pendingAction={pendingAction}
                  state={stateByItemId.get(item.id)}
                />
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No active regression signals in the current workspace scope.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {snapshotHistory ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <History className="size-4" />
                  Saved snapshots
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {snapshotHistory.summary.totalSnapshotCount} snapshots, {snapshotHistory.summary.totalItemCount} captured items, latest saved{" "}
                  {formatDate(snapshotHistory.summary.latestSavedAt)}.
                </p>
              </div>
              {snapshotHistory.summary.latestContentHash ? (
                <Badge className="max-w-full rounded-md font-mono" variant="outline">
                  <span className="truncate">{snapshotHistory.summary.latestContentHash}</span>
                </Badge>
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshotHistory.snapshots.length > 0 ? (
                  snapshotHistory.snapshots.slice(0, 5).map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{formatDate(snapshot.createdAt)}</p>
                        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{snapshot.contentHash}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{snapshot.actor.name ?? "Unknown actor"}</p>
                        <p className="text-xs text-muted-foreground">{snapshot.actor.email ?? "No email snapshot"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p>{snapshot.itemCount} total</p>
                        <p>{snapshot.severeCount} severe, {snapshot.recurringCount} recurring</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/regression-watchlist-snapshots/${snapshot.id}?format=json`}>
                            <FileJson2 className="size-3.5" />
                            JSON {formatByteSize(snapshot.jsonByteSize)}
                          </a>
                          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/regression-watchlist-snapshots/${snapshot.id}?format=csv`}>
                            <Download className="size-3.5" />
                            CSV {formatByteSize(snapshot.csvByteSize)}
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No saved regression watchlist snapshots yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
