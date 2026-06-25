"use client";

import { useEffect, useRef } from "react";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import {
  matchesNetworkTrigger,
  NETWORK_INTERACTION_EVENT_TYPE,
  resolveNetworkTriggerCooldownMs,
  type NetworkInteractionEventDetail,
} from "./network-triggers";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import type { ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface NetworkInteractionRunnerProps {
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  sceneId: string;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

function withoutNetworkActions(interaction: ObjectInteraction): ObjectInteraction {
  const { apiAction: _apiAction, webhookAction: _webhookAction, ...nextInteraction } = interaction;

  return nextInteraction;
}

export function NetworkInteractionRunner({ enabled, objects, onInteraction, sceneId, variables, visibilityOverrides }: NetworkInteractionRunnerProps) {
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const { runMediaAction } = useMediaActionRegistry();

  useEffect(() => {
    if (!enabled) {
      lastTriggerTimesRef.current = {};
      return;
    }

    function handleNetworkEvent(event: Event) {
      const detail = (event as CustomEvent<NetworkInteractionEventDetail>).detail;

      if (!detail || (detail.sceneId && detail.sceneId !== sceneId)) {
        return;
      }

      const now = window.performance.now();

      for (const object of objects) {
        const interaction = object.interaction;
        const trigger = interaction?.networkTrigger;
        const lastTriggeredAt = lastTriggerTimesRef.current[object.id] ?? -Infinity;

        if (
          !interaction ||
          !matchesNetworkTrigger(trigger, detail.event) ||
          now - lastTriggeredAt < resolveNetworkTriggerCooldownMs(trigger) ||
          !resolveRuntimeObjectVisible(object, visibilityOverrides) ||
          !evaluateInteractionCondition(interaction.condition, variables)
        ) {
          continue;
        }

        lastTriggerTimesRef.current[object.id] = now;
        onInteraction(withoutNetworkActions(interaction));
        runMediaAction(interaction.mediaAction);
        openInteractionLink(interaction.linkUrl);
      }
    }

    window.addEventListener(NETWORK_INTERACTION_EVENT_TYPE, handleNetworkEvent);

    return () => window.removeEventListener(NETWORK_INTERACTION_EVENT_TYPE, handleNetworkEvent);
  }, [enabled, objects, onInteraction, runMediaAction, sceneId, variables, visibilityOverrides]);

  return null;
}
