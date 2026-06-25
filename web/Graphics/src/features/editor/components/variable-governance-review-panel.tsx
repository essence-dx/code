"use client";

import { useMemo, useState } from "react";
import { Download, Network, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getVariableGovernanceReviewCsv,
  getVariableGovernanceReviewMarkdown,
} from "@/features/editor/variable-governance-review-export";
import { getVariableGovernancePatch } from "@/features/editor/variable-governance-review-patches";
import type {
  VariableGovernanceCategory,
  VariableGovernanceReviewReport,
  VariableGovernanceReviewRow,
  VariableGovernanceStatus,
} from "@/features/editor/variable-governance-review-types";
import type { DesignDocument } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type VariableGovernanceReviewPanelProps = {
  document: DesignDocument;
  report: VariableGovernanceReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onUpdateVariableSystem: (
    patch: Partial<
      Pick<
        DesignDocument,
        | "variables"
        | "variableModes"
        | "activeVariableModeId"
        | "variableDefinitions"
        | "variableCollections"
      >
    >,
    applyBindings?: boolean,
  ) => void;
};

type VariableGovernanceFilter =
  | "all"
  | VariableGovernanceStatus
  | VariableGovernanceCategory
  | "repairable";

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "alias", label: "Alias" },
  { id: "coverage", label: "Modes" },
  { id: "orphan", label: "Unused" },
  { id: "repairable", label: "Fixable" },
] satisfies Array<{ id: VariableGovernanceFilter; label: string }>;

export function VariableGovernanceReviewPanel({
  document,
  report,
  onRecordActivity,
  onUpdateVariableSystem,
}: VariableGovernanceReviewPanelProps) {
  const [filter, setFilter] = useState<VariableGovernanceFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const repairRows = useMemo(
    () => visibleRows.filter((row) => row.repairable),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getVariableGovernanceReviewCsv(report, visibleRows),
      filename: `variable-governance-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported variable governance CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getVariableGovernanceReviewMarkdown(report, visibleRows),
      filename: `variable-governance-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported variable governance handoff",
      `${visibleRows.length} rows`,
    );
  }

  function applyRows(rows: VariableGovernanceReviewRow[]) {
    const patch = getVariableGovernancePatch(document, rows);

    if (Object.keys(patch).length === 0) {
      return;
    }

    onUpdateVariableSystem(patch, true);
    onRecordActivity?.(
      "Applied variable governance fixes",
      `${rows.length} review row${rows.length === 1 ? "" : "s"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Network className="size-3.5" />
            Variable governance
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Mode coverage, alias graph safety, orphan cleanup, and library-safe token migration.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Vars" value={report.variableCount} />
        <Metric label="Modes" value={report.modeCount} />
        <Metric label="Alias" value={report.aliasCount} />
        <Metric label="Fix" value={report.repairableCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Gaps" value={report.missingModeValueCount} />
        <Metric label="Cycles" value={report.aliasCycleCount} />
        <Metric label="Unused" value={report.orphanTokenCount} />
        <Metric label="Dupes" value={report.duplicateNameCount} />
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
          disabled={repairRows.length === 0}
          onClick={() => applyRows(repairRows)}
        >
          <Wrench className="size-3" />
          Fix
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <VariableGovernanceRowCard
            key={row.id}
            row={row}
            onApply={() => applyRows([row])}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No variable governance rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more variable governance rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VariableGovernanceRowCard({
  row,
  onApply,
}: {
  row: VariableGovernanceReviewRow;
  onApply: () => void;
}) {
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.label}
            </span>
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.category} / {row.variableNames.slice(0, 3).join(" / ")}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 font-mono text-[10px] opacity-75">
            metric {row.metric} / action {row.actionLabel}
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={!row.repairable}
          aria-label={row.actionLabel}
          onClick={onApply}
        >
          <Wrench className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: VariableGovernanceReviewRow[],
  filter: VariableGovernanceFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "repairable") {
    return rows.filter((row) => row.repairable);
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function getStatusVariant(status: VariableGovernanceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
