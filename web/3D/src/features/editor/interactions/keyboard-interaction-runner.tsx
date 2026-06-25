"use client";

import { useEffect } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { isEditableKeyboardTarget, matchesKeyboardTrigger, resolveKeyboardTriggerCooldownMs } from "./keyboard-triggers";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { KeyboardTriggerEvent, ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface KeyboardInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

export function KeyboardInteractionRunner({ enabled, objects, onInteraction, variables, visibilityOverrides }: KeyboardInteractionRunnerProps) {
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pressIntervals = new Map<string, number>();

    function clearPressInteraction(objectId: string) {
      const intervalId = pressIntervals.get(objectId);

      if (intervalId === undefined) {
        return;
      }

      window.clearInterval(intervalId);
      pressIntervals.delete(objectId);
    }

    function runKeyboardInteraction(object: SceneObject, triggerEvent: KeyboardTriggerEvent, event: Pick<KeyboardEvent, "code" | "key">) {
      const interaction = object.interaction;

      if (
        !interaction?.keyboardTrigger ||
        !resolveRuntimeObjectVisible(object, visibilityOverrides) ||
        !matchesKeyboardTrigger(interaction.keyboardTrigger, event, triggerEvent) ||
        !evaluateInteractionCondition(interaction.condition, variables)
      ) {
        return false;
      }

      onInteraction(interaction);
      runMediaAction(interaction.mediaAction);
      openInteractionLink(interaction.linkUrl);

      return true;
    }

    function startPressInteraction(object: SceneObject, event: Pick<KeyboardEvent, "code" | "key">) {
      if (pressIntervals.has(object.id)) {
        return false;
      }

      if (!runKeyboardInteraction(object, "press", event)) {
        return false;
      }

      const cooldownMs = Math.max(16, resolveKeyboardTriggerCooldownMs(object.interaction?.keyboardTrigger));
      const intervalId = window.setInterval(() => runKeyboardInteraction(object, "press", event), cooldownMs);

      pressIntervals.set(object.id, intervalId);

      return true;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || isEditableKeyboardTarget(event.target)) {
        return;
      }

      let handled = false;

      for (const object of objects) {
        handled = runKeyboardInteraction(object, "down", event) || startPressInteraction(object, event) || handled;
      }

      if (handled) {
        event.preventDefault();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      for (const object of objects) {
        if (matchesKeyboardTrigger(object.interaction?.keyboardTrigger, event, "press")) {
          clearPressInteraction(object.id);
        }
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      let handled = false;

      for (const object of objects) {
        handled = runKeyboardInteraction(object, "up", event) || handled;
      }

      if (handled) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      for (const intervalId of pressIntervals.values()) {
        window.clearInterval(intervalId);
      }

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled, objects, onInteraction, runMediaAction, variables, visibilityOverrides]);

  return null;
}
