"use client";

import { Button } from "@/components/ui/button";
import { MediaHealthStrip } from "@/features/editor/components/media-health-strip";
import type { MediaFilter } from "@/features/editor/components/media-filters";
import type { MediaHealthReport } from "@/lib/media/media-health";
import type { MediaPanelMessage } from "@/features/editor/components/media-bin-types";

type MediaBinStatusPanelsProps = {
  message: MediaPanelMessage | null;
  lastRemovedAssetName: string | null;
  mediaHealth: MediaHealthReport;
  activeFilter: MediaFilter;
  impactSummary: string | null;
  missingIssueCount: number;
  missingAssetCount: number;
  isImporting: boolean;
  onRestoreRemovedAsset: () => void;
  onFilter: (filter: MediaFilter) => void;
  onBatchReconnect: () => void;
};

export function MediaBinStatusPanels({
  message,
  lastRemovedAssetName,
  mediaHealth,
  activeFilter,
  impactSummary,
  missingIssueCount,
  missingAssetCount,
  isImporting,
  onRestoreRemovedAsset,
  onFilter,
  onBatchReconnect,
}: MediaBinStatusPanelsProps) {
  return (
    <>
      {message ? (
        <div
          className={`rounded-md border p-2 text-xs ${
            message.tone === "destructive" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"
          }`}
        >
          {message.text}
        </div>
      ) : null}
      {lastRemovedAssetName ? (
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
          <span className="truncate">{lastRemovedAssetName} can be restored.</span>
          <Button size="sm" variant="outline" className="h-7" onClick={onRestoreRemovedAsset}>
            Restore
          </Button>
        </div>
      ) : null}
      <MediaHealthStrip report={mediaHealth} activeFilter={activeFilter} impactSummary={impactSummary} onFilter={onFilter} />
      {missingIssueCount > 0 ? (
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          <span>
            {missingIssueCount} {missingIssueCount === 1 ? "media item needs" : "media items need"} attention
            {impactSummary ? `: ${impactSummary}` : "."}
          </span>
          <Button size="sm" variant="outline" className="h-7" onClick={onBatchReconnect} disabled={isImporting || missingAssetCount === 0}>
            Match files
          </Button>
        </div>
      ) : null}
    </>
  );
}
