import { normalizeSolverCellReference } from "@/features/spreadsheet/what-if-solver-evaluation";
import type {
  SolverConstraint,
  SolverEngine,
  SolverInput,
  SolverVariable,
} from "@/features/spreadsheet/what-if-solver-types";
import type { SheetData } from "@/features/workbooks/types";

const maxGridSolverVariables = 3;
const maxGridSolverConstraints = 4;
const maxAdaptiveSolverVariables = 6;
const maxAdaptiveSolverConstraints = 8;

export function normalizeSolverVariables(input: SolverInput) {
  const variables = input.variables.map((variable) => ({
    ...variable,
    cellKey: normalizeSolverCellReference(variable.cellKey),
    domain: variable.domain ?? "continuous",
    lowerBound: variable.domain === "binary" ? 0 : variable.lowerBound,
    upperBound: variable.domain === "binary" ? 1 : variable.upperBound,
  }));

  if (variables.some((variable) => !variable.cellKey)) {
    return null;
  }

  return variables as SolverVariable[];
}

export function normalizeSolverConstraints(input: SolverInput) {
  const constraints = (input.constraints ?? []).map((constraint) => ({
    ...constraint,
    cellKey: normalizeSolverCellReference(constraint.cellKey),
  }));

  if (constraints.some((constraint) => !constraint.cellKey)) {
    return null;
  }

  return constraints as SolverConstraint[];
}

export function getSolverSetupError(input: {
  constraints: SolverConstraint[];
  engine: SolverEngine;
  objective: SolverInput["objective"];
  sheet: SheetData;
  targetCellKey: string;
  targetValue?: number;
  variables: SolverVariable[];
}) {
  const maxSolverVariables =
    input.engine === "adaptive"
      ? maxAdaptiveSolverVariables
      : maxGridSolverVariables;
  const maxSolverConstraints =
    input.engine === "adaptive"
      ? maxAdaptiveSolverConstraints
      : maxGridSolverConstraints;

  if (
    input.variables.length === 0 ||
    input.variables.length > maxSolverVariables ||
    input.constraints.length > maxSolverConstraints
  ) {
    return `Use up to ${maxSolverVariables} variables and ${maxSolverConstraints} constraints.`;
  }

  const uniqueVariableKeys = new Set(
    input.variables.map((variable) => variable.cellKey),
  );

  if (uniqueVariableKeys.size !== input.variables.length) {
    return "Variable cells must be unique.";
  }

  if (uniqueVariableKeys.has(input.targetCellKey)) {
    return "The target cell and variable cells must be different.";
  }

  if (!input.sheet.cells[input.targetCellKey]?.raw.startsWith("=")) {
    return "The target cell must contain a formula.";
  }

  if (
    input.variables.some((variable) =>
      input.sheet.cells[variable.cellKey]?.raw.startsWith("="),
    )
  ) {
    return "Variable cells must be input values.";
  }

  if (
    input.variables.some(
      (variable) =>
        !Number.isFinite(variable.lowerBound) ||
        !Number.isFinite(variable.upperBound) ||
        variable.lowerBound >= variable.upperBound,
    )
  ) {
    return "Enter valid lower and upper bounds.";
  }

  if (
    input.variables.some(
      (variable) =>
        variable.domain === "integer" &&
        Math.ceil(variable.lowerBound) > Math.floor(variable.upperBound),
    )
  ) {
    return "Integer variables need at least one integer in bounds.";
  }

  if (input.objective === "value" && !Number.isFinite(input.targetValue)) {
    return "Enter a numeric target value.";
  }

  if (input.constraints.some((constraint) => !Number.isFinite(constraint.value))) {
    return "Enter numeric constraint values.";
  }

  return null;
}
