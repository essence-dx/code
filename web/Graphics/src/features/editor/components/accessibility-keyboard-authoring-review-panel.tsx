"use client";

import { ClipboardCopy, Download, FileJson2, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getAccessibilityKeyboardAuthoringReviewCsv,
  getAccessibilityKeyboardAuthoringReviewJson,
  getAccessibilityKeyboardAuthoringReviewMarkdown,
  type AccessibilityKeyboardAuthoringReviewReport,
  type AccessibilityKeyboardAuthoringStatus,
} from "@/features/editor/accessibility-keyboard-authoring-review";

type AccessibilityKeyboardAuthoringReviewPanelProps = {
  report: AccessibilityKeyboardAuthoringReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function AccessibilityKeyboardAuthoringReviewPanel({
  report,
  onRecordActivity,
}: AccessibilityKeyboardAuthoringReviewPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getAccessibilityKeyboardAuthoringReviewJson(report),
      filename: "accessibility-keyboard-authoring-review.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported accessibility keyboard authoring JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getAccessibilityKeyboardAuthoringReviewCsv(report),
      filename: "accessibility-keyboard-authoring-review.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported accessibility keyboard authoring CSV",
      `${report.surfaceCount} surfaces`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAccessibilityKeyboardAuthoringReviewMarkdown(report),
      filename: "accessibility-keyboard-authoring-review.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported accessibility keyboard authoring handoff",
      `${report.readySurfaceCount}/${report.surfaceCount} surfaces`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAccessibilityKeyboardAuthoringReviewMarkdown(report),
    );
    onRecordActivity?.(
      "Copied accessibility keyboard authoring handoff",
      `${report.keyboardReviewCount} keyboard checks`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Keyboard className="size-3.5" />
            Accessibility keyboard authoring
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Editor, admin, share, prototype, and embed surface readiness.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Surface" value={report.readySurfaceCount} />
        <ReadinessMetric label="Routes" value={report.routeSmokeSurfaceCount} />
        <ReadinessMetric
          label="Cmds"
          value={report.commandPaletteEvidenceCount}
        />
        <ReadinessMetric label="Keys" value={report.keyboardIssueCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.surfaceReviews.map((surface) => (
          <div key={surface.id} className="rounded-sm bg-muted px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium">
                {surface.label}
              </span>
              <Badge variant={getStatusVariant(surface.status)}>
                {surface.status}
              </Badge>
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {surface.route}
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

function getStatusVariant(status: AccessibilityKeyboardAuthoringStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
