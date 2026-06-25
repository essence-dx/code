"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { RuntimeAnimationOverrides } from "./animation-actions";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { matchesDistanceTrigger, resolveDistanceTriggerCooldownMs, resolveDistanceTriggerThreshold } from "./distance-triggers";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "./runtime-transforms";
import type { RuntimePhysicsTransforms } from "../runtime/physics-runtime-state";
import type { RuntimeTransitionOverrides } from "./transition-actions";
import type { AnimationTrack, ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface DistanceInteractionRunnerProps {
  animationTracks: AnimationTrack[];
  enabled: boolean;
  objects: SceneObject[];
  onInteraction: (interaction?: ObjectInteraction | null) => void;
  runtimeAnimationOverrides: RuntimeAnimationOverrides;
  runtimePhysicsTransforms?: RuntimePhysicsTransforms;
  runtimeTransitionOverrides: RuntimeTransitionOverrides;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

const objectPosition = new Vector3();

export function DistanceInteractionRunner({
  animationTracks,
  enabled,
  objects,
  onInteraction,
  runtimeAnimationOverrides,
  runtimePhysicsTransforms,
  runtimeTransitionOverrides,
  variables,
  visibilityOverrides,
}: DistanceInteractionRunnerProps) {
  const camera = useThree((state) => state.camera);
  const insideStateRef = useRef<Record<string, boolean>>({});
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const playStartedAt = useRef<number | null>(null);
  const { runMediaAction } = useMediaActionRegistry();
  const tracksByObjectId = useMemo(() => createAnimationTrackMap(animationTracks), [animationTracks]);

  useFrame(({ clock }) => {
    if (!enabled) {
      insideStateRef.current = {};
      lastTriggerTimesRef.current = {};
      playStartedAt.current = null;
      return;
    }

    if (playStartedAt.current === null) {
      playStartedAt.current = clock.elapsedTime;
    }

    const now = window.performance.now();
    const elapsedSeconds = clock.elapsedTime - playStartedAt.current;

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.distanceTrigger;

      if (!interaction || trigger?.enabled !== true || !resolveRuntimeObjectVisible(object, visibilityOverrides)) {
        insideStateRef.current[object.id] = false;
        continue;
      }

      const runtimeTransform = resolveRuntimeObjectTransform(object, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, elapsedSeconds, variables, runtimePhysicsTransforms);

      objectPosition.set(...runtimeTransform.position);

      const distance = camera.position.distanceTo(objectPosition);
      const inside = distance <= resolveDistanceTriggerThreshold(trigger);
      const wasInside = insideStateRef.current[object.id] ?? false;

      insideStateRef.current[object.id] = inside;

      if (
        !matchesDistanceTrigger(trigger, inside, wasInside) ||
        now - (lastTriggerTimesRef.current[object.id] ?? -Infinity) < resolveDistanceTriggerCooldownMs(trigger) ||
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
