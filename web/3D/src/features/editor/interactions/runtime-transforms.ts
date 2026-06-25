import { evaluateAnimatedTransform } from "../animation/evaluate-animation";
import { resolveVariableBoundObject } from "../scene/variable-bindings";
import type { AnimationTrack, SceneObject, SceneVariable, Transform } from "../types";
import { resolveRuntimePhysicsTransform, type RuntimePhysicsTransforms } from "../runtime/physics-runtime-state";
import { getRuntimeNowSeconds, resolveRuntimeAnimationElapsed, type RuntimeAnimationOverrides } from "./animation-actions";
import { getRuntimeNowSeconds as getTransitionNowSeconds, resolveRuntimeTransitionTransform, type RuntimeTransitionOverrides } from "./transition-actions";

export function createAnimationTrackMap(animationTracks: AnimationTrack[]) {
  const tracksByObjectId = new Map<string, AnimationTrack[]>();

  for (const track of animationTracks) {
    tracksByObjectId.set(track.objectId, [...(tracksByObjectId.get(track.objectId) ?? []), track]);
  }

  return tracksByObjectId;
}

export function resolveRuntimeObjectTransform(
  object: SceneObject,
  tracksByObjectId: Map<string, AnimationTrack[]>,
  runtimeAnimationOverrides: RuntimeAnimationOverrides,
  runtimeTransitionOverrides: RuntimeTransitionOverrides,
  elapsedSeconds: number,
  variables: SceneVariable[] = [],
  runtimePhysicsTransforms: RuntimePhysicsTransforms = {},
): Transform {
  const physicsTransform = runtimePhysicsTransforms[object.id];

  if (physicsTransform) {
    return physicsTransform;
  }

  const runtimeObject = resolveVariableBoundObject(object, variables);
  const objectTracks = tracksByObjectId.get(object.id) ?? [];
  const animatedTransform =
    objectTracks.length > 0
      ? evaluateAnimatedTransform(runtimeObject.transform, objectTracks, resolveRuntimeAnimationElapsed(runtimeAnimationOverrides[object.id], elapsedSeconds, getRuntimeNowSeconds()))
      : runtimeObject.transform;

  return resolveRuntimePhysicsTransform(object.id, resolveRuntimeTransitionTransform(animatedTransform, runtimeTransitionOverrides[object.id], getTransitionNowSeconds()), runtimePhysicsTransforms);
}
