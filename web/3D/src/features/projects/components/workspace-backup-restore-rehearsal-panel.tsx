"use client";

import { ArchiveRestore, CheckCircle2, Clock3, DatabaseBackup, FileArchive, FileClock, FolderSync, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkspaceBackupRestoreRehearsalReport, WorkspaceBackupRestoreScope, WorkspaceBackupRestoreStatus } from "@/features/projects/workspace-backup-restore-rehearsal";

const scopeIcon: Record<WorkspaceBackupRestoreScope, typeof ArchiveRestore> = {
  assets: FileArchive,
  "audit-logs": FileClock,
  "evidence-packets": ShieldAlert,
  projects: FolderSync,
  "release-runbooks": DatabaseBackup,
};

function statusVariant(status: WorkspaceBackupRestoreStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: WorkspaceBackupRestoreStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "watch") {
    return <Clock3 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function WorkspaceBackupRestoreRehearsalPanel({ report }: { report: WorkspaceBackupRestoreRehearsalReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArchiveRestore className="size-4" />
              Backup and restore rehearsal
            </CardTitle>
            <CardDescription>Restore coverage for projects, assets, audit logs, release runbooks, and evidence packets in {report.workspaceName}.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.score}/100 rehearsal readiness
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Ready scopes</p>
            <p className="mt-2 text-xl font-semibold">
              {report.summary.readyCount}/{report.summary.totalCount}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Watch scopes</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.watchCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Blocked scopes</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.blockedCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="mt-2 text-sm font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Restore target</p>
            <p className="mt-2 text-sm font-medium">Clean workspace import</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sources</TableHead>
              <TableHead>Exercise</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = scopeIcon[row.id];

              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[340px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{row.backupTarget}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.sourceCount} records</p>
                    <p className="mt-1 line-clamp-2">{row.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-2">{row.restoreExercise}</p>
                    <p className="mt-1">
                      {row.recoveryTargetMinutes} min target - {row.ownerHint}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
