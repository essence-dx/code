"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/features/editor/state/editor-store";

export function usePlaybackClock() {
  const isPlaying = useEditorStore((state) => state.isPlaying);

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrame = 0;
    let previousTime = performance.now();

    const tick = (now: number) => {
      const state = useEditorStore.getState();
      if (!state.isPlaying) return;

      const duration = Math.max(0, state.project.duration);
      if (duration <= 0) {
        state.setPlayback(false);
        return;
      }

      const deltaSeconds = Math.max(0, (now - previousTime) / 1000);
      previousTime = now;
      const nextTime = Math.min(duration, state.currentTime + deltaSeconds);

      state.setCurrentTime(nextTime);

      if (nextTime >= duration) {
        state.setPlayback(false);
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);
}
