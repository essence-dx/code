import { Activity, ArrowDownRight, ArrowUpRight, Diff, Download, Hash, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardApprovalPacketDiffDirection,
  BoardApprovalPacketDiffReport,
  BoardApprovalPacketDiffRow,
  BoardApprovalPacketDiffSeverity,
  BoardApprovalPacketDiffStatus,
} from "@/features/projects/board-approval-diff";

function statusVariant(status: BoardApprovalPacketDiffStatus | BoardApprovalPacketDiffSeverity) {
  if (status === "blocked" || status === "critical") {
    return "destructive" as const;
  }

  return status === "watch" || status === "warning" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalPacketDiffStatus | BoardApprovalPacketDiffSeverity }) {
  if (status === "ready" || status === "info") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" || status === "warning" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function DirectionIcon({ direction }: { direction: BoardApprovalPacketDiffDirection }) {
  if (direction === "improvement") {
    return <ArrowUpRight className="size-3.5" />;
  }

  return direction === "regression" ? <ArrowDownRight className="size-3.5" /> : <Hash className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No baseline";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatValue(value: string | number | null) {
  if (value === null) {
    return "None";
  }

  return String(value);
}

function formatDelta(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return value > 0 ? `+${value}` : String(value);
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

function DiffRow({ row }: { row: BoardApprovalPacketDiffRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <DirectionIcon direction={row.direction} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.metric}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.sourceLabel}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.severity)}>
          <StatusIcon status={row.severity} />
          {row.severity}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.kind}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="break-all">{formatValue(row.previousValue)}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="break-all font-medium text-foreground">{formatValue(row.currentValue)}</p>
      </TableCell>
      <TableCell className="text-sm">{formatDelta(row.delta)}</TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardApprovalDiffPanel({ report }: { report: BoardApprovalPacketDiffReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Diff className="size-4" />
              Board packet diff
            </CardTitle>
            <CardDescription>Compares the current board packet against saved approval packets and executive release snapshots.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.regressionCount > 0 ? "destructive" : "outline"}>
              {report.summary.regressionCount} regressions
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SummaryTile detail={report.summary.baselinePacketId ?? "No saved packet"} label="Baseline packet" value={formatDate(report.summary.baselineSavedAt)} />
          <SummaryTile detail={report.summary.currentPacketId} label="Score delta" value={formatDelta(report.summary.scoreDelta)} />
          <SummaryTile detail="blocked sign-offs" label="Blocker delta" value={formatDelta(report.summary.blockerDelta)} />
          <SummaryTile detail="all drift rows" label="Changes" value={`${report.summary.changeCount}`} />
          <SummaryTile detail="warnings" label="Critical" value={`${report.summary.criticalChangeCount}`} />
          <SummaryTile detail="packet hash changed" label="Checksum" value={report.summary.checksumChanged ? "changed" : "stable"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Diff next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Previous</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.length > 0 ? (
              report.rows.slice(0, 10).map((row) => <DiffRow key={`${row.kind}:${row.metric}`} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No board packet drift is active against saved packet and executive snapshot baselines.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
