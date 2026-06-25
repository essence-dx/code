"use client";

import { useMemo, useState } from "react";
import { Code2, Download, FileJson2, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDevModeIntegrationReviewCsv,
  getDevModeIntegrationReviewJson,
  getDevModeIntegrationReviewMarkdown,
  type DevModeIntegrationReviewReport,
  type DevModeIntegrationReviewRow,
  type DevModeIntegrationReviewStatus,
} from "@/features/editor/dev-mode-integration-review";
import { cn } from "@/lib/utils";

type DevModeIntegrationReviewPanelProps = {
  report: DevModeIntegrationReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type DevModeIntegrationReviewFilter =
  | "all"
  | DevModeIntegrationReviewStatus
  | DevModeIntegrationReviewRow["category"];

export function DevModeIntegrationReviewPanel({
  report,
  onRecordActivity,
}: DevModeIntegrationReviewPanelProps) {
  const [filter, setFilter] =
    useState<DevModeIntegrationReviewFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getDevModeIntegrationReviewCsv(report, visibleRows),
      filename: `dev-mode-integration-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode integration CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDevModeIntegrationReviewMarkdown(report, visibleRows),
      filename: `dev-mode-integration-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode integration review",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getDevModeIntegrationReviewJson(report, visibleRows),
      filename: `dev-mode-integration-review-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode integration evidence",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Code2 className="size-3.5" />
            Dev Mode integration
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Codegen freshness, variable bindings, integration links, and export evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Fresh" value={report.codegenFreshnessStatus} />
        <Metric label="Vars" value={`${report.variableHandoffCoveragePercent}%`} />
        <Metric label="Links" value={report.linkHealthStatus} />
        <Metric label="Bundle" value={`${report.exportBundleCoveragePercent}%`} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Story" value={report.storybookLinkCount} />
        <Metric label="GitHub" value={report.githubLinkCount} />
        <Metric label="Jira" value={report.jiraLinkCount} />
        <Metric label="Bad" value={report.invalidLinkCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {filters.map((item) => (
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
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          <Download className="size-3" />
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <IntegrationRow key={row.id} row={row} />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No Dev Mode integration rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more integration rows
          </div>
        ) : null}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Export evidence</div>
        <div className="mt-1 line-clamp-2">
          {report.exportBundleEvidence.join(" ")}
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ row }: { row: DevModeIntegrationReviewRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 size-3.5 shrink-0 opacity-75" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.label}
            </span>
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate font-mono text-[10px] opacity-75">
            {row.category} / {row.value}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 line-clamp-2 text-[10px] opacity-75">
            {row.recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "codegen-freshness", label: "Fresh" },
  { id: "variable-handoff", label: "Vars" },
  { id: "link-health", label: "Links" },
  { id: "export-bundle", label: "Bundle" },
] as const satisfies ReadonlyArray<{
  id: DevModeIntegrationReviewFilter;
  label: string;
}>;

function getVisibleRows(
  rows: DevModeIntegrationReviewRow[],
  filter: DevModeIntegrationReviewFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "ready" || filter === "review" || filter === "blocked") {
    return rows.filter((row) => row.status === filter);
  }

  return rows.filter((row) => row.category === filter);
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-muted/40 p-1.5">
      <div className="truncate">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: DevModeIntegrationReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
