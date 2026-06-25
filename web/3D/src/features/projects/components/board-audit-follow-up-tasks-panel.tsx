import { CheckCircle2, ClipboardCheck, Download, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditFollowUpTask,
  BoardAuditFollowUpTaskSeverity,
  BoardAuditFollowUpTasksReport,
  PersistedBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";

function severityVariant(severity: BoardAuditFollowUpTaskSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "high" ? "secondary" : "outline";
}

function statusVariant(status: BoardAuditFollowUpTasksReport["summary"]["status"]) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditFollowUpTasksReport["summary"]["status"] }) {
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

function TaskRow({ task }: { task: BoardAuditFollowUpTask }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{task.title}</p>
            <p className="truncate text-xs text-muted-foreground">{task.sourceLabel}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={severityVariant(task.severity)}>
          {task.severity}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{task.status}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{task.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">{task.ownerEmail ?? "Needs owner"}</p>
      </TableCell>
      <TableCell className="text-sm">{task.dueAt.slice(0, 10)}</TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{task.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

function hasJsonExport(report: BoardAuditFollowUpTasksReport): report is PersistedBoardAuditFollowUpTasksReport {
  return "jsonDataUri" in report && typeof report.jsonDataUri === "string";
}

export function BoardAuditFollowUpTasksPanel({ report }: { report: BoardAuditFollowUpTasksReport | PersistedBoardAuditFollowUpTasksReport }) {
  const persisted = "closedCount" in report.summary ? report.summary : null;

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Board audit follow-up tasks
            </CardTitle>
            <CardDescription>Generated follow-ups from digest blockers, stale evidence, overloaded reviewers, and unresolved decisions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.taskScore < 80 ? "destructive" : "outline"}>
              {report.summary.taskScore}/100 task score
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            {hasJsonExport(report) ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
                <Download className="size-4" />
                JSON
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="open follow-ups" label="Tasks" value={`${report.summary.taskCount}`} />
          <SummaryTile detail="urgent" label="Critical" value={`${report.summary.criticalCount}`} />
          <SummaryTile detail="next tier" label="High" value={`${report.summary.highCount}`} />
          <SummaryTile detail="monitor" label="Medium" value={`${report.summary.mediumCount}`} />
          <SummaryTile detail="needs owner" label="Unassigned" value={`${report.summary.unassignedCount}`} />
          {persisted ? <SummaryTile detail="closeout" label="Closed" value={`${persisted.closedCount}`} /> : null}
          <SummaryTile detail="workspace" label="Audit" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Task next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.tasks.map((task) => <TaskRow key={task.id} task={task} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
