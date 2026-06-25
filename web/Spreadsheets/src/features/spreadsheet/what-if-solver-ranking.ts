import { normalizeSolverCellReference } from "@/features/spreadsheet/what-if-solver-evaluation";
import type {
  SolverCandidate,
  SolverConstraint,
  SolverConstraintResult,
  SolverInput,
  SolverResult,
} from "@/features/spreadsheet/what-if-solver-types";

const targetTolerance = 0.000001;
const infeasiblePenalty = 1_000_000_000;

export function createSolverFailureResult(
  input: SolverInput,
  message: string,
  iterations = 0,
): SolverResult {
  return {
    changingCellKey:
      normalizeSolverCellReference(input.variables[0]?.cellKey ?? "") ??
      input.variables[0]?.cellKey ??
      "",
    iterations,
    message,
    objective: input.objective,
    success: false,
    targetCellKey:
      normalizeSolverCellReference(input.targetCellKey) ?? input.targetCellKey,
  };
}

export function scoreSolverValue(input: SolverInput, achievedValue: number) {
  if (input.objective === "max") {
    return -achievedValue;
  }

  if (input.objective === "min") {
    return achievedValue;
  }

  return Math.abs(achievedValue - (input.targetValue ?? 0));
}

function getConstraintDelta(
  constraint: SolverConstraint,
  actualValue: number | null,
) {
  if (actualValue === null) {
    return Number.POSITIVE_INFINITY;
  }

  if (constraint.operator === "lte") {
    return Math.max(0, actualValue - constraint.value);
  }

  if (constraint.operator === "gte") {
    return Math.max(0, constraint.value - actualValue);
  }

  return Math.abs(actualValue - constraint.value);
}

export function getSolverConstraintResults(input: {
  constraints: SolverConstraint[];
  values: Map<string, number | null>;
}) {
  return input.constraints.map<SolverConstraintResult>((constraint) => {
    const actualValue = input.values.get(constraint.cellKey) ?? null;
    const delta = getConstraintDelta(constraint, actualValue);

    return {
      ...constraint,
      actualValue: actualValue ?? undefined,
      satisfied: delta <= targetTolerance,
    };
  });
}

export function getSolverConstraintPenalty(
  constraints: SolverConstraint[],
  values: Map<string, number | null>,
) {
  return constraints.reduce((total, constraint) => {
    const actualValue = values.get(constraint.cellKey) ?? null;
    const delta = getConstraintDelta(constraint, actualValue);
    const scale = Math.max(1, Math.abs(constraint.value));

    return total + delta / scale;
  }, 0);
}

export function getConstrainedSolverScore(input: {
  baseScore: number;
  constraintPenalty: number;
}) {
  if (input.constraintPenalty <= targetTolerance) {
    return input.baseScore;
  }

  return infeasiblePenalty + input.constraintPenalty;
}

export function getSolverSuccessMessage(
  input: SolverInput,
  achievedValue: number,
) {
  const hasConstraints = (input.constraints ?? []).length > 0;

  if (hasConstraints) {
    return "Solver found a bounded solution that satisfies the constraints.";
  }

  if (input.objective === "max") {
    return "Solver found the best bounded maximum from the search range.";
  }

  if (input.objective === "min") {
    return "Solver found the best bounded minimum from the search range.";
  }

  const delta = Math.abs(achievedValue - (input.targetValue ?? 0));

  return delta <= targetTolerance
    ? "Solver matched the bounded target value."
    : "Solver found the closest bounded value to the target.";
}

export function getBestSolverCandidate(candidates: SolverCandidate[]) {
  return candidates.reduce<SolverCandidate | null>((bestCandidate, candidate) => {
    if (!bestCandidate || candidate.score < bestCandidate.score) {
      return candidate;
    }

    return bestCandidate;
  }, null);
}
