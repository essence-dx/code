"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface ResizeInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function ResizeInteractionRunner({ enabled, objects, onInteraction, variables, visibilityOverrides }: ResizeInteractionRunnerProps) {
  const resizeTimeoutRef = useRef<number | null>(null);
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      return;
    }

    function runResizeInteractions() {
      resizeTimeoutRef.current = null;

      for (const object of objects) {
        const interaction = object.interaction;

        if (
          interaction?.resizeTrigger?.enabled !== true ||
          !resolveRuntimeObjectVisible(object, visibilityOverrides) ||
          !evaluateInteractionCondition(interaction.condition, variables)
        ) {
          continue;
        }

        onInteraction(interaction);
        runMediaAction(interaction.mediaAction);
        openInteractionLink(interaction.linkUrl);
      }
    }

    function handleResize() {
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = window.setTimeout(runResizeInteractions, 120);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [enabled, objects, onInteraction, runMediaAction, variables, visibilityOverrides]);

  return null;
}
