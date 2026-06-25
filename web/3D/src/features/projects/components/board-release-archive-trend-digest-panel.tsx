import { Activity, CheckCircle2, Download, FileJson2, ShieldAlert, TrendingDown, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveTrendDigestReport,
  BoardReleaseArchiveTrendDigestRow,
} from "@/features/projects/board-release-archive-trend-digest";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

function statusVariant(status: BoardReleaseCloseoutReadinessGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutReadinessGateStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function TrendRow({ row }: { row: BoardReleaseArchiveTrendDigestRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Activity className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
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
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{row.metric}</p>
        <p className="truncate text-xs text-muted-foreground">{row.digestId}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-sm text-muted-foreground">
        <p className="line-clamp-3">{row.detail}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.digestHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveTrendDigestPanel({ report }: { report: BoardReleaseArchiveTrendDigestReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="size-4" />
              Board release archive trend digest
            </CardTitle>
            <CardDescription>Closeout score movement, recurring blocker categories, and owner follow-through for archived release intelligence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.closeoutScoreMovement < 0 ? "destructive" : "outline"}>
              {report.summary.closeoutScoreMovement} movement
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="digest rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="archive trend score" label="Trend" value={`${report.summary.trendScore}`} />
          <SummaryTile detail="score movement" label="Movement" value={`${report.summary.closeoutScoreMovement}`} />
          <SummaryTile detail="recurring categories" label="Recurring" value={`${report.summary.recurringBlockerCategoryCount}`} />
          <SummaryTile detail="checksum" label="Hash" value={report.summary.digestHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Trend digest next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.digestHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trend</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TrendRow key={row.digestId} row={row} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
