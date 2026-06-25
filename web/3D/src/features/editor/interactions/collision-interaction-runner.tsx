"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RuntimeAnimationOverrides } from "./animation-actions";
import { canUseCollisionBounds, collisionBoundsIntersect, resolveCollisionBounds } from "./collision-bounds";
import { matchesCollisionTrigger, resolveCollisionTriggerCooldownMs } from "./collision-triggers";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "./runtime-transforms";
import type { RuntimePhysicsTransforms } from "../runtime/physics-runtime-state";
import type { RuntimeTransitionOverrides } from "./transition-actions";
import type { AnimationTrack, ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface CollisionInteractionRunnerProps {
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

export function CollisionInteractionRunner({
  animationTracks,
  enabled,
  objects,
  onInteraction,
  runtimeAnimationOverrides,
  runtimePhysicsTransforms,
  runtimeTransitionOverrides,
  variables,
  visibilityOverrides,
}: CollisionInteractionRunnerProps) {
  const insideStateRef = useRef<Record<string, boolean>>({});
  const lastTriggerTimesRef = useRef<Record<string, number>>({});
  const playStartedAt = useRef<number | null>(null);
  const { runMediaAction } = useMediaActionRegistry();
  const objectById = useMemo(() => new Map(objects.map((object) => [object.id, object])), [objects]);
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

    const elapsedSeconds = clock.elapsedTime - playStartedAt.current;
    const now = window.performance.now();

    for (const object of objects) {
      const interaction = object.interaction;
      const trigger = interaction?.collisionTrigger;

      if (!interaction || trigger?.enabled !== true || !resolveRuntimeObjectVisible(object, visibilityOverrides) || !canUseCollisionBounds(object)) {
        insideStateRef.current[object.id] = false;
        continue;
      }

      const targetObjects = trigger.targetObjectId ? [objectById.get(trigger.targetObjectId)].filter((target): target is SceneObject => Boolean(target)) : objects;

      if (trigger.targetObjectId && targetObjects.length === 0) {
        insideStateRef.current[object.id] = false;
        continue;
      }

      const objectTransform = resolveRuntimeObjectTransform(object, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, elapsedSeconds, variables, runtimePhysicsTransforms);
      const objectBounds = resolveCollisionBounds(object, objectTransform);
      const touching = targetObjects.some((targetObject) => {
        if (
          targetObject.id === object.id ||
          !resolveRuntimeObjectVisible(targetObject, visibilityOverrides) ||
          !canUseCollisionBounds(targetObject)
        ) {
          return false;
        }

        const targetTransform = resolveRuntimeObjectTransform(
          targetObject,
          tracksByObjectId,
          runtimeAnimationOverrides,
          runtimeTransitionOverrides,
          elapsedSeconds,
          variables,
          runtimePhysicsTransforms,
        );

        return collisionBoundsIntersect(objectBounds, resolveCollisionBounds(targetObject, targetTransform));
      });
      const wasTouching = insideStateRef.current[object.id] ?? false;

      insideStateRef.current[object.id] = touching;

      if (
        !matchesCollisionTrigger(trigger, touching, wasTouching) ||
        now - (lastTriggerTimesRef.current[object.id] ?? -Infinity) < resolveCollisionTriggerCooldownMs(trigger) ||
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
