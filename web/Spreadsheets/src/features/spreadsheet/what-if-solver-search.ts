import type {
  SolverCandidate,
  SolverVariable,
  SolverVariableValue,
} from "@/features/spreadsheet/what-if-solver-types";

const oneVariableSearchPoints = 81;
const twoVariableSearchPoints = 17;
const multiVariableSearchPoints = 9;

export const solverRefinementPasses = 5;

function getUniqueSortedValues(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function getIntegerGridValues(variable: SolverVariable, pointCount: number) {
  const lowerBound = Math.ceil(variable.lowerBound);
  const upperBound = Math.floor(variable.upperBound);
  const integerCount = upperBound - lowerBound + 1;

  if (integerCount <= pointCount) {
    return Array.from(
      { length: integerCount },
      (_, index) => lowerBound + index,
    );
  }

  const step = (upperBound - lowerBound) / (pointCount - 1);

  return getUniqueSortedValues(
    Array.from({ length: pointCount }, (_, index) =>
      Math.round(lowerBound + step * index),
    ),
  );
}

function getVariableGridValues(variable: SolverVariable, pointCount: number) {
  if (variable.domain === "binary") {
    return [0, 1];
  }

  if (variable.domain === "integer") {
    return getIntegerGridValues(variable, pointCount);
  }

  const step = (variable.upperBound - variable.lowerBound) / (pointCount - 1);

  return Array.from(
    { length: pointCount },
    (_, index) => variable.lowerBound + step * index,
  );
}

export function getSolverSearchPointCount(variableCount: number) {
  if (variableCount === 1) {
    return oneVariableSearchPoints;
  }

  if (variableCount === 2) {
    return twoVariableSearchPoints;
  }

  return multiVariableSearchPoints;
}

export function getSolverGridValues(input: {
  pointCount: number;
  variables: SolverVariable[];
}) {
  const rows: SolverVariableValue[][] = [];

  function visit(variableIndex: number, values: SolverVariableValue[]) {
    const variable = input.variables[variableIndex];

    if (!variable) {
      rows.push(values);
      return;
    }

    for (const value of getVariableGridValues(variable, input.pointCount)) {
      visit(variableIndex + 1, [
        ...values,
        {
          cellKey: variable.cellKey,
          value,
        },
      ]);
    }
  }

  visit(0, []);

  return rows;
}

export function getNextSolverBounds(input: {
  bestCandidate: SolverCandidate;
  currentVariables: SolverVariable[];
  originalVariables: SolverVariable[];
  pointCount: number;
}) {
  return input.currentVariables.map((variable, index) => {
    if (variable.domain === "binary") {
      return {
        ...variable,
        lowerBound: 0,
        upperBound: 1,
      };
    }

    const originalVariable = input.originalVariables[index] ?? variable;
    const bestValue =
      input.bestCandidate.variableValues[index]?.value ?? variable.lowerBound;
    const step =
      (variable.upperBound - variable.lowerBound) / (input.pointCount - 1);
    const nextSpan = Math.max(step * 2, Math.abs(bestValue) * 0.001);

    return {
      ...variable,
      lowerBound:
        variable.domain === "integer"
          ? Math.ceil(Math.max(originalVariable.lowerBound, bestValue - nextSpan))
          : Math.max(originalVariable.lowerBound, bestValue - nextSpan),
      upperBound:
        variable.domain === "integer"
          ? Math.floor(Math.min(originalVariable.upperBound, bestValue + nextSpan))
          : Math.min(originalVariable.upperBound, bestValue + nextSpan),
    };
  });
}
