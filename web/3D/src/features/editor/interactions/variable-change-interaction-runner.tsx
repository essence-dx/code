"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import {
  createVariableValueMap,
  getChangedVariableIds,
  matchesVariableChangeTrigger,
  resolveVariableChangeTriggerCooldownMs,
} from "./variable-change-triggers";
import type { ObjectInteraction, SceneObject, SceneVariable, SceneVariableValue } from "../types";

interface VariableChangeInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function VariableChangeInteractionRunner({ enabled, objects, onInteraction, variables, visibilityOverrides }: VariableChangeInteractionRunnerProps) {
  const previousValuesRef = useRef<Record<string, SceneVariableValue> | null>(null);
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      previousValuesRef.current = null;
      lastTriggerTimesRef.current = {};
      return;
    }

    const currentValues = createVariableValueMap(variables);

    if (!previousValuesRef.current) {
      previousValuesRef.current = currentValues;
      return;
    }

    const changedVariableIds = getChangedVariableIds(previousValuesRef.current, variables);

    previousValuesRef.current = currentValues;

    if (changedVariableIds.size === 0) {
      return;
    }

    const now = window.performance.now();

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.variableChangeTrigger;
      const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

      if (
        !interaction ||
        !matchesVariableChangeTrigger(trigger, changedVariableIds) ||
        now - lastTriggeredAt < resolveVariableChangeTriggerCooldownMs(trigger) ||
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
  }, [enabled, objects, onInteraction, runMediaAction, variables, visibilityOverrides]);

  return null;
}
