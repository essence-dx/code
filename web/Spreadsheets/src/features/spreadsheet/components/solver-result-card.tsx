"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { SolverResult } from "@/features/spreadsheet/what-if-solver";

function formatNumber(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toPrecision(8);
}

function getConstraintOperatorLabel(operator: string) {
  if (operator === "lte") {
    return "<=";
  }

  if (operator === "gte") {
    return ">=";
  }

  return "=";
}

export function SolverResultCard({ result }: { result: SolverResult }) {
  const variableValues = result.variableValues?.length
    ? result.variableValues
    : [
        {
          cellKey: result.changingCellKey,
          value: result.changingValue,
        },
      ];

  return (
    <div
      className={`rounded-md border p-2 text-xs ${
        result.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-destructive/30 bg-destructive/5 text-destructive"
      }`}
    >
      <p className="flex items-center gap-2 font-medium">
        {result.success ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <XCircle className="size-3" />
        )}
        {result.message}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
        {result.engine ? (
          <div>
            <dt>Engine</dt>
            <dd className="font-mono text-foreground">{result.engine}</dd>
          </div>
        ) : null}
        {result.executionMode ? (
          <div>
            <dt>Runtime</dt>
            <dd className="font-mono text-foreground">{result.executionMode}</dd>
          </div>
        ) : null}
        {variableValues.map((variable) => (
          <div key={variable.cellKey}>
            <dt>{variable.cellKey || "Variable"}</dt>
            <dd className="font-mono text-foreground">
              {formatNumber(variable.value)}
            </dd>
          </div>
        ))}
        <div>
          <dt>Formula value</dt>
          <dd className="font-mono text-foreground">
            {formatNumber(result.achievedValue)}
          </dd>
        </div>
      </dl>
      {result.constraintResults?.length ? (
        <div className="mt-2 grid gap-1 text-muted-foreground">
          {result.constraintResults.map((constraint) => (
            <p
              key={`${constraint.cellKey}-${constraint.operator}-${constraint.value}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="font-mono">
                {constraint.cellKey} {getConstraintOperatorLabel(constraint.operator)}{" "}
                {formatNumber(constraint.value)}
              </span>
              <span className={constraint.satisfied ? "text-emerald-700" : ""}>
                {formatNumber(constraint.actualValue)}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
