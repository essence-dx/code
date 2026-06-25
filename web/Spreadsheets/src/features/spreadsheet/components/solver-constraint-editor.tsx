"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSolverRowId } from "@/features/spreadsheet/components/solver-form-utils";
import type { SolverConstraintDraft } from "@/features/spreadsheet/components/solver-panel-types";
import type { SolverConstraintOperator } from "@/features/spreadsheet/what-if-solver";

function createConstraintRow(): SolverConstraintDraft {
  return {
    cellKey: "",
    id: createSolverRowId("constraint"),
    operator: "lte",
    value: "",
  };
}

export function SolverConstraintEditor({
  disabled,
  maxRows = 4,
  rows,
  onChange,
}: {
  disabled?: boolean;
  maxRows?: number;
  rows: SolverConstraintDraft[];
  onChange: (rows: SolverConstraintDraft[]) => void;
}) {
  function updateRow(id: string, update: Partial<SolverConstraintDraft>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...update } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium">Constraints</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled || rows.length >= maxRows}
          title="Add constraint"
          onClick={() => onChange([...rows, createConstraintRow()])}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No constraints.</p>
      ) : null}
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_68px_1fr_auto] gap-2">
          <Input
            value={row.cellKey}
            disabled={disabled}
            placeholder="D5"
            className="h-8 px-2 font-mono text-xs"
            onChange={(event) => updateRow(row.id, { cellKey: event.target.value })}
          />
          <select
            value={row.operator}
            disabled={disabled}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            onChange={(event) =>
              updateRow(row.id, {
                operator: event.target.value as SolverConstraintOperator,
              })
            }
          >
            <option value="lte">&lt;=</option>
            <option value="gte">&gt;=</option>
            <option value="eq">=</option>
          </select>
          <Input
            value={row.value}
            disabled={disabled}
            inputMode="decimal"
            placeholder="100"
            className="h-8 px-2 font-mono text-xs"
            onChange={(event) => updateRow(row.id, { value: event.target.value })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            title="Remove constraint"
            onClick={() => removeRow(row.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
