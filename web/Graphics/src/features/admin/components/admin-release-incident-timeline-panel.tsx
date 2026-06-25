"use client";

import {
  Activity,
  Bell,
  ClipboardCopy,
  Download,
  FileJson2,
  History,
  RotateCcw,
  ShieldCheck,
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
  AdminReleaseIncidentTimelineReport,
  AdminReleaseIncidentTimelineSource,
  AdminReleaseIncidentTimelineStatus,
} from "@/features/admin/admin-release-incident-timeline";
import {
  getAdminReleaseIncidentTimelineCsv,
  getAdminReleaseIncidentTimelineJson,
  getAdminReleaseIncidentTimelineMarkdown,
} from "@/features/admin/admin-release-incident-timeline-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseIncidentTimelinePanelProps = {
  report: AdminReleaseIncidentTimelineReport;
};

export function AdminReleaseIncidentTimelinePanel({
  report,
}: AdminReleaseIncidentTimelinePanelProps) {
  const correlations = report.correlations
    .filter((row) => row.status !== "ready")
    .concat(report.correlations.filter((row) => row.status === "ready"));
  const timeline = report.timeline
    .filter((event) => event.status !== "ready")
    .concat(report.timeline.filter((event) => event.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseIncidentTimelineJson(report),
      filename: "release-incident-timeline.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseIncidentTimelineCsv(report),
      filename: "release-incident-timeline.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseIncidentTimelineMarkdown(report),
      filename: "release-incident-timeline.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleaseIncidentTimelineMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            Release incident timeline
          </CardTitle>
          <CardDescription>
            Deploy checks, audit events, notifications, runtime observations,
            and rollback evidence correlated for release review.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Events" value={report.eventCount} />
          <Metric label="Blocked" value={report.blockedEventCount} />
          <Metric label="Review" value={report.reviewEventCount} />
          <Metric label="Deploy" value={report.deployEventCount} />
          <Metric label="Runtime" value={report.runtimeEventCount} />
          <Metric label="Rollback" value={report.rollbackEventCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {correlations.map((correlation) => (
            <div
              key={correlation.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{correlation.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={getStatusVariant(correlation.status)}>
                      {correlation.status}
                    </Badge>
                    <Badge variant="outline">{correlation.value}</Badge>
                    <Badge variant="outline">
                      {correlation.eventCount} linked
                    </Badge>
                    {correlation.latestAt ? (
                      <Badge variant="outline">
                        {formatDate(correlation.latestAt)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {correlation.detail}
              </p>
              <p className="mt-2 text-xs">{correlation.recommendation}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {timeline.slice(0, 14).map((event) => {
            const Icon = getSourceIcon(event.source);

            return (
              <div
                key={event.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-4" />
                      <span className="truncate">{event.title}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      <Badge variant="outline">{event.source}</Badge>
                      <Badge variant={getStatusVariant(event.status)}>
                        {event.status}
                      </Badge>
                      <Badge variant="outline">{event.severity}</Badge>
                      <Badge variant="outline">{formatDate(event.occurredAt)}</Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {event.summary}
                </p>
                <p className="mt-2 text-xs">{event.recommendation}</p>
                {event.target ? (
                  <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                    {event.target}
                  </div>
                ) : null}
              </div>
            );
          })}
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

function getSourceIcon(source: AdminReleaseIncidentTimelineSource) {
  if (source === "notification") {
    return Bell;
  }

  if (source === "rollback") {
    return RotateCcw;
  }

  if (source === "deploy-check" || source === "runtime") {
    return Activity;
  }

  return ShieldCheck;
}

function getStatusVariant(status: AdminReleaseIncidentTimelineStatus) {
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
