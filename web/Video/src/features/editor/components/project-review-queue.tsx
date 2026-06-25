"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/editor/factory";
import { createHandoffSummary, handoffSummaryFilename } from "@/lib/editor/handoff-summary";
import type { EditorProject, LayerReviewStatus, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { downloadTextFile } from "@/lib/files/download";

interface ProjectReviewQueueProps {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  onSelect: (layerId: string) => void;
}

const reviewStatusLabels: Record<LayerReviewStatus, string> = {
  none: "No status",
  "needs-review": "Needs review",
  "changes-requested": "Changes requested",
  approved: "Approved",
};

const reviewStatusVariants: Record<LayerReviewStatus, "outline" | "secondary" | "destructive" | "default"> = {
  none: "outline",
  "needs-review": "secondary",
  "changes-requested": "destructive",
  approved: "default",
};

export function ProjectReviewQueue({ project, mediaAssets, onSelect }: ProjectReviewQueueProps) {
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const layers = project.layers;
  const reviewLayers = layers
    .filter(hasReviewSignal)
    .sort((a, b) => a.track - b.track || a.start - b.start || a.name.localeCompare(b.name));
  const counts = countReviewStates(layers);

  function exportHandoffSummary() {
    try {
      downloadTextFile(
        handoffSummaryFilename(project.title),
        createHandoffSummary(project, mediaAssets),
        "text/markdown;charset=utf-8",
      );
      setDownloadMessage("Handoff summary downloaded.");
    } catch {
      setDownloadMessage("Handoff summary could not be downloaded.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Review and delivery handoff</div>
        <Button size="sm" variant="outline" onClick={exportHandoffSummary}>
          <Download className="size-4" />
          Handoff
        </Button>
      </div>
      {downloadMessage ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{downloadMessage}</div> : null}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <ReviewCount label="Review" value={counts.needsReview} />
        <ReviewCount label="Changes" value={counts.changesRequested} />
        <ReviewCount label="Approved" value={counts.approved} />
      </div>
      {reviewLayers.length ? (
        <div className="space-y-2">
          {reviewLayers.map((layer) => {
            const status = layer.reviewStatus ?? "none";
            return (
              <button
                key={layer.id}
                type="button"
                className="w-full rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelect(layer.id)}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{layer.name}</span>
                  <Badge variant={reviewStatusVariants[status]}>{reviewStatusLabels[status]}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Track {layer.track + 1} · {formatTime(layer.start)} · {layer.kind}
                </div>
                {layer.notes?.trim() ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{layer.notes}</p> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No layer notes or review statuses yet.
        </div>
      )}
      {reviewLayers.length ? (
        <Button variant="outline" className="w-full" onClick={() => onSelect(reviewLayers[0].id)}>
          Open first review item
        </Button>
      ) : null}
    </div>
  );
}

function ReviewCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-base font-semibold text-foreground">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function hasReviewSignal(layer: TimelineLayer) {
  return Boolean(layer.notes?.trim()) || Boolean(layer.reviewStatus && layer.reviewStatus !== "none");
}

function countReviewStates(layers: TimelineLayer[]) {
  return layers.reduce(
    (counts, layer) => ({
      needsReview: counts.needsReview + (layer.reviewStatus === "needs-review" ? 1 : 0),
      changesRequested: counts.changesRequested + (layer.reviewStatus === "changes-requested" ? 1 : 0),
      approved: counts.approved + (layer.reviewStatus === "approved" ? 1 : 0),
    }),
    { needsReview: 0, changesRequested: 0, approved: 0 },
  );
}
