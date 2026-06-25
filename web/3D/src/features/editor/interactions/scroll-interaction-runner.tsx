"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import { getScrollDirectionFromDelta, matchesScrollTrigger, resolveScrollTriggerCooldownMs } from "./scroll-triggers";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface ScrollInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

function isEditableScrollTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function ScrollInteractionRunner({ enabled, objects, onInteraction, variables, visibilityOverrides }: ScrollInteractionRunnerProps) {
  const lastScrollYRef = useRef(0);
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      lastTriggerTimesRef.current = {};
      return;
    }

    lastScrollYRef.current = window.scrollY;

    function runScrollInteractions(deltaY: number) {
      const direction = getScrollDirectionFromDelta(deltaY);

      if (!direction) {
        return;
      }

      const now = window.performance.now();

      for (const object of objects) {
        const interaction = object.interaction;
        const trigger = interaction?.scrollTrigger;
        const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

        if (
          !interaction ||
          !matchesScrollTrigger(trigger, direction, deltaY) ||
          now - lastTriggeredAt < resolveScrollTriggerCooldownMs(trigger) ||
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
    }

    function handleWheel(event: WheelEvent) {
      if (isEditableScrollTarget(event.target)) {
        return;
      }

      runScrollInteractions(event.deltaY);
    }

    function handleScroll() {
      const nextScrollY = window.scrollY;
      const deltaY = nextScrollY - lastScrollYRef.current;

      lastScrollYRef.current = nextScrollY;
      runScrollInteractions(deltaY);
    }

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, objects, onInteraction, runMediaAction, variables, visibilityOverrides]);

  return null;
}
