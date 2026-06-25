"use client";

import {
  Activity,
  ClipboardCopy,
  Download,
  FileJson2,
  RadioTower,
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
  AdminRealtimeHealthReport,
  AdminRealtimeHealthStatus,
} from "@/features/admin/admin-realtime-health-monitor";
import {
  getAdminRealtimeHealthCsv,
  getAdminRealtimeHealthJson,
  getAdminRealtimeHealthMarkdown,
} from "@/features/admin/admin-realtime-health-monitor-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminRealtimeHealthMonitorPanelProps = {
  report: AdminRealtimeHealthReport;
};

export function AdminRealtimeHealthMonitorPanel({
  report,
}: AdminRealtimeHealthMonitorPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminRealtimeHealthJson(report),
      filename: "workspace-realtime-health.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminRealtimeHealthCsv(report),
      filename: "workspace-realtime-health.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminRealtimeHealthMarkdown(report),
      filename: "workspace-realtime-health.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminRealtimeHealthMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="size-4" />
            Workspace realtime health
          </CardTitle>
          <CardDescription>
            Room latency, reconnect quality, save signals, notification
            delivery, and route analytics anomalies for live collaboration.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">
            <Activity className="size-3" />
            {report.monitoredRoomCount} rooms
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Room age avg" value={formatMetric(report.averageRoomAgeMinutes)} />
          <Metric label="Reconnect" value={report.reconnectQualityScore} />
          <Metric label="Offline replay" value={report.offlineReplayQueueCount} />
          <Metric label="Save signals" value={report.pendingSaveSignalCount} />
          <Metric label="Failed mail" value={report.failedNotificationDeliveryCount} />
          <Metric label="Route anomalies" value={report.routeAnalyticsAnomalyCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.category}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">{row.value}</Badge>
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

function formatMetric(value: number | null) {
  return value === null ? "none" : `${value}m`;
}

function getStatusVariant(status: AdminRealtimeHealthStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
