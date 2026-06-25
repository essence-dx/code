"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getMultiplayerFollowSpotlightCsv,
  getMultiplayerFollowSpotlightJson,
  getMultiplayerFollowSpotlightMarkdown,
  type MultiplayerFollowSpotlightReport,
  type MultiplayerFollowSpotlightRow,
  type MultiplayerFollowSpotlightStatus,
} from "@/features/editor/multiplayer-follow-spotlight";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type MultiplayerFollowSpotlightPanelProps = {
  report: MultiplayerFollowSpotlightReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type MultiplayerFollowSpotlightFilter = "all" | MultiplayerFollowSpotlightStatus;

export function MultiplayerFollowSpotlightPanel({
  report,
  onRecordActivity,
}: MultiplayerFollowSpotlightPanelProps) {
  const [filter, setFilter] = useState<MultiplayerFollowSpotlightFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getMultiplayerFollowSpotlightCsv(report, visibleRows),
      filename: `multiplayer-follow-spotlight-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported follow spotlight CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getMultiplayerFollowSpotlightMarkdown(report, visibleRows),
      filename: `multiplayer-follow-spotlight-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported follow spotlight handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getMultiplayerFollowSpotlightJson(report, visibleRows),
      filename: `multiplayer-follow-spotlight-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported follow spotlight evidence",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RadioTower className="size-3.5" />
            Follow spotlight
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Presenter ownership, handoff timer, viewport sync, and admin evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Peers" value={report.activePeerCount} />
        <Metric label="Live" value={report.activePresenterCount} />
        <Metric label="Follow" value={report.followEventCount} />
        <Metric label="Export" value={report.adminExportEvidenceCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Owner" value={report.ownerName ?? report.presenterStatus} />
        <Metric
          label="Timer"
          value={
            report.handoffTimerSeconds === null
              ? "none"
              : `${Math.round(report.handoffTimerSeconds / 60)}m`
          }
        />
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

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 4).map((row) => (
          <FollowSpotlightRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
] as const satisfies ReadonlyArray<{
  id: MultiplayerFollowSpotlightFilter;
  label: string;
}>;

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-muted px-2 py-1">
      <div className="truncate">{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

function FollowSpotlightRow({ row }: { row: MultiplayerFollowSpotlightRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border px-2 py-1.5",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.value}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: MultiplayerFollowSpotlightRow[],
  filter: MultiplayerFollowSpotlightFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: MultiplayerFollowSpotlightStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
