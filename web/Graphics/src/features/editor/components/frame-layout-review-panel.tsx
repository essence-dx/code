"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getFrameLayoutReview,
  getFrameLayoutReviewCsv,
  getManualFrameLayoutMigrationPatches,
  getFrameLayoutReviewMarkdown,
} from "@/features/editor/frame-layout-review";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type FrameLayoutReviewPanelProps = {
  page: DesignPage;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function FrameLayoutReviewPanel({
  page,
  onUpdateLayers,
}: FrameLayoutReviewPanelProps) {
  const report = useMemo(() => getFrameLayoutReview(page), [page]);
  const migrationPatches = useMemo(
    () => getManualFrameLayoutMigrationPatches(page),
    [page],
  );
  const previewRows = report.rows.slice(0, 5);
  const issueCount = report.blockedCount + report.reviewCount;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Frame layout review
          </div>
          <div className="mt-1 text-muted-foreground">
            {report.autoLayoutFrameCount} auto / {report.manualFrameCount} manual
          </div>
        </div>
        <Badge
          variant={issueCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {issueCount} issues
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Migrate" value={report.migrationCount} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={report.rows.length === 0}
          onClick={() =>
            downloadTextFile({
              content: getFrameLayoutReviewCsv(report),
              filename: "frame-layout-review.csv",
              type: "text/csv;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={migrationPatches.length === 0}
          onClick={() => onUpdateLayers(migrationPatches)}
        >
          Migrate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={report.rows.length === 0}
          onClick={() =>
            downloadTextFile({
              content: getFrameLayoutReviewMarkdown(report),
              filename: "frame-layout-review.md",
              type: "text/markdown;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          Inspect
        </Button>
      </div>

      {previewRows.length > 0 ? (
        <div className="space-y-1.5">
          {previewRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-2 py-1.5"
            >
              {row.status === "ready" ? (
                <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 text-destructive" />
              )}
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {row.frameName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      row.status === "ready" && "text-emerald-600",
                      row.status === "review" && "text-amber-600",
                      row.status === "blocked" && "text-destructive",
                    )}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {row.mode} / {row.childCount} layout /{" "}
                  {row.absoluteChildCount} absolute
                </div>
                <div className="truncate text-muted-foreground">
                  {row.detail}
                </div>
              </div>
            </div>
          ))}
          {report.rows.length > previewRows.length ? (
            <div className="text-[11px] text-muted-foreground">
              {report.rows.length - previewRows.length} more frames in handoff
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          No frame layers on this page yet.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-background px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}
