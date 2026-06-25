import { nanoid } from "nanoid";
import type { SceneVariable, SceneVariableType, SceneVariableValue, VariableAction } from "../types";
import { evaluateNumericExpression } from "./variable-expressions";

const localVariableStoragePrefix = "essence-spline:local-variable";

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isSceneVariableValue(value: unknown): value is SceneVariableValue {
  return typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function getLocalVariableStorageKey(sceneId: string, variableId: string) {
  return `${localVariableStoragePrefix}:${sceneId}:${variableId}`;
}

export function getDefaultVariableValue(type: SceneVariableType): SceneVariableValue {
  if (type === "number") {
    return 0;
  }

  if (type === "boolean") {
    return false;
  }

  if (type === "color") {
    return "#51e0c3";
  }

  return "";
}

export function normalizeVariableValue(type: SceneVariableType, value: SceneVariableValue): SceneVariableValue {
  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  if (type === "boolean") {
    return typeof value === "boolean" ? value : value === "true";
  }

  if (type === "color") {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#51e0c3";
  }

  return typeof value === "string" ? value : String(value);
}

export function createSceneVariable(type: SceneVariableType, index: number): SceneVariable {
  return {
    id: nanoid(),
    name: `Variable ${index}`,
    type,
    value: getDefaultVariableValue(type),
    scope: "scene",
    source: "manual",
  };
}

function readNumberValue(value: SceneVariableValue) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function readActionNumber(action: VariableAction, variables: SceneVariable[], fallback: number) {
  const value = readNumberValue(action.value ?? fallback);

  return action.expression?.trim() ? evaluateNumericExpression(action.expression, variables, value) : value;
}

function readCycleOptions(variable: SceneVariable, action: VariableAction) {
  const options = action.expression?.trim() || (typeof action.value === "string" ? action.value : "");

  return options
    .split("|")
    .map((option) => normalizeVariableValue(variable.type, option.trim()))
    .filter((option) => {
      if (variable.type === "color") {
        return typeof option === "string" && /^#[0-9a-f]{6}$/i.test(option);
      }

      return typeof option === "string" && option.length > 0;
    });
}

function cycleActionValue(variable: SceneVariable, action: VariableAction): SceneVariableValue {
  const options = readCycleOptions(variable, action);

  if (!options.length) {
    return variable.value;
  }

  const currentIndex = options.findIndex((option) => Object.is(option, variable.value));
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;

  return options[nextIndex];
}

function applyActionValue(variable: SceneVariable, action: VariableAction, variables: SceneVariable[]): SceneVariableValue {
  if (action.operation === "increment") {
    if (variable.type !== "number") {
      return variable.value;
    }

    return readNumberValue(variable.value) + readActionNumber(action, variables, 1);
  }

  if (action.operation === "decrement") {
    if (variable.type !== "number") {
      return variable.value;
    }

    return readNumberValue(variable.value) - readActionNumber(action, variables, 1);
  }

  if (action.operation === "multiply") {
    if (variable.type !== "number") {
      return variable.value;
    }

    return readNumberValue(variable.value) * readActionNumber(action, variables, 1);
  }

  if (action.operation === "toggle") {
    if (variable.type !== "boolean") {
      return variable.value;
    }

    return !(variable.value === true);
  }

  if (action.operation === "cycle") {
    if (variable.type !== "text" && variable.type !== "color") {
      return variable.value;
    }

    return cycleActionValue(variable, action);
  }

  if (variable.type === "number") {
    return normalizeVariableValue(variable.type, readActionNumber(action, variables, readNumberValue(getDefaultVariableValue(variable.type))));
  }

  return normalizeVariableValue(variable.type, action.value ?? getDefaultVariableValue(variable.type));
}

export function applyVariableAction(variables: SceneVariable[], action?: VariableAction | null): SceneVariable[] {
  if (!action?.variableId) {
    return variables;
  }

  let changed = false;
  const nextVariables = variables.map((variable) => {
    if (variable.id !== action.variableId || (variable.source ?? "manual") !== "manual") {
      return variable;
    }

    changed = true;

    return {
      ...variable,
      value: applyActionValue(variable, action, variables),
    };
  });

  return changed ? nextVariables : variables;
}

export function setSceneVariableValue(variables: SceneVariable[], variableId: string, value: SceneVariableValue): SceneVariable[] {
  let changed = false;
  const nextVariables = variables.map((variable) => {
    if (variable.id !== variableId || (variable.source ?? "manual") !== "manual") {
      return variable;
    }

    const nextValue = normalizeVariableValue(variable.type, value);

    if (Object.is(nextValue, variable.value)) {
      return variable;
    }

    changed = true;

    return {
      ...variable,
      value: nextValue,
    };
  });

  return changed ? nextVariables : variables;
}

export function resolveLocalVariableValues(sceneId: string, variables: SceneVariable[]): SceneVariable[] {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return variables;
  }

  let changed = false;
  const nextVariables = variables.map((variable) => {
    if (variable.scope !== "local" || (variable.source ?? "manual") !== "manual") {
      return variable;
    }

    const storedValue = storage.getItem(getLocalVariableStorageKey(sceneId, variable.id));

    if (storedValue === null) {
      return variable;
    }

    try {
      const parsedValue = JSON.parse(storedValue);

      if (!isSceneVariableValue(parsedValue)) {
        return variable;
      }

      const value = normalizeVariableValue(variable.type, parsedValue);

      if (Object.is(value, variable.value)) {
        return variable;
      }

      changed = true;

      return {
        ...variable,
        value,
      };
    } catch {
      return variable;
    }
  });

  return changed ? nextVariables : variables;
}

export function persistLocalVariables(sceneId: string, variables: SceneVariable[]) {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return;
  }

  for (const variable of variables) {
    if (variable.scope === "local" && (variable.source ?? "manual") === "manual") {
      try {
        storage.setItem(getLocalVariableStorageKey(sceneId, variable.id), JSON.stringify(variable.value));
      } catch {
        return;
      }
    }
  }
}

export function deleteLocalVariableValue(sceneId: string, variableId: string) {
  const storage = getBrowserLocalStorage();

  if (storage) {
    try {
      storage.removeItem(getLocalVariableStorageKey(sceneId, variableId));
    } catch {
      return;
    }
  }
}

export function clearLocalVariableValues(sceneId: string, variables: SceneVariable[]) {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return;
  }

  for (const variable of variables) {
    if (variable.scope === "local" && (variable.source ?? "manual") === "manual") {
      try {
        storage.removeItem(getLocalVariableStorageKey(sceneId, variable.id));
      } catch {
        return;
      }
    }
  }
}

export function resetLocalVariablesToBaseline(variables: SceneVariable[], baselineVariables: SceneVariable[]) {
  const baselineById = new Map(baselineVariables.map((variable) => [variable.id, variable]));
  let changed = false;

  const nextVariables = variables.map((variable) => {
    if (variable.scope !== "local" || (variable.source ?? "manual") !== "manual") {
      return variable;
    }

    const baseline = baselineById.get(variable.id);
    const value = baseline ? normalizeVariableValue(variable.type, baseline.value) : getDefaultVariableValue(variable.type);

    if (Object.is(variable.value, value)) {
      return variable;
    }

    changed = true;

    return {
      ...variable,
      value,
    };
  });

  return changed ? nextVariables : variables;
}

export function interpolateVariables(value: string, variables: SceneVariable[]) {
  if (!value.includes("{{")) {
    return value;
  }

  const variableByKey = new Map<string, SceneVariable>();

  for (const variable of variables) {
    variableByKey.set(variable.id, variable);
    variableByKey.set(variable.name.trim().toLowerCase(), variable);
  }

  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    const variable = variableByKey.get(key.trim().toLowerCase());

    return variable ? String(variable.value) : match;
  });
}
