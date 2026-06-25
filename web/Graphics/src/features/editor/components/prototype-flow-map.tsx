"use client";

import { useMemo, useState } from "react";
import { Link2Off, MousePointer2, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type {
  PrototypeFlowDiagnostics,
  PrototypeFlowIssue,
} from "@/features/editor/prototype-flow-diagnostics";
import {
  getRecommendedPrototypeStartPageId,
  getPrototypeFlowDiagnosticsCsv,
  getPrototypeFlowDiagnosticsMarkdown,
} from "@/features/editor/prototype-flow-diagnostics";
import { cn } from "@/lib/utils";

type PrototypeFlowMapProps = {
  report: PrototypeFlowDiagnostics;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
  onClearPrototypeLinks: (layerIds: string[]) => void;
  onSetPrototypeStartPage: (pageId: string) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type PrototypeFlowIssueFilter = "all" | "high" | "medium" | "low" | "active";

export function PrototypeFlowMap({
  report,
  activePageId,
  onSelectLayers,
  onClearPrototypeLinks,
  onSetPrototypeStartPage,
  onRecordActivity,
}: PrototypeFlowMapProps) {
  const [filter, setFilter] = useState<PrototypeFlowIssueFilter>("all");
  const recommendedStartPageId = getRecommendedPrototypeStartPageId(report);
  const activeBrokenIssues = report.issues.filter(
    (issue) =>
      issue.pageId === activePageId &&
      issue.label === "Broken hotspot target" &&
      issue.layerId,
  );
  const visibleIssues = useMemo(
    () => getVisibleIssues(report.issues, activePageId, filter),
    [activePageId, filter, report.issues],
  );
  const visibleLayerIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleIssues
            .map((issue) => issue.layerId)
            .filter((layerId): layerId is string => Boolean(layerId)),
        ),
      ),
    [visibleIssues],
  );

  function exportCsv() {
    downloadTextFile({
      content: getPrototypeFlowDiagnosticsCsv({
        ...report,
        issues: visibleIssues,
      }),
      filename: `prototype-flow-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported prototype flow CSV",
      `${visibleIssues.length} issues`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPrototypeFlowDiagnosticsMarkdown({
        ...report,
        issues: visibleIssues,
      }),
      filename: `prototype-flow-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported prototype flow handoff",
      `${visibleIssues.length} issues`,
    );
  }

  function queueReview() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued prototype flow review",
      `${visibleLayerIds.length} layers`,
    );
  }

  function normalizeStartPage() {
    if (!recommendedStartPageId) {
      return;
    }

    const page = report.pages.find((item) => item.pageId === recommendedStartPageId);

    onSetPrototypeStartPage(recommendedStartPageId);
    onRecordActivity?.(
      "Normalized prototype start page",
      page?.pageName ?? recommendedStartPageId,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Route className="size-3.5" />
            Prototype flow
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Page starts, hotspot routing, and broken target diagnostics.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {recommendedStartPageId ? (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={normalizeStartPage}
            >
              Set start
            </Button>
          ) : null}
          {activeBrokenIssues.length > 0 ? (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() =>
                onClearPrototypeLinks(
                  activeBrokenIssues
                    .map((issue) => issue.layerId)
                    .filter((layerId): layerId is string => Boolean(layerId)),
                )
              }
            >
              <Link2Off className="size-3.5" />
              Clear page
            </Button>
          ) : null}
          <Badge
            variant={report.warningCount > 0 ? "destructive" : "secondary"}
          >
            {report.hotspotCount}
          </Badge>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <FlowMetric label="Pages" value={report.pageCount} />
        <FlowMetric label="Starts" value={report.startPageCount} />
        <FlowMetric label="Issues" value={report.warningCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {issueFilters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleIssues.length === 0}
          onClick={exportCsv}
        >
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleIssues.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleLayerIds.length === 0}
          onClick={queueReview}
        >
          Queue
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {report.pages.map((page) => (
          <div
            key={page.pageId}
            className={cn(
              "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
              page.pageId === activePageId && "border-primary/60 bg-primary/10",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">
                {page.pageName}
              </span>
              {page.prototypeStart ? (
                <Badge variant="secondary">Start</Badge>
              ) : null}
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              out {page.outgoingCount} / in {page.incomingCount} / broken{" "}
              {page.brokenCount}
            </div>
          </div>
        ))}
      </div>

      {visibleIssues.length > 0 ? (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          {visibleIssues.slice(0, 5).map((issue) => (
            <BrokenFlowIssue
              key={issue.id}
              issue={issue}
              activePageId={activePageId}
              onSelectLayers={onSelectLayers}
              onClearPrototypeLinks={onClearPrototypeLinks}
            />
          ))}
          {visibleIssues.length > 5 ? (
            <div className="text-[11px] text-muted-foreground">
              +{visibleIssues.length - 5} more prototype issues
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BrokenFlowIssue({
  issue,
  activePageId,
  onSelectLayers,
  onClearPrototypeLinks,
}: {
  issue: PrototypeFlowIssue;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
  onClearPrototypeLinks: (layerIds: string[]) => void;
}) {
  const canSelect = issue.pageId === activePageId && Boolean(issue.layerId);
  const canClear = canSelect && issue.label === "Broken hotspot target";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-sm border p-2 text-xs",
        issue.severity === "high" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        issue.severity === "medium" &&
          "border-primary/30 bg-primary/10 text-primary",
        issue.severity === "low" &&
          "border-border bg-muted/30 text-muted-foreground",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{issue.label}</span>
        <span className="block truncate text-[11px] opacity-80">
          {issue.layerName ? `${issue.pageName} / ${issue.layerName}` : issue.pageName}
        </span>
      </span>
      {canSelect ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Select broken prototype layer"
            onClick={() => {
              if (issue.layerId) {
                onSelectLayers([issue.layerId]);
              }
            }}
          >
            <MousePointer2 className="size-3.5" />
          </Button>
          {canClear && issue.layerId ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Clear broken prototype link"
              onClick={() => {
                if (issue.layerId) {
                  onClearPrototypeLinks([issue.layerId]);
                }
              }}
            >
              <Link2Off className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const issueFilters = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Med" },
  { id: "low", label: "Low" },
  { id: "active", label: "Page" },
] satisfies Array<{ id: PrototypeFlowIssueFilter; label: string }>;

function getVisibleIssues(
  issues: PrototypeFlowIssue[],
  activePageId: string,
  filter: PrototypeFlowIssueFilter,
) {
  if (filter === "all") {
    return issues;
  }

  if (filter === "active") {
    return issues.filter((issue) => issue.pageId === activePageId);
  }

  return issues.filter((issue) => issue.severity === filter);
}

function FlowMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
