"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { trySaveLocalProject } from "@/lib/projects/local-project-store";

export function useEditorShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const commandKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (commandKey && key === "s") {
        event.preventDefault();
        const { project, mediaAssets } = useEditorStore.getState();
        void trySaveLocalProject(project, mediaAssets);
        return;
      }

      if (isEditableTarget(event.target)) return;

      const state = useEditorStore.getState();

      if (commandKey && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          state.redo();
        } else {
          state.undo();
        }
        return;
      }

      if (commandKey && key === "y") {
        event.preventDefault();
        state.redo();
        return;
      }

      if (commandKey && key === "d") {
        event.preventDefault();
        state.duplicateSelectedLayers();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        state.removeSelectedLayers();
        return;
      }

      const nudge = layerNudgeForKey(event, state.project.snapInterval ?? 0.25);
      if (nudge) {
        event.preventDefault();
        state.nudgeSelectedLayers(nudge);
        return;
      }

      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        state.togglePlayback();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function layerNudgeForKey(event: KeyboardEvent, snapInterval: number) {
  const timeStep = event.shiftKey ? 1 : snapInterval;

  if (event.key === "ArrowLeft") return { timeDelta: -timeStep };
  if (event.key === "ArrowRight") return { timeDelta: timeStep };
  if (event.key === "ArrowUp") return { trackDelta: -1 };
  if (event.key === "ArrowDown") return { trackDelta: 1 };

  return null;
}
