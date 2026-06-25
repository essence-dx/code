"use client";

import {
  CheckCircle2,
  Eye,
  Gauge,
  LibraryBig,
  MousePointerClick,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  createTemplateMarketplaceDiscovery,
  type MarketplaceDiscoveryTemplate,
  type TemplateQualityGate,
} from "@/features/templates/template-marketplace-discovery";
import { cn } from "@/lib/utils";

type TemplateMarketplaceDiscoveryPanelProps = {
  templates: DesignTemplateSummary[];
  createFromTemplateAction: (formData: FormData) => void;
};

export function TemplateMarketplaceDiscoveryPanel({
  templates,
  createFromTemplateAction,
}: TemplateMarketplaceDiscoveryPanelProps) {
  const discovery = useMemo(
    () => createTemplateMarketplaceDiscovery(templates),
    [templates],
  );
  const trackedTemplateKey = discovery.featuredTemplates
    .map((template) => template.id)
    .join("|");
  const trackedTemplateKeyRef = useRef("");

  useEffect(() => {
    if (
      !trackedTemplateKey ||
      trackedTemplateKeyRef.current === trackedTemplateKey
    ) {
      return;
    }

    trackedTemplateKeyRef.current = trackedTemplateKey;
    void fetch("/api/templates/marketplace-views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateIds: discovery.featuredTemplates.map((template) => template.id),
      }),
    }).catch(() => undefined);
  }, [discovery.featuredTemplates, trackedTemplateKey]);

  if (!discovery.publishedTemplates.length && !discovery.qualityQueue.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Marketplace discovery</h3>
          <p className="text-sm text-muted-foreground">
            Featured published templates, creator attribution, usage analytics,
            and release quality gates.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-72">
          <MarketplaceMetric
            icon={<LibraryBig className="h-3.5 w-3.5" />}
            label="Published"
            value={discovery.totals.published.toLocaleString()}
          />
          <MarketplaceMetric
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Views"
            value={discovery.totals.views.toLocaleString()}
          />
          <MarketplaceMetric
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
            label="Uses"
            value={discovery.totals.uses.toLocaleString()}
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="space-y-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Featured templates
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked by quality, recent publishing, views, and template use.
            </p>
          </div>
          {discovery.featuredTemplates.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {discovery.featuredTemplates.map((template) => (
                <FeaturedTemplateCard
                  key={template.id}
                  template={template}
                  createFromTemplateAction={createFromTemplateAction}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
              Publish approved templates to start marketplace discovery.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Featured collections</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Collection depth and marketplace performance.
              </p>
            </div>
            <div className="space-y-2">
              {discovery.featuredCollections.length
                ? discovery.featuredCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {collection.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {collection.templateCount} templates
                            {collection.topTemplate
                              ? ` - top: ${collection.topTemplate.name}`
                              : ""}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {collection.averageQuality}/100
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>{collection.totalViews} views</span>
                        <span>{collection.totalUses} uses</span>
                      </div>
                    </div>
                  ))
                : null}
              {!discovery.featuredCollections.length ? (
                <p className="text-sm text-muted-foreground">
                  Add marketplace collections to published templates.
                </p>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Quality gates</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Templates that need curation before they are strong discovery
                candidates.
              </p>
            </div>
            <div className="space-y-2">
              {discovery.qualityQueue.length ? (
                discovery.qualityQueue.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.collectionLabel} - {template.creatorDetail}
                        </p>
                      </div>
                      <Badge variant={getQualityVariant(template)}>
                        {template.qualityScore}/100
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.qualityGates.map((gate) => (
                        <QualityGateBadge key={gate.id} gate={gate} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  All active marketplace templates pass the current gates.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function FeaturedTemplateCard({
  template,
  createFromTemplateAction,
}: {
  template: MarketplaceDiscoveryTemplate;
  createFromTemplateAction: (formData: FormData) => void;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-border">
      <div className="aspect-[4/3] bg-muted">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{template.collectionLabel}</Badge>
            {template.season ? (
              <Badge variant="outline">{template.season}</Badge>
            ) : null}
            <Badge variant={getQualityVariant(template)}>
              {template.qualityScore}/100
            </Badge>
          </div>
          <div>
            <h4 className="line-clamp-2 text-sm font-medium">
              {template.name}
            </h4>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              {template.creatorLabel}: {template.creatorDetail}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <MarketplaceMetric
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Views"
            value={template.viewCount.toLocaleString()}
          />
          <MarketplaceMetric
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
            label="Uses"
            value={template.useCount.toLocaleString()}
          />
          <MarketplaceMetric
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Rate"
            value={`${template.conversionRate}%`}
          />
        </div>

        <form action={createFromTemplateAction} className="flex gap-2">
          <input type="hidden" name="templateId" value={template.id} />
          <Input
            name="name"
            placeholder={`${template.name} copy`}
            aria-label={`New design name from ${template.name}`}
          />
          <Button type="submit" size="sm">
            Use
          </Button>
        </form>
      </div>
    </article>
  );
}

function MarketplaceMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function QualityGateBadge({ gate }: { gate: TemplateQualityGate }) {
  return (
    <Badge
      variant={gate.status === "fail" ? "destructive" : "outline"}
      className={cn(
        gate.status === "pass" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
        gate.status === "warn" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-600",
      )}
    >
      {gate.label}
    </Badge>
  );
}

function getQualityVariant(template: MarketplaceDiscoveryTemplate) {
  if (template.qualityStatus === "ready") return "secondary" as const;
  if (template.qualityStatus === "blocked") return "destructive" as const;

  return "outline" as const;
}
