"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { RuntimeAnimationOverrides } from "./animation-actions";
import { evaluateInteractionCondition } from "./interaction-conditions";
import { useMediaActionRegistry } from "./media-actions";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { openInteractionLink } from "./object-links";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "./runtime-transforms";
import type { RuntimePhysicsTransforms } from "../runtime/physics-runtime-state";
import type { RuntimeTransitionOverrides } from "./transition-actions";
import { matchesTriggerArea, resolveTriggerAreaCooldownMs, resolveTriggerAreaRadius } from "./trigger-area";
import type { AnimationTrack, ObjectInteraction, SceneObject, SceneVariable } from "../types";

interface TriggerAreaInteractionRunnerProps {
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

const areaPosition = new Vector3();
const targetPosition = new Vector3();

export function TriggerAreaInteractionRunner({
  animationTracks,
  enabled,
  objects,
  onInteraction,
  runtimeAnimationOverrides,
  runtimePhysicsTransforms,
  runtimeTransitionOverrides,
  variables,
  visibilityOverrides,
}: TriggerAreaInteractionRunnerProps) {
  const camera = useThree((state) => state.camera);
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
      const triggerArea = interaction?.triggerArea;

      if (!interaction || triggerArea?.enabled !== true || !resolveRuntimeObjectVisible(object, visibilityOverrides)) {
        insideStateRef.current[object.id] = false;
        continue;
      }

      const targetObject = triggerArea.targetObjectId ? objectById.get(triggerArea.targetObjectId) : undefined;

      if (triggerArea.targetObjectId && (!targetObject || !resolveRuntimeObjectVisible(targetObject, visibilityOverrides))) {
        insideStateRef.current[object.id] = false;
        continue;
      }

      const areaTransform = resolveRuntimeObjectTransform(object, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, elapsedSeconds, variables, runtimePhysicsTransforms);
      const targetTransform = targetObject
        ? resolveRuntimeObjectTransform(targetObject, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, elapsedSeconds, variables, runtimePhysicsTransforms)
        : null;

      areaPosition.set(...areaTransform.position);
      if (targetTransform) {
        targetPosition.set(...targetTransform.position);
      } else {
        targetPosition.copy(camera.position);
      }

      const inside = areaPosition.distanceTo(targetPosition) <= resolveTriggerAreaRadius(triggerArea);
      const wasInside = insideStateRef.current[object.id] ?? false;

      insideStateRef.current[object.id] = inside;

      if (
        !matchesTriggerArea(triggerArea, inside, wasInside) ||
        now - (lastTriggerTimesRef.current[object.id] ?? -Infinity) < resolveTriggerAreaCooldownMs(triggerArea) ||
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
