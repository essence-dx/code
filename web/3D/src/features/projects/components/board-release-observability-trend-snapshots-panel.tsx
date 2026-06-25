import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Download, FileJson2, LineChart, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseObservabilityTrendSnapshot,
  BoardReleaseObservabilityTrendSnapshotDirection,
  BoardReleaseObservabilityTrendSnapshotReport,
  BoardReleaseObservabilityTrendSnapshotStatus,
} from "@/features/projects/board-release-observability-trend-snapshots";

function statusVariant(status: BoardReleaseObservabilityTrendSnapshotStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseObservabilityTrendSnapshotStatus }) {
  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : status === "watch" ? <TriangleAlert className="size-3.5" /> : <Activity className="size-3.5" />;
}

function DirectionIcon({ direction }: { direction: BoardReleaseObservabilityTrendSnapshotDirection }) {
  if (direction === "improving") {
    return <ArrowUpRight className="size-3.5" />;
  }

  return direction === "declining" ? <ArrowDownRight className="size-3.5" /> : <ArrowRight className="size-3.5" />;
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

function SnapshotRow({ snapshot }: { snapshot: BoardReleaseObservabilityTrendSnapshot }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <LineChart className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{snapshot.title}</p>
            <p className="truncate text-xs text-muted-foreground">{snapshot.metric}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(snapshot.status)}>
          <StatusIcon status={snapshot.status} />
          {snapshot.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={snapshot.direction === "declining" ? "secondary" : "outline"}>
          <DirectionIcon direction={snapshot.direction} />
          {snapshot.direction}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <p>
          {snapshot.previousValue} to {snapshot.currentValue}
        </p>
        <p className="text-xs text-muted-foreground">
          {snapshot.delta > 0 ? "+" : ""}
          {snapshot.delta}
        </p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{snapshot.nextAction}</p>
        <p className="mt-1 truncate font-mono">{snapshot.snapshotHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseObservabilityTrendSnapshotsPanel({ report }: { report: BoardReleaseObservabilityTrendSnapshotReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-4" />
              Board release observability trend snapshots
            </CardTitle>
            <CardDescription>Trend movement for readiness score, blocked filters, retry load, and timeline closure.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="tracked metrics" label="Snapshots" value={`${report.summary.snapshotCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch metrics" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="better than prior" label="Improving" value={`${report.summary.improvingCount}`} />
          <SummaryTile detail="worse than prior" label="Declining" value={`${report.summary.decliningCount}`} />
          <SummaryTile detail="readiness movement" label="Score Delta" value={`${report.summary.readinessScoreDelta > 0 ? "+" : ""}${report.summary.readinessScoreDelta}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Trend next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Movement</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.snapshots.map((snapshot) => <SnapshotRow key={snapshot.metric} snapshot={snapshot} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
