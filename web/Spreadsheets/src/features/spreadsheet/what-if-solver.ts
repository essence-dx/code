import { normalizeSolverCellReference } from "@/features/spreadsheet/what-if-solver-evaluation";
import { runAdaptiveSolver } from "@/features/spreadsheet/what-if-solver-adaptive";
import { runGridSolver } from "@/features/spreadsheet/what-if-solver-grid";
import {
  createSolverFailureResult,
  getSolverSuccessMessage,
} from "@/features/spreadsheet/what-if-solver-ranking";
import {
  getSolverSetupError,
  normalizeSolverConstraints,
  normalizeSolverVariables,
} from "@/features/spreadsheet/what-if-solver-validation";
import type {
  SolverConstraint,
  SolverEngine,
  SolverConstraintOperator,
  SolverExecutionMode,
  SolverInput,
  SolverObjective,
  SolverRequest,
  SolverResult,
  SolverVariable,
  SolverVariableDomain,
} from "@/features/spreadsheet/what-if-solver-types";

export function solveBoundedVariables(input: SolverInput): SolverResult {
  const engine = input.engine ?? "grid";
  const targetCellKey = normalizeSolverCellReference(input.targetCellKey);
  const variables = normalizeSolverVariables(input);
  const constraints = normalizeSolverConstraints(input);
  const sheet = input.document.sheets.find(
    (item) => item.id === input.activeSheetId,
  );

  if (!targetCellKey || !variables || !constraints || !sheet) {
    return createSolverFailureResult(
      input,
      "Use valid active-sheet cell references.",
    );
  }

  const setupError = getSolverSetupError({
    constraints,
    engine,
    objective: input.objective,
    sheet,
    targetCellKey,
    targetValue: input.targetValue,
    variables,
  });

  if (setupError) {
    return createSolverFailureResult(input, setupError);
  }

  const run = engine === "adaptive" ? runAdaptiveSolver : runGridSolver;
  const { iterations, solution } = run({
    constraints,
    solverInput: {
      ...input,
      engine,
    },
    targetCellKey,
    variables,
  });

  if (!solution) {
    return createSolverFailureResult(
      input,
      "Solver could not evaluate the target formula numerically.",
      iterations,
    );
  }

  if (solution.constraintPenalty > 0.000001) {
    return {
      achievedValue: solution.achievedValue,
      changingCellKey: solution.variableValues[0]?.cellKey ?? "",
      changingValue: solution.variableValues[0]?.value,
      constraintResults: solution.constraintResults,
      engine,
      iterations,
      message: "Solver could not satisfy the active constraints.",
      objective: input.objective,
      success: false,
      targetCellKey,
      variableValues: solution.variableValues,
    };
  }

  return {
    achievedValue: solution.achievedValue,
    changingCellKey: solution.variableValues[0]?.cellKey ?? "",
    changingValue: solution.variableValues[0]?.value,
    constraintResults: solution.constraintResults,
    engine,
    iterations,
    message: getSolverSuccessMessage(input, solution.achievedValue),
    objective: input.objective,
    success: true,
    targetCellKey,
    variableValues: solution.variableValues,
  };
}

export const solveBoundedSingleVariable = solveBoundedVariables;

export type {
  SolverConstraint,
  SolverEngine,
  SolverConstraintOperator,
  SolverExecutionMode,
  SolverObjective,
  SolverRequest,
  SolverResult,
  SolverVariable,
  SolverVariableDomain,
};
