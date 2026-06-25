import { nanoid } from "nanoid";
import type { InputControlType, SceneInputControl, SceneVariable } from "../types";

export const defaultInputControlRange = {
  max: 100,
  min: 0,
  step: 1,
};

export function getInputControlTypeForVariable(variable?: SceneVariable): InputControlType {
  if (variable?.type === "number") {
    return "slider";
  }

  if (variable?.type === "boolean") {
    return "toggle";
  }

  if (variable?.type === "color") {
    return "color";
  }

  return "text";
}

export function createInputControl(variable: SceneVariable, index: number): SceneInputControl {
  const type = getInputControlTypeForVariable(variable);

  return {
    id: nanoid(),
    label: variable.name || `Input ${index}`,
    variableId: variable.id,
    type,
    min: type === "slider" ? defaultInputControlRange.min : undefined,
    max: type === "slider" ? defaultInputControlRange.max : undefined,
    step: type === "slider" ? defaultInputControlRange.step : undefined,
  };
}

export function resolveInputControlType(control: SceneInputControl, variable?: SceneVariable): InputControlType {
  const variableType = getInputControlTypeForVariable(variable);

  if (!variable || variableType !== control.type) {
    return variableType;
  }

  return control.type;
}

export function resolveInputControlRange(control: SceneInputControl) {
  const min = control.min ?? defaultInputControlRange.min;
  const max = Math.max(control.max ?? defaultInputControlRange.max, min + 0.0001);
  const step = control.step ?? defaultInputControlRange.step;

  return {
    min,
    max,
    step: Math.max(0.0001, step),
  };
}
