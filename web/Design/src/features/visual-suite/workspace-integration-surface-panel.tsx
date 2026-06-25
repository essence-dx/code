"use client";

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  PanelTop,
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
  WorkspaceIntegrationSection,
  WorkspaceIntegrationStatus,
  WorkspaceIntegrationSurface,
} from "@/features/visual-suite/workspace-integration-surface";
import { cn } from "@/lib/utils";

type WorkspaceIntegrationSurfacePanelProps = {
  surface: WorkspaceIntegrationSurface;
};

const statusLabels: Record<WorkspaceIntegrationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspaceIntegrationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspaceIntegrationSurfacePanel({
  surface,
}: WorkspaceIntegrationSurfacePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Workspace integration surface
            </CardTitle>
            <CardDescription>
              Handoffs, reusable template shelves, and production review queues
              in one place.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[surface.status]}>
            {surface.score}/100 {statusLabels[surface.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <IntegrationMetric
            label="Active projects"
            value={surface.totals.activeProjects}
          />
          <IntegrationMetric
            label="Ready handoffs"
            value={surface.totals.handoffReady}
          />
          <IntegrationMetric
            label="Template shelves"
            value={surface.totals.templateShelves}
          />
          <IntegrationMetric
            label="Review items"
            value={surface.totals.reviewItems}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {surface.sections.map((section) => (
            <IntegrationSectionView key={section.id} section={section} />
          ))}
        </div>

        {surface.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <PanelTop className="h-4 w-4 text-muted-foreground" />
              Next integration actions
            </div>
            <div className="mt-2 grid gap-2">
              {surface.nextActions.map((action) => (
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

function IntegrationSectionView({
  section,
}: {
  section: WorkspaceIntegrationSection;
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
            <div
              key={item.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <Badge
                  variant={statusVariants[item.status]}
                  className="shrink-0"
                >
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

function ReadinessIcon({ status }: { status: WorkspaceIntegrationStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function IntegrationMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <PackageCheck className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
