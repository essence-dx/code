import type { ControlsTrigger, ControlsTriggerEvent } from "../types";

export type { ControlsTriggerEvent };

export const DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS = 250;
export const controlsTriggerEvents: ControlsTriggerEvent[] = ["start", "change", "end"];

export interface RuntimeControlsEvent {
  id: number;
  event: ControlsTriggerEvent;
}

export function resolveControlsTriggerEvent(trigger: ControlsTrigger | undefined): ControlsTriggerEvent {
  return trigger?.event ?? "start";
}

export function resolveControlsTriggerCooldownMs(trigger: ControlsTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS;
}

export function matchesControlsTrigger(trigger: ControlsTrigger | undefined, event: ControlsTriggerEvent) {
  return trigger?.enabled === true && resolveControlsTriggerEvent(trigger) === event;
}
