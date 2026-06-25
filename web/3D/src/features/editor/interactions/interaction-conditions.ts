import { normalizeVariableValue } from "../scene/scene-variables";
import type { InteractionCondition, SceneVariable, SceneVariableValue } from "../types";

function toNumberValue(value: SceneVariableValue) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isSameValue(left: SceneVariableValue, right: SceneVariableValue) {
  return Object.is(left, right);
}

export function getDefaultConditionValue(variable: SceneVariable): SceneVariableValue {
  return normalizeVariableValue(variable.type, variable.value);
}

export function evaluateInteractionCondition(condition: InteractionCondition | undefined | null, variables: SceneVariable[]) {
  if (!condition?.variableId) {
    return true;
  }

  const variable = variables.find((entry) => entry.id === condition.variableId);

  if (!variable) {
    return false;
  }

  const expectedValue = normalizeVariableValue(variable.type, condition.value ?? getDefaultConditionValue(variable));
  const actualValue = normalizeVariableValue(variable.type, variable.value);

  if (condition.operator === "equals") {
    return isSameValue(actualValue, expectedValue);
  }

  if (condition.operator === "notEquals") {
    return !isSameValue(actualValue, expectedValue);
  }

  if (variable.type !== "number") {
    return false;
  }

  const actualNumber = toNumberValue(actualValue);
  const expectedNumber = toNumberValue(expectedValue);

  if (condition.operator === "greaterThan") {
    return actualNumber > expectedNumber;
  }

  if (condition.operator === "lessThan") {
    return actualNumber < expectedNumber;
  }

  if (condition.operator === "greaterOrEqual") {
    return actualNumber >= expectedNumber;
  }

  return actualNumber <= expectedNumber;
}
