import type { TriggerArea, TriggerAreaMode } from "../types";

export const DEFAULT_TRIGGER_AREA_RADIUS = 2;
export const DEFAULT_TRIGGER_AREA_COOLDOWN_MS = 500;
export const triggerAreaModes: TriggerAreaMode[] = ["enter", "inside", "exit"];

export function resolveTriggerAreaMode(triggerArea: TriggerArea | undefined): TriggerAreaMode {
  return triggerArea?.mode ?? "enter";
}

export function resolveTriggerAreaRadius(triggerArea: TriggerArea | undefined) {
  return triggerArea?.radius ?? DEFAULT_TRIGGER_AREA_RADIUS;
}

export function resolveTriggerAreaCooldownMs(triggerArea: TriggerArea | undefined) {
  return triggerArea?.cooldownMs ?? DEFAULT_TRIGGER_AREA_COOLDOWN_MS;
}

export function matchesTriggerArea(triggerArea: TriggerArea | undefined, inside: boolean, wasInside: boolean) {
  if (triggerArea?.enabled !== true) {
    return false;
  }

  const mode = resolveTriggerAreaMode(triggerArea);

  if (mode === "inside") {
    return inside;
  }

  if (mode === "exit") {
    return wasInside && !inside;
  }

  return inside && !wasInside;
}
