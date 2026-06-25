"use client";

import { ClipboardCopy, Download, FileJson2, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getSitesResponsivePublishingPreflightCsv,
  getSitesResponsivePublishingPreflightJson,
  getSitesResponsivePublishingPreflightMarkdown,
  type SitesResponsivePublishingPreflightReport,
  type SitesResponsivePublishingStatus,
} from "@/features/editor/sites-responsive-publishing-preflight";

type SitesResponsivePublishingPreflightPanelProps = {
  report: SitesResponsivePublishingPreflightReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers?: (layerIds: string[]) => void;
};

export function SitesResponsivePublishingPreflightPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: SitesResponsivePublishingPreflightPanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getSitesResponsivePublishingPreflightJson(report),
      filename: "sites-responsive-publishing-preflight.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites publishing preflight JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getSitesResponsivePublishingPreflightCsv(report),
      filename: "sites-responsive-publishing-preflight.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites publishing preflight CSV",
      `${report.coveredBreakpointCount}/${report.breakpointCount} breakpoints`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getSitesResponsivePublishingPreflightMarkdown(report),
      filename: "sites-responsive-publishing-preflight.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites publishing preflight handoff",
      `${report.publicRouteSmokePacketCount} route packets`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getSitesResponsivePublishingPreflightMarkdown(report),
    );
    onRecordActivity?.(
      "Copied Sites publishing preflight handoff",
      `${report.status} score ${report.score}`,
    );
  }

  function selectBreakpoint(layerIds: string[], label: string) {
    if (layerIds.length === 0) {
      return;
    }

    onSelectLayers?.(layerIds);
    onRecordActivity?.(
      "Selected Sites publishing breakpoint frames",
      label,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Rocket className="size-3.5" />
            Sites publishing preflight
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Breakpoints, public routes, and rollback handoff for launch.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric
          label="Break"
          value={report.coveredBreakpointCount}
        />
        <ReadinessMetric
          label="Routes"
          value={report.publicRouteSmokePacketCount}
        />
        <ReadinessMetric label="Notes" value={report.rollbackNoteCount} />
        <ReadinessMetric label="Block" value={report.blockedCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {report.breakpoints.map((breakpoint) => (
          <Button
            key={breakpoint.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-2 py-1.5 text-left"
            disabled={breakpoint.matchingFrameIds.length === 0}
            onClick={() =>
              selectBreakpoint(
                breakpoint.matchingFrameIds,
                `${breakpoint.label} ${breakpoint.width}px`,
              )
            }
          >
            <span className="w-full truncate text-[11px] font-medium">
              {breakpoint.label}
            </span>
            <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
              {breakpoint.matchingFrameIds.length} frame
              {breakpoint.matchingFrameIds.length === 1 ? "" : "s"}
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

function getStatusVariant(status: SitesResponsivePublishingStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
