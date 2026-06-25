import { createSolverRowId } from "@/features/spreadsheet/components/solver-form-utils";
import type {
  SolverConstraintDraft,
  SolverModelDraft,
  SolverVariableDraft,
} from "@/features/spreadsheet/components/solver-panel-types";
import type {
  SolverConstraintOperator,
  SolverEngine,
  SolverObjective,
  SolverVariableDomain,
} from "@/features/spreadsheet/what-if-solver";

const solverModelStorageKey = "essence-excel:solver-models";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asEngine(value: unknown): SolverEngine {
  return value === "adaptive" ? "adaptive" : "grid";
}

function asObjective(value: unknown): SolverObjective {
  return value === "min" || value === "value" ? value : "max";
}

function asDomain(value: unknown): SolverVariableDomain {
  if (value === "integer" || value === "binary") {
    return value;
  }

  return "continuous";
}

function asOperator(value: unknown): SolverConstraintOperator {
  if (value === "gte" || value === "eq") {
    return value;
  }

  return "lte";
}

function parseVariableDraft(value: unknown): SolverVariableDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    cellKey: asString(value.cellKey),
    domain: asDomain(value.domain),
    id: asString(value.id) || createSolverRowId("variable"),
    lowerBound: asString(value.lowerBound),
    upperBound: asString(value.upperBound),
  };
}

function parseConstraintDraft(value: unknown): SolverConstraintDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    cellKey: asString(value.cellKey),
    id: asString(value.id) || createSolverRowId("constraint"),
    operator: asOperator(value.operator),
    value: asString(value.value),
  };
}

function parseModelDraft(value: unknown): SolverModelDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = asString(value.name).trim();

  if (!name) {
    return null;
  }

  return {
    constraints: Array.isArray(value.constraints)
      ? value.constraints.flatMap((row) => {
          const parsedRow = parseConstraintDraft(row);
          return parsedRow ? [parsedRow] : [];
        })
      : [],
    engine: asEngine(value.engine),
    id: asString(value.id) || createSolverRowId("solver-model"),
    name,
    objective: asObjective(value.objective),
    targetCellKey: asString(value.targetCellKey),
    targetValue: asString(value.targetValue),
    variables: Array.isArray(value.variables)
      ? value.variables.flatMap((row) => {
          const parsedRow = parseVariableDraft(row);
          return parsedRow ? [parsedRow] : [];
        })
      : [],
  };
}

export function readSavedSolverModels(): SolverModelDraft[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawModels = window.localStorage.getItem(solverModelStorageKey);
    const parsedModels: unknown = rawModels ? JSON.parse(rawModels) : [];

    return Array.isArray(parsedModels)
      ? parsedModels.flatMap((model) => {
          const parsedModel = parseModelDraft(model);
          return parsedModel ? [parsedModel] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function writeSavedSolverModels(models: SolverModelDraft[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(solverModelStorageKey, JSON.stringify(models));
  } catch {
    return;
  }
}
