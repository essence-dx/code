"use client";

import { ClipboardCopy, Download, FileJson2, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getAdvancedPrototypeTransitionAuthoringCsv,
  getAdvancedPrototypeTransitionAuthoringJson,
  getAdvancedPrototypeTransitionAuthoringMarkdown,
  type AdvancedPrototypeTransitionAuthoringReport,
  type AdvancedPrototypeTransitionAuthoringStatus,
} from "@/features/editor/advanced-prototype-transition-authoring";

type AdvancedPrototypeTransitionAuthoringPanelProps = {
  report: AdvancedPrototypeTransitionAuthoringReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers?: (layerIds: string[]) => void;
};

export function AdvancedPrototypeTransitionAuthoringPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: AdvancedPrototypeTransitionAuthoringPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getAdvancedPrototypeTransitionAuthoringJson(report),
      filename: "advanced-prototype-transition-authoring.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced prototype transition JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdvancedPrototypeTransitionAuthoringCsv(report),
      filename: "advanced-prototype-transition-authoring.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced prototype transition CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdvancedPrototypeTransitionAuthoringMarkdown(report),
      filename: "advanced-prototype-transition-authoring.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced prototype transition handoff",
      `${report.routePlaybackEvidenceCount} route playback item(s)`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdvancedPrototypeTransitionAuthoringMarkdown(report),
    );
    onRecordActivity?.(
      "Copied advanced prototype transition handoff",
      `${report.variableActionCount} variable action(s)`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Presentation className="size-3.5" />
            Prototype transitions
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Overlays, scroll replay, smart animate, variables, and route evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric
          label="Overlay"
          value={report.overlayTransitionCount}
        />
        <ReadinessMetric label="Scroll" value={report.scrollBehaviorCount} />
        <ReadinessMetric
          label="Smart"
          value={report.smartAnimateReadinessCount}
        />
        <ReadinessMetric label="Route" value={report.routePlaybackEvidenceCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.rows
          .filter((row) => row.layerIds.length > 0)
          .slice(0, 4)
          .map((row) => (
            <Button
              key={row.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-2 py-1.5 text-left"
              onClick={() => onSelectLayers?.(row.layerIds)}
            >
              <span className="w-full truncate text-[11px] font-medium">
                {row.label}
              </span>
              <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
                {row.layerIds.length} layer
                {row.layerIds.length === 1 ? "" : "s"}
              </span>
            </Button>
          ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportCsv}
        >
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
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
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {reviewRows.map((row) => (
          <div key={row.id} className="rounded-sm bg-muted px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium">
                {row.label}
              </span>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
              {row.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(status: AdvancedPrototypeTransitionAuthoringStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
