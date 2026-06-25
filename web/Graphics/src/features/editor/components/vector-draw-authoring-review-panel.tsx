"use client";

import { ClipboardCopy, Download, FileJson2, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getVectorDrawAuthoringReviewCsv,
  getVectorDrawAuthoringReviewJson,
  getVectorDrawAuthoringReviewMarkdown,
  type VectorDrawAuthoringReviewReport,
  type VectorDrawAuthoringReviewStatus,
} from "@/features/editor/vector-draw-authoring-review";

type VectorDrawAuthoringReviewPanelProps = {
  report: VectorDrawAuthoringReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function VectorDrawAuthoringReviewPanel({
  report,
  onRecordActivity,
}: VectorDrawAuthoringReviewPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getVectorDrawAuthoringReviewJson(report),
      filename: "vector-draw-authoring-review.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported vector Draw authoring JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getVectorDrawAuthoringReviewCsv(report),
      filename: "vector-draw-authoring-review.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported vector Draw authoring CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getVectorDrawAuthoringReviewMarkdown(report),
      filename: "vector-draw-authoring-review.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported vector Draw authoring handoff",
      `${report.exportSafeTopologyCount} export-safe topology rows`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getVectorDrawAuthoringReviewMarkdown(report),
    );
    onRecordActivity?.(
      "Copied vector Draw authoring handoff",
      `${report.booleanPreviewCount} boolean preview evidence items`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PenTool className="size-3.5" />
            Vector Draw authoring
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Pen, pencil, bend, cutter, boolean, outline, and topology coverage.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Pen" value={report.penRefinementCount} />
        <ReadinessMetric label="Pencil" value={report.pencilRefinementCount} />
        <ReadinessMetric label="Boolean" value={report.booleanPreviewCount} />
        <ReadinessMetric label="Topology" value={report.exportSafeTopologyCount} />
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

function getStatusVariant(status: VectorDrawAuthoringReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
