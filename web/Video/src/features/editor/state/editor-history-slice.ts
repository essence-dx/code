"use client";

import type { EditorProject } from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorHistorySlice = Pick<EditorState, "undo" | "redo">;

type EditorHistoryDeps = {
  clamp: (value: number, min: number, max: number) => number;
  normalizeProjectTimeline: (project: EditorProject) => EditorProject;
};

export function createEditorHistorySlice(set: EditorStoreSet, get: EditorStoreGet, deps: EditorHistoryDeps): EditorHistorySlice {
  return {
    undo: () => {
      const { past, project, future, currentTime } = get();
      const previous = past.at(-1);
      if (!previous) return;
      const normalizedPrevious = deps.normalizeProjectTimeline(previous);
      set({
        project: normalizedPrevious,
        past: past.slice(0, -1),
        future: [project, ...future],
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTime: deps.clamp(currentTime, 0, normalizedPrevious.duration),
      });
    },
    redo: () => {
      const { future, project, past, currentTime } = get();
      const next = future[0];
      if (!next) return;
      const normalizedNext = deps.normalizeProjectTimeline(next);
      set({
        project: normalizedNext,
        past: [...past, project].slice(-40),
        future: future.slice(1),
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTime: deps.clamp(currentTime, 0, normalizedNext.duration),
      });
    },
  };
}
