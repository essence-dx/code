"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Download,
  FileJson2,
  History,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditRow, BoardDecisionReplayAuditStatus } from "@/features/projects/board-decision-replay-audit";
import type {
  BoardDecisionReplaySnapshotHistoryReport,
  BoardDecisionReplaySnapshotRecord,
  BoardDecisionReplaySnapshotTrendDirection,
  BoardDecisionReplaySnapshotTrendRow,
} from "@/features/projects/board-decision-replay-snapshots";

function statusVariant(status: BoardDecisionReplayAuditStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardDecisionReplayAuditStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function trendVariant(direction: BoardDecisionReplaySnapshotTrendDirection) {
  return direction === "declining" ? ("destructive" as const) : direction === "improving" ? ("outline" as const) : ("secondary" as const);
}

function TrendIcon({ direction }: { direction: BoardDecisionReplaySnapshotTrendDirection }) {
  return direction === "declining" ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function valueText(value: string | number | null) {
  return value === null ? "None" : String(value);
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function ReplayRow({ row }: { row: BoardDecisionReplayAuditRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{row.recipientPurpose ?? "No approval"}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{row.packetId ?? row.approvalId ?? "Missing packet"}</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.occurredAt)}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">{valueText(row.baselineValue)}</TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">{valueText(row.currentValue)}</TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

function TrendRow({ row }: { row: BoardDecisionReplaySnapshotTrendRow }) {
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

function SnapshotRow({ record, workspaceId }: { record: BoardDecisionReplaySnapshotRecord; workspaceId: string }) {
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
        <p className="font-medium text-foreground">{record.replayScore}/100</p>
        <p>{record.blockedRowCount} blocked, {record.watchRowCount} watch</p>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal">
        <p className="font-medium">{record.actor.name ?? "Unknown actor"}</p>
        <p className="text-xs text-muted-foreground">{record.actor.email ?? "No email snapshot"}</p>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <a
            className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
            href={`/api/workspaces/${workspaceId}/board-decision-replay-snapshots/${record.id}?format=json`}
          >
            <FileJson2 className="size-3.5" />
            JSON {formatByteSize(record.jsonByteSize)}
          </a>
          <a
            className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
            href={`/api/workspaces/${workspaceId}/board-decision-replay-snapshots/${record.id}?format=csv`}
          >
            <Download className="size-3.5" />
            CSV {formatByteSize(record.csvByteSize)}
          </a>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function BoardDecisionReplayAuditPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: BoardDecisionReplaySnapshotHistoryReport | null;
  report: BoardDecisionReplayAuditReport;
  workspaceId?: string;
}) {
  const [snapshotHistory, setSnapshotHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveSnapshot() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-decision-replay-snapshots`, {
        body: JSON.stringify({ report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardDecisionReplaySnapshotHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board decision replay snapshot could not be saved.");
      }

      setSnapshotHistory(payload.history);
      toast.success("Board decision replay snapshot saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board decision replay snapshot could not be saved.");
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
              Board decision replay audit
            </CardTitle>
            <CardDescription>Replays signed board approvals against later incidents, release evidence drift, and runbook outcomes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.replayScore < 80 ? "destructive" : "outline"}>
              {report.summary.replayScore}/100 replay
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            {snapshotHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={snapshotHistory.csvFileName} href={snapshotHistory.csvDataUri}>
                <History className="size-4" />
                History CSV
              </a>
            ) : null}
            {canPersist && workspaceId ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={saveSnapshot} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save snapshot
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SummaryTile detail={formatDate(report.summary.latestApprovalAt)} label="Approvals" value={`${report.summary.activeApprovalCount}`} />
          <SummaryTile detail="ready approvals" label="Ready" value={`${report.summary.readyApprovalCount}`} />
          <SummaryTile detail="after approval" label="Incidents" value={`${report.summary.laterIncidentCount}`} />
          <SummaryTile detail="drift rows" label="Evidence" value={`${report.summary.releaseEvidenceDriftCount}`} />
          <SummaryTile detail="blocked runbook" label="Runbook" value={`${report.summary.runbookBlockedCount}`} />
          <SummaryTile detail="blocked rows" label="Replay risk" value={`${report.summary.blockedRowCount}`} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="saved replay audits" label="Snapshots" value={`${snapshotHistory?.summary.totalSnapshotCount ?? 0}`} />
          <SummaryTile detail="latest vs previous" label="Score delta" value={formatDelta(snapshotHistory?.summary.scoreDelta ?? 0)} />
          <SummaryTile detail="latest vs previous" label="Blocked delta" value={formatDelta(snapshotHistory?.summary.blockedRowDelta ?? 0)} />
          <SummaryTile detail="unique actors" label="Actors" value={`${snapshotHistory?.summary.actorCount ?? 0}`} />
          <SummaryTile detail={formatDate(snapshotHistory?.summary.latestSavedAt ?? null)} label="Snapshot trend" value={snapshotHistory?.summary.statusTrend ?? "flat"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Replay next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
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
            <p className="text-sm font-medium">Replay trend baseline</p>
            <p className="mt-1 text-sm text-muted-foreground">Save at least two board decision replay snapshots to compare approval assurance movement.</p>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Approval</TableHead>
              <TableHead>Replay signal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Baseline</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length > 0 ? (
              report.rows.slice(0, 12).map((row) => <ReplayRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No board decision replay rows are available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

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
              {snapshotHistory.records.length > 0 ? (
                snapshotHistory.records.slice(0, 6).map((record) => <SnapshotRow key={record.id} record={record} workspaceId={workspaceId ?? report.workspaceId} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    No board decision replay snapshots are saved yet.
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
