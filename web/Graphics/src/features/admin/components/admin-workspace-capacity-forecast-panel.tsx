"use client";

import { ClipboardCopy, Database, Download, FileJson2 } from "lucide-react";
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
  AdminWorkspaceCapacityForecastReport,
  AdminWorkspaceCapacityStatus,
} from "@/features/admin/admin-workspace-capacity-forecast";
import {
  getAdminWorkspaceCapacityForecastCsv,
  getAdminWorkspaceCapacityForecastJson,
  getAdminWorkspaceCapacityForecastMarkdown,
} from "@/features/admin/admin-workspace-capacity-forecast";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminWorkspaceCapacityForecastPanelProps = {
  report: AdminWorkspaceCapacityForecastReport;
};

export function AdminWorkspaceCapacityForecastPanel({
  report,
}: AdminWorkspaceCapacityForecastPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminWorkspaceCapacityForecastJson(report),
      filename: "admin-workspace-capacity-forecast.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminWorkspaceCapacityForecastCsv(report),
      filename: "admin-workspace-capacity-forecast.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminWorkspaceCapacityForecastMarkdown(report),
      filename: "admin-workspace-capacity-forecast.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminWorkspaceCapacityForecastMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            Workspace capacity forecast
          </CardTitle>
          <CardDescription>
            File, version, comment, route analytics, collaboration room,
            storage, and database growth projections for operators.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.rowCount} dimensions</Badge>
          <Badge variant="outline">{report.storageUsedPercent}% storage</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Files" value={report.activeFileCount} />
          <Metric label="Versions" value={report.versionCount} />
          <Metric label="Comments" value={report.commentCount} />
          <Metric label="Route events" value={report.routeEventCount} />
        </div>

        <div className="grid gap-2 text-xs md:grid-cols-3">
          <Metric label="Storage now" value={formatBytes(report.storageUsedBytes)} />
          <Metric
            label="Storage 30d"
            value={formatBytes(report.projected30DayStorageBytes)}
          />
          <Metric
            label="Storage 90d"
            value={formatBytes(report.projected90DayStorageBytes)}
          />
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.dimension}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">
                      {row.utilizationPercent}% projected
                    </Badge>
                    <Badge variant="outline">{row.owner}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                <Info label="Now" value={formatRowValue(row.dimension, row.current)} />
                <Info
                  label="30 days"
                  value={formatRowValue(row.dimension, row.projected30Day)}
                />
                <Info
                  label="90 days"
                  value={formatRowValue(row.dimension, row.projected90Day)}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
            </div>
          ))}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminWorkspaceCapacityStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatRowValue(dimension: string, value: number) {
  return dimension === "storage" ? formatBytes(value) : `${value}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}
