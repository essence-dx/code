import type {
  SolverEngine,
  SolverConstraintOperator,
  SolverObjective,
  SolverVariableDomain,
} from "@/features/spreadsheet/what-if-solver";

export type SolverVariableDraft = {
  cellKey: string;
  domain: SolverVariableDomain;
  id: string;
  lowerBound: string;
  upperBound: string;
};

export type SolverConstraintDraft = {
  cellKey: string;
  id: string;
  operator: SolverConstraintOperator;
  value: string;
};

export type SolverModelDraft = {
  constraints: SolverConstraintDraft[];
  engine: SolverEngine;
  id: string;
  name: string;
  objective: SolverObjective;
  targetCellKey: string;
  targetValue: string;
  variables: SolverVariableDraft[];
};
