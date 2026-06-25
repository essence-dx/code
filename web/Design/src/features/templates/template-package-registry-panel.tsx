"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  GitCompareArrows,
  History,
  PackageOpen,
  RotateCcw,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  TemplatePackageCheck,
  TemplatePackageChangelogEntry,
  TemplatePackageDependency,
  TemplatePackageDependencyView,
  TemplatePackageEntry,
  TemplatePackageRegistry,
  TemplatePackageStatus,
} from "@/features/templates/template-package-registry";
import { cn } from "@/lib/utils";

type TemplatePackageRegistryPanelProps = {
  registry: TemplatePackageRegistry;
};

const statusLabels: Record<TemplatePackageStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  TemplatePackageStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function TemplatePackageRegistryPanel({
  registry,
}: TemplatePackageRegistryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" />
              Template package registry
            </CardTitle>
            <CardDescription>
              Semantic package versions, changelogs, install/update/rollback
              checks, and workspace dependency views.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[registry.status]}>
            {registry.score}/100 {statusLabels[registry.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Templates" value={registry.totals.templates} />
          <Metric
            label="Installable"
            value={registry.totals.installablePackages}
          />
          <Metric label="Update checks" value={registry.totals.updateChecks} />
          <Metric
            label="Rollback ready"
            value={registry.totals.rollbackReadyPackages}
          />
          <Metric label="Dependencies" value={registry.totals.dependencyLinks} />
          <Metric label="Changelog" value={registry.totals.changelogEntries} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-3">
            {registry.packages.length ? (
              registry.packages.slice(0, 8).map((item) => (
                <TemplatePackageCard key={item.id} item={item} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Save templates before building the first package registry.
              </p>
            )}
          </section>

          <div className="space-y-4">
            <DependencyViewsPanel views={registry.dependencyViews} />
            <RegistryChangelogPanel changelog={registry.changelog} />
          </div>
        </div>

        {registry.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next registry actions
            </div>
            <div className="mt-2 grid gap-2">
              {registry.nextActions.map((action) => (
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

function TemplatePackageCard({ item }: { item: TemplatePackageEntry }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <Badge variant={statusVariants[item.status]}>
              {statusLabels[item.status]}
            </Badge>
            <Badge variant="outline">v{item.version}</Badge>
            <Badge variant="outline">{item.kindLabel}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.nextAction}
          </p>
        </div>
        <Button asChild size="icon" variant="ghost" aria-label="Open template">
          <a href={item.href}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {item.checks.map((check) => (
          <PackageCheckSignal key={check.id} check={check} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{item.score}/100</Badge>
        <Badge variant="outline">{item.dimensions}</Badge>
        <Badge variant="outline">{item.marketplaceLabel}</Badge>
        <Badge variant="outline">{item.approvalLabel}</Badge>
        <Badge variant="outline">{item.stats.dependencyCount} dependencies</Badge>
        <Badge variant="outline">{item.stats.uses} uses</Badge>
      </div>
    </article>
  );
}

function PackageCheckSignal({ check }: { check: TemplatePackageCheck }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{check.label}</p>
        <ReadinessIcon status={check.status} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {check.detail}
      </p>
    </div>
  );
}

function DependencyViewsPanel({
  views,
}: {
  views: TemplatePackageDependencyView[];
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <GitCompareArrows className="h-4 w-4" />
          Dependency views
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Active projects mapped to reusable template and component packages.
        </p>
      </div>
      {views.length ? (
        <ScrollArea className="h-[340px]">
          <div className="divide-y divide-border">
            {views.map((view) => (
              <div key={view.id} className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {view.packageName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      v{view.version} - {view.detail}
                    </p>
                  </div>
                  <Badge variant={statusVariants[view.status]}>
                    {view.score}/100
                  </Badge>
                </div>
                <div className="grid gap-2">
                  {view.dependencies.slice(0, 4).map((dependency) => (
                    <DependencyRow
                      key={dependency.id}
                      dependency={dependency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No active project dependencies are mapped yet.
        </p>
      )}
    </section>
  );
}

function DependencyRow({
  dependency,
}: {
  dependency: TemplatePackageDependency;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm">{dependency.projectName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dependency.relation} match - {dependency.versionCount} snapshot
            {dependency.versionCount === 1 ? "" : "s"}
          </p>
        </div>
        <ReadinessIcon status={dependency.status} />
      </div>
    </div>
  );
}

function RegistryChangelogPanel({
  changelog,
}: {
  changelog: TemplatePackageChangelogEntry[];
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4" />
          Package changelog
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest release, approval, and workspace activity records.
        </p>
      </div>
      {changelog.length ? (
        <div className="divide-y divide-border">
          {changelog.map((entry) => (
            <div key={entry.id} className="p-3">
              <p className="line-clamp-1 text-sm font-medium">{entry.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {entry.detail}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {entry.actorEmail ?? "System"} - {formatDate(entry.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No package changelog entries are available yet.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RotateCcw className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: TemplatePackageStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
