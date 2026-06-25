"use client";

import { Activity, ClipboardCopy, Download, FileJson2 } from "lucide-react";
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
  AdminProductionMonitoringDigest,
  AdminProductionMonitoringStatus,
} from "@/features/admin/admin-production-monitoring-digest";
import {
  getAdminProductionMonitoringDigestCsv,
  getAdminProductionMonitoringDigestJson,
  getAdminProductionMonitoringDigestMarkdown,
} from "@/features/admin/admin-production-monitoring-digest-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminProductionMonitoringDigestPanelProps = {
  digest: AdminProductionMonitoringDigest;
};

export function AdminProductionMonitoringDigestPanel({
  digest,
}: AdminProductionMonitoringDigestPanelProps) {
  const rows = digest.rows
    .filter((row) => row.status !== "ready")
    .concat(digest.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminProductionMonitoringDigestJson(digest),
      filename: "production-monitoring-digest.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminProductionMonitoringDigestCsv(digest),
      filename: "production-monitoring-digest.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminProductionMonitoringDigestMarkdown(digest),
      filename: "production-monitoring-digest.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminProductionMonitoringDigestMarkdown(digest),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Production monitoring digest
          </CardTitle>
          <CardDescription>
            Deploy smoke, runtime evidence, auth/email incidents, rollback
            readiness, and recent admin actions in one release view.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(digest.status)}>
          {digest.status} {digest.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Deploy smoke" value={digest.deploySmokeScore} />
          <Metric label="Runtime" value={digest.runtimeScore} />
          <Metric label="Runtime errors" value={digest.runtimeErrorCount} />
          <Metric label="Auth failures" value={digest.failedAuthAttemptCount} />
          <Metric label="Email failed" value={digest.failedEmailDeliveryCount} />
          <Metric label="Rollback" value={digest.rollbackScore} />
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
            <div className="font-medium">Recent admin action feed</div>
            <Badge variant="outline">
              {digest.recentAdminActionCount} recent /{" "}
              {digest.highImpactAdminActionCount} high-impact
            </Badge>
          </div>
          {digest.recentActions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">
              No recent admin actions are loaded for this digest.
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {digest.recentActions.slice(0, 8).map((action) => (
                <div
                  key={action.id}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="truncate font-medium">{action.action}</div>
                  <div className="mt-1 truncate text-muted-foreground">
                    {action.actorEmail} on {action.targetLabel}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {formatDate(action.createdAt)}
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

function getStatusVariant(status: AdminProductionMonitoringStatus) {
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
