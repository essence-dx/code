"use client";

import { ClipboardCopy, Download, FileJson2, Map, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getSitesContentMapPublishQueueCsv,
  getSitesContentMapPublishQueueJson,
  getSitesContentMapPublishQueueMarkdown,
  type SitesContentMapPublishQueueReport,
  type SitesContentMapPublishQueueStatus,
} from "@/features/editor/sites-content-map-publish-queue";

type SitesContentMapPublishQueuePanelProps = {
  report: SitesContentMapPublishQueueReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers?: (layerIds: string[]) => void;
};

export function SitesContentMapPublishQueuePanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: SitesContentMapPublishQueuePanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 6);

  function exportJson() {
    downloadTextFile({
      content: getSitesContentMapPublishQueueJson(report),
      filename: "sites-content-map-publish-queue.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites content map publish queue JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getSitesContentMapPublishQueueCsv(report),
      filename: "sites-content-map-publish-queue.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites content map publish queue CSV",
      `${report.publishQueueCount} route(s) queued`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getSitesContentMapPublishQueueMarkdown(report),
      filename: "sites-content-map-publish-queue.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Sites content map publish queue handoff",
      `${report.publicRouteEvidenceCount} public route evidence item(s)`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getSitesContentMapPublishQueueMarkdown(report),
    );
    onRecordActivity?.(
      "Copied Sites content map publish queue handoff",
      `${report.routeSitemapCount} route sitemap item(s)`,
    );
  }

  function selectRoute(layerIds: string[], route: string) {
    if (layerIds.length === 0) {
      return;
    }

    onSelectLayers?.(layerIds);
    onRecordActivity?.("Selected Sites route content map layers", route);
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Map className="size-3.5" />
            Sites content map
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Sitemap, SEO/meta, assets, queue, rollback, and route evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Routes" value={report.routeSitemapCount} />
        <ReadinessMetric label="SEO" value={report.seoMetaCheckCount} />
        <ReadinessMetric label="Queue" value={report.publishQueueCount} />
        <ReadinessMetric
          label="Evidence"
          value={report.publicRouteEvidenceCount}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.routeSitemap.slice(0, 4).map((route) => (
          <Button
            key={route.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-2 py-1.5 text-left"
            disabled={route.layerIds.length === 0}
            onClick={() => selectRoute(route.layerIds, route.route)}
          >
            <span className="w-full truncate text-[11px] font-medium">
              {route.route}
            </span>
            <span className="flex w-full items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Rocket className="size-3" />
              {route.status}
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

function getStatusVariant(status: SitesContentMapPublishQueueStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
