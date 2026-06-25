"use client";

import {
  ArrowRight,
  CheckCircle2,
  Component,
  Download,
  ExternalLink,
  GitBranch,
  Layers3,
  ShieldCheck,
  TriangleAlert,
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
  ReusableComponentLibrary,
  ReusableComponentSectionLibraryCenter,
  ReusableLibraryStatus,
  ReusableSectionLibrary,
} from "@/features/libraries/reusable-component-section-library";
import { cn } from "@/lib/utils";

type ReusableComponentSectionLibraryPanelProps = {
  center: ReusableComponentSectionLibraryCenter;
};

const statusLabels: Record<ReusableLibraryStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ReusableLibraryStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ReusableComponentSectionLibraryPanel({
  center,
}: ReusableComponentSectionLibraryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              Reusable component and section libraries
            </CardTitle>
            <CardDescription>
              Versioned component variants, dependency-aware updates, and
              design-system-safe insert packets for reusable creative sections.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Components" value={center.totals.componentLibraries} />
          <Metric label="Sections" value={center.totals.sectionLibraries} />
          <Metric label="Variants" value={center.totals.versionedVariants} />
          <Metric
            label="Dependencies"
            value={center.totals.dependencyUpdatePlans}
          />
          <Metric label="Insert plans" value={center.totals.safeInsertPlans} />
          <Metric label="Blocked" value={center.totals.blockedInsertPlans} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Component libraries"
            badge={`${center.componentLibraries.length} components`}
            icon={<Component className="h-4 w-4 text-muted-foreground" />}
          >
            {center.componentLibraries.length ? (
              <div className="grid gap-3">
                {center.componentLibraries.slice(0, 8).map((library) => (
                  <ComponentLibraryCard key={library.id} library={library} />
                ))}
              </div>
            ) : (
              <EmptyLine>
                Publish reusable templates to populate component libraries.
              </EmptyLine>
            )}
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              title="Section libraries"
              badge={`${center.sectionLibraries.length} sections`}
              icon={<Layers3 className="h-4 w-4 text-muted-foreground" />}
            >
              {center.sectionLibraries.length ? (
                <div className="grid gap-2">
                  {center.sectionLibraries.map((section) => (
                    <SectionLibraryRow key={section.id} section={section} />
                  ))}
                </div>
              ) : (
                <EmptyLine>
                  Component definitions will be grouped into sections here.
                </EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              title="Next insert actions"
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
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentLibraryCard({
  library,
}: {
  library: ReusableComponentLibrary;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={library.status} />
            <h3 className="truncate text-sm font-semibold">{library.name}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {library.safeInsertPlan.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariants[library.status]}>
            {library.score}/100
          </Badge>
          <Button asChild size="icon" variant="ghost" aria-label="Open library">
            <a href={library.href}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Signal
          icon={<Layers3 className="h-4 w-4" />}
          label="Section"
          value={library.sectionKind}
          detail={`${library.safeInsertPlan.targetFormats.length} insert targets`}
        />
        <Signal
          icon={<GitBranch className="h-4 w-4" />}
          label="Versions"
          value={library.versionedVariants.length}
          detail={
            library.versionedVariants[0]?.detail ??
            "Version variants are waiting for reuse evidence."
          }
        />
        <Signal
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Safe insert"
          value={`${library.safeInsertPlan.score}/100`}
          detail={
            library.dependencyUpdatePlan.blockers[0] ?? "Gates are clear."
          }
          variant={statusVariants[library.safeInsertPlan.status]}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <SectionHeader>Versioned variants</SectionHeader>
          <div className="mt-2 grid gap-2">
            {library.versionedVariants.slice(0, 3).map((variant) => (
              <div
                key={variant.id}
                className="rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium">
                    {variant.label}
                  </p>
                  <Badge variant={statusVariants[variant.status]}>
                    {statusLabels[variant.status]}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {variant.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader>Insert gates</SectionHeader>
          <ScrollArea className="mt-2 h-[150px] pr-3">
            <div className="grid gap-2">
              {library.safeInsertPlan.requiredGates.map((gate) => (
                <div
                  key={gate.id}
                  className="rounded-md border border-border bg-background p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{gate.label}</p>
                    <Badge variant={statusVariants[gate.status]}>
                      {statusLabels[gate.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {gate.detail}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={library.insertPacket.downloadJson}
          download={`${library.templateId}-component-insert.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Component packet
        </a>
      </Button>
    </article>
  );
}

function SectionLibraryRow({ section }: { section: ReusableSectionLibrary }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={section.status} />
            <p className="truncate text-sm font-medium">{section.label}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {section.nextAction}
          </p>
        </div>
        <Badge variant={statusVariants[section.status]}>
          {section.score}/100
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {section.componentIds.length} components
        </Badge>
        <Badge variant="outline">{section.variantCount} variants</Badge>
        <Badge variant="outline">
          {section.safeInsertPlanIds.length} insert plans
        </Badge>
      </div>
      <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
        <a
          href={section.insertPacket.downloadJson}
          download={`${section.kind}-section-insert.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Section packet
        </a>
      </Button>
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Signal({
  icon,
  label,
  value,
  detail,
  variant = "outline",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  variant?: "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: ReusableLibraryStatus }) {
  const className = cn(
    "h-4 w-4",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <TriangleAlert className={className} />;

  return <TriangleAlert className={className} />;
}
