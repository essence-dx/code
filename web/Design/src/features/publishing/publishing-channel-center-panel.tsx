"use client";

import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  Globe2,
  Mail,
  Megaphone,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  PublishingChannelCheck,
  PublishingChannelCenter,
  PublishingChannelId,
  PublishingChannelPreset,
  PublishingChannelQueueItem,
  PublishingChannelRollup,
  PublishingChannelStatus,
} from "@/features/publishing/publishing-channel-depth";
import type {
  PublishingAnalyticsGoal,
  PublishingAttributionSource,
  PublishingAnalyticsWorkspace,
  PublishingAnomalyNote,
  PublishingExperimentView,
  PublishingPerformanceSnapshot,
} from "@/features/publishing/publishing-analytics-workspace";
import { cn } from "@/lib/utils";

type PublishingChannelCenterPanelProps = {
  center: PublishingChannelCenter;
};

const statusLabels: Record<PublishingChannelStatus, string> = {
  ready: "Ready",
  attention: "Attention",
  blocked: "Blocked",
};

const statusVariants: Record<
  PublishingChannelStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  attention: "outline",
  blocked: "destructive",
};

const channelIcons: Record<PublishingChannelId, LucideIcon> = {
  social: Megaphone,
  website: Globe2,
  email: Mail,
  campaign: CalendarRange,
};

export function PublishingChannelCenterPanel({
  center,
}: PublishingChannelCenterPanelProps) {
  const defaultChannel = center.channels[0]?.id ?? "social";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Publishing channels
            </CardTitle>
            <CardDescription>
              Channel presets, rollout queues, and analytics rollups.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Metric label="Planned" value={center.totals.planned} />
          <Metric label="Published" value={center.totals.published} />
          <Metric label="Deliverables" value={center.totals.deliverables} />
          <Metric label="Submissions" value={center.totals.submissions} />
        </div>

        <AnalyticsWorkspaceView workspace={center.analyticsWorkspace} />

        <Tabs defaultValue={defaultChannel} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {center.channels.map((channel) => (
              <TabsTrigger key={channel.id} value={channel.id}>
                {channel.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {center.channels.map((channel) => (
            <TabsContent key={channel.id} value={channel.id}>
              <ChannelRollupView channel={channel} />
            </TabsContent>
          ))}
        </Tabs>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next publishing actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnalyticsWorkspaceView({
  workspace,
}: {
  workspace: PublishingAnalyticsWorkspace;
}) {
  return (
    <section className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Analytics workspace
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Goals, performance snapshots, anomaly notes, and a stakeholder
            review packet.
          </p>
        </div>
        <Badge variant={statusVariants[workspace.status]}>
          {workspace.score}/100 {statusLabels[workspace.status]}
        </Badge>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-md border border-border bg-background p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-muted-foreground" />
            Channel goals
          </h4>
          <div className="mt-3 grid gap-2">
            {workspace.goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-background p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Snapshots
          </h4>
          <div className="mt-3 grid gap-2">
            {workspace.snapshots.map((snapshot) => (
              <SnapshotRow key={snapshot.id} snapshot={snapshot} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-background p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
            Review packet
          </h4>
          <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {workspace.stakeholderPacket.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {workspace.stakeholderPacket.summary}
                </p>
              </div>
              <Badge variant={statusVariants[workspace.stakeholderPacket.status]}>
                {workspace.stakeholderPacket.score}/100
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {workspace.stakeholderPacket.nextActions.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-muted-foreground">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AttributionSourcesView sources={workspace.attributionSources} />
        <ExperimentViewsPanel experiments={workspace.experiments} />
      </div>

      {workspace.anomalies.length ? (
        <section className="grid gap-2 md:grid-cols-2">
          {workspace.anomalies.map((anomaly) => (
            <AnomalyRow key={anomaly.id} anomaly={anomaly} />
          ))}
        </section>
      ) : null}
    </section>
  );
}

function AttributionSourcesView({
  sources,
}: {
  sources: PublishingAttributionSource[];
}) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        Attribution sources
      </h4>
      <div className="mt-3 grid gap-2">
        {sources.length ? (
          sources.slice(0, 5).map((source) => (
            <div
              key={source.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{source.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {source.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[source.status]}>
                  {source.score}/100
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {source.metrics.slice(0, 3).map((metric) => (
                  <Metric
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    compact
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No attribution sources are available yet.
          </p>
        )}
      </div>
    </section>
  );
}

function ExperimentViewsPanel({
  experiments,
}: {
  experiments: PublishingExperimentView[];
}) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Target className="h-4 w-4 text-muted-foreground" />
        Experiments
      </h4>
      <div className="mt-3 grid gap-2">
        {experiments.length ? (
          experiments.slice(0, 4).map((experiment) => (
            <div
              key={experiment.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {experiment.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {experiment.hypothesis}
                  </p>
                </div>
                <Badge variant={statusVariants[experiment.status]}>
                  {experiment.score}/100
                </Badge>
              </div>
              <div className="mt-3 grid gap-2">
                {experiment.variants.slice(0, 3).map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {variant.label}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {variant.metricLabel}: {variant.metricValue}
                      </p>
                    </div>
                    <Badge variant={statusVariants[variant.status]}>
                      {variant.score}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {experiment.winnerLabel
                  ? `Leading: ${experiment.winnerLabel}. `
                  : ""}
                {experiment.nextAction}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Publish or schedule variants to start the first experiment view.
          </p>
        )}
      </div>
    </section>
  );
}

function GoalRow({ goal }: { goal: PublishingAnalyticsGoal }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{goal.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{goal.detail}</p>
        </div>
        <Badge variant={statusVariants[goal.status]}>{goal.progress}%</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${goal.progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
      </p>
    </div>
  );
}

function SnapshotRow({
  snapshot,
}: {
  snapshot: PublishingPerformanceSnapshot;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{snapshot.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {snapshot.summary}
          </p>
        </div>
        <Badge variant={statusVariants[snapshot.status]}>
          {snapshot.score}/100
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {snapshot.metrics.slice(0, 4).map((metric) => (
          <Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: PublishingAnomalyNote }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <StatusIcon status={anomaly.severity} />
        <div className="min-w-0">
          <p className="text-sm font-medium">{anomaly.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {anomaly.detail}
          </p>
          <p className="mt-2 text-xs font-medium">{anomaly.nextAction}</p>
        </div>
      </div>
    </div>
  );
}

function ChannelRollupView({ channel }: { channel: PublishingChannelRollup }) {
  const Icon = channelIcons[channel.id];

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {channel.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {channel.description}
            </p>
          </div>
          <Badge variant={statusVariants[channel.status]}>
            {channel.score}/100 {statusLabels[channel.status]}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Metric label="Queue" value={channel.analytics.planned} compact />
          <Metric
            label="Published"
            value={channel.analytics.published}
            compact
          />
          <Metric label="Views" value={channel.analytics.views} compact />
          <Metric
            label="Conversion"
            value={`${channel.analytics.conversionRate}%`}
            compact
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Presets</h3>
          <div className="mt-3 grid gap-2">
            {channel.presets.map((preset) => (
              <PresetRow key={preset.id} preset={preset} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Readiness</h3>
          <div className="mt-3 grid gap-2">
            {channel.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold">Queue</h3>
          <div className="mt-3 grid gap-2">
            {channel.queue.length ? (
              channel.queue.map((item) => (
                <QueueRow key={item.id} item={item} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                No active queue items for this channel yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function PresetRow({ preset }: { preset: PublishingChannelPreset }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{preset.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {preset.cadence}
          </p>
        </div>
        <Badge variant="outline">{preset.plannerChannel}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {preset.analyticsFocus}
      </p>
    </div>
  );
}

function CheckRow({ check }: { check: PublishingChannelCheck }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusIcon status={check.status} />
          <p className="text-sm font-medium">{check.label}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
      </div>
      <Badge variant={statusVariants[check.status]}>{check.score}/100</Badge>
    </div>
  );
}

function QueueRow({ item }: { item: PublishingChannelQueueItem }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
        </div>
        <Badge variant="outline">{item.status}</Badge>
      </div>
      {item.scheduledAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(item.scheduledAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: PublishingChannelStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "attention",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "attention") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn("mt-1 font-semibold", compact ? "text-base" : "text-lg")}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
