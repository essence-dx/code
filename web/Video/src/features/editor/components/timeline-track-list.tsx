"use client";

import type { PointerEvent } from "react";
import { Group, Lock } from "lucide-react";
import { layerColors } from "@/lib/editor/presets";
import type { LayerReviewStatus, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import type { TimelineDragMode } from "@/features/editor/hooks/use-timeline-drag";
import { WaveformBars } from "@/features/editor/components/waveform-bars";

export type TrackLaneKind = "media" | "audio" | "captions" | "overlays" | "mixed";

export const trackLaneMetadata: Record<TrackLaneKind, { label: string; toneClass: string }> = {
  media: { label: "Media", toneClass: "bg-primary" },
  audio: { label: "Audio", toneClass: "bg-secondary-foreground" },
  captions: { label: "Captions", toneClass: "bg-accent-foreground" },
  overlays: { label: "Overlays", toneClass: "bg-muted-foreground" },
  mixed: { label: "Mixed", toneClass: "bg-muted-foreground" },
};

const reviewStatusLabels: Record<LayerReviewStatus, string> = {
  none: "",
  "needs-review": "Review",
  "changes-requested": "Changes",
  approved: "Approved",
};

type TimelineTrackListProps = {
  tracks: Array<[number, TimelineLayer[]]>;
  assetById: Map<string, MediaAsset>;
  selectedLayerIds: string[];
  duration: number;
  timelineWidth: number;
  labelWidth: number;
  trackHeight: number;
  layerHeight: number;
  layerTop: number;
  onSelectTimelineLayer: (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, layerId: string) => void;
  onBeginDrag: (event: PointerEvent<HTMLDivElement>, layer: TimelineLayer, mode: TimelineDragMode) => void;
  onUpdateDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onEndDrag: (event: PointerEvent<HTMLDivElement>) => void;
};

export function TimelineTrackList({
  tracks,
  assetById,
  selectedLayerIds,
  duration,
  timelineWidth,
  labelWidth,
  trackHeight,
  layerHeight,
  layerTop,
  onSelectTimelineLayer,
  onBeginDrag,
  onUpdateDrag,
  onEndDrag,
}: TimelineTrackListProps) {
  const safeDuration = Math.max(duration, 1);

  return (
    <>
      {tracks.map(([track, layers]) => {
        const lane = getTrackLaneSummary(track, layers);
        return (
          <div
            key={track}
            className="mb-2 grid items-center gap-2"
            style={{ gridTemplateColumns: `${labelWidth}px ${timelineWidth}px` }}
            role="group"
            aria-label={lane.label}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <span className={`size-2 shrink-0 rounded-full ${lane.toneClass}`} />
                <span className="truncate text-xs font-medium text-foreground">{lane.label}</span>
              </div>
              <div className="truncate text-[10px] leading-4 text-muted-foreground">{lane.detail}</div>
            </div>
            <div
              data-timeline-track
              className="relative overflow-hidden rounded-md bg-background"
              role="list"
              aria-label={`${lane.label} timeline lane`}
              style={{
                height: trackHeight,
                backgroundImage:
                  "repeating-linear-gradient(to right, color-mix(in oklch, var(--border) 45%, transparent) 0 1px, transparent 1px 24px), repeating-linear-gradient(to right, color-mix(in oklch, var(--border) 75%, transparent) 0 1px, transparent 1px 96px)",
              }}
            >
              {layers.map((layer) => {
                const isSelected = selectedLayerIds.includes(layer.id);
                const asset = layer.assetId ? assetById.get(layer.assetId) : undefined;
                return (
                  <div
                    key={layer.id}
                    role="button"
                    tabIndex={0}
                    aria-label={timelineLayerAriaLabel(layer)}
                    aria-pressed={isSelected}
                    className={`absolute touch-none rounded-md border px-2 text-left text-xs font-medium shadow-sm ${
                      layerColors[layer.kind]
                    } ${layer.locked ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing"} ${isSelected ? "ring-2 ring-ring/70" : ""}`}
                    style={{
                      left: `${(layer.start / safeDuration) * 100}%`,
                      width: `${Math.max(4, (layer.duration / safeDuration) * 100)}%`,
                      top: layerTop,
                      height: layerHeight,
                    }}
                    onPointerDown={(event) => onBeginDrag(event, layer, "move")}
                    onPointerMove={onUpdateDrag}
                    onPointerUp={onEndDrag}
                    onPointerCancel={onEndDrag}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onSelectTimelineLayer(event, layer.id);
                    }}
                  >
                    {!layer.locked ? (
                      <div
                        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md bg-foreground/15"
                        onPointerDown={(event) => onBeginDrag(event, layer, "trim-start")}
                      />
                    ) : null}
                    {layer.kind === "audio" ? (
                      <WaveformBars peaks={asset?.waveformPeaks} className="absolute inset-x-3 top-1 h-6 text-current" barClassName="w-0.5" />
                    ) : null}
                    <span className="relative flex min-w-0 items-center gap-1 pl-1 pr-3">
                      {layer.locked ? <Lock className="size-3 shrink-0" /> : null}
                      {layer.groupId ? <Group className="size-3 shrink-0" /> : null}
                      <span className="truncate">{layer.name}</span>
                      {layer.reviewStatus && layer.reviewStatus !== "none" ? (
                        <span className="shrink-0 rounded bg-foreground/10 px-1 text-[10px] uppercase">
                          {reviewStatusLabels[layer.reviewStatus]}
                        </span>
                      ) : null}
                    </span>
                    {!layer.locked ? (
                      <div
                        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md bg-foreground/15"
                        onPointerDown={(event) => onBeginDrag(event, layer, "trim-end")}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function timelineLayerAriaLabel(layer: TimelineLayer) {
  return `${layer.name}, ${layer.kind} layer, starts at ${formatTimelineSeconds(layer.start)}, duration ${formatTimelineSeconds(layer.duration)}`;
}

function formatTimelineSeconds(value: number) {
  return `${Number(value.toFixed(2))} seconds`;
}

export function getTrackLaneSummary(track: number, layers: TimelineLayer[]) {
  const laneCounts = layers.reduce(
    (counts, layer) => counts.set(getLayerLaneKind(layer), (counts.get(getLayerLaneKind(layer)) ?? 0) + 1),
    new Map<TrackLaneKind, number>(),
  );
  const dominantLanes = [...laneCounts.entries()].sort(([, a], [, b]) => b - a);
  const laneKind = dominantLanes.length === 1 ? dominantLanes[0][0] : "mixed";
  const metadata = trackLaneMetadata[laneKind];
  const layerCount = layers.length;
  const detail = layerCount === 1 ? "1 layer" : `${layerCount} layers`;

  return {
    label: `${metadata.label} ${track + 1}`,
    detail,
    toneClass: metadata.toneClass,
  };
}

export function getLayerLaneKind(layer: TimelineLayer): TrackLaneKind {
  if (layer.kind === "audio") return "audio";
  if (layer.kind === "subtitle") return "captions";
  if (layer.kind === "video" || layer.kind === "image") return "media";
  return "overlays";
}
