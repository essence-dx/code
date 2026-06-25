"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadTextFile,
  ReadinessMetric,
} from "@/features/editor/components/library-release-panel-shared";
import type {
  LibraryPublishReadinessItem,
  LibraryPublishReadinessReport,
} from "@/features/editor/library-publish-readiness";
import { getLibraryPublishReadinessCsv } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import { getLibraryPublishRiskCsv } from "@/features/editor/library-publish-risk";

export function LibraryPublishReadinessPanel({
  report,
  onReviewDocumentation,
  onReviewStaleInstances,
  onAcceptAllLibraryUpdates,
}: {
  report: LibraryPublishReadinessReport;
  onReviewDocumentation: () => void;
  onReviewStaleInstances: () => void;
  onAcceptAllLibraryUpdates: () => void;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Publish readiness</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={report.canPublish ? "secondary" : "outline"}>
            {report.label} / {report.score}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={() => exportPublishReadinessCsv(report)}
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ReadinessMetric label="Ready" value={report.readyCount} />
        <ReadinessMetric label="Review" value={report.reviewCount} />
        <ReadinessMetric label="Blocked" value={report.blockedCount} />
      </div>
      <div className="space-y-1">
        {report.items.map((item) => (
          <ReadinessItemRow
            key={item.id}
            item={item}
            action={getReadinessAction(item.id, {
              onAcceptAllLibraryUpdates,
              onReviewDocumentation,
              onReviewStaleInstances,
            })}
          />
        ))}
      </div>
    </div>
  );
}

export function LibraryPublishRiskPanel({
  report,
}: {
  report: LibraryPublishRiskReport;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Publish risk</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={report.highCount > 0 ? "outline" : "secondary"}>
            {report.label} / {report.score}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={() => exportPublishRiskCsv(report)}
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ReadinessMetric label="High" value={report.highCount} />
        <ReadinessMetric label="Medium" value={report.mediumCount} />
        <ReadinessMetric label="Low" value={report.lowCount} />
      </div>
      <div className="space-y-1">
        {report.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-2 rounded-sm bg-background px-2 py-1.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">
                {item.label}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {item.detail} / impact {item.impact}
              </div>
            </div>
            <Badge variant={item.severity === "low" ? "secondary" : "outline"}>
              {item.severity}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessItemRow({
  item,
  action,
}: {
  item: LibraryPublishReadinessItem;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="rounded-sm bg-background px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium">{item.label}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {item.detail}
          </div>
        </div>
        <Badge
          variant={item.status === "ready" ? "secondary" : "outline"}
          className="shrink-0 capitalize"
        >
          {item.status}
        </Badge>
      </div>
      {item.status !== "ready" && action ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-6 w-full px-2 text-[11px]"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function exportPublishReadinessCsv(report: LibraryPublishReadinessReport) {
  downloadTextFile({
    content: getLibraryPublishReadinessCsv(report),
    filename: "library-publish-readiness.csv",
    type: "text/csv;charset=utf-8",
  });
}

function exportPublishRiskCsv(report: LibraryPublishRiskReport) {
  downloadTextFile({
    content: getLibraryPublishRiskCsv(report),
    filename: "library-publish-risk.csv",
    type: "text/csv;charset=utf-8",
  });
}

function getReadinessAction(
  itemId: string,
  actions: {
    onReviewDocumentation: () => void;
    onReviewStaleInstances: () => void;
    onAcceptAllLibraryUpdates: () => void;
  },
) {
  if (
    itemId === "documentation" ||
    itemId === "examples" ||
    itemId === "variants" ||
    itemId === "code-connect" ||
    itemId === "variable-coverage"
  ) {
    return {
      label: "Review components",
      onClick: actions.onReviewDocumentation,
    };
  }

  if (itemId === "source-state") {
    return {
      label: "Review source state",
      onClick: actions.onReviewStaleInstances,
    };
  }

  if (itemId === "updates") {
    return {
      label: "Accept pending updates",
      onClick: actions.onAcceptAllLibraryUpdates,
    };
  }

  return undefined;
}
