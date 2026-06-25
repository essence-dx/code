import { CalendarClock, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveEvidenceExceptionRenewalRow,
  BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport,
  BoardReleaseArchiveEvidenceExceptionRenewalStatus,
} from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";

function statusVariant(status: BoardReleaseArchiveEvidenceExceptionRenewalStatus) {
  if (status === "overdue" || status === "blocked") {
    return "destructive" as const;
  }

  return status === "due-soon" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveEvidenceExceptionRenewalStatus }) {
  if (status === "scheduled") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" || status === "overdue" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function RenewalRow({ row }: { row: BoardReleaseArchiveEvidenceExceptionRenewalRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <CalendarClock className="size-3.5" />
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
        <p className="mt-1 text-xs text-muted-foreground">{row.hoursUntilDue} hours</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">{row.ownerEmail}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{row.dueAt.slice(0, 10)}</p>
        <p className="truncate text-xs text-muted-foreground">{row.signedPacketHash ?? "missing sign-off"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.renewalHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveEvidenceExceptionRenewalSchedulerPanel({
  report,
}: {
  report: BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Archive evidence exception renewals
            </CardTitle>
            <CardDescription>Renewal schedule for expiring exception notes, stale packet hash sign-offs, and reviewer acknowledgement windows.</CardDescription>
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="renewal rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="needs action" label="Overdue" value={`${report.summary.overdueCount}`} />
          <SummaryTile detail="blocked evidence" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="closing soon" label="Due soon" value={`${report.summary.dueSoonCount}`} />
          <SummaryTile detail="future windows" label="Scheduled" value={`${report.summary.scheduledCount}`} />
          <SummaryTile detail="workspace" label="Renewal" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Renewal next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.renewalHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Renewal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RenewalRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
