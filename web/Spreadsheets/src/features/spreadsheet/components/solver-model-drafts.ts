import { createSolverRowId } from "@/features/spreadsheet/components/solver-form-utils";
import type {
  SolverConstraintDraft,
  SolverModelDraft,
  SolverVariableDraft,
} from "@/features/spreadsheet/components/solver-panel-types";
import type {
  SolverEngine,
  SolverObjective,
} from "@/features/spreadsheet/what-if-solver";

const maxSavedSolverModels = 12;

export function cloneSolverVariables(
  rows: SolverVariableDraft[],
): SolverVariableDraft[] {
  return rows.map((row) => ({
    ...row,
    id: createSolverRowId("variable"),
  }));
}

export function cloneSolverConstraints(
  rows: SolverConstraintDraft[],
): SolverConstraintDraft[] {
  return rows.map((row) => ({
    ...row,
    id: createSolverRowId("constraint"),
  }));
}

export function createSolverModelDraft({
  constraints,
  engine,
  name,
  objective,
  targetCellKey,
  targetValue,
  variables,
}: {
  constraints: SolverConstraintDraft[];
  engine: SolverEngine;
  name: string;
  objective: SolverObjective;
  targetCellKey: string;
  targetValue: string;
  variables: SolverVariableDraft[];
}): SolverModelDraft {
  return {
    constraints: cloneSolverConstraints(constraints),
    engine,
    id: createSolverRowId("solver-model"),
    name,
    objective,
    targetCellKey,
    targetValue,
    variables: cloneSolverVariables(variables),
  };
}

export function upsertSolverModel(
  models: SolverModelDraft[],
  model: SolverModelDraft,
) {
  const modelName = model.name.trim().toLowerCase();
  const retainedModels = models.filter(
    (savedModel) =>
      savedModel.id !== model.id &&
      savedModel.name.trim().toLowerCase() !== modelName,
  );

  return [model, ...retainedModels].slice(0, maxSavedSolverModels);
}
