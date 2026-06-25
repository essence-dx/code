import type { WorkbookDocument } from "@/features/workbooks/types";

export type SolverObjective = "max" | "min" | "value";

export type SolverEngine = "adaptive" | "grid";

export type SolverExecutionMode = "sync" | "worker";

export type SolverConstraintOperator = "eq" | "gte" | "lte";

export type SolverVariableDomain = "binary" | "continuous" | "integer";

export type SolverVariable = {
  cellKey: string;
  domain?: SolverVariableDomain;
  lowerBound: number;
  upperBound: number;
};

export type SolverConstraint = {
  cellKey: string;
  operator: SolverConstraintOperator;
  value: number;
};

export type SolverVariableValue = {
  cellKey: string;
  value: number;
};

export type SolverConstraintResult = SolverConstraint & {
  actualValue?: number;
  satisfied: boolean;
};

export type SolverRequest = {
  constraints?: SolverConstraint[];
  engine?: SolverEngine;
  objective: SolverObjective;
  targetCellKey: string;
  targetValue?: number;
  variables: SolverVariable[];
};

export type SolverResult = {
  achievedValue?: number;
  changingCellKey: string;
  changingValue?: number;
  constraintResults?: SolverConstraintResult[];
  engine?: SolverEngine;
  executionMode?: SolverExecutionMode;
  iterations: number;
  message: string;
  objective: SolverObjective;
  success: boolean;
  targetCellKey: string;
  variableValues?: SolverVariableValue[];
};

export type SolverInput = SolverRequest & {
  activeSheetId: string;
  document: WorkbookDocument;
};

export type SolverCandidate = {
  achievedValue: number;
  constraintPenalty: number;
  constraintResults: SolverConstraintResult[];
  score: number;
  variableValues: SolverVariableValue[];
};

export type SolverEngineRun = {
  iterations: number;
  solution: SolverCandidate | null;
};
