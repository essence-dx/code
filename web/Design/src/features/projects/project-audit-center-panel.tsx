"use client";

import { ClipboardCheck, ExternalLink } from "lucide-react";

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
  ProjectAuditStatus,
  ProjectAuditSummary,
} from "@/features/projects/project-audit-center";

type ProjectAuditCenterPanelProps = {
  audits: ProjectAuditSummary[];
};

const statusLabels: Record<ProjectAuditStatus, string> = {
  ready: "Ready",
  review: "Review",
  fix: "Fix",
};

const statusVariants: Record<
  ProjectAuditStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "secondary",
  review: "outline",
  fix: "destructive",
};

export function ProjectAuditCenterPanel({
  audits,
}: ProjectAuditCenterPanelProps) {
  const averageScore = audits.length
    ? Math.round(
        audits.reduce((total, audit) => total + audit.overallScore, 0) /
          audits.length,
      )
    : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Project audit center
            </CardTitle>
            <CardDescription>
              Accessibility, SEO, brand, print, email, and website readiness in one place.
            </CardDescription>
          </div>
          <Badge variant={averageScore >= 85 ? "secondary" : "outline"}>
            {averageScore}/100 average
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {audits.length ? (
          <div className="grid gap-3">
            {audits.map((audit) => (
              <ProjectAuditRow key={audit.projectId} audit={audit} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            Create a design to start tracking production readiness.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectAuditRow({ audit }: { audit: ProjectAuditSummary }) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {audit.projectName}
            </h3>
            <Badge variant={statusVariants[audit.status]}>
              {statusLabels[audit.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {new Date(audit.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{audit.overallScore}/100</Badge>
          <Button asChild variant="ghost" size="icon" aria-label="Open project">
            <a href={`/editor/${audit.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {audit.dimensions.map((dimension) => (
          <div
            key={dimension.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{dimension.label}</p>
              <Badge variant={statusVariants[dimension.status]}>
                {dimension.score}/100
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {dimension.detail}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
