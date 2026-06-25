"use client";

import {
  ClipboardCopy,
  Clock3,
  Download,
  FileJson2,
  Presentation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getPresentationPresenterControlsCsv,
  getPresentationPresenterControlsJson,
  getPresentationPresenterControlsMarkdown,
  type PresentationPresenterControlsReport,
  type PresentationPresenterControlsStatus,
} from "@/features/editor/presentation-presenter-controls";

type PresentationPresenterControlsPanelProps = {
  report: PresentationPresenterControlsReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers?: (layerIds: string[]) => void;
};

export function PresentationPresenterControlsPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: PresentationPresenterControlsPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getPresentationPresenterControlsJson(report),
      filename: "presentation-presenter-controls.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported presentation presenter controls JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getPresentationPresenterControlsCsv(report),
      filename: "presentation-presenter-controls.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported presentation presenter controls CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPresentationPresenterControlsMarkdown(report),
      filename: "presentation-presenter-controls.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported presentation presenter controls handoff",
      `${report.viewerHandoffExportCount} viewer handoff export(s)`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getPresentationPresenterControlsMarkdown(report),
    );
    onRecordActivity?.(
      "Copied presentation presenter controls handoff",
      `${report.timedRehearsalPacketCount} timed rehearsal packet(s)`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Presentation className="size-3.5" />
            Presenter controls
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Slide navigator, speaker notes, rehearsal timing, and viewer handoff.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Slides" value={report.slideNavigatorCount} />
        <ReadinessMetric label="Notes" value={report.speakerNoteCount} />
        <ReadinessMetric
          label="Time"
          value={report.timedRehearsalPacketCount}
        />
        <ReadinessMetric
          label="Export"
          value={report.viewerHandoffExportCount}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.slideNavigator.slice(0, 4).map((slide) => (
          <Button
            key={slide.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-2 py-1.5 text-left"
            disabled={slide.frameIds.length === 0}
            onClick={() => onSelectLayers?.(slide.frameIds)}
          >
            <span className="w-full truncate text-[11px] font-medium">
              {slide.label}
            </span>
            <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
              {slide.frameIds.length} frame
              {slide.frameIds.length === 1 ? "" : "s"}
            </span>
          </Button>
        ))}
      </div>

      <div className="mt-2 space-y-1.5">
        {report.timedRehearsalPackets.slice(0, 2).map((packet) => (
          <div
            key={packet.id}
            className="flex items-center justify-between gap-2 rounded-sm bg-muted px-2 py-1.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">
                {packet.label}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {packet.pageName}
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Clock3 className="size-3" />
              {formatDuration(packet.durationSeconds)}
            </div>
          </div>
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

function getStatusVariant(status: PresentationPresenterControlsStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}
