"use client";

import { ClipboardCopy, Download, FileJson2, LibraryBig } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getDesignSystemLibraryPublicationDepthCsv,
  getDesignSystemLibraryPublicationDepthJson,
  getDesignSystemLibraryPublicationDepthMarkdown,
  type DesignSystemLibraryPublicationDepthReport,
  type DesignSystemLibraryPublicationDepthStatus,
} from "@/features/editor/design-system-library-publication-depth";

type DesignSystemLibraryPublicationDepthPanelProps = {
  report: DesignSystemLibraryPublicationDepthReport;
};

export function DesignSystemLibraryPublicationDepthPanel({
  report,
}: DesignSystemLibraryPublicationDepthPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getDesignSystemLibraryPublicationDepthJson(report),
      filename: "design-system-library-publication-depth.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getDesignSystemLibraryPublicationDepthCsv(report),
      filename: "design-system-library-publication-depth.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDesignSystemLibraryPublicationDepthMarkdown(report),
      filename: "design-system-library-publication-depth.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getDesignSystemLibraryPublicationDepthMarkdown(report),
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <LibraryBig className="size-3.5" />
            Library publication depth
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Release scopes, adoption diffs, subscribers, and rollback evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric
          label="Scopes"
          value={
            report.componentReleaseScopeCount +
            report.propertyReleaseScopeCount +
            report.styleReleaseScopeCount
          }
        />
        <ReadinessMetric label="Diffs" value={report.adoptionDiffCount} />
        <ReadinessMetric
          label="Plans"
          value={report.subscriberUpdatePlanCount}
        />
        <ReadinessMetric
          label="Rollback"
          value={report.rollbackEvidenceCount}
        />
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

function getStatusVariant(status: DesignSystemLibraryPublicationDepthStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
