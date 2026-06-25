"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Download,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadTextFile,
  ReadinessMetric,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getFigJamFacilitationDepthCsv,
  getFigJamFacilitationDepthJson,
  getFigJamFacilitationDepthMarkdown,
  type FigJamFacilitationDepthReport,
  type FigJamFacilitationDepthRow,
  type FigJamFacilitationDepthStatus,
  type FigJamStickyCluster,
} from "@/features/editor/figjam-facilitation-depth";
import { cn } from "@/lib/utils";

type FigJamFacilitationDepthPanelProps = {
  report: FigJamFacilitationDepthReport;
  onSelectLayers: (layerIds: string[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function FigJamFacilitationDepthPanel({
  report,
  onSelectLayers,
  onRecordActivity,
}: FigJamFacilitationDepthPanelProps) {
  function exportReport(kind: "csv" | "json" | "markdown") {
    const exportMap = {
      csv: {
        content: getFigJamFacilitationDepthCsv(report),
        filename: "figjam-facilitation-depth.csv",
        type: "text/csv;charset=utf-8",
      },
      json: {
        content: getFigJamFacilitationDepthJson(report),
        filename: "figjam-facilitation-depth.json",
        type: "application/json;charset=utf-8",
      },
      markdown: {
        content: getFigJamFacilitationDepthMarkdown(report),
        filename: "figjam-facilitation-depth.md",
        type: "text/markdown;charset=utf-8",
      },
    } satisfies Record<
      typeof kind,
      { content: string; filename: string; type: string }
    >;
    const artifact = exportMap[kind];

    downloadTextFile(artifact);
    onRecordActivity?.(
      "Exported FigJam facilitation depth",
      `${report.pageName}: ${artifact.filename}`,
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Timer className="size-4 text-muted-foreground" />
            FigJam facilitation depth
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Voting, timer, stamps, sticky clusters, and facilitator handoff.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <ReadinessMetric label="Votes" value={report.voteCount} />
        <ReadinessMetric label="Stamps" value={report.stampCount} />
        <ReadinessMetric label="Clusters" value={report.stickyClusterCount} />
        <ReadinessMetric label="Open" value={report.openCommentCount} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() => exportReport("json")}
        >
          <Download className="size-3.5" />
          JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() => exportReport("csv")}
        >
          <Download className="size-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() => exportReport("markdown")}
        >
          <Download className="size-3.5" />
          Inspect
        </Button>
      </div>

      <div className="grid gap-1.5">
        {report.rows.map((row) => (
          <FacilitationRow
            key={row.id}
            row={row}
            onSelectLayers={onSelectLayers}
          />
        ))}
      </div>

      {report.clusters.length > 0 ? (
        <div className="space-y-1.5 rounded-md border border-border bg-card p-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sticky clusters
          </div>
          {report.clusters.slice(0, 4).map((cluster) => (
            <StickyClusterRow
              key={cluster.id}
              cluster={cluster}
              onSelectLayers={onSelectLayers}
            />
          ))}
          {report.clusters.length > 4 ? (
            <div className="text-[11px] text-muted-foreground">
              {report.clusters.length - 4} more clusters in handoff export
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          No sticky clusters detected on this page.
        </div>
      )}
    </div>
  );
}

function FacilitationRow({
  row,
  onSelectLayers,
}: {
  row: FigJamFacilitationDepthRow;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium">
            <StatusIcon status={row.status} />
            <span className="truncate">{row.label}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{row.detail}</p>
        </div>
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {row.recommendation}
        </span>
        {row.layerIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 shrink-0 px-2 text-[11px]"
            onClick={() => onSelectLayers(row.layerIds)}
          >
            Select
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StickyClusterRow({
  cluster,
  onSelectLayers,
}: {
  cluster: FigJamStickyCluster;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className="size-2.5 rounded-full border border-border"
              style={{ backgroundColor: cluster.dominantFill }}
            />
            <span className="truncate">{cluster.label}</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {cluster.sampleTexts.join(" / ")}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={() => onSelectLayers(cluster.layerIds)}
        >
          {cluster.stickyCount} notes
        </Button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: FigJamFacilitationDepthStatus }) {
  const className = cn(
    "size-3.5 shrink-0",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") {
    return <CheckCircle2 className={className} />;
  }

  if (status === "blocked") {
    return <AlertTriangle className={className} />;
  }

  return <CircleDashed className={className} />;
}

function getStatusVariant(status: FigJamFacilitationDepthStatus) {
  if (status === "ready") {
    return "default";
  }

  if (status === "review") {
    return "secondary";
  }

  return "destructive";
}
