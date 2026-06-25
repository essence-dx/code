"use client";

import {
  ArrowRight,
  BotOff,
  CheckCircle2,
  Download,
  FileWarning,
  Globe2,
  Mail,
  MonitorPlay,
  PanelsTopLeft,
  Route,
  Share2,
  ShieldAlert,
  Sparkles,
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
  CampaignGeneratedSurface,
  CampaignGeneratedVariant,
  CampaignGenerationPlan,
  CampaignGenerationStatus,
  CampaignGenerationTrace,
  RuleBasedCampaignGenerationCenter,
} from "@/features/campaigns/rule-based-campaign-generation";

type RuleBasedCampaignGenerationPanelProps = {
  center: RuleBasedCampaignGenerationCenter;
};

const statusLabels: Record<CampaignGenerationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  CampaignGenerationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function RuleBasedCampaignGenerationPanel({
  center,
}: RuleBasedCampaignGenerationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Rule-based campaign generation
            </CardTitle>
            <CardDescription>
              Deterministic multi-format variants from briefs, starter packs,
              brand snapshots, and reusable content records.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <BotOff className="h-3.5 w-3.5" />
              No paid AI
            </Badge>
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={center.packet.dataUrl} download={center.packet.fileName}>
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Campaigns" value={center.totals.campaigns} />
          <Metric label="Variants" value={center.totals.variants} />
          <Metric label="Ready" value={center.totals.readyVariants} />
          <Metric label="Review" value={center.totals.reviewVariants} />
          <Metric label="Blocked" value={center.totals.blockedVariants} />
          <Metric label="Starter packs" value={center.totals.starterPacks} />
          <Metric label="Traces" value={center.totals.sourceTraces} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Generation plans"
            badge={`${center.plans.length} plans`}
            icon={<Route className="h-4 w-4 text-muted-foreground" />}
          >
            {center.plans.length ? (
              <div className="grid gap-2">
                {center.plans.slice(0, 4).map((plan) => (
                  <GenerationPlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <EmptyLine>
                Create campaign boards before generating variants.
              </EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Reviewable variants"
            badge={`${center.variants.length} variants`}
            icon={<PanelsTopLeft className="h-4 w-4 text-muted-foreground" />}
          >
            {center.variants.length ? (
              <ScrollArea className="h-[430px]">
                <div className="grid gap-2 pr-3">
                  {center.variants.slice(0, 20).map((variant) => (
                    <VariantRow key={variant.id} variant={variant} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>No variants have been generated yet.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Source trace"
            badge={`${center.totals.sourceTraces} links`}
            icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
          >
            {center.plans.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {center.plans
                  .flatMap((plan) => plan.sourceTrace)
                  .slice(0, 8)
                  .map((trace) => (
                    <TraceRow
                      key={`${trace.sourceType}-${trace.id}`}
                      trace={trace}
                    />
                  ))}
              </div>
            ) : (
              <EmptyLine>No campaign source traces are available.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Next actions"
            badge={`${center.nextActions.length} actions`}
            icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </PanelBlock>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerationPlanCard({ plan }: { plan: CampaignGenerationPlan }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={plan.status} />
            <p className="truncate text-sm font-semibold">
              {plan.campaignName}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.starterPack.name} with {plan.variants.length} variants.
          </p>
        </div>
        <Badge variant={statusVariants[plan.status]}>{plan.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.starterPack.formats.map((format) => (
          <Badge key={format} variant="outline">
            {format}
          </Badge>
        ))}
        <Badge variant="secondary">{plan.sourceTrace.length} plan traces</Badge>
      </div>
    </article>
  );
}

function VariantRow({ variant }: { variant: CampaignGeneratedVariant }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SurfaceIcon surface={variant.surface} />
            <p className="truncate text-sm font-medium">
              {variant.templateName}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {variant.copyBlocks[0]}
          </p>
        </div>
        <Badge variant={statusVariants[variant.reviewStatus]}>
          {statusLabels[variant.reviewStatus]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{variant.surface}</Badge>
        <Badge variant="outline">
          {Object.keys(variant.variableMap).length} vars
        </Badge>
        <Badge variant="outline">{variant.sourceTrace.length} traces</Badge>
      </div>
    </div>
  );
}

function TraceRow({ trace }: { trace: CampaignGenerationTrace }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="truncate text-sm font-medium">{trace.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {trace.sourceType} / {trace.field}
      </p>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {trace.value}
      </p>
    </div>
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
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: CampaignGenerationStatus }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "review") return <FileWarning className="h-4 w-4" />;

  return <ShieldAlert className="h-4 w-4" />;
}

function SurfaceIcon({ surface }: { surface: CampaignGeneratedSurface }) {
  if (surface === "website") {
    return <Globe2 className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "email") {
    return <Mail className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "video") {
    return <MonitorPlay className="h-4 w-4 text-muted-foreground" />;
  }

  if (surface === "presentation") {
    return <PanelsTopLeft className="h-4 w-4 text-muted-foreground" />;
  }

  return <Share2 className="h-4 w-4 text-muted-foreground" />;
}
