"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getBrokenConnectorRepairPatches,
  getConnectorReview,
  getConnectorReviewCsv,
} from "@/features/editor/connector-review";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type ConnectorReviewPanelProps = {
  page: DesignPage;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function ConnectorReviewPanel({
  page,
  onUpdateLayers,
}: ConnectorReviewPanelProps) {
  const report = useMemo(() => getConnectorReview(page), [page]);
  const repairPatches = useMemo(
    () => getBrokenConnectorRepairPatches(page),
    [page],
  );
  const previewRows = report.rows.slice(0, 5);

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Connector review
          </div>
          <div className="mt-1 text-muted-foreground">
            {report.readyCount} ready / {report.brokenCount} broken
          </div>
        </div>
        <Badge
          variant={report.brokenCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {report.connectorCount} connectors
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={report.rows.length === 0}
          onClick={() =>
            downloadTextFile({
              content: getConnectorReviewCsv(report),
              filename: "connector-review.csv",
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
          disabled={repairPatches.length === 0}
          onClick={() => onUpdateLayers(repairPatches)}
        >
          <Unlink className="size-3.5" />
          Unlink broken
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
                    {row.layerName}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      row.status === "ready" && "text-emerald-600",
                      row.status === "broken" && "text-destructive",
                    )}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {row.sourceLayerName} to {row.targetLayerName}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          No connector layers on this page yet.
        </div>
      )}
    </div>
  );
}
