"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, Download, FileJson2, History, Loader2, Save, ShieldCheck, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceStatus } from "@/features/projects/executive-release-intelligence";
import type {
  ExecutiveReleaseSnapshotHistoryReport,
  ExecutiveReleaseSnapshotRecord,
  ExecutiveReleaseSnapshotTrendDirection,
  ExecutiveReleaseSnapshotTrendRow,
} from "@/features/projects/executive-release-snapshots";

function statusVariant(status: ExecutiveReleaseIntelligenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ExecutiveReleaseIntelligenceStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function trendVariant(direction: ExecutiveReleaseSnapshotTrendDirection) {
  return direction === "declining" ? ("destructive" as const) : direction === "improving" ? ("outline" as const) : ("secondary" as const);
}

function TrendIcon({ direction }: { direction: ExecutiveReleaseSnapshotTrendDirection }) {
  return direction === "declining" ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No snapshot";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDelta(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function TrendRow({ row }: { row: ExecutiveReleaseSnapshotTrendRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.metric}</TableCell>
      <TableCell className="text-sm">{row.currentValue}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.previousValue}</TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={trendVariant(row.direction)}>
          <TrendIcon direction={row.direction} />
          {formatDelta(row.delta)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={trendVariant(row.direction)}>
          {row.direction}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function SnapshotRow({ record, workspaceId }: { record: ExecutiveReleaseSnapshotRecord; workspaceId: string }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{formatDate(record.createdAt)}</p>
        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{record.contentHash}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          <StatusIcon status={record.status} />
          {record.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{record.executiveScore}/100</p>
        <p>{record.blockedCount} blocked, {record.watchCount} watch</p>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal">
        <p className="font-medium">{record.actor.name ?? "Unknown actor"}</p>
        <p className="text-xs text-muted-foreground">{record.actor.email ?? "No email snapshot"}</p>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/executive-release-snapshots/${record.id}?format=json`}>
            <FileJson2 className="size-3.5" />
            JSON {formatByteSize(record.jsonByteSize)}
          </a>
          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/executive-release-snapshots/${record.id}?format=csv`}>
            <Download className="size-3.5" />
            CSV {formatByteSize(record.csvByteSize)}
          </a>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ExecutiveReleaseSnapshotPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: ExecutiveReleaseSnapshotHistoryReport | null;
  report: ExecutiveReleaseIntelligenceReport;
  workspaceId: string;
}) {
  const [snapshotHistory, setSnapshotHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveSnapshot() {
    if (!canPersist || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/executive-release-snapshots`, {
        body: JSON.stringify({ report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: ExecutiveReleaseSnapshotHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Executive release snapshot could not be saved.");
      }

      setSnapshotHistory(payload.history);
      toast.success("Executive release snapshot saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Executive release snapshot could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Executive release snapshots
            </CardTitle>
            <CardDescription>Persisted executive release intelligence checkpoints with release-window trend comparison.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.executiveScore}/100 current
            </Badge>
            {snapshotHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={snapshotHistory.csvFileName} href={snapshotHistory.csvDataUri}>
                <Download className="size-4" />
                History CSV
              </a>
            ) : null}
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="current report" label="Executive score" value={`${report.summary.executiveScore}/100`} />
          <SummaryTile detail="latest vs previous" label="Score delta" value={formatDelta(snapshotHistory?.summary.scoreDelta ?? 0)} />
          <SummaryTile detail="latest vs previous" label="Blocker delta" value={formatDelta(snapshotHistory?.summary.blockerDelta ?? 0)} />
          <SummaryTile detail="saved checkpoints" label="Snapshots" value={`${snapshotHistory?.summary.totalSnapshotCount ?? 0}`} />
          <SummaryTile detail={formatDate(snapshotHistory?.summary.latestSavedAt ?? null)} label="Latest saved" value={snapshotHistory?.summary.statusTrend ?? "flat"} />
        </div>

        {snapshotHistory && snapshotHistory.trends.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{snapshotHistory.trends.map((row) => <TrendRow key={row.metric} row={row} />)}</TableBody>
          </Table>
        ) : (
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-medium">Trend baseline</p>
            <p className="mt-1 text-sm text-muted-foreground">Save at least two executive snapshots to compare release-window movement.</p>
          </div>
        )}

        {snapshotHistory ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotHistory.snapshots.length > 0 ? (
                snapshotHistory.snapshots.slice(0, 6).map((record) => <SnapshotRow key={record.id} record={record} workspaceId={workspaceId} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    No executive release snapshots are saved yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
