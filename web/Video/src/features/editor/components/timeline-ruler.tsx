"use client";

import { formatTime } from "@/lib/editor/factory";
import { createTimelineRulerTicks } from "@/lib/editor/timeline-ruler";

interface TimelineRulerProps {
  duration: number;
  labelWidth: number;
  width: number;
}

export function TimelineRuler({ duration, labelWidth, width }: TimelineRulerProps) {
  const ticks = createTimelineRulerTicks(duration, width);

  return (
    <div className="mb-2 grid items-end gap-2" style={{ gridTemplateColumns: `${labelWidth}px ${width}px` }}>
      <div className="pb-1 text-xs text-muted-foreground">Time</div>
      <div className="relative h-8 border-b border-border/80 bg-background/70">
        {ticks.map((tick) => (
          <div
            key={tick.id}
            className={`absolute bottom-0 border-l ${tick.kind === "major" ? "h-8 border-border" : "h-3 border-border/60"}`}
            style={{ left: `${tick.percent}%` }}
          >
            {tick.kind === "major" ? (
              <span className="absolute bottom-3 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                {formatTime(tick.time)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
