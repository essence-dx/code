"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import { matchesStateChangeTrigger, resolveStateChangeTriggerCooldownMs } from "./state-change-triggers";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface StateChangeInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  runtimeSceneStateId: string | null;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function StateChangeInteractionRunner({
  enabled,
  objects,
  onInteraction,
  runtimeSceneStateId,
  variables,
  visibilityOverrides,
}: StateChangeInteractionRunnerProps) {
  const initializedRef = useRef(false);
  const previousStateIdRef = useRef<string | null>(null);
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      previousStateIdRef.current = null;
      lastTriggerTimesRef.current = {};
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      previousStateIdRef.current = runtimeSceneStateId;
      return;
    }

    if (previousStateIdRef.current === runtimeSceneStateId) {
      return;
    }

    previousStateIdRef.current = runtimeSceneStateId;

    if (!runtimeSceneStateId) {
      return;
    }

    const now = window.performance.now();

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.stateChangeTrigger;
      const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

      if (
        !interaction ||
        !matchesStateChangeTrigger(trigger, runtimeSceneStateId) ||
        now - lastTriggeredAt < resolveStateChangeTriggerCooldownMs(trigger) ||
        !resolveRuntimeObjectVisible(object, visibilityOverrides) ||
        !evaluateInteractionCondition(interaction.condition, variables)
      ) {
        continue;
      }

      lastTriggerTimesRef.current[object.id] = now;
      onInteraction(interaction);
      runMediaAction(interaction.mediaAction);
      openInteractionLink(interaction.linkUrl);
    }
  }, [enabled, objects, onInteraction, runMediaAction, runtimeSceneStateId, variables, visibilityOverrides]);

  return null;
}
