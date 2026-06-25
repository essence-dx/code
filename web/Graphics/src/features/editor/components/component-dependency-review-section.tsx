"use client";

import { Copy, Download, GitBranch, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ComponentDependencyImpactSummary,
  ComponentDependencyReviewReport,
  ComponentDependencyReviewRow,
} from "@/features/editor/component-dependency-review";
import { getComponentDependencyGraphMermaid } from "@/features/editor/component-dependency-review";

type ComponentDependencyReviewSectionProps = {
  report: ComponentDependencyReviewReport;
};

export function ComponentDependencyReviewSection({
  report,
}: ComponentDependencyReviewSectionProps) {
  const graph = getComponentDependencyGraphMermaid(report);

  if (report.dependencyCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-xs text-muted-foreground">
        <GitBranch className="size-3.5 text-emerald-500" />
        No nested component dependencies yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="size-3.5 text-primary" />
          <span className="truncate text-xs font-medium">Dependency review</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={report.issueCount > 0 ? "outline" : "secondary"}>
            {report.issueCount} issues
          </Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label="Copy component dependency graph"
            onClick={() => void navigator.clipboard.writeText(graph)}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label="Download component dependency graph"
            onClick={() => downloadDependencyGraph(graph)}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <DependencyMetric label="Deps" value={report.dependencyCount} />
        <DependencyMetric label="Nested" value={report.nestedLayerCount} />
        <DependencyMetric label="Slots" value={report.slottedLayerCount} />
        <DependencyMetric label="Issues" value={report.issueCount} />
      </div>
      {report.impactSummaries.length > 0 ? (
        <div className="space-y-1">
          {report.impactSummaries.slice(0, 3).map((summary) => (
            <DependencyImpactRow key={summary.componentId} summary={summary} />
          ))}
        </div>
      ) : null}
      <div className="space-y-1">
        {report.rows.slice(0, 5).map((row) => (
          <DependencyRow key={row.id} row={row} />
        ))}
        {report.rows.length > 5 ? (
          <div className="rounded-sm bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
            {report.rows.length - 5} more component dependencies hidden by the compact review.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function downloadDependencyGraph(graph: string) {
  const blob = new Blob([graph], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "component-dependency-graph.mmd";
  link.click();
  URL.revokeObjectURL(url);
}

function DependencyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/30 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

function DependencyImpactRow({
  summary,
}: {
  summary: ComponentDependencyImpactSummary;
}) {
  return (
    <div className="rounded-sm bg-muted/30 px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">
          {summary.componentName}
        </span>
        <Badge variant={summary.issueCount > 0 ? "outline" : "secondary"}>
          impact {summary.riskScore}
        </Badge>
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        depends on {summary.dependsOnCount} / used by {summary.usedByCount} /
        issues {summary.issueCount}
      </div>
    </div>
  );
}

function DependencyRow({ row }: { row: ComponentDependencyReviewRow }) {
  return (
    <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {row.componentName} {"->"} {row.dependencyName}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {row.sourceNames.join(", ")} / {row.nestedLayerCount} nested
          </div>
        </div>
        <DependencyStatusBadge row={row} />
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      {row.slotNames.length > 0 ? (
        <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          Slots: {row.slotNames.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function DependencyStatusBadge({ row }: { row: ComponentDependencyReviewRow }) {
  if (row.status === "ready") {
    return (
      <Badge variant="secondary" className="shrink-0">
        Ready
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 gap-1">
      <Link2Off className="size-3" />
      {formatStatus(row.status)}
    </Badge>
  );
}

function formatStatus(status: ComponentDependencyReviewRow["status"]) {
  return status.replace(/-/g, " ");
}
