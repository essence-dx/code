"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gauge,
  LibraryBig,
  TrendingUp,
  UsersRound,
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
import type {
  MarketplaceCreatorTrend,
  MarketplaceDemandSignal,
  MarketplaceDemandSignalType,
  MarketplaceIntelligenceStatus,
  MarketplaceModerationSlaItem,
  MarketplaceModerationSlaStatus,
  TemplateMarketplaceIntelligence,
} from "@/features/templates/template-marketplace-intelligence";

type TemplateMarketplaceIntelligencePanelProps = {
  intelligence: TemplateMarketplaceIntelligence;
};

const statusLabels: Record<MarketplaceIntelligenceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MarketplaceIntelligenceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const demandLabels: Record<MarketplaceDemandSignalType, string> = {
  rising: "Rising",
  "high-intent": "High intent",
  "under-converting": "Under-converting",
  "needs-visibility": "Needs visibility",
};

const slaLabels: Record<MarketplaceModerationSlaStatus, string> = {
  "on-track": "On track",
  "due-soon": "Due soon",
  overdue: "Overdue",
};

export function TemplateMarketplaceIntelligencePanel({
  intelligence,
}: TemplateMarketplaceIntelligencePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Marketplace intelligence
            </CardTitle>
            <CardDescription>
              Demand signals, creator quality, collection coverage, moderation
              SLA, and install cohorts for the template marketplace.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[intelligence.status]}>
            {intelligence.score}/100 {statusLabels[intelligence.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Published"
            value={intelligence.totals.publishedTemplates}
          />
          <Metric label="Review" value={intelligence.totals.reviewTemplates} />
          <Metric label="Views" value={intelligence.totals.totalViews} />
          <Metric label="Uses" value={intelligence.totals.totalUses} />
          <Metric
            label="Conversion"
            value={`${intelligence.totals.averageConversionRate}%`}
          />
          <Metric label="SLA open" value={intelligence.totals.moderationOpen} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={TrendingUp}
              title="Demand signals"
              detail="Ranked by installs, views, conversion, quality, and launch recency."
            />
            <div className="mt-3 grid gap-2">
              {intelligence.demandSignals.length ? (
                intelligence.demandSignals
                  .slice(0, 5)
                  .map((signal) => (
                    <DemandSignalRow key={signal.templateId} signal={signal} />
                  ))
              ) : (
                <EmptyState text="Publish templates and gather views to build demand intelligence." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Clock3}
              title="Moderation SLA"
              detail={`${intelligence.moderationSla.overdueCount} overdue, ${intelligence.moderationSla.dueSoonCount} due soon.`}
            />
            <div className="mt-3 grid gap-2">
              {intelligence.moderationSla.items.length ? (
                intelligence.moderationSla.items
                  .slice(0, 4)
                  .map((item) => (
                    <ModerationSlaRow key={item.templateId} item={item} />
                  ))
              ) : (
                <EmptyState text="No marketplace submissions are waiting on moderation." />
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={UsersRound}
              title="Creator trends"
              detail="Quality and conversion grouped by template creator."
            />
            <div className="mt-3 grid gap-2">
              {intelligence.creatorTrends.slice(0, 4).map((creator) => (
                <CreatorTrendRow key={creator.creatorKey} creator={creator} />
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={LibraryBig}
              title="Collection gaps"
              detail="Coverage health across marketplace collections."
            />
            <div className="mt-3 grid gap-2">
              {intelligence.collectionGaps.slice(0, 5).map((gap) => (
                <div
                  key={gap.collection}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{gap.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {gap.detail}
                      </p>
                    </div>
                    <Badge variant={statusVariants[gap.severity]}>
                      {gap.publishedCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Gauge}
              title="Install cohorts"
              detail="Use and conversion by template publish age."
            />
            <div className="mt-3 grid gap-2">
              {intelligence.installCohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{cohort.label}</p>
                    <Badge variant="outline">
                      {cohort.conversionRate}% conversion
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>{cohort.templateCount} templates</span>
                    <span>{cohort.views} views</span>
                    <span>{cohort.uses} uses</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {intelligence.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Marketplace next actions
            </div>
            <div className="mt-2 grid gap-2">
              {intelligence.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DemandSignalRow({ signal }: { signal: MarketplaceDemandSignal }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{signal.templateName}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {signal.detail}
          </p>
        </div>
        <Badge variant={demandVariant(signal.signal)} className="shrink-0">
          {demandLabels[signal.signal]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{signal.collectionLabel}</Badge>
        <Badge variant="outline">{signal.badge}</Badge>
        <Badge variant="outline">{signal.demandScore} demand</Badge>
      </div>
    </div>
  );
}

function CreatorTrendRow({ creator }: { creator: MarketplaceCreatorTrend }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {creator.creatorDetail}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {creator.templateCount} templates, {creator.publishedCount}{" "}
            published
          </p>
        </div>
        <Badge variant={creatorTrendVariant(creator.trend)}>
          {formatCreatorTrend(creator.trend)}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <span>{creator.averageQuality}/100 quality</span>
        <span>{creator.totalUses} uses</span>
        <span>{creator.averageConversionRate}% conv.</span>
      </div>
    </div>
  );
}

function ModerationSlaRow({ item }: { item: MarketplaceModerationSlaItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.templateName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.collectionLabel} - {item.creatorDetail}
          </p>
        </div>
        <Badge variant={slaVariant(item.status)} className="shrink-0">
          {slaLabels[item.status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{item.daysOpen} days</Badge>
        {item.reasons.slice(0, 2).map((reason) => (
          <Badge key={reason} variant="outline">
            {reason}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      {text}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: number | string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function demandVariant(signal: MarketplaceDemandSignalType) {
  if (signal === "rising") return "secondary" as const;
  if (signal === "under-converting") return "destructive" as const;
  if (signal === "high-intent") return "default" as const;

  return "outline" as const;
}

function creatorTrendVariant(trend: MarketplaceCreatorTrend["trend"]) {
  if (trend === "leader") return "secondary" as const;
  if (trend === "needs-review") return "destructive" as const;
  if (trend === "rising") return "default" as const;

  return "outline" as const;
}

function slaVariant(status: MarketplaceModerationSlaStatus) {
  if (status === "overdue") return "destructive" as const;
  if (status === "due-soon") return "outline" as const;

  return "secondary" as const;
}

function formatCreatorTrend(trend: MarketplaceCreatorTrend["trend"]) {
  if (trend === "needs-review") return "Needs review";

  return `${trend[0]?.toUpperCase() ?? ""}${trend.slice(1)}`;
}
