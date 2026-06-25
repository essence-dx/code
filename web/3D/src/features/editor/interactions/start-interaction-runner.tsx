"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface StartInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  runKey: string;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function StartInteractionRunner({ enabled, objects, onInteraction, runKey, variables, visibilityOverrides }: StartInteractionRunnerProps) {
  const lastRunKeyRef = useRef<string | null>(null);
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      lastRunKeyRef.current = null;
      return;
    }

    if (lastRunKeyRef.current === runKey) {
      return;
    }

    lastRunKeyRef.current = runKey;

    for (const object of objects) {
      const interaction = object.interaction;

      if (
        interaction?.startTrigger?.enabled !== true ||
        !resolveRuntimeObjectVisible(object, visibilityOverrides) ||
        !evaluateInteractionCondition(interaction.condition, variables)
      ) {
        continue;
      }

      onInteraction(interaction);
      runMediaAction(interaction.mediaAction);
      openInteractionLink(interaction.linkUrl);
    }
  }, [enabled, objects, onInteraction, runKey, runMediaAction, variables, visibilityOverrides]);

  return null;
}
