import Link from "next/link";
import { BookOpenCheck, CheckCircle2, Clock3, ExternalLink, ShieldAlert, TriangleAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookRecordStatus, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

function statusVariant(status: WorkspaceReleaseRunbookRecordStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  if (status === "in-progress") {
    return "secondary";
  }

  return "outline";
}

function statusIcon(status: WorkspaceReleaseRunbookRecordStatus) {
  if (status === "complete") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "blocked") {
    return <TriangleAlert className="size-3.5" />;
  }

  return <Clock3 className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function RunbookRow({ record }: { record: WorkspaceReleaseRunbookRecord }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{record.title}</p>
          <p className="truncate text-xs text-muted-foreground">{record.projectName ?? "Workspace release"}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{record.checklistEvidence[0] ?? record.detail}</p>
          {record.comments.at(-1) ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">Latest: {record.comments.at(-1)?.body}</p> : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          {statusIcon(record.status)}
          {record.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <UserRound className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate">{record.ownerName}</p>
            <p className="truncate text-xs text-muted-foreground">{record.ownerEmail ?? "No email"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(record.completedAt ?? record.dueAt)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-muted-foreground">
            {record.blockerCount} blockers, {record.attachments.length} files, {record.transitionHistory.length} transitions
          </span>
          <Link className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={record.auditLogHref}>
            <ExternalLink className="size-3.5" />
            Audit
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function WorkspaceReleaseRunbookPanel({
  error,
  report,
}: {
  error?: string | null;
  report: WorkspaceReleaseRunbookReport;
}) {
  const visibleRecords = report.records.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="size-4" />
              Release runbook
            </CardTitle>
            <CardDescription>Owner-assigned execution records with due dates, checklist evidence, blockers, and audit-log links.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.inProgressCount} in progress
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.history.batchCount} batches
            </Badge>
          </div>
        </div>
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Owners</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.ownerCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Complete</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.completeCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.scheduledCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Next due</p>
            <p className="mt-2 text-sm font-semibold">{formatDate(report.summary.nextDueAt)}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due/completed</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRecords.length > 0 ? (
              visibleRecords.map((record) => <RunbookRow key={record.sourceKey} record={record} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No release runbook records are available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
