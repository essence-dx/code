"use client";

import {
  ClipboardCopy,
  Download,
  FileArchive,
  FileJson2,
  Globe2,
  MonitorDown,
  ServerCog,
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
  AdminReleaseChannelKind,
  AdminReleaseChannelPackage,
  AdminReleaseChannelStatus,
  AdminReleaseChannelsReport,
} from "@/features/admin/admin-release-channels";
import {
  getAdminReleaseChannelsCsv,
  getAdminReleaseChannelsJson,
  getAdminReleaseChannelsMarkdown,
} from "@/features/admin/admin-release-channels-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseChannelsPanelProps = {
  report: AdminReleaseChannelsReport;
};

export function AdminReleaseChannelsPanel({
  report,
}: AdminReleaseChannelsPanelProps) {
  const sortedRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseChannelsJson(report),
      filename: "admin-release-channels.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseChannelsCsv(report),
      filename: "admin-release-channels.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseChannelsMarkdown(report),
      filename: "admin-release-channels.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminReleaseChannelsMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="size-4" />
            Release channels
          </CardTitle>
          <CardDescription>
            Web, desktop, and self-hosted packages with release evidence,
            commands, and blockers in one operator handoff.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Channels" value={report.channelCount} />
          <Metric label="Ready" value={report.readyChannelCount} />
          <Metric label="Review" value={report.reviewChannelCount} />
          <Metric label="Blocked" value={report.blockedChannelCount} />
          <Metric label="Artifacts" value={report.artifactCount} />
          <Metric label="Commands" value={report.commandCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {report.packages.map((releasePackage) => (
            <ReleasePackageCard
              key={releasePackage.channel}
              releasePackage={releasePackage}
            />
          ))}
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {sortedRows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.channel}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">{row.value}</Badge>
                  </div>
                </div>
                <Badge variant="outline">{row.artifactCount} artifacts</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Release commands</div>
            <Badge variant="outline">{report.commands.length} commands</Badge>
          </div>
          <div className="grid gap-2">
            {report.commands.slice(0, 8).map((command) => (
              <div
                key={command}
                className="rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground"
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

function ReleasePackageCard({
  releasePackage,
}: {
  releasePackage: AdminReleaseChannelPackage;
}) {
  const Icon = getChannelIcon(releasePackage.channel);

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <Icon className="size-4" />
            {releasePackage.label}
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {releasePackage.packageName}
          </div>
        </div>
        <Badge variant={getStatusVariant(releasePackage.status)}>
          {releasePackage.status}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Score" value={releasePackage.score} />
        <Metric label="Artifacts" value={releasePackage.artifacts.length} />
      </div>
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <span>Version: {releasePackage.packageVersion}</span>
        <span className="truncate">Release: {releasePackage.releaseLabel}</span>
        <span className="truncate">Commit: {releasePackage.commitSha}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getChannelIcon(channel: AdminReleaseChannelKind) {
  if (channel === "desktop") {
    return MonitorDown;
  }

  if (channel === "self-hosted") {
    return ServerCog;
  }

  return Globe2;
}

function getStatusVariant(status: AdminReleaseChannelStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
