"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  builtInPluginManifests,
  pluginPermissionLabels,
} from "@/features/editor/editor-plugin-api";
import {
  getPluginGovernanceCleanGrants,
  getPluginGovernanceCsv,
  getPluginGovernanceMarkdown,
  getPluginGovernanceReview,
  type PluginGovernanceRow,
} from "@/features/editor/plugin-governance-review";
import { cn } from "@/lib/utils";

type PluginGovernancePanelProps = {
  grants: Record<string, boolean>;
  onReplacePluginGrants: (grants: Record<string, boolean>) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type PluginGovernanceFilter = "all" | "blocked" | "review" | "ready";

export function PluginGovernancePanel({
  grants,
  onReplacePluginGrants,
  onRecordActivity,
}: PluginGovernancePanelProps) {
  const [filter, setFilter] = useState<PluginGovernanceFilter>("all");
  const review = useMemo(
    () =>
      getPluginGovernanceReview({
        manifests: builtInPluginManifests,
        grants,
      }),
    [grants],
  );
  const visibleRows = useMemo(
    () => getVisibleRows(review.rows, filter),
    [filter, review.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getPluginGovernanceCsv({
        ...review,
        rows: visibleRows,
      }),
      filename: `plugin-governance-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin governance CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginGovernanceMarkdown({
        ...review,
        rows: visibleRows,
      }),
      filename: `plugin-governance-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin governance handoff",
      `${visibleRows.length} rows`,
    );
  }

  function cleanStaleGrants() {
    const next = getPluginGovernanceCleanGrants({
      manifests: builtInPluginManifests,
      grants,
    });

    onReplacePluginGrants(next);
    onRecordActivity?.(
      "Cleaned stale plugin grants",
      `${review.staleGrantCount} grants`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Plugin governance
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Permission grants, stale access, and write-capable plugin review.
          </div>
        </div>
        <Badge variant={review.staleGrantCount > 0 ? "destructive" : "secondary"}>
          {review.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Plugins" value={review.manifestCount} />
        <Metric label="Granted" value={review.grantedPermissionCount} />
        <Metric label="Write" value={review.writeGrantCount} />
        <Metric label="Stale" value={review.staleGrantCount} />
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
          <Download className="size-3.5" />
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
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={review.staleGrantCount === 0}
          onClick={cleanStaleGrants}
        >
          Clean
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <PluginGovernanceRowCard key={row.id} row={row} />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No plugin governance rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more plugin governance rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PluginGovernanceRowCard({ row }: { row: PluginGovernanceRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.label}</div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pluginName}
            {row.permission ? ` / ${pluginPermissionLabels[row.permission]}` : ""}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
        </div>
        <Badge variant={row.status === "blocked" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
] satisfies Array<{ id: PluginGovernanceFilter; label: string }>;

function getVisibleRows(
  rows: PluginGovernanceRow[],
  filter: PluginGovernanceFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
