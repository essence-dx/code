"use client";

import type { PointerEvent } from "react";
import { useRef } from "react";
import { TIMELINE_MIN_LAYER_SECONDS, snapTime } from "@/lib/editor/timeline";
import type { TimelineLayer } from "@/lib/editor/types";

export type TimelineDragMode = "move" | "trim-start" | "trim-end";

type TimelineDragState = {
  layerId: string;
  mode: TimelineDragMode;
  startX: number;
  startY: number;
  trackWidth: number;
  projectDuration: number;
  layerStart: number;
  layerDuration: number;
  layerTrimStart: number;
  layerTrack: number;
  trackStep: number;
};

type TimelineDragOptions = {
  projectDuration: number;
  snapInterval: number;
  trackStep: number;
  onSelectLayer: (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, layerId: string) => void;
  onPushHistorySnapshot: () => void;
  onUpdateLayerTiming: (
    layerId: string,
    patch: Partial<Pick<TimelineLayer, "start" | "duration" | "trimStart" | "track">>,
    options?: { history?: boolean; snap?: boolean },
  ) => void;
};

export function useTimelineDrag({
  projectDuration,
  snapInterval,
  trackStep,
  onSelectLayer,
  onPushHistorySnapshot,
  onUpdateLayerTiming,
}: TimelineDragOptions) {
  const dragRef = useRef<TimelineDragState | null>(null);

  function beginTimelineDrag(event: PointerEvent<HTMLDivElement>, layer: TimelineLayer, mode: TimelineDragMode) {
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer(event, layer.id);
    if (layer.locked) return;

    onPushHistorySnapshot();
    const track = event.currentTarget.closest("[data-timeline-track]");
    const trackWidth = track?.getBoundingClientRect().width ?? 1;
    dragRef.current = {
      layerId: layer.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      trackWidth,
      projectDuration: Math.max(projectDuration, 1),
      layerStart: layer.start,
      layerDuration: layer.duration,
      layerTrimStart: layer.trimStart,
      layerTrack: layer.track,
      trackStep,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateTimelineDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const secondsDelta = ((event.clientX - drag.startX) / drag.trackWidth) * drag.projectDuration;
    const trackDelta = Math.round((event.clientY - drag.startY) / drag.trackStep);

    if (drag.mode === "move") {
      onUpdateLayerTiming(
        drag.layerId,
        {
          start: drag.layerStart + secondsDelta,
          track: Math.max(0, drag.layerTrack + trackDelta),
        },
        { history: false },
      );
      return;
    }

    if (drag.mode === "trim-start") {
      const nextStart = snapTime(drag.layerStart + secondsDelta, true, snapInterval);
      const consumed = Math.min(drag.layerDuration - TIMELINE_MIN_LAYER_SECONDS, Math.max(-drag.layerTrimStart, nextStart - drag.layerStart));
      onUpdateLayerTiming(
        drag.layerId,
        {
          start: drag.layerStart + consumed,
          duration: drag.layerDuration - consumed,
          trimStart: drag.layerTrimStart + consumed,
        },
        { history: false },
      );
      return;
    }

    const nextEnd = snapTime(drag.layerStart + drag.layerDuration + secondsDelta, true, snapInterval);
    onUpdateLayerTiming(
      drag.layerId,
      {
        duration: Math.max(TIMELINE_MIN_LAYER_SECONDS, nextEnd - drag.layerStart),
      },
      { history: false },
    );
  }

  function endTimelineDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    beginTimelineDrag,
    updateTimelineDrag,
    endTimelineDrag,
  };
}
