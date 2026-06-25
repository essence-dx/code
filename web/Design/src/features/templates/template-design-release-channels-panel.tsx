"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  GitBranch,
  GitCompareArrows,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  TemplateDesignDeprecationNotice,
  TemplateDesignMigrationSuggestion,
  TemplateDesignReleaseChannel,
  TemplateDesignReleaseChannelsCenter,
  TemplateDesignReleaseEntry,
  TemplateDesignReleaseStatus,
  TemplateDesignRollbackPacket,
} from "@/features/templates/template-design-release-channels";
import { cn } from "@/lib/utils";

type TemplateDesignReleaseChannelsPanelProps = {
  center: TemplateDesignReleaseChannelsCenter;
};

const statusLabels: Record<TemplateDesignReleaseStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  TemplateDesignReleaseStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function TemplateDesignReleaseChannelsPanel({
  center,
}: TemplateDesignReleaseChannelsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Template and design release channels
            </CardTitle>
            <CardDescription>
              Staged rollouts, deprecation notices, migration suggestions,
              dependency impact, and rollback-safe update packets.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Templates" value={center.totals.templates} />
          <Metric label="Rollouts" value={center.totals.stagedRollouts} />
          <Metric
            label="Deprecations"
            value={center.totals.deprecationNotices}
          />
          <Metric label="Migrations" value={center.totals.migrationSuggestions} />
          <Metric label="Impacted" value={center.totals.affectedProjects} />
          <Metric label="Rollback" value={center.totals.rollbackSafePackets} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section className="space-y-3">
            {center.releaseEntries.length ? (
              center.releaseEntries.slice(0, 8).map((entry) => (
                <ReleaseEntryCard key={entry.id} entry={entry} />
              ))
            ) : (
              <EmptyLine>
                Save templates before release channels can be planned.
              </EmptyLine>
            )}
          </section>

          <div className="space-y-4">
            <ChannelSummary channels={center.channels} />
            <DeprecationPanel notices={center.deprecationNotices} />
            <MigrationPanel suggestions={center.migrationSuggestions} />
            <RollbackPanel packets={center.rollbackPackets} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next release actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReleaseEntryCard({ entry }: { entry: TemplateDesignReleaseEntry }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={entry.status} />
            <h3 className="truncate text-sm font-semibold">
              {entry.templateName}
            </h3>
            <Badge variant={statusVariants[entry.status]}>
              {statusLabels[entry.status]}
            </Badge>
            <Badge variant="outline">{entry.channelLabel}</Badge>
            <Badge variant="outline">v{entry.version}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.nextAction}
          </p>
        </div>
        <Button asChild size="icon" variant="ghost" aria-label="Open template">
          <a href={entry.href}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Stage" value={entry.stageLabel} />
        <MiniStat label="Rollout" value={`${entry.rolloutPercent}%`} />
        <MiniStat
          label="Impact"
          value={`${entry.dependencyImpact.affectedProjects} designs`}
        />
        <MiniStat
          label="Rollback"
          value={statusLabels[entry.rollbackPacket.status]}
        />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <EvidenceLine
          icon={<GitCompareArrows className="h-4 w-4 text-muted-foreground" />}
          title="Dependency impact"
          detail={entry.dependencyImpact.detail}
          status={entry.dependencyImpact.status}
        />
        <EvidenceLine
          icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          title="Rollback packet"
          detail={`${entry.rollbackPacket.impactedProjectIds.length} impacted design${entry.rollbackPacket.impactedProjectIds.length === 1 ? "" : "s"}`}
          status={entry.rollbackPacket.status}
        />
      </div>
    </article>
  );
}

function ChannelSummary({
  channels,
}: {
  channels: TemplateDesignReleaseChannel[];
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <PackageCheck className="h-4 w-4 text-muted-foreground" />
        Channel rollouts
      </div>
      <div className="mt-3 grid gap-2">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{channel.label}</p>
                <p className="text-xs text-muted-foreground">
                  {channel.summary}
                </p>
              </div>
              <Badge variant={statusVariants[channel.status]}>
                {channel.rolloutPercent}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeprecationPanel({
  notices,
}: {
  notices: TemplateDesignDeprecationNotice[];
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        Deprecation notices
      </div>
      <ScrollArea className="mt-3 h-[190px]">
        <div className="grid gap-2 pr-3">
          {notices.length ? (
            notices.map((notice) => (
              <NoticeRow key={notice.id} notice={notice} />
            ))
          ) : (
            <EmptyLine>No deprecation notices are pending.</EmptyLine>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

function MigrationPanel({
  suggestions,
}: {
  suggestions: TemplateDesignMigrationSuggestion[];
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
        Migration suggestions
      </div>
      <div className="mt-3 grid gap-2">
        {suggestions.length ? (
          suggestions.slice(0, 4).map((suggestion) => (
            <MigrationRow key={suggestion.id} suggestion={suggestion} />
          ))
        ) : (
          <EmptyLine>No template migrations are required.</EmptyLine>
        )}
      </div>
    </section>
  );
}

function RollbackPanel({
  packets,
}: {
  packets: TemplateDesignRollbackPacket[];
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4 text-muted-foreground" />
        Rollback packets
      </div>
      <div className="mt-3 grid gap-2">
        {packets.slice(0, 4).map((packet) => (
          <div
            key={packet.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {packet.templateName}
              </p>
              <p className="text-xs text-muted-foreground">
                Previous v{packet.previousVersion}
              </p>
            </div>
            <Button asChild size="icon" variant="ghost" aria-label="Download">
              <a href={packet.dataUrl} download={packet.fileName}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoticeRow({ notice }: { notice: TemplateDesignDeprecationNotice }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{notice.templateName}</p>
        <Badge variant={statusVariants[notice.status]}>
          {statusLabels[notice.status]}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{notice.detail}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Effective {new Date(notice.effectiveAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function MigrationRow({
  suggestion,
}: {
  suggestion: TemplateDesignMigrationSuggestion;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariants[suggestion.status]}>
          {suggestion.confidence}% match
        </Badge>
        <p className="text-xs font-medium">
          {suggestion.fromTemplateName} to {suggestion.toTemplateName}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {suggestion.reason}
      </p>
    </div>
  );
}

function EvidenceLine({
  icon,
  title,
  detail,
  status,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  status: TemplateDesignReleaseStatus;
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold">{title}</p>
        <Badge className="ml-auto" variant={statusVariants[status]}>
          {statusLabels[status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: TemplateDesignReleaseStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <GitBranch className={className} />;
  return <ShieldAlert className={className} />;
}
