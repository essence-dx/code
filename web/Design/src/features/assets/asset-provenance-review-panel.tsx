"use client";

import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock3,
  ExternalLink,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  AssetProvenanceReviewCenter,
  AssetProvenanceReviewItem,
  AssetProvenanceStatus,
} from "@/features/assets/asset-provenance-review";

type AssetProvenanceReviewPanelProps = {
  center: AssetProvenanceReviewCenter;
};

const statusLabels: Record<AssetProvenanceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AssetProvenanceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AssetProvenanceReviewPanel({
  center,
}: AssetProvenanceReviewPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Asset provenance
            </CardTitle>
            <CardDescription>
              Source lineage, license reminders, usage impact, and export-safe
              warnings for stored assets.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-5">
          <Metric label="Assets" value={center.totals.assets} />
          <Metric label="Export safe" value={center.totals.exportSafe} />
          <Metric label="Attribution" value={center.totals.needsAttribution} />
          <Metric label="Review due" value={center.totals.expiring} />
          <Metric label="Blocked" value={center.totals.blocked} />
        </div>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <ReviewQueue
              icon={FileWarning}
              title="Export-safe warnings"
              description="Assets that need source, license, attribution, or manifest review before handoff."
              emptyState="No export warnings are pending."
              items={center.exportWarnings}
            />
            <ReviewQueue
              icon={Boxes}
              title="Usage impact"
              description="High-impact project, brand, or package assets to review first."
              emptyState="No high-impact asset reviews are pending."
              items={center.usageImpactQueue}
            />
          </div>
          <div className="space-y-4">
            <ReviewQueue
              icon={AlertTriangle}
              title="Source lineage"
              description="Assets missing usable provenance or using restricted terms."
              emptyState="Every asset has usable source lineage."
              items={center.sourceLineageQueue}
              compact
            />
            <ReviewQueue
              icon={Clock3}
              title="License reminders"
              description="External sources due for recurring license review."
              emptyState="No license review reminders are due."
              items={center.expirationQueue}
              compact
            />
          </div>
        </section>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Provenance next actions
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

function ReviewQueue({
  icon: Icon,
  title,
  description,
  emptyState,
  items,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  emptyState: string;
  items: AssetProvenanceReviewItem[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" />
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length ? (
        <ScrollArea className={compact ? "h-[250px]" : "h-[330px]"}>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <ProvenanceRow key={`${title}-${item.id}`} item={item} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">{emptyState}</p>
      )}
    </div>
  );
}

function ProvenanceRow({ item }: { item: AssetProvenanceReviewItem }) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <Badge variant={statusVariants[item.status]}>
              {statusLabels[item.status]}
            </Badge>
            <Badge variant="outline">{item.licenseStatus}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.scopeLabel} - {item.mimeType}
          </p>
        </div>
        <Badge variant={item.usageImpact === "high" ? "outline" : "secondary"}>
          {item.usageImpact}
        </Badge>
      </div>

      <div className="grid gap-1.5">
        {item.sourceLineage.map((step) => (
          <div
            key={`${item.id}-${step.label}`}
            className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium">{step.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {step.detail}
              </p>
            </div>
            {step.href ? (
              <Button
                asChild
                size="icon-sm"
                variant="ghost"
                aria-label={`Open ${step.label}`}
              >
                <a href={step.href}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {item.reviewDueAt ? (
        <p className="text-xs text-muted-foreground">
          Review due {formatDate(item.reviewDueAt)}.
        </p>
      ) : null}

      {item.exportWarnings.length ? (
        <div className="grid gap-1">
          {item.exportWarnings.map((warning) => (
            <p key={warning} className="flex gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{item.usageDetail}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
