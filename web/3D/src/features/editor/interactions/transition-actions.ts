import type { SceneObject, Transform, TransitionAction, Vec3 } from "../types";

export type RuntimeTransition = {
  duration: number;
  from: Transform;
  startedAt: number;
  to: Transform;
};

export type RuntimeTransitionOverrides = Record<string, RuntimeTransition>;

export const defaultTransitionDuration = 0.6;

export function getRuntimeNowSeconds() {
  return typeof performance === "undefined" ? Date.now() / 1000 : performance.now() / 1000;
}

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return [
    interpolateNumber(start[0], end[0], progress),
    interpolateNumber(start[1], end[1], progress),
    interpolateNumber(start[2], end[2], progress),
  ];
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function resolveRuntimeTransitionTransform(transform: Transform, transition: RuntimeTransition | undefined, now: number): Transform {
  if (!transition) {
    return transform;
  }

  const progress = transition.duration <= 0 ? 1 : clampProgress((now - transition.startedAt) / transition.duration);

  return {
    position: interpolateVec3(transition.from.position, transition.to.position, progress),
    rotation: interpolateVec3(transition.from.rotation, transition.to.rotation, progress),
    scale: interpolateVec3(transition.from.scale, transition.to.scale, progress),
  };
}

export function applyTransitionAction(
  action: TransitionAction | undefined | null,
  objects: SceneObject[],
  transitionOverrides: RuntimeTransitionOverrides,
  now: number,
): RuntimeTransitionOverrides {
  if (!action?.targetObjectId) {
    return transitionOverrides;
  }

  const targetObject = objects.find((object) => object.id === action.targetObjectId);

  if (!targetObject) {
    return transitionOverrides;
  }

  const from = resolveRuntimeTransitionTransform(targetObject.transform, transitionOverrides[targetObject.id], now);
  const to: Transform = {
    position: action.position ?? targetObject.transform.position,
    rotation: action.rotation ?? targetObject.transform.rotation,
    scale: action.scale ?? targetObject.transform.scale,
  };

  return {
    ...transitionOverrides,
    [targetObject.id]: {
      duration: action.duration ?? defaultTransitionDuration,
      from,
      startedAt: now,
      to,
    },
  };
}
