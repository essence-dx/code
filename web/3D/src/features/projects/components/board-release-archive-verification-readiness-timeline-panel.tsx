import { CheckCircle2, Download, FileJson2, ListChecks, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveVerificationReadinessTimelineReport,
  BoardReleaseArchiveVerificationReadinessTimelineRow,
  BoardReleaseArchiveVerificationReadinessTimelineStatus,
} from "@/features/projects/board-release-archive-verification-readiness-timeline";

function statusVariant(status: BoardReleaseArchiveVerificationReadinessTimelineStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveVerificationReadinessTimelineStatus }) {
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

function TimelineRow({ row }: { row: BoardReleaseArchiveVerificationReadinessTimelineRow }) {
  return (
    <TableRow>
      <TableCell className="w-16 font-mono text-xs text-muted-foreground">{row.sequence}</TableCell>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ListChecks className="size-3.5" />
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
        <p className="font-medium">{row.kind}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.timelineHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveVerificationReadinessTimelinePanel({
  report,
}: {
  report: BoardReleaseArchiveVerificationReadinessTimelineReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Archive verification readiness timeline
            </CardTitle>
            <CardDescription>Board-review order for certificate, replay, auditor, revocation, exception, and distribution evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.timelineScore < 80 ? "destructive" : "outline"}>
              {report.summary.timelineScore}/100 timeline
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
          <SummaryTile detail="timeline events" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="board-ready" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Timeline" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Timeline next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.timelineHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seq</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <TimelineRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
