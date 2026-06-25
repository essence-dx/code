"use client";

import { ClipboardCopy, Download, FileJson2, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getAdvancedPaintStyleAuthoringCsv,
  getAdvancedPaintStyleAuthoringJson,
  getAdvancedPaintStyleAuthoringMarkdown,
  type AdvancedPaintStyleAuthoringReport,
  type AdvancedPaintStyleAuthoringStatus,
} from "@/features/editor/advanced-paint-style-authoring";

type AdvancedPaintStyleAuthoringPanelProps = {
  report: AdvancedPaintStyleAuthoringReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function AdvancedPaintStyleAuthoringPanel({
  report,
  onRecordActivity,
}: AdvancedPaintStyleAuthoringPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getAdvancedPaintStyleAuthoringJson(report),
      filename: "advanced-paint-style-authoring.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced paint style authoring JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdvancedPaintStyleAuthoringCsv(report),
      filename: "advanced-paint-style-authoring.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced paint style authoring CSV",
      `${report.rows.length} review rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdvancedPaintStyleAuthoringMarkdown(report),
      filename: "advanced-paint-style-authoring.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported advanced paint style authoring handoff",
      `${report.gradientFamilyCount} gradient families`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdvancedPaintStyleAuthoringMarkdown(report),
    );
    onRecordActivity?.(
      "Copied advanced paint style authoring handoff",
      `${report.reusablePresetCount} reusable presets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Palette className="size-3.5" />
            Advanced paint authoring
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Layered fills, stroke stacks, gradients, image fills, contrast, and
            reusable presets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Fills" value={report.multipleFillLayerCount} />
        <ReadinessMetric
          label="Strokes"
          value={report.multipleStrokeLayerCount}
        />
        <ReadinessMetric label="Grad" value={report.gradientFamilyCount} />
        <ReadinessMetric label="Styles" value={report.reusablePresetCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.gradientFamilies.slice(0, 6).map((family) => (
          <div key={family.family} className="rounded-sm bg-muted px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium">
                {family.label}
              </span>
              <Badge variant="outline">{family.count}</Badge>
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {family.sample}
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

function getStatusVariant(status: AdvancedPaintStyleAuthoringStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
