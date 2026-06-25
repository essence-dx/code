"use client";

import {
  ClipboardCopy,
  Download,
  FileJson2,
  Gauge,
  MonitorDown,
  PauseCircle,
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
  AdminDesktopUpdateChannelKind,
  AdminDesktopUpdateChannelPackage,
  AdminDesktopUpdateChannelReport,
  AdminDesktopUpdateChannelStatus,
} from "@/features/admin/admin-desktop-update-channel";
import {
  getAdminDesktopUpdateChannelCsv,
  getAdminDesktopUpdateChannelJson,
  getAdminDesktopUpdateChannelMarkdown,
} from "@/features/admin/admin-desktop-update-channel-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminDesktopUpdateChannelPanelProps = {
  report: AdminDesktopUpdateChannelReport;
};

export function AdminDesktopUpdateChannelPanel({
  report,
}: AdminDesktopUpdateChannelPanelProps) {
  const sortedPackages = report.packages
    .filter((updatePackage) => updatePackage.channel === report.activeChannel)
    .concat(
      report.packages.filter(
        (updatePackage) => updatePackage.channel !== report.activeChannel,
      ),
    );

  function exportJson() {
    downloadTextFile({
      content: getAdminDesktopUpdateChannelJson(report),
      filename: "admin-desktop-update-channel.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminDesktopUpdateChannelCsv(report),
      filename: "admin-desktop-update-channel.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminDesktopUpdateChannelMarkdown(report),
      filename: "admin-desktop-update-channel.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminDesktopUpdateChannelMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="size-4" />
            Desktop update channels
          </CardTitle>
          <CardDescription>
            Stable, beta, and canary desktop update readiness with version
            parity, rollout exposure, holds, package evidence, and feed status.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Active" value={report.activeChannel} />
          <Metric label="Current" value={report.currentVersion} />
          <Metric label="Target" value={report.targetVersion} />
          <Metric label="Minimum" value={report.minimumVersion} />
          <Metric label="Rollout" value={`${report.rolloutPercent}%`} />
          <Metric label="Commands" value={report.commandCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {sortedPackages.map((updatePackage) => (
            <UpdatePackageCard
              key={updatePackage.channel}
              active={updatePackage.channel === report.activeChannel}
              updatePackage={updatePackage}
            />
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Update commands</div>
            <Badge variant="outline">{report.commands.length} commands</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.commands.map((command) => (
              <div
                key={command}
                className="rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground"
              >
                {command}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

function UpdatePackageCard({
  active,
  updatePackage,
}: {
  active: boolean;
  updatePackage: AdminDesktopUpdateChannelPackage;
}) {
  const sortedRows = updatePackage.rows
    .filter((row) => row.status !== "ready")
    .concat(updatePackage.rows.filter((row) => row.status === "ready"));

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <MonitorDown className="size-4" />
            <span className="truncate">{updatePackage.label}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            {active ? <Badge variant="secondary">active</Badge> : null}
            <Badge variant="outline">{formatChannel(updatePackage.channel)}</Badge>
            <Badge variant={getStatusVariant(updatePackage.status)}>
              {updatePackage.status}
            </Badge>
          </div>
        </div>
        <Badge variant="outline">{updatePackage.score}/100</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Target" value={updatePackage.targetVersion} />
        <Metric label="Minimum" value={updatePackage.minimumVersion} />
        <Metric label="Rollout" value={`${updatePackage.rolloutPercent}%`} />
        <Metric
          label="Feed"
          value={updatePackage.feedUrl ? "configured" : "manual"}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        <Badge variant={updatePackage.hold.active ? "secondary" : "outline"}>
          <PauseCircle className="size-3" />
          {updatePackage.hold.active
            ? updatePackage.hold.reason ?? "held"
            : "no hold"}
        </Badge>
        <Badge variant="outline">
          <Gauge className="size-3" />
          {updatePackage.rows.length} checks
        </Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {sortedRows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-border bg-background/70 p-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{row.label}</div>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </div>
            <div className="mt-1 text-muted-foreground">{row.value}</div>
            <p className="mt-2 text-muted-foreground">{row.detail}</p>
            <p className="mt-2">{row.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function formatChannel(channel: AdminDesktopUpdateChannelKind) {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function getStatusVariant(status: AdminDesktopUpdateChannelStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
