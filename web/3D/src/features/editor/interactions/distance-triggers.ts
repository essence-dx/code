import type { DistanceTrigger, DistanceTriggerMode } from "../types";

export const DEFAULT_DISTANCE_TRIGGER_THRESHOLD = 3;
export const DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS = 500;
export const distanceTriggerModes: DistanceTriggerMode[] = ["enter", "inside", "exit"];

export function resolveDistanceTriggerMode(trigger: DistanceTrigger | undefined): DistanceTriggerMode {
  return trigger?.mode ?? "enter";
}

export function resolveDistanceTriggerThreshold(trigger: DistanceTrigger | undefined) {
  return trigger?.threshold ?? DEFAULT_DISTANCE_TRIGGER_THRESHOLD;
}

export function resolveDistanceTriggerCooldownMs(trigger: DistanceTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS;
}

export function matchesDistanceTrigger(trigger: DistanceTrigger | undefined, inside: boolean, wasInside: boolean) {
  if (trigger?.enabled !== true) {
    return false;
  }

  const mode = resolveDistanceTriggerMode(trigger);

  if (mode === "inside") {
    return inside;
  }

  if (mode === "exit") {
    return wasInside && !inside;
  }

  return inside && !wasInside;
}
