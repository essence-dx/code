import { resolveSceneSettings } from "../scene/default-document";
import type { RuntimeVisibilityOverrides } from "./object-visibility-actions";
import { defaultTransitionDuration, resolveRuntimeTransitionTransform, type RuntimeTransitionOverrides } from "./transition-actions";
import type { SceneObject, SceneSettings, SceneState, SceneTransitionAction } from "../types";

export const defaultSceneTransitionDuration = 0.8;

export type RuntimeSceneTransition = {
  duration: number;
  runtimeCameraId: string | null;
  runtimeSceneSettings: SceneSettings | null;
  sceneState: SceneState;
};

export function resolveSceneTransition(
  action: SceneTransitionAction | undefined | null,
  sceneStates: SceneState[],
  objects: SceneObject[],
): RuntimeSceneTransition | null {
  if (!action?.targetStateId) {
    return null;
  }

  const sceneState = sceneStates.find((state) => state.id === action.targetStateId);

  if (!sceneState) {
    return null;
  }

  const runtimeCameraId =
    sceneState.activeCameraId && objects.some((object) => object.id === sceneState.activeCameraId && object.kind === "camera")
      ? sceneState.activeCameraId
      : null;

  return {
    duration: action.duration ?? defaultSceneTransitionDuration,
    runtimeCameraId,
    runtimeSceneSettings: sceneState.sceneSettings ? resolveSceneSettings(sceneState.sceneSettings) : null,
    sceneState,
  };
}

export function applySceneStateVisibility(
  sceneState: SceneState,
  objects: SceneObject[],
  visibilityOverrides: RuntimeVisibilityOverrides,
): RuntimeVisibilityOverrides {
  const objectIds = new Set(objects.map((object) => object.id));
  const nextOverrides: RuntimeVisibilityOverrides = { ...visibilityOverrides };

  for (const objectState of sceneState.objects) {
    if (objectIds.has(objectState.objectId)) {
      nextOverrides[objectState.objectId] = objectState.visible;
    }
  }

  return nextOverrides;
}

export function applySceneStateTransitions(
  sceneState: SceneState,
  objects: SceneObject[],
  transitionOverrides: RuntimeTransitionOverrides,
  now: number,
  duration = defaultTransitionDuration,
): RuntimeTransitionOverrides {
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const nextOverrides: RuntimeTransitionOverrides = { ...transitionOverrides };

  for (const objectState of sceneState.objects) {
    const object = objectById.get(objectState.objectId);

    if (!object) {
      continue;
    }

    nextOverrides[object.id] = {
      duration,
      from: resolveRuntimeTransitionTransform(object.transform, transitionOverrides[object.id], now),
      startedAt: now,
      to: objectState.transform,
    };
  }

  return nextOverrides;
}
