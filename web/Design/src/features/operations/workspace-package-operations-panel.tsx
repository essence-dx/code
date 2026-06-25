"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  Layers,
  PackageCheck,
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
  WorkspacePackageItem,
  WorkspacePackageOperations,
  WorkspacePackageSection,
  WorkspacePackageStatus,
} from "@/features/operations/workspace-package-operations";
import { cn } from "@/lib/utils";

type WorkspacePackageOperationsPanelProps = {
  operations: WorkspacePackageOperations;
};

const statusLabels: Record<WorkspacePackageStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspacePackageStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspacePackageOperationsPanel({
  operations,
}: WorkspacePackageOperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Workspace package operations
            </CardTitle>
            <CardDescription>
              Project bundles, reusable kits, dependency health, and migration
              readiness for workspace-scale production.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[operations.status]}>
            {operations.score}/100 {statusLabels[operations.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={operations.totals.activeProjects} />
          <Metric label="Versioned" value={operations.totals.versionedProjects} />
          <Metric label="Bundles" value={operations.totals.readyBundles} />
          <Metric label="Kits" value={operations.totals.componentKits} />
          <Metric
            label="Dependency issues"
            value={operations.totals.blockedDependencies}
          />
          <Metric label="Migration checks" value={operations.totals.migrationChecks} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {operations.sections.map((section) => (
            <PackageSectionCard key={section.id} section={section} />
          ))}
        </div>

        {operations.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Next package actions
            </div>
            <div className="mt-2 grid gap-2">
              {operations.nextActions.map((action) => (
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

function PackageSectionCard({
  section,
}: {
  section: WorkspacePackageSection;
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
            <PackageItemCard key={`${section.id}-${item.id}`} item={item} />
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

function PackageItemCard({ item }: { item: WorkspacePackageItem }) {
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
        <Layers className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: WorkspacePackageStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
