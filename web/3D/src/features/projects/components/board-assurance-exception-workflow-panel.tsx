import { CheckCircle2, Clock3, Download, FileWarning, ShieldAlert, ShieldCheck, ShieldQuestion, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAssuranceExceptionStatus,
  BoardAssuranceExceptionWorkflowReport,
  BoardAssuranceExceptionWorkflowRow,
  BoardAssuranceReleaseGateStatus,
} from "@/features/projects/board-assurance-exceptions";

const statusIcon: Record<BoardAssuranceExceptionStatus, typeof ShieldQuestion> = {
  approved: CheckCircle2,
  expired: Clock3,
  pending: ShieldQuestion,
  rejected: TriangleAlert,
  "release-gate-blocked": ShieldAlert,
  "request-needed": FileWarning,
};

function statusVariant(status: BoardAssuranceExceptionStatus | BoardAssuranceReleaseGateStatus) {
  if (status === "expired" || status === "rejected" || status === "release-gate-blocked" || status === "blocked" || status === "missing") {
    return "destructive" as const;
  }

  if (status === "pending" || status === "request-needed") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function expiryLabel(days: number | null) {
  if (days === null) {
    return "Needs expiry";
  }

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} expired`;
  }

  return days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"} left`;
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

function ExceptionRow({ row }: { row: BoardAssuranceExceptionWorkflowRow }) {
  const Icon = statusIcon[row.status];

  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.replayKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={statusVariant(row.status)}>
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.replayStatus} replay</p>
      </TableCell>
      <TableCell className="whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{expiryLabel(row.expiresInDays)}</p>
        <p className="mt-1">{formatDate(row.expiresAt)}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <Badge className="rounded-md" variant={statusVariant(row.releaseGateStatus)}>
          {row.releaseGateStatus}
        </Badge>
        <p className="mt-2">{row.blockedReleaseGateCount} blocked, {row.dueReleaseGateCount} due, {row.checkedReleaseGateCount} checked</p>
        <p className="mt-1 line-clamp-1">{row.releaseGateLabels.join(", ") || row.releaseGateSourceKeys.join(", ") || "No gate attached"}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.signedOffBy ?? "No sign-off"}</p>
        <p className="mt-1">{row.approverNote ?? row.ownerNote}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAssuranceExceptionWorkflowPanel({ report }: { report: BoardAssuranceExceptionWorkflowReport }) {
  const visibleRows = report.rows.slice(0, 12);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Board assurance exceptions
            </CardTitle>
            <CardDescription>Scoped replay-blocker exception workflow with expiry dates, approver sign-off, and release-gate checks.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={statusVariant(report.summary.status)}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.workflowScore < 80 ? "destructive" : "outline"}>
              {report.summary.workflowScore}/100 workflow
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
          <SummaryTile detail="replay blockers" label="Exceptions" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="signed and gate-clear" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="needs sign-off" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="needs request" label="Requests" value={`${report.summary.requestNeededCount}`} />
          <SummaryTile detail="blocked gate checks" label="Gate blocked" value={`${report.summary.releaseGateBlockedCount}`} />
          <SummaryTile detail="approved, <= 7 days" label="Expiring" value={`${report.summary.expiringSoonCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Exception next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        {visibleRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Replay scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Release gates</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{visibleRows.map((row) => <ExceptionRow key={row.id} row={row} />)}</TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No board assurance exceptions are needed for the current replay audit.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
