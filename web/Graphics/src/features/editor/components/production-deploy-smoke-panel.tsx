"use client";

import { ClipboardCopy, Download, FileJson2, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getProductionDeploySmokeCsv,
  getProductionDeploySmokeJson,
  getProductionDeploySmokeMarkdown,
  type ProductionDeploySmokeReport,
  type ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";

type ProductionDeploySmokePanelProps = {
  report: ProductionDeploySmokeReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function ProductionDeploySmokePanel({
  report,
  onRecordActivity,
}: ProductionDeploySmokePanelProps) {
  const reviewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 5);

  function exportJson() {
    downloadTextFile({
      content: getProductionDeploySmokeJson(report),
      filename: "production-deploy-smoke.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production deploy smoke JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getProductionDeploySmokeCsv(report),
      filename: "production-deploy-smoke.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production deploy smoke CSV",
      `${report.routeCount} routes`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getProductionDeploySmokeMarkdown(report),
      filename: "production-deploy-smoke.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production deploy smoke handoff",
      `${report.status} score ${report.score}`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getProductionDeploySmokeMarkdown(report));
    onRecordActivity?.(
      "Copied production deploy smoke handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Rocket className="size-3.5" />
            Production deploy smoke
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Auth, editor, admin, share, prototype, and handoff route evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Routes" value={report.routeCount} />
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Block" value={report.blockedCount} />
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
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {row.method} {row.route}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: ProductionDeploySmokeStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
