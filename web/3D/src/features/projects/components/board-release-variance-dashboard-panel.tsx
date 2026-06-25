import { Activity, CheckCircle2, Download, LineChart, ShieldAlert, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseVarianceDashboard,
  BoardReleaseVarianceDirection,
  BoardReleaseVarianceRow,
  BoardReleaseVarianceStatus,
} from "@/features/projects/board-release-variance-dashboard";

function statusVariant(status: BoardReleaseVarianceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseVarianceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function DirectionIcon({ direction }: { direction: BoardReleaseVarianceDirection }) {
  if (direction === "improving") {
    return <TrendingUp className="size-3.5" />;
  }

  if (direction === "declining") {
    return <TrendingDown className="size-3.5" />;
  }

  return <Activity className="size-3.5" />;
}

function valueLabel(row: BoardReleaseVarianceRow, value: number) {
  if (row.unit === "percent") {
    return `${value}%`;
  }

  return `${value}`;
}

function deltaLabel(row: BoardReleaseVarianceRow) {
  const prefix = row.delta > 0 ? "+" : "";

  if (row.unit === "percent") {
    return `${prefix}${row.delta}%`;
  }

  return `${prefix}${row.delta}`;
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

function VarianceRow({ row }: { row: BoardReleaseVarianceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <DirectionIcon direction={row.direction} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.direction}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{valueLabel(row, row.currentValue)}</p>
        <p className="mt-1 text-xs text-muted-foreground">from {valueLabel(row, row.previousValue)}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{deltaLabel(row)}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseVarianceDashboardPanel({ dashboard }: { dashboard: BoardReleaseVarianceDashboard }) {
  const latestTrend = dashboard.trendPoints.at(-1);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-4" />
              Board release variance
            </CardTitle>
            <CardDescription>Approval score, blocker drift, incident recurrence, and runbook follow-through trends for board assurance.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(dashboard.summary.status)}>
              <StatusIcon status={dashboard.summary.status} />
              {dashboard.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={dashboard.summary.varianceScore < 80 ? "destructive" : "outline"}>
              {dashboard.summary.varianceScore}/100 variance
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={dashboard.csvFileName} href={dashboard.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="vs latest approval" label="Approval" value={`${dashboard.summary.approvalScoreDelta}`} />
          <SummaryTile detail="new active blockers" label="Blockers" value={`${dashboard.summary.blockerDrift}`} />
          <SummaryTile detail="later incidents" label="Incidents" value={`${dashboard.summary.incidentRecurrenceDelta}`} />
          <SummaryTile detail="completion delta" label="Runbook" value={`${dashboard.summary.runbookFollowThroughDelta}%`} />
          <SummaryTile detail="snapshot points" label="Trend" value={`${dashboard.summary.trendPointCount}`} />
          <SummaryTile detail={`${dashboard.summary.blockedCount} blocked`} label="Rows" value={`${dashboard.summary.rowCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Variance next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{dashboard.summary.nextAction}</p>
          {latestTrend ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Latest replay trend: {latestTrend.replayScore}/100 score, {latestTrend.blockedRows} blocked rows, {latestTrend.laterIncidents} later incidents.
            </p>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{dashboard.rows.map((row) => <VarianceRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
