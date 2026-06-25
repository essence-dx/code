"use client";

import { useEffect, useRef } from "react";
import { matchesControlsTrigger, resolveControlsTriggerCooldownMs, type RuntimeControlsEvent } from "./controls-triggers";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface ControlsInteractionRunnerProps {
  controlsEvent: RuntimeControlsEvent | null;
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function ControlsInteractionRunner({ controlsEvent, enabled, objects, onInteraction, variables, visibilityOverrides }: ControlsInteractionRunnerProps) {
  const handledEventIdRef = useRef<number | null>(null);
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      handledEventIdRef.current = null;
      lastTriggerTimesRef.current = {};
      return;
    }

    if (!controlsEvent || handledEventIdRef.current === controlsEvent.id) {
      return;
    }

    handledEventIdRef.current = controlsEvent.id;

    const now = window.performance.now();

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.controlsTrigger;
      const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

      if (
        !interaction ||
        !matchesControlsTrigger(trigger, controlsEvent.event) ||
        now - lastTriggeredAt < resolveControlsTriggerCooldownMs(trigger) ||
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
  }, [controlsEvent, enabled, objects, onInteraction, runMediaAction, variables, visibilityOverrides]);

  return null;
}
