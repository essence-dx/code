import { createSolverCandidate } from "@/features/spreadsheet/what-if-solver-candidate";
import type {
  SolverCandidate,
  SolverConstraint,
  SolverEngineRun,
  SolverInput,
  SolverVariable,
  SolverVariableValue,
} from "@/features/spreadsheet/what-if-solver-types";

const maxAdaptiveIterations = 640;
const continuousTolerance = 0.000001;

function clamp(value: number, lowerBound: number, upperBound: number) {
  return Math.min(upperBound, Math.max(lowerBound, value));
}

function normalizeValue(variable: SolverVariable, value: number) {
  if (variable.domain === "binary") {
    return value >= 0.5 ? 1 : 0;
  }

  const boundedValue = clamp(value, variable.lowerBound, variable.upperBound);

  return variable.domain === "integer"
    ? Math.round(boundedValue)
    : boundedValue;
}

function getInitialValue(variable: SolverVariable) {
  return normalizeValue(
    variable,
    variable.lowerBound + (variable.upperBound - variable.lowerBound) / 2,
  );
}

function getInitialStep(variable: SolverVariable) {
  if (variable.domain === "binary") {
    return 1;
  }

  const span = Math.max(1, variable.upperBound - variable.lowerBound);

  return variable.domain === "integer" ? Math.max(1, Math.floor(span / 4)) : span / 4;
}

function reduceStep(variable: SolverVariable, step: number) {
  if (variable.domain === "binary") {
    return 0;
  }

  if (variable.domain === "integer") {
    return step <= 1 ? 0 : Math.floor(step / 2);
  }

  return step <= continuousTolerance ? 0 : step / 2;
}

function getSeedRows(variables: SolverVariable[]) {
  return [
    variables.map((variable) => ({
      cellKey: variable.cellKey,
      value: getInitialValue(variable),
    })),
    variables.map((variable) => ({
      cellKey: variable.cellKey,
      value: normalizeValue(variable, variable.lowerBound),
    })),
    variables.map((variable) => ({
      cellKey: variable.cellKey,
      value: normalizeValue(variable, variable.upperBound),
    })),
  ];
}

function isBetterCandidate(
  candidate: SolverCandidate,
  bestCandidate: SolverCandidate | null,
) {
  return !bestCandidate || candidate.score < bestCandidate.score;
}

function getCandidate(input: {
  constraints: SolverConstraint[];
  solverInput: SolverInput;
  targetCellKey: string;
  variableValues: SolverVariableValue[];
}) {
  return createSolverCandidate(input);
}

export function runAdaptiveSolver(input: {
  constraints: SolverConstraint[];
  solverInput: SolverInput;
  targetCellKey: string;
  variables: SolverVariable[];
}): SolverEngineRun {
  let bestCandidate: SolverCandidate | null = null;
  let iterations = 0;

  for (const variableValues of getSeedRows(input.variables)) {
    const candidate = getCandidate({ ...input, variableValues });

    iterations += 1;

    if (candidate && isBetterCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate) {
    return { iterations, solution: null };
  }

  let currentValues = bestCandidate.variableValues;
  let steps = input.variables.map(getInitialStep);

  while (
    iterations < maxAdaptiveIterations &&
    steps.some((step) => step > 0)
  ) {
    let improved = false;

    for (let index = 0; index < input.variables.length; index += 1) {
      const variable = input.variables[index];
      const step = steps[index];

      if (!variable || step <= 0) {
        continue;
      }

      const currentValue = currentValues[index]?.value ?? getInitialValue(variable);
      const nextValues =
        variable.domain === "binary"
          ? [currentValue === 1 ? 0 : 1]
          : [currentValue + step, currentValue - step];

      for (const nextValue of nextValues) {
        const normalizedValue = normalizeValue(variable, nextValue);

        if (normalizedValue === currentValue) {
          continue;
        }

        const variableValues = currentValues.map((value, valueIndex) =>
          valueIndex === index ? { ...value, value: normalizedValue } : value,
        );
        const candidate = getCandidate({ ...input, variableValues });

        iterations += 1;

        if (candidate && isBetterCandidate(candidate, bestCandidate)) {
          bestCandidate = candidate;
          currentValues = candidate.variableValues;
          improved = true;
        }

        if (iterations >= maxAdaptiveIterations) {
          break;
        }
      }
    }

    if (!improved) {
      steps = steps.map((step, index) =>
        reduceStep(input.variables[index] ?? input.variables[0], step),
      );
    }
  }

  return {
    iterations,
    solution: bestCandidate,
  };
}
