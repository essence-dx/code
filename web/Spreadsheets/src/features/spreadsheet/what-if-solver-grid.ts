import { createSolverCandidate } from "@/features/spreadsheet/what-if-solver-candidate";
import { getBestSolverCandidate } from "@/features/spreadsheet/what-if-solver-ranking";
import {
  getNextSolverBounds,
  getSolverGridValues,
  getSolverSearchPointCount,
  solverRefinementPasses,
} from "@/features/spreadsheet/what-if-solver-search";
import type {
  SolverCandidate,
  SolverConstraint,
  SolverEngineRun,
  SolverInput,
  SolverVariable,
} from "@/features/spreadsheet/what-if-solver-types";

export function runGridSolver(input: {
  constraints: SolverConstraint[];
  solverInput: SolverInput;
  targetCellKey: string;
  variables: SolverVariable[];
}): SolverEngineRun {
  const candidates: SolverCandidate[] = [];
  const pointCount = getSolverSearchPointCount(input.variables.length);
  let currentVariables = input.variables;
  let iterations = 0;

  for (let pass = 0; pass <= solverRefinementPasses; pass += 1) {
    const valueRows = getSolverGridValues({
      pointCount,
      variables: currentVariables,
    });

    for (const variableValues of valueRows) {
      const candidate = createSolverCandidate({
        constraints: input.constraints,
        solverInput: input.solverInput,
        targetCellKey: input.targetCellKey,
        variableValues,
      });

      iterations += 1;

      if (candidate) {
        candidates.push(candidate);
      }
    }

    const bestCandidate = getBestSolverCandidate(candidates);

    if (!bestCandidate) {
      continue;
    }

    currentVariables = getNextSolverBounds({
      bestCandidate,
      currentVariables,
      originalVariables: input.variables,
      pointCount,
    });
  }

  return {
    iterations,
    solution: getBestSolverCandidate(candidates),
  };
}
