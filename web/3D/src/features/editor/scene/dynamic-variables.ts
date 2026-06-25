import { getDefaultVariableValue, normalizeVariableValue } from "./scene-variables";
import type { SceneVariable, SceneVariableSource, SceneVariableType, SceneVariableValue } from "../types";

export interface DynamicVariableRuntime {
  nowMs: number;
  startedAtMs: number;
  tick: number;
}

export const variableSourceOptions: Array<{
  label: string;
  source: SceneVariableSource;
}> = [
  { source: "manual", label: "Manual" },
  { source: "time", label: "Time" },
  { source: "clock", label: "Clock" },
  { source: "timer", label: "Timer" },
  { source: "stopwatch", label: "Stopwatch" },
  { source: "counter", label: "Counter" },
  { source: "random", label: "Random" },
];

export function isDynamicVariable(variable: SceneVariable) {
  return (variable.source ?? "manual") !== "manual";
}

export function getVariableTypeForSource(source: SceneVariableSource, fallback: SceneVariableType): SceneVariableType {
  if (source === "clock" || source === "stopwatch") {
    return "text";
  }

  if (source === "manual") {
    return fallback;
  }

  return "number";
}

export function getDefaultVariableValueForSource(source: SceneVariableSource, type: SceneVariableType): SceneVariableValue {
  if (source === "clock") {
    return "00:00:00";
  }

  if (source === "stopwatch") {
    return "00:00.0";
  }

  return getDefaultVariableValue(getVariableTypeForSource(source, type));
}

export function normalizeVariableForSource(variable: SceneVariable): SceneVariable {
  const source = variable.source ?? "manual";
  const type = getVariableTypeForSource(source, variable.type);

  return {
    ...variable,
    scope: source === "manual" ? variable.scope : "scene",
    source,
    type,
    value: normalizeVariableValue(type, variable.value),
  };
}

function formatClock(nowMs: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(nowMs));
}

function formatStopwatch(elapsedSeconds: number) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const tenths = Math.floor((elapsedSeconds % 1) * 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function resolveDynamicVariableValue(source: SceneVariableSource, runtime: DynamicVariableRuntime): SceneVariableValue | null {
  const elapsedSeconds = Math.max(0, (runtime.nowMs - runtime.startedAtMs) / 1000);

  if (source === "time") {
    return Number((runtime.nowMs / 1000).toFixed(1));
  }

  if (source === "clock") {
    return formatClock(runtime.nowMs);
  }

  if (source === "timer") {
    return Number(elapsedSeconds.toFixed(1));
  }

  if (source === "stopwatch") {
    return formatStopwatch(elapsedSeconds);
  }

  if (source === "counter") {
    return runtime.tick;
  }

  if (source === "random") {
    return Number(seededRandom(Math.floor(elapsedSeconds)).toFixed(3));
  }

  return null;
}

export function resolveDynamicVariableValues(variables: SceneVariable[], runtime: DynamicVariableRuntime): SceneVariable[] {
  let changed = false;
  const nextVariables = variables.map((variable) => {
    const source = variable.source ?? "manual";
    const value = resolveDynamicVariableValue(source, runtime);

    if (value === null || Object.is(value, variable.value)) {
      return variable;
    }

    changed = true;

    return normalizeVariableForSource({
      ...variable,
      value,
    });
  });

  return changed ? nextVariables : variables;
}
