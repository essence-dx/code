import type { SceneVariable, SceneVariableValue, VariableChangeTrigger } from "../types";

export const DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS = 250;

type VariableValueMap = Record<string, SceneVariableValue>;

export function resolveVariableChangeTriggerCooldownMs(trigger: VariableChangeTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS;
}

export function createVariableValueMap(variables: SceneVariable[]): VariableValueMap {
  return Object.fromEntries(variables.map((variable) => [variable.id, variable.value]));
}

export function getChangedVariableIds(previousValues: VariableValueMap, variables: SceneVariable[]) {
  const changedIds = new Set<string>();

  for (const variable of variables) {
    if (!Object.prototype.hasOwnProperty.call(previousValues, variable.id)) {
      continue;
    }

    if (!Object.is(previousValues[variable.id], variable.value)) {
      changedIds.add(variable.id);
    }
  }

  return changedIds;
}

export function matchesVariableChangeTrigger(trigger: VariableChangeTrigger | undefined, changedVariableIds: Set<string>) {
  if (trigger?.enabled !== true || changedVariableIds.size === 0) {
    return false;
  }

  return trigger.variableId ? changedVariableIds.has(trigger.variableId) : true;
}
