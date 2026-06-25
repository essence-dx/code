import { CalendarClock, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveOversightExceptionRenewalCalendarReport,
  BoardReleaseArchiveOversightExceptionRenewalCalendarRow,
  BoardReleaseArchiveOversightExceptionRenewalStatus,
} from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";

function statusVariant(status: BoardReleaseArchiveOversightExceptionRenewalStatus | BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"]["status"]) {
  if (status === "overdue" || status === "blocked") {
    return "destructive" as const;
  }

  return status === "due-soon" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveOversightExceptionRenewalStatus | BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"]["status"] }) {
  if (status === "complete" || status === "scheduled") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "overdue" || status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function RenewalRow({ row }: { row: BoardReleaseArchiveOversightExceptionRenewalCalendarRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <CalendarClock className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{new Date(row.dueAt).toLocaleDateString()}</TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.renewalEvidenceHash ?? "renewal evidence pending"}</p>
        <p className="mt-1 truncate font-mono">{row.renewalHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveOversightExceptionRenewalCalendarPanel({
  report,
}: {
  report: BoardReleaseArchiveOversightExceptionRenewalCalendarReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Archive oversight exception renewal calendar
            </CardTitle>
            <CardDescription>Renewal schedule for custody, retention, access, restore, and closeout evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.renewalScore < 80 ? "destructive" : "outline"}>
              {report.summary.renewalScore}/100 renewal
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
          <SummaryTile detail="renewal rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="scheduled evidence" label="Scheduled" value={`${report.summary.scheduledCount}`} />
          <SummaryTile detail="due soon" label="Due soon" value={`${report.summary.dueSoonCount}`} />
          <SummaryTile detail="overdue evidence" label="Overdue" value={`${report.summary.overdueCount}`} />
          <SummaryTile detail="completed renewals" label="Complete" value={`${report.summary.completedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Renewal next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.renewalCalendarHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Renewal evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RenewalRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
