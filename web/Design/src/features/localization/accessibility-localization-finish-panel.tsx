"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  Languages,
  ListChecks,
  ShieldAlert,
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
  AccessibilityLocalizationFinishCenter,
  AccessibilityLocalizationItem,
  AccessibilityLocalizationSection,
  AccessibilityLocalizationStatus,
} from "@/features/localization/accessibility-localization-finish";
import { cn } from "@/lib/utils";

type AccessibilityLocalizationFinishPanelProps = {
  center: AccessibilityLocalizationFinishCenter;
};

const statusLabels: Record<AccessibilityLocalizationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AccessibilityLocalizationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AccessibilityLocalizationFinishPanel({
  center,
}: AccessibilityLocalizationFinishPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Accessibility and localization finish
            </CardTitle>
            <CardDescription>
              Page-level issue routing, copy-length checks, translation QA, and
              stakeholder handoff exports.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.handoffExport.fileName}
                href={center.handoffExport.dataUrl}
              >
                <Download className="h-4 w-4" />
                Export packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Pages" value={center.totals.pages} />
          <Metric label="Page issues" value={center.totals.routedIssues} />
          <Metric label="Copy warnings" value={center.totals.copyWarnings} />
          <Metric label="Strings" value={center.totals.translationEntries} />
          <Metric label="Packets" value={center.totals.handoffExports} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.sections.map((section) => (
            <FinishSection key={section.id} section={section} />
          ))}
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next finishing actions
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

function FinishSection({
  section,
}: {
  section: AccessibilityLocalizationSection;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{section.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {section.description}
          </p>
        </div>
        <ReadinessIcon status={section.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={statusVariants[section.status]}>
          {statusLabels[section.status]}
        </Badge>
        <Badge variant="outline">{section.score}/100</Badge>
        <Badge variant="outline">
          {section.metricValue} {section.metricLabel}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {section.items.length ? (
          section.items.map((item) => (
            <FinishItem key={`${section.id}-${item.id}`} item={item} />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            {section.emptyState}
          </p>
        )}
      </div>
    </section>
  );
}

function FinishItem({ item }: { item: AccessibilityLocalizationItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]} className="shrink-0">
          {item.badge}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.meta.slice(0, 3).map((meta) => (
          <Badge key={meta} variant="outline">
            {meta}
          </Badge>
        ))}
      </div>
      {item.href ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={item.href}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: AccessibilityLocalizationStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
