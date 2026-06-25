import { evaluateSolverCellsAt } from "@/features/spreadsheet/what-if-solver-evaluation";
import {
  getConstrainedSolverScore,
  getSolverConstraintPenalty,
  getSolverConstraintResults,
  scoreSolverValue,
} from "@/features/spreadsheet/what-if-solver-ranking";
import type {
  SolverCandidate,
  SolverConstraint,
  SolverInput,
  SolverVariableValue,
} from "@/features/spreadsheet/what-if-solver-types";

export function createSolverCandidate(input: {
  constraints: SolverConstraint[];
  solverInput: SolverInput;
  targetCellKey: string;
  variableValues: SolverVariableValue[];
}): SolverCandidate | null {
  const evaluation = evaluateSolverCellsAt({
    activeSheetId: input.solverInput.activeSheetId,
    document: input.solverInput.document,
    targetCellKey: input.targetCellKey,
    valueCellKeys: input.constraints.map((constraint) => constraint.cellKey),
    variableValues: input.variableValues,
  });

  if (!evaluation || evaluation.targetValue === null) {
    return null;
  }

  const constraintPenalty = getSolverConstraintPenalty(
    input.constraints,
    evaluation.cellValues,
  );
  const baseScore = scoreSolverValue(input.solverInput, evaluation.targetValue);

  return {
    achievedValue: evaluation.targetValue,
    constraintPenalty,
    constraintResults: getSolverConstraintResults({
      constraints: input.constraints,
      values: evaluation.cellValues,
    }),
    score: getConstrainedSolverScore({
      baseScore,
      constraintPenalty,
    }),
    variableValues: input.variableValues,
  };
}
