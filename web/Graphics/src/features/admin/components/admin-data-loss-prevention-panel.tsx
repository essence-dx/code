"use client";

import {
  ClipboardCopy,
  Code2,
  Download,
  FileJson2,
  FileWarning,
  PlugZap,
  Route,
  ShieldAlert,
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
  AdminDataLossPreventionCategory,
  AdminDataLossPreventionReport,
  AdminDataLossPreventionStatus,
} from "@/features/admin/admin-data-loss-prevention";
import {
  getAdminDataLossPreventionCsv,
  getAdminDataLossPreventionJson,
  getAdminDataLossPreventionMarkdown,
} from "@/features/admin/admin-data-loss-prevention-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminDataLossPreventionPanelProps = {
  report: AdminDataLossPreventionReport;
};

export function AdminDataLossPreventionPanel({
  report,
}: AdminDataLossPreventionPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminDataLossPreventionJson(report),
      filename: "data-loss-prevention.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminDataLossPreventionCsv(report),
      filename: "data-loss-prevention.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminDataLossPreventionMarkdown(report),
      filename: "data-loss-prevention.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminDataLossPreventionMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Data-loss prevention
          </CardTitle>
          <CardDescription>
            Export, embed, download, plugin, public route, and sensitive
            metadata controls before design work leaves the workspace.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">
            {report.blockedCount} blocked / {report.reviewCount} review
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Sensitive" value={report.sensitiveFindingCount} />
          <Metric label="Files" value={report.sensitiveFileCount} />
          <Metric label="Exports" value={report.sensitiveExportEventCount} />
          <Metric label="Downloads" value={report.downloadExposureCount} />
          <Metric label="Plugin risk" value={report.pluginRiskCount} />
          <Metric label="Routes" value={report.publicRouteRiskCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => {
            const Icon = getCategoryIcon(row.category);

            return (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{row.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{row.category}</Badge>
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                      <Badge variant="outline">{row.value}</Badge>
                      {row.latestAt ? (
                        <Badge variant="outline">
                          {formatDate(row.latestAt)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.detail}
                </p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
                <div className="mt-2 rounded-md border border-border bg-background p-2 text-xs">
                  {row.workflow}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">DLP workflows</div>
            <Badge variant="outline">{report.workflows.length} workflows</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{workflow.title}</div>
                  <Badge variant={getStatusVariant(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{workflow.scope}</Badge>
                  <Badge variant="outline">{workflow.owner}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {workflow.evidence}
                </p>
                <p className="mt-2">{workflow.action}</p>
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getCategoryIcon(category: AdminDataLossPreventionCategory) {
  if (category === "downloads") {
    return Download;
  }

  if (category === "embeds") {
    return Code2;
  }

  if (category === "plugin-runs") {
    return PlugZap;
  }

  if (category === "public-routes") {
    return Route;
  }

  if (category === "sensitive-metadata") {
    return FileWarning;
  }

  return FileJson2;
}

function getStatusVariant(status: AdminDataLossPreventionStatus) {
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
