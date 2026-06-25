import type { PointerTrigger, PointerTriggerEvent } from "../types";

export const DEFAULT_POINTER_TRIGGER_COOLDOWN_MS = 120;
export const pointerTriggerEvents: PointerTriggerEvent[] = ["click", "down", "up", "press", "hoverEnter", "hoverExit"];

export function resolvePointerTriggerEvent(trigger: PointerTrigger | undefined): PointerTriggerEvent {
  return trigger?.event ?? "click";
}

export function resolvePointerTriggerCooldownMs(trigger: PointerTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_POINTER_TRIGGER_COOLDOWN_MS;
}

export function matchesPointerTrigger(trigger: PointerTrigger | undefined, event: PointerTriggerEvent) {
  if (!trigger) {
    return event === "click";
  }

  return trigger.enabled === true && resolvePointerTriggerEvent(trigger) === event;
}
