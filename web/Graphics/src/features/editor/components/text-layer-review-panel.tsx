"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Download,
  Maximize2,
  TextCursorInput,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getTextHandoffJson,
  getTextHandoffMarkdown,
  getTextHandoffReport,
} from "@/features/editor/text-handoff";
import {
  getTextLayerFitPatches,
  getTextLayerNormalizePatches,
  getTextLayerReadyPatches,
  getTextLayerReview,
  getTextLayerReviewCsv,
  type TextLayerReviewStatus,
} from "@/features/editor/text-layer-review";
import type { DesignLayer } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type TextLayerReviewPanelProps = {
  layers: DesignLayer[];
  variables?: Record<string, string>;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function TextLayerReviewPanel({
  layers,
  variables = {},
  onUpdateLayers,
}: TextLayerReviewPanelProps) {
  const report = useMemo(() => getTextLayerReview(layers), [layers]);
  const handoff = useMemo(
    () => getTextHandoffReport(layers, variables),
    [layers, variables],
  );
  const fitPatches = useMemo(() => getTextLayerFitPatches(layers), [layers]);
  const normalizePatches = useMemo(
    () => getTextLayerNormalizePatches(layers),
    [layers],
  );
  const readyPatches = useMemo(() => getTextLayerReadyPatches(layers), [layers]);
  const previewIssues = report.issues.slice(0, 4);

  if (report.textLayerCount === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Text review
          </div>
          <div className="mt-1 text-muted-foreground">
            {report.readyCount} ready / {report.reviewCount} review /{" "}
            {report.blockedCount} blocked
          </div>
        </div>
        <Badge
          variant={report.blockedCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {report.score}% {report.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={fitPatches.length === 0}
          onClick={() => onUpdateLayers(fitPatches)}
        >
          <Maximize2 className="size-3.5" />
          Fit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          disabled={normalizePatches.length === 0}
          onClick={() => onUpdateLayers(normalizePatches)}
        >
          <TextCursorInput className="size-3.5" />
          Normalize
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getTextLayerReviewCsv(report),
              filename: "text-layer-review.csv",
              type: "text/csv;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getTextHandoffMarkdown(handoff),
              filename: "selected-text-handoff.md",
              type: "text/markdown;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          Inspect
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getTextHandoffJson(handoff),
              filename: "selected-text-handoff.json",
              type: "application/json;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          JSON
        </Button>
      </div>

      <Button
        type="button"
        variant={report.blockedCount === 0 ? "secondary" : "outline"}
        size="sm"
        className="h-8 w-full text-[11px]"
        disabled={readyPatches.length === 0 || report.blockedCount > 0}
        onClick={() => onUpdateLayers(readyPatches)}
      >
        <CheckCircle2 className="size-3.5" />
        Mark non-blocked text ready
      </Button>

      {previewIssues.length > 0 ? (
        <div className="space-y-1.5">
          {previewIssues.map((issue) => (
            <div
              key={issue.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-2 py-1.5"
            >
              <StatusIcon status={issue.status} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {issue.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      issue.status === "review" && "text-amber-600",
                      issue.status === "blocked" && "text-destructive",
                    )}
                  >
                    {issue.status}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {issue.layerName}: {issue.detail}
                </div>
              </div>
            </div>
          ))}
          {report.issues.length > previewIssues.length ? (
            <div className="text-[11px] text-muted-foreground">
              {report.issues.length - previewIssues.length} more issues in CSV
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-emerald-700">
          Text layers fit their boxes and have handoff-safe typography.
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: TextLayerReviewStatus }) {
  const className = cn(
    "mt-0.5 size-3.5",
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
