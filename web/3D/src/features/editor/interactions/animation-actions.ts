import type { AnimationAction, AnimationTrack, SceneObject } from "../types";

export type RuntimeAnimationPlayback = {
  elapsed: number;
  mode: "paused" | "playing";
  startedAt: number;
};

export type RuntimeAnimationOverrides = Record<string, RuntimeAnimationPlayback>;

export function getRuntimeNowSeconds() {
  return typeof performance === "undefined" ? Date.now() / 1000 : performance.now() / 1000;
}

export function resolveRuntimeAnimationElapsed(playback: RuntimeAnimationPlayback | undefined, fallbackElapsed: number, now = getRuntimeNowSeconds()) {
  if (!playback) {
    return fallbackElapsed;
  }

  if (playback.mode === "paused") {
    return playback.elapsed;
  }

  return playback.elapsed + Math.max(0, now - playback.startedAt);
}

function getCurrentElapsed(playback: RuntimeAnimationPlayback | undefined, now: number, defaultStartedAt: number) {
  return resolveRuntimeAnimationElapsed(playback, Math.max(0, now - defaultStartedAt), now);
}

function hasAnimationTarget(targetObjectId: string | undefined, objects: SceneObject[], animationTracks: AnimationTrack[]) {
  return Boolean(targetObjectId && objects.some((object) => object.id === targetObjectId) && animationTracks.some((track) => track.objectId === targetObjectId));
}

export function applyAnimationAction(
  action: AnimationAction | undefined | null,
  objects: SceneObject[],
  animationTracks: AnimationTrack[],
  animationOverrides: RuntimeAnimationOverrides,
  now: number,
  defaultStartedAt: number,
): RuntimeAnimationOverrides {
  if (!hasAnimationTarget(action?.targetObjectId, objects, animationTracks)) {
    return animationOverrides;
  }

  const targetObjectId = action?.targetObjectId ?? "";
  const currentPlayback = animationOverrides[targetObjectId];
  const currentElapsed = getCurrentElapsed(currentPlayback, now, defaultStartedAt);
  const operation = action?.operation ?? "toggle";
  const nextPlayback: RuntimeAnimationPlayback =
    operation === "pause"
      ? { mode: "paused", elapsed: currentElapsed, startedAt: now }
      : operation === "restart"
        ? { mode: "playing", elapsed: 0, startedAt: now }
        : operation === "start" || currentPlayback?.mode === "paused"
          ? { mode: "playing", elapsed: currentPlayback?.mode === "paused" ? currentElapsed : 0, startedAt: now }
          : { mode: "paused", elapsed: currentElapsed, startedAt: now };
  const existing = animationOverrides[targetObjectId];

  if (existing && existing.mode === nextPlayback.mode && Math.abs(existing.elapsed - nextPlayback.elapsed) < 0.001 && Math.abs(existing.startedAt - nextPlayback.startedAt) < 0.001) {
    return animationOverrides;
  }

  return {
    ...animationOverrides,
    [targetObjectId]: nextPlayback,
  };
}

