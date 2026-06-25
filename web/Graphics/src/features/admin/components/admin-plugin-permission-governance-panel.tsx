"use client";

import { ClipboardCopy, Download, FileJson2, PlugZap } from "lucide-react";
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
  AdminPluginPermissionGovernanceReport,
  AdminPluginPermissionGovernanceStatus,
} from "@/features/admin/admin-plugin-permission-governance";
import {
  getAdminPluginPermissionGovernanceCsv,
  getAdminPluginPermissionGovernanceJson,
  getAdminPluginPermissionGovernanceMarkdown,
} from "@/features/admin/admin-plugin-permission-governance-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPluginPermissionGovernancePanelProps = {
  report: AdminPluginPermissionGovernanceReport;
};

export function AdminPluginPermissionGovernancePanel({
  report,
}: AdminPluginPermissionGovernancePanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminPluginPermissionGovernanceJson(report),
      filename: "plugin-permission-governance.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminPluginPermissionGovernanceCsv(report),
      filename: "plugin-permission-governance.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminPluginPermissionGovernanceMarkdown(report),
      filename: "plugin-permission-governance.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminPluginPermissionGovernanceMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="size-4" />
            Plugin permission governance
          </CardTitle>
          <CardDescription>
            Installed extensions, capability grants, write-capable activity, and
            stale approvals from design activity evidence.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Extensions" value={report.manifestCount} />
          <Metric label="Permissions" value={report.permissionCount} />
          <Metric label="Write" value={report.writePermissionCount} />
          <Metric label="Grants" value={report.grantActivityCount} />
          <Metric label="Runs" value={report.runActivityCount} />
          <Metric label="Unknown" value={report.unknownActivityCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.kind}</Badge>
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
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Recent extension activity</div>
            <Badge variant="outline">
              {report.activities.length} visible events
            </Badge>
          </div>
          {report.activities.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">
              No extension activity is loaded for this governance report.
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {report.activities.slice(0, 8).map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="truncate font-medium">{activity.label}</div>
                  <div className="mt-1 truncate text-muted-foreground">
                    {activity.fileName} / {activity.actorName}
                  </div>
                  {activity.detail ? (
                    <div className="mt-1 line-clamp-2 text-muted-foreground">
                      {activity.detail}
                    </div>
                  ) : null}
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
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

function getStatusVariant(status: AdminPluginPermissionGovernanceStatus) {
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
