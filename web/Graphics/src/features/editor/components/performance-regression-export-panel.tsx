"use client";

import { Download, FileJson2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getPerformanceRegressionJson,
  getPerformanceRegressionMarkdown,
  type PerformanceRegressionExport,
  type PerformanceRegressionStatus,
} from "@/features/editor/performance-regression-export";

type PerformanceRegressionExportPanelProps = {
  report: PerformanceRegressionExport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function PerformanceRegressionExportPanel({
  report,
  onRecordActivity,
}: PerformanceRegressionExportPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getPerformanceRegressionJson(report),
      filename: `performance-regression-${report.activePageName}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance regression JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPerformanceRegressionMarkdown(report),
      filename: `performance-regression-${report.activePageName}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance regression handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Performance release export
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Release-review bundle for scale, runtime, commands, baselines, collaboration replay, deploy smoke, and responsive constraints.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground sm:grid-cols-6">
        <Metric label="Doc" value={report.documentPerformance.score} />
        <Metric label="Index" value={report.layerIndex.score} />
        <Metric label="View" value={report.canvasViewportIntelligence.score} />
        <Metric label="Render" value={report.canvasRenderBudget.score} />
        <Metric label="Safe" value={report.largeDocumentSafeMode.score} />
        <Metric label="Run" value={report.runtimeObservability.score} />
        <Metric label="Cmd" value={report.commandTelemetry.score} />
        <Metric label="Base" value={report.performanceBaseline.score} />
        <Metric label="Sync" value={report.collaborationSyncReplay.score} />
        <Metric label="Ship" value={report.productionDeploySmoke.score} />
        <Metric label="Resp" value={report.responsiveConstraints.score} />
      </div>

      <div className="mt-2 rounded-sm bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
        {report.releaseNotes[0]}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
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
          onClick={exportMarkdown}
        >
          <Download className="size-3" />
          Inspect
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: PerformanceRegressionStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
