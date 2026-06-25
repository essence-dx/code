"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardCopy,
  Download,
  ExternalLink,
  FileJson2,
  Globe2,
  MonitorPlay,
  RadioTower,
  RotateCcw,
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
  AdminPublishChannelKind,
  AdminPublishChannelManagerReport,
  AdminPublishChannelStatus,
} from "@/features/admin/admin-publish-channel-manager";
import {
  getAdminPublishChannelManagerCsv,
  getAdminPublishChannelManagerJson,
  getAdminPublishChannelManagerMarkdown,
} from "@/features/admin/admin-publish-channel-manager-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPublishChannelManagerPanelProps = {
  report: AdminPublishChannelManagerReport;
};

const channelIcons: Record<AdminPublishChannelKind, LucideIcon> = {
  prototype: MonitorPlay,
  release: RadioTower,
  share: ExternalLink,
  site: Globe2,
};

export function AdminPublishChannelManagerPanel({
  report,
}: AdminPublishChannelManagerPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "publish-channel-manager.json",
      content: getAdminPublishChannelManagerJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "publish-channel-manager.csv",
      content: getAdminPublishChannelManagerCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "publish-channel-manager.md",
      content: getAdminPublishChannelManagerMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminPublishChannelManagerMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="size-4" />
            Publish channels
          </CardTitle>
          <CardDescription>
            Prototype, share, site-style handoff, and release targets with route
            smoke, approval, and rollback readiness.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
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
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Channels" value={report.channelCount} />
          <Metric label="Prototype" value={report.prototypeChannelCount} />
          <Metric label="Site-style" value={report.siteChannelCount} />
          <Metric label="Stale" value={report.staleChannelCount} />
          <Metric label="Approvals" value={report.approvalReadyCount} />
          <Metric label="Rollback" value={report.rollbackLinkedCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.channels.slice(0, 10).map((channel) => {
            const Icon = channelIcons[channel.kind];

            return (
              <div
                key={channel.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{channel.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{channel.kind}</Badge>
                      <Badge variant={getStatusVariant(channel.status)}>
                        {channel.status}
                      </Badge>
                      <Badge variant={getStatusVariant(channel.routeSmokeStatus)}>
                        smoke {channel.routeSmokeStatus}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={channel.rollbackState === "linked" ? "outline" : "secondary"}>
                    <RotateCcw className="size-3" />
                    {channel.rollbackState}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info label="Approval" value={channel.approvalState} />
                  <Info label="Evidence" value={`${channel.evidence.length}`} />
                  <Info
                    label="Expiry"
                    value={channel.expiresAt ? formatDate(channel.expiresAt) : "None"}
                  />
                </div>

                <div className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
                  {channel.targetUrl}
                </div>
                <p className="mt-2 text-xs">{channel.recommendation}</p>
                {channel.blockers.length > 0 || channel.warnings.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[...channel.blockers, ...channel.warnings].slice(0, 4).map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminPublishChannelStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
