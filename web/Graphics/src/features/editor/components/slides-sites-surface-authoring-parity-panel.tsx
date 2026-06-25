"use client";

import { ClipboardCopy, Download, FileJson2, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getSlidesSitesSurfaceAuthoringParityCsv,
  getSlidesSitesSurfaceAuthoringParityJson,
  getSlidesSitesSurfaceAuthoringParityMarkdown,
  type SlidesSitesSurfaceAuthoringParityReport,
  type SlidesSitesSurfaceAuthoringParityStatus,
} from "@/features/editor/slides-sites-surface-authoring-parity";

type SlidesSitesSurfaceAuthoringParityPanelProps = {
  report: SlidesSitesSurfaceAuthoringParityReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers?: (layerIds: string[]) => void;
};

export function SlidesSitesSurfaceAuthoringParityPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: SlidesSitesSurfaceAuthoringParityPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getSlidesSitesSurfaceAuthoringParityJson(report),
      filename: "slides-sites-surface-authoring-parity.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Slides/Sites surface authoring parity JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getSlidesSitesSurfaceAuthoringParityCsv(report),
      filename: "slides-sites-surface-authoring-parity.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Slides/Sites surface authoring parity CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getSlidesSitesSurfaceAuthoringParityMarkdown(report),
      filename: "slides-sites-surface-authoring-parity.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Slides/Sites surface authoring handoff",
      `${report.publicPublishingEvidenceCount} public publishing item(s)`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getSlidesSitesSurfaceAuthoringParityMarkdown(report),
    );
    onRecordActivity?.(
      "Copied Slides/Sites surface authoring handoff",
      `${report.embeddedPrototypeHandoffCount} embedded prototype handoff(s)`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Presentation className="size-3.5" />
            Slides/Sites authoring
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Deck/site modes, readiness packets, embeds, and public publishing.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Deck" value={report.deckDocumentModeCount} />
        <ReadinessMetric label="Site" value={report.siteDocumentModeCount} />
        <ReadinessMetric
          label="Embed"
          value={report.embeddedPrototypeHandoffCount}
        />
        <ReadinessMetric
          label="Publish"
          value={report.publicPublishingEvidenceCount}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[...report.deckModes, ...report.siteModes].map((mode) => (
          <Button
            key={mode.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-2 py-1.5 text-left"
            disabled={mode.frameIds.length === 0}
            onClick={() => onSelectLayers?.(mode.frameIds)}
          >
            <span className="w-full truncate text-[11px] font-medium">
              {mode.label}
            </span>
            <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
              {mode.frameIds.length} frame
              {mode.frameIds.length === 1 ? "" : "s"}
            </span>
          </Button>
        ))}
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
    </div>
  );
}

function getStatusVariant(status: SlidesSitesSurfaceAuthoringParityStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
