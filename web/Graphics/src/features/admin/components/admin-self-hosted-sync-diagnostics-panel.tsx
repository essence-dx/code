"use client";

import {
  ClipboardCopy,
  Database,
  Download,
  FileJson2,
  Globe2,
  MonitorCog,
  RadioTower,
  ServerCog,
  TerminalSquare,
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
  SelfHostedSyncDiagnosticCategory,
  SelfHostedSyncDiagnosticReport,
  SelfHostedSyncDiagnosticStatus,
} from "@/features/admin/admin-self-hosted-sync-diagnostics";
import {
  getSelfHostedSyncDiagnosticCsv,
  getSelfHostedSyncDiagnosticJson,
  getSelfHostedSyncDiagnosticMarkdown,
} from "@/features/admin/admin-self-hosted-sync-diagnostics-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminSelfHostedSyncDiagnosticsPanelProps = {
  report: SelfHostedSyncDiagnosticReport;
};

export function AdminSelfHostedSyncDiagnosticsPanel({
  report,
}: AdminSelfHostedSyncDiagnosticsPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getSelfHostedSyncDiagnosticJson(report),
      filename: "self-hosted-sync-diagnostics.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getSelfHostedSyncDiagnosticCsv(report),
      filename: "self-hosted-sync-diagnostics.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getSelfHostedSyncDiagnosticMarkdown(report),
      filename: "self-hosted-sync-diagnostics.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getSelfHostedSyncDiagnosticMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ServerCog className="size-4" />
            Self-hosted sync diagnostics
          </CardTitle>
          <CardDescription>
            Turso/libSQL, desktop package, browser route, Vercel runtime, and
            realtime parity checks with operator repair commands.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">
            <TerminalSquare className="size-3" />
            {report.repairCommandCount} repairs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Database" value={report.databaseKind} />
          <Metric
            label="DB auth"
            value={report.databaseAuthReady ? "ready" : "missing"}
          />
          <Metric label="Desktop" value={report.desktopChannel} />
          <Metric label="Routes" value={`${report.routeSmokeScore}/100`} />
          <Metric label="Realtime" value={`${report.realtimeScore}/100`} />
          <Metric label="Runtime" value={report.runtime} />
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
                <div className="mt-2 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                  {row.repairCommand}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Operator repair runbook</div>
            <Badge variant="outline">
              {report.readyCount} ready / {report.reviewCount} review /{" "}
              {report.blockedCount} blocked
            </Badge>
          </div>
          <div className="grid gap-2">
            {report.repairCommands.map((command) => (
              <div
                key={command.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="font-mono text-[11px] text-foreground">
                  {command.command}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {command.reason}
                </div>
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
      <div className="mt-1 truncate font-mono text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function getCategoryIcon(category: SelfHostedSyncDiagnosticCategory) {
  if (category === "database") {
    return Database;
  }

  if (category === "desktop") {
    return MonitorCog;
  }

  if (category === "browser") {
    return Globe2;
  }

  if (category === "realtime") {
    return RadioTower;
  }

  if (category === "vercel") {
    return ServerCog;
  }

  return TerminalSquare;
}

function getStatusVariant(status: SelfHostedSyncDiagnosticStatus) {
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
