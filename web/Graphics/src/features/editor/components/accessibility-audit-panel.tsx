"use client";

import { useMemo, useState } from "react";
import { Download, MousePointer2, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getAccessibilityAuditCsv,
  getAccessibilityAuditMarkdown,
  type AccessibilityAudit,
  type AccessibilityIssue,
} from "@/features/editor/accessibility-audit";
import { cn } from "@/lib/utils";

type AccessibilityAuditPanelProps = {
  title: string;
  audit: AccessibilityAudit;
  emptyLabel: string;
  exportName: string;
  quickFixPatches?: LayerPatch[];
  onSelectLayers: (layerIds: string[]) => void;
  onApplyQuickFixes?: (patches: LayerPatch[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type AccessibilityIssueFilter = "all" | "high" | "medium" | "low" | "fixable";

export function AccessibilityAuditPanel({
  title,
  audit,
  emptyLabel,
  exportName,
  quickFixPatches = [],
  onSelectLayers,
  onApplyQuickFixes,
  onRecordActivity,
}: AccessibilityAuditPanelProps) {
  const [filter, setFilter] = useState<AccessibilityIssueFilter>("all");
  const visibleIssues = useMemo(
    () => getVisibleIssues(audit.issues, filter),
    [audit.issues, filter],
  );
  const visibleAudit = useMemo(
    () => getFilteredAudit(audit, visibleIssues),
    [audit, visibleIssues],
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
  const visibleQuickFixPatches = useMemo(() => {
    const visibleLayerIdSet = new Set(visibleLayerIds);

    return quickFixPatches.filter((patch) => visibleLayerIdSet.has(patch.layerId));
  }, [quickFixPatches, visibleLayerIds]);

  function exportCsv() {
    downloadTextFile({
      content: getAccessibilityAuditCsv(visibleAudit),
      filename: `${exportName}-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported accessibility CSV",
      `${title} / ${visibleIssues.length} issues`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAccessibilityAuditMarkdown(visibleAudit, title),
      filename: `${exportName}-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported accessibility handoff",
      `${title} / ${visibleIssues.length} issues`,
    );
  }

  function selectVisibleIssueLayers() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued accessibility review",
      `${title} / ${visibleLayerIds.length} layers`,
    );
  }

  function applyQuickFixes() {
    onApplyQuickFixes?.(visibleQuickFixPatches);
    onRecordActivity?.(
      "Applied accessibility quick fixes",
      `${title} / ${visibleQuickFixPatches.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <div className="font-mono text-sm">{audit.score}</div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="High" value={audit.highCount} />
        <Metric label="Med" value={audit.mediumCount} />
        <Metric label="Low" value={audit.lowCount} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Layers" value={audit.checkedLayerCount} />
        <Metric label="Text" value={audit.textLayerCount} />
        <Metric label="Targets" value={audit.interactiveLayerCount} />
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

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleIssues.length === 0}
          onClick={exportCsv}
        >
          <Download className="size-3.5" />
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
          <Download className="size-3.5" />
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleLayerIds.length === 0}
          onClick={selectVisibleIssueLayers}
        >
          Queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={!onApplyQuickFixes || visibleQuickFixPatches.length === 0}
          onClick={applyQuickFixes}
        >
          <Wrench className="size-3.5" />
          Fix {visibleQuickFixPatches.length || ""}
        </Button>
      </div>

      <IssueList
        issues={visibleIssues}
        emptyLabel={emptyLabel}
        onSelectLayers={onSelectLayers}
      />
    </div>
  );
}

const issueFilters = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Med" },
  { id: "low", label: "Low" },
  { id: "fixable", label: "Fixable" },
] satisfies Array<{ id: AccessibilityIssueFilter; label: string }>;

function getVisibleIssues(
  issues: AccessibilityIssue[],
  filter: AccessibilityIssueFilter,
) {
  if (filter === "all") {
    return issues;
  }

  if (filter === "fixable") {
    return issues.filter((issue) => issue.fixable);
  }

  return issues.filter((issue) => issue.severity === filter);
}

function getFilteredAudit(
  audit: AccessibilityAudit,
  issues: AccessibilityIssue[],
): AccessibilityAudit {
  return {
    ...audit,
    issues,
    highCount: issues.filter((issue) => issue.severity === "high").length,
    mediumCount: issues.filter((issue) => issue.severity === "medium").length,
    lowCount: issues.filter((issue) => issue.severity === "low").length,
  };
}

function IssueList({
  issues,
  emptyLabel,
  onSelectLayers,
}: {
  issues: AccessibilityIssue[];
  emptyLabel: string;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="mt-2 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      {issues.slice(0, 8).map((issue) => (
        <button
          key={issue.id}
          type="button"
          className="w-full rounded-sm border border-border/70 bg-muted/20 p-2 text-left"
          onClick={() => issue.layerId && onSelectLayers([issue.layerId])}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
                issue.severity === "high" && "bg-destructive/15 text-destructive",
                issue.severity === "medium" && "bg-primary/15 text-primary",
                issue.severity === "low" && "bg-muted text-muted-foreground",
              )}
            >
              {issue.severity}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {issue.pageName ? `${issue.pageName} / ` : ""}
              {issue.label}
            </span>
            {issue.layerId ? (
              <MousePointer2 className="size-3.5 text-muted-foreground" />
            ) : null}
          </div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {issue.detail}
          </div>
        </button>
      ))}
      {issues.length > 8 ? (
        <div className="text-[11px] text-muted-foreground">
          +{issues.length - 8} more issues
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
