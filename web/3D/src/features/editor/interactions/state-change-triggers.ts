import type { StateChangeTrigger } from "../types";

export const DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS = 250;

export function resolveStateChangeTriggerCooldownMs(trigger: StateChangeTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS;
}

export function matchesStateChangeTrigger(trigger: StateChangeTrigger | undefined, stateId: string | null) {
  if (trigger?.enabled !== true || !stateId) {
    return false;
  }

  return trigger.targetStateId ? trigger.targetStateId === stateId : true;
}
