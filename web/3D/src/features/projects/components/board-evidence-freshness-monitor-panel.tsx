import { CheckCircle2, Clock3, Download, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceFreshnessMonitorReport,
  BoardEvidenceFreshnessRow,
  BoardEvidenceFreshnessStatus,
  BoardEvidenceFreshnessSummaryStatus,
} from "@/features/projects/board-evidence-freshness-monitor";

function statusVariant(status: BoardEvidenceFreshnessStatus | BoardEvidenceFreshnessSummaryStatus) {
  if (status === "blocked" || status === "expired" || status === "stale") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceFreshnessStatus | BoardEvidenceFreshnessSummaryStatus }) {
  if (status === "ready" || status === "fresh") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" || status === "expired" || status === "stale" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function FreshnessRow({ row }: { row: BoardEvidenceFreshnessRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Clock3 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.ageDays}d</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.kind}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">{row.owner}</TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
      <TableCell className="max-w-[220px] break-all font-mono text-xs text-muted-foreground">{row.sourceHash ?? row.sourceId}</TableCell>
    </TableRow>
  );
}

export function BoardEvidenceFreshnessMonitorPanel({ report }: { report: BoardEvidenceFreshnessMonitorReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="size-4" />
              Board evidence freshness
            </CardTitle>
            <CardDescription>Stale packet evidence, old replay snapshots, pending acknowledgements, and aging notification route proof.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.freshnessScore < 80 ? "destructive" : "outline"}>
              {report.summary.freshnessScore}/100 freshness
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="evidence checks" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="stale evidence" label="Stale" value={`${report.summary.staleCount}`} />
          <SummaryTile detail="expired ack" label="Expired" value={`${report.summary.expiredCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="fresh proof" label="Fresh" value={`${report.summary.freshCount}`} />
          <SummaryTile detail="workspace" label="Monitor" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Freshness next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Source hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <FreshnessRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
