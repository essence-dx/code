"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  LayoutTemplate,
  Maximize2,
  Ruler,
  Sparkles,
  Type,
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
  LayoutHierarchyCheck,
  LayoutRepairPlan,
  LayoutResponsiveSuggestion,
  LayoutSpacingAudit,
  RuleBasedLayoutIntelligenceCenter,
  RuleBasedLayoutPageReport,
  RuleBasedLayoutProjectReport,
  RuleBasedLayoutStatus,
} from "@/features/creation/rule-based-layout-intelligence";
import { cn } from "@/lib/utils";

type RuleBasedLayoutIntelligencePanelProps = {
  center: RuleBasedLayoutIntelligenceCenter;
};

const statusLabels: Record<RuleBasedLayoutStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  RuleBasedLayoutStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function RuleBasedLayoutIntelligencePanel({
  center,
}: RuleBasedLayoutIntelligencePanelProps) {
  const topProject = center.projectReports[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Rule-based layout intelligence
            </CardTitle>
            <CardDescription>
              Spacing audits, hierarchy checks, responsive format suggestions,
              and one-click repair plans for real project pages.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.repairPlans.toLocaleString()} repairs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Pages" value={center.totals.pages} />
          <Metric label="Spacing" value={center.totals.spacingAudits} />
          <Metric label="Hierarchy" value={center.totals.hierarchyChecks} />
          <Metric
            label="Responsive"
            value={center.totals.responsiveSuggestions}
          />
          <Metric label="Repairs" value={center.totals.repairPlans} />
          <Metric label="Blocked" value={center.totals.blockedPages} />
          <Metric label="Review" value={center.totals.reviewPages} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Project layout readiness"
            badge={`${center.projectReports.length} projects`}
            icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            {center.projectReports.length ? (
              <ScrollArea className="h-[360px]">
                <div className="grid gap-2 pr-3">
                  {center.projectReports.map((project) => (
                    <ProjectReportCard key={project.id} project={project} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>
                No project pages are available for layout intelligence.
              </EmptyLine>
            )}
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              title="Page findings"
              badge={`${center.pageReports.length} pages`}
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.pageReports.slice(0, 5).map((page) => (
                  <PageReportRow key={page.id} page={page} />
                ))}
              </div>
            </PanelBlock>

            <PanelBlock
              title="Responsive suggestions"
              badge={`${center.responsiveSuggestions.length} suggestions`}
              icon={<Maximize2 className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.responsiveSuggestions.slice(0, 4).map((suggestion) => (
                  <ResponsiveSuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            </PanelBlock>
          </div>
        </div>

        {topProject ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelBlock
              title="Spacing audits"
              badge={`${center.spacingAudits.length} audits`}
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.spacingAudits.slice(0, 4).map((audit) => (
                  <SpacingAuditRow key={audit.id} audit={audit} />
                ))}
              </div>
            </PanelBlock>

            <PanelBlock
              title="Hierarchy checks"
              badge={`${center.hierarchyChecks.length} checks`}
              icon={<Type className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.hierarchyChecks.slice(0, 4).map((check) => (
                  <HierarchyCheckRow key={check.id} check={check} />
                ))}
              </div>
            </PanelBlock>
          </div>
        ) : null}

        <PanelBlock
          title="One-click repair plans"
          badge={`${center.repairPlans.length} plans`}
          icon={<Download className="h-4 w-4 text-muted-foreground" />}
        >
          {center.repairPlans.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {center.repairPlans.map((plan) => (
                <RepairPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <EmptyLine>
              No repair plans are needed for current layouts.
            </EmptyLine>
          )}
        </PanelBlock>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Layout next actions
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
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProjectReportCard({
  project,
}: {
  project: RuleBasedLayoutProjectReport;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={project.status} />
            <h3 className="truncate text-sm font-semibold">
              {project.projectName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.nextAction}
          </p>
        </div>
        <Badge variant={statusVariants[project.status]}>
          {project.score}/100
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <MiniStat label="Pages" value={project.pageCount} />
        <MiniStat label="Repairs" value={project.repairPlanIds.length} />
        <MiniStat label="Reports" value={project.pageReportIds.length} />
      </div>
    </article>
  );
}

function PageReportRow({ page }: { page: RuleBasedLayoutPageReport }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{page.pageName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {page.dimensions.width}x{page.dimensions.height} /{" "}
            {page.repairPlanIds.length} repair plans
          </p>
        </div>
        <Badge variant={statusVariants[page.status]}>{page.score}/100</Badge>
      </div>
    </div>
  );
}

function ResponsiveSuggestionRow({
  suggestion,
}: {
  suggestion: LayoutResponsiveSuggestion;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{suggestion.targetLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {suggestion.targetWidth}x{suggestion.targetHeight} /{" "}
            {suggestion.scalePercent}% scale
          </p>
        </div>
        <Badge variant={statusVariants[suggestion.status]}>
          {statusLabels[suggestion.status]}
        </Badge>
      </div>
    </div>
  );
}

function SpacingAuditRow({ audit }: { audit: LayoutSpacingAudit }) {
  return (
    <FindingRow
      status={audit.status}
      title={audit.issue}
      detail={audit.detail}
      action={audit.repairAction}
    />
  );
}

function HierarchyCheckRow({ check }: { check: LayoutHierarchyCheck }) {
  return (
    <FindingRow
      status={check.status}
      title={check.issue}
      detail={check.detail}
      action={check.repairAction}
    />
  );
}

function FindingRow({
  status,
  title,
  detail,
  action,
}: {
  status: RuleBasedLayoutStatus;
  title: string;
  detail: string;
  action: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 p-3",
        status === "blocked" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <p className="mt-2 text-xs text-muted-foreground">{action}</p>
    </div>
  );
}

function RepairPlanCard({ plan }: { plan: LayoutRepairPlan }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{plan.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.operations.length} operations
          </p>
        </div>
        <Badge variant={statusVariants[plan.status]}>
          {statusLabels[plan.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-1">
        {plan.operations.slice(0, 3).map((operation) => (
          <p key={operation.kind} className="text-xs text-muted-foreground">
            {operation.description}
          </p>
        ))}
      </div>
      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
        <a href={plan.dataUrl} download={plan.fileName}>
          <Download className="h-4 w-4" />
          Repair packet
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
    <section className="rounded-md border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusIcon({ status }: { status: RuleBasedLayoutStatus }) {
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  if (status === "review") {
    return <Ruler className="h-4 w-4 text-muted-foreground" />;
  }

  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}
