"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileArchive,
  Globe2,
  Mail,
  Megaphone,
  Route,
  ShieldAlert,
  TrendingUp,
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
  ProductionDistributionAnalyticsCenter,
  ProductionDistributionAnalyticsStatus,
  ProductionDistributionCampaignAttribution,
  ProductionDistributionChannelAttribution,
  ProductionDistributionFunnelStage,
  ProductionDistributionSourceInfluence,
} from "@/features/distribution/production-distribution-analytics";
import { cn } from "@/lib/utils";

type ProductionDistributionAnalyticsPanelProps = {
  center: ProductionDistributionAnalyticsCenter;
};

const statusLabels: Record<ProductionDistributionAnalyticsStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProductionDistributionAnalyticsStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProductionDistributionAnalyticsPanel({
  center,
}: ProductionDistributionAnalyticsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Production distribution analytics
            </CardTitle>
            <CardDescription>
              Campaign attribution across generated variants, channel publishes,
              exports, audience forms, and reusable content sources.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.attributionPacket.dataUrl}
                download={center.attributionPacket.fileName}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Campaigns" value={center.totals.campaigns} />
          <Metric label="Variants" value={center.totals.variants} />
          <Metric label="Published" value={center.totals.publishedItems} />
          <Metric label="Exports" value={center.totals.exportArtifacts} />
          <Metric label="Forms" value={center.totals.formSubmissions} />
          <Metric label="Sources" value={center.totals.contentSources} />
        </div>

        <FunnelView stages={center.funnelStages} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Campaign attribution"
            badge={`${center.campaignAttribution.length} campaigns`}
            icon={<Route className="h-4 w-4 text-muted-foreground" />}
          >
            {center.campaignAttribution.length ? (
              <div className="grid gap-3">
                {center.campaignAttribution.slice(0, 6).map((row) => (
                  <CampaignAttributionCard key={row.id} row={row} />
                ))}
              </div>
            ) : (
              <EmptyLine>
                Create campaign boards before production attribution can be
                calculated.
              </EmptyLine>
            )}
          </PanelBlock>

          <div className="space-y-4">
            <ChannelAttributionPanel channels={center.channelAttribution} />
            <SourceInfluencePanel sources={center.sourceInfluence} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next attribution actions
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
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

function FunnelView({
  stages,
}: {
  stages: ProductionDistributionFunnelStage[];
}) {
  return (
    <section className="grid gap-2 md:grid-cols-5">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">{stage.label}</p>
            <StatusIcon status={stage.status} />
          </div>
          <p className="mt-2 text-lg font-semibold">
            {stage.current}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / {stage.target}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stage.conversionRate}% coverage
          </p>
        </div>
      ))}
    </section>
  );
}

function CampaignAttributionCard({
  row,
}: {
  row: ProductionDistributionCampaignAttribution;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={row.status} />
            <h3 className="truncate text-sm font-semibold">
              {row.campaignName}
            </h3>
            <Badge variant={statusVariants[row.status]}>
              {row.score}/100
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {row.detail}
          </p>
        </div>
        <Badge variant="outline">{row.conversionRate}% conversion</Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Variants" value={row.generatedVariants} />
        <MiniStat label="Publishes" value={row.scheduledPublishes} />
        <MiniStat label="Exports" value={row.exportArtifacts} />
        <MiniStat label="Forms" value={row.formSubmissions} />
      </div>
    </article>
  );
}

function ChannelAttributionPanel({
  channels,
}: {
  channels: ProductionDistributionChannelAttribution[];
}) {
  return (
    <PanelBlock
      title="Channel attribution"
      badge={`${channels.length} channels`}
      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="grid gap-2">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ChannelIcon channelId={channel.id} />
                  <p className="truncate text-sm font-medium">
                    {channel.label}
                  </p>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {channel.detail}
                </p>
              </div>
              <Badge variant={statusVariants[channel.status]}>
                {channel.score}/100
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </PanelBlock>
  );
}

function SourceInfluencePanel({
  sources,
}: {
  sources: ProductionDistributionSourceInfluence[];
}) {
  return (
    <PanelBlock
      title="Content source influence"
      badge={`${sources.length} sources`}
      icon={<DatabaseZap className="h-4 w-4 text-muted-foreground" />}
    >
      <ScrollArea className="h-[300px]">
        <div className="grid gap-2 pr-3">
          {sources.length ? (
            sources.map((source) => (
              <div
                key={source.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {source.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source.variableKey} / {source.surfaces.join(", ")}
                    </p>
                  </div>
                  <Badge variant={statusVariants[source.status]}>
                    {source.attributedVariants} variants
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <EmptyLine>No reusable content source influence is mapped yet.</EmptyLine>
          )}
        </div>
      </ScrollArea>
    </PanelBlock>
  );
}

function PanelBlock({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
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

function StatusIcon({ status }: { status: ProductionDistributionAnalyticsStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <TrendingUp className={className} />;
  return <ShieldAlert className={className} />;
}

function ChannelIcon({
  channelId,
}: {
  channelId: ProductionDistributionChannelAttribution["id"];
}) {
  const className = "h-4 w-4 text-muted-foreground";

  if (channelId === "website") return <Globe2 className={className} />;
  if (channelId === "email") return <Mail className={className} />;
  if (channelId === "export") return <FileArchive className={className} />;
  return <Megaphone className={className} />;
}
