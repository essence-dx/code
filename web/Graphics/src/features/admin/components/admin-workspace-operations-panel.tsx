"use client";

import {
  ClipboardCopy,
  Database,
  Download,
  FileJson2,
  HardDrive,
  ListChecks,
  MailCheck,
  PlayCircle,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminWorkspaceOperationsReport,
  AdminWorkspaceOperationsStatus,
} from "@/features/admin/admin-workspace-operations";
import {
  getAdminWorkspaceOperationsCsv,
  getAdminWorkspaceOperationsJson,
  getAdminWorkspaceOperationsMarkdown,
} from "@/features/admin/admin-workspace-operations-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminWorkspaceOperationsPanelProps = {
  report: AdminWorkspaceOperationsReport;
};

const metricIcons = {
  "admin-queue": ListChecks,
  automation: Workflow,
  database: Database,
  "deploy-smoke": PlayCircle,
  email: MailCheck,
  storage: HardDrive,
} as const;

export function AdminWorkspaceOperationsPanel({
  report,
}: AdminWorkspaceOperationsPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminWorkspaceOperationsJson(report),
      filename: "workspace-operations-dashboard.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminWorkspaceOperationsCsv(report),
      filename: "workspace-operations-dashboard.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminWorkspaceOperationsMarkdown(report),
      filename: "workspace-operations-dashboard.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminWorkspaceOperationsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" />
            Workspace operations
          </CardTitle>
          <CardDescription>
            Storage budgets, database health, email delivery, deploy smoke
            recency, automation runs, and admin action queues.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {report.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((row) => {
            const Icon = metricIcons[row.category];

            return (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{row.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{row.category}</Badge>
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                      <Badge variant="outline">{row.value}</Badge>
                      {row.latestAt ? (
                        <Badge variant="outline">{formatDate(row.latestAt)}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
                {row.target ? (
                  <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                    {row.target}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Operations command queue</div>
            <Badge variant="outline">{report.commands.length} commands</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.commands.slice(0, 8).map((command) => (
              <div
                key={command}
                className="truncate rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-[11px]"
              >
                {command}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  metric,
}: {
  metric: AdminWorkspaceOperationsReport["metrics"][number];
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs text-muted-foreground">
          {metric.label}
        </div>
        <Badge variant={getStatusVariant(metric.status)}>{metric.status}</Badge>
      </div>
      <div className="mt-2 truncate font-mono text-lg font-semibold">
        {metric.value}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {metric.detail}
      </p>
    </div>
  );
}

function getStatusVariant(status: AdminWorkspaceOperationsStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
