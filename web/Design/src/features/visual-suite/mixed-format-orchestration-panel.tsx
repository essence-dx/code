"use client";

import {
  CheckCircle2,
  ExternalLink,
  FileStack,
  Layers3,
  PanelTop,
  Workflow,
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
import { Separator } from "@/components/ui/separator";
import type {
  MixedFormatProjectOrchestration,
  MixedFormatReadinessStatus,
  MixedFormatWorkspaceOrchestration,
} from "@/features/visual-suite/mixed-format-orchestration";

type MixedFormatOrchestrationPanelProps = {
  orchestration: MixedFormatWorkspaceOrchestration;
};

const statusLabels: Record<MixedFormatReadinessStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  MixedFormatReadinessStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function MixedFormatOrchestrationPanel({
  orchestration,
}: MixedFormatOrchestrationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Mixed-format orchestration
            </CardTitle>
            <CardDescription>
              Page-type coverage and readiness across docs, sheets,
              whiteboards, presentations, social, video, websites, email, and
              print.
            </CardDescription>
          </div>
          <Badge
            variant={
              orchestration.totals.averageReadiness >= 85
                ? "secondary"
                : "outline"
            }
          >
            {orchestration.totals.averageReadiness}/100 average
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <OrchestrationMetric
            label="Projects"
            value={orchestration.totals.projects}
          />
          <OrchestrationMetric
            label="Mixed format"
            value={orchestration.totals.mixedFormatProjects}
          />
          <OrchestrationMetric
            label="Pages"
            value={orchestration.totals.pageCount}
          />
          <OrchestrationMetric
            label="Suite types"
            value={
              orchestration.suiteCoverage.filter(
                (item) => item.projectCount > 0,
              ).length
            }
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <PanelTop className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Visual suite coverage</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
            {orchestration.suiteCoverage.map((item) => (
              <div
                key={item.pageType}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant={statusVariants[item.status]}>
                    {item.pageCount}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.projectCount} project
                  {item.projectCount === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileStack className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Project orchestration</h3>
          </div>
          {orchestration.projects.length ? (
            <div className="grid gap-3">
              {orchestration.projects.slice(0, 6).map((project) => (
                <MixedFormatProjectRow
                  key={project.projectId}
                  project={project}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Create a project to start tracking mixed-format orchestration.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function MixedFormatProjectRow({
  project,
}: {
  project: MixedFormatProjectOrchestration;
}) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold">
              {project.projectName}
            </h4>
            <Badge variant={statusVariants[project.status]}>
              {statusLabels[project.status]}
            </Badge>
            {project.isMixedFormat ? (
              <Badge variant="secondary">Mixed format</Badge>
            ) : (
              <Badge variant="outline">Single format</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.pageCount} pages - {project.pageTypeLabels.join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Badge variant="outline">{project.readinessScore}/100</Badge>
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${project.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 xl:grid-cols-3">
        {project.pageReadiness.slice(0, 3).map((page) => (
          <div
            key={page.pageId}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{page.pageName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {page.pageTypeLabel}
                </p>
              </div>
              <Badge variant={statusVariants[page.status]}>
                {page.score}/100
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {page.signals.slice(0, 4).map((signal) => (
                <Badge key={signal} variant="outline">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {project.nextBestActions.length ? (
        <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Layers3 className="h-4 w-4 text-muted-foreground" />
            Next actions
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {project.nextBestActions.map((action) => (
              <li key={action} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function OrchestrationMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
