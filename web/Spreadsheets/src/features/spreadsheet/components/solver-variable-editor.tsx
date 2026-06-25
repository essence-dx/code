"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSolverRowId } from "@/features/spreadsheet/components/solver-form-utils";
import type { SolverVariableDraft } from "@/features/spreadsheet/components/solver-panel-types";

function createVariableRow(): SolverVariableDraft {
  return {
    cellKey: "",
    domain: "continuous",
    id: createSolverRowId("variable"),
    lowerBound: "0",
    upperBound: "100",
  };
}

export const initialSolverVariables: SolverVariableDraft[] = [
  {
    cellKey: "",
    domain: "continuous",
    id: "variable-1",
    lowerBound: "0",
    upperBound: "100",
  },
];

export function SolverVariableEditor({
  disabled,
  maxRows = 3,
  rows,
  onChange,
}: {
  disabled?: boolean;
  maxRows?: number;
  rows: SolverVariableDraft[];
  onChange: (rows: SolverVariableDraft[]) => void;
}) {
  function updateRow(id: string, update: Partial<SolverVariableDraft>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...update } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  function updateDomain(
    id: string,
    domain: SolverVariableDraft["domain"],
  ) {
    updateRow(
      id,
      domain === "binary"
        ? {
            domain,
            lowerBound: "0",
            upperBound: "1",
          }
        : { domain },
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium">Variables</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled || rows.length >= maxRows}
          title="Add variable"
          onClick={() => onChange([...rows, createVariableRow()])}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
        >
          <Input
            value={row.cellKey}
            disabled={disabled}
            placeholder={index === 0 ? "B5" : "Cell"}
            className="h-8 px-2 font-mono text-xs"
            onChange={(event) => updateRow(row.id, { cellKey: event.target.value })}
          />
          <select
            value={row.domain}
            disabled={disabled}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            onChange={(event) =>
              updateDomain(
                row.id,
                event.target.value as SolverVariableDraft["domain"],
              )
            }
          >
            <option value="continuous">Dec</option>
            <option value="integer">Int</option>
            <option value="binary">Bin</option>
          </select>
          <Input
            value={row.lowerBound}
            disabled={disabled || row.domain === "binary"}
            inputMode="decimal"
            className="h-8 px-2 font-mono text-xs"
            onChange={(event) =>
              updateRow(row.id, { lowerBound: event.target.value })
            }
          />
          <Input
            value={row.upperBound}
            disabled={disabled || row.domain === "binary"}
            inputMode="decimal"
            className="h-8 px-2 font-mono text-xs"
            onChange={(event) =>
              updateRow(row.id, { upperBound: event.target.value })
            }
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || rows.length === 1}
            title="Remove variable"
            onClick={() => removeRow(row.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
