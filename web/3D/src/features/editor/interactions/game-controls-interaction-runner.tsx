"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { collectGameControlDirections, matchesGameControlsTrigger, resolveGameControlsCooldownMs, resolveGameControlsDeadzone } from "./game-controls";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { isEditableKeyboardTarget } from "./keyboard-triggers";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface GameControlsInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function GameControlsInteractionRunner({ enabled, objects, onInteraction, variables, visibilityOverrides }: GameControlsInteractionRunnerProps) {
  const activeKeysRef = useRef(new Set<string>());
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      activeKeysRef.current.clear();
      lastTriggerTimesRef.current = {};
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      activeKeysRef.current.add(event.code.toLowerCase());
      activeKeysRef.current.add(event.key.toLowerCase());
    }

    function handleKeyUp(event: KeyboardEvent) {
      activeKeysRef.current.delete(event.code.toLowerCase());
      activeKeysRef.current.delete(event.key.toLowerCase());
    }

    function handleBlur() {
      activeKeysRef.current.clear();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      activeKeysRef.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled]);

  useFrame(() => {
    if (!enabled) {
      return;
    }

    const now = window.performance.now();

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.gameControlsTrigger;

      if (!interaction || !trigger?.enabled) {
        continue;
      }

      const directions = collectGameControlDirections(activeKeysRef.current, resolveGameControlsDeadzone(trigger));
      const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

      if (
        !matchesGameControlsTrigger(trigger, directions) ||
        now - lastTriggeredAt < resolveGameControlsCooldownMs(trigger) ||
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
  });

  return null;
}
