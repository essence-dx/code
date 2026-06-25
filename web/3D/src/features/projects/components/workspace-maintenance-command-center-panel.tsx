"use client";

import { Archive, CheckCircle2, ClipboardList, Hammer, PackageSearch, ShieldAlert, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  WorkspaceMaintenanceActionPriority,
  WorkspaceMaintenanceCommandCenterReport,
  WorkspaceMaintenanceScope,
  WorkspaceMaintenanceStatus,
} from "@/features/projects/workspace-maintenance-command-center";

const scopeIcon: Record<WorkspaceMaintenanceScope, typeof Hammer> = {
  "cleanup-tasks": ClipboardList,
  "expiring-evidence": Archive,
  "inactive-members": Users2,
  "old-artifacts": PackageSearch,
  "stale-projects": Hammer,
};

function statusVariant(status: WorkspaceMaintenanceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function priorityVariant(priority: WorkspaceMaintenanceActionPriority) {
  if (priority === "high") {
    return "destructive" as const;
  }

  return priority === "medium" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: WorkspaceMaintenanceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function WorkspaceMaintenanceCommandCenterPanel({ report }: { report: WorkspaceMaintenanceCommandCenterReport }) {
  const visibleActions = report.actions.slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="size-4" />
              Workspace maintenance
            </CardTitle>
            <CardDescription>Command center for stale scenes, inactive members, old artifacts, expiring evidence, and cleanup tasks.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.maintenanceScore}/100 maintenance
            </Badge>
            <Badge className="rounded-md" variant={report.summary.highPriorityActionCount > 0 ? "destructive" : "outline"}>
              {report.summary.highPriorityActionCount} high priority
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Scopes</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Ready</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.readyCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Watch</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.watchCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.blockedCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Cleanup queue</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.cleanupTaskCount}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Maintenance signal</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = scopeIcon[row.id];

              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[300px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.ownerHint}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.recordCount}</TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.metricLabel}</p>
                    <p className="mt-1 line-clamp-2">{row.detail}</p>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-2">{row.actionLabel}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {visibleActions.length > 0 ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="size-4" />
              Cleanup queue
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {visibleActions.map((action) => {
                const Icon = scopeIcon[action.scope];

                return (
                  <div className="rounded-md border bg-background p-3" key={action.id}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{action.label}</p>
                          <Badge className="rounded-md" variant={priorityVariant(action.priority)}>
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.detail}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {action.ownerHint} - {action.dueLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No maintenance cleanup tasks are currently queued.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
