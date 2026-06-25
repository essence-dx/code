"use client";

import { Flag } from "lucide-react";
import type { TimelineMarker } from "@/lib/editor/types";

type TimelineMarkerRailProps = {
  markers: TimelineMarker[];
  selectedMarkerId: string | null;
  currentTime: number;
  duration: number;
  timelineLeft: number;
  timelineWidth: number;
  labelWidth: number;
  onSelectMarker: (marker: TimelineMarker) => void;
};

export function TimelineMarkerRail({
  markers,
  selectedMarkerId,
  currentTime,
  duration,
  timelineLeft,
  timelineWidth,
  labelWidth,
  onSelectMarker,
}: TimelineMarkerRailProps) {
  const safeDuration = Math.max(duration, 1);

  return (
    <>
      <div
        className="pointer-events-none absolute bottom-3 top-3 w-px bg-primary"
        style={{ left: `${timelineLeft + (currentTime / safeDuration) * timelineWidth}px` }}
      />
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="pointer-events-none absolute bottom-3 top-3 w-px opacity-80"
          style={{
            left: `${timelineLeft + (marker.time / safeDuration) * timelineWidth}px`,
            backgroundColor: marker.color,
          }}
        />
      ))}
      {markers.length > 0 ? (
        <div className="mb-2 grid items-center gap-2" style={{ gridTemplateColumns: `${labelWidth}px ${timelineWidth}px` }}>
          <div className="text-xs text-muted-foreground">Markers</div>
          <div className="relative h-8 rounded-md bg-background/70">
            {markers.map((marker) => (
              <button
                key={marker.id}
                className={`absolute top-1 flex h-6 max-w-32 -translate-x-1/2 items-center gap-1 rounded-full border px-2 text-xs shadow-sm ${
                  selectedMarkerId === marker.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"
                }`}
                style={{ left: `${(marker.time / safeDuration) * 100}%` }}
                onClick={() => onSelectMarker(marker)}
              >
                <Flag className="size-3" style={{ color: selectedMarkerId === marker.id ? undefined : marker.color }} />
                <span className="truncate">{marker.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
