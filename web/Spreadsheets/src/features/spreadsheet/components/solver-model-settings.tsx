"use client";

import { Input } from "@/components/ui/input";
import type {
  SolverEngine,
  SolverObjective,
} from "@/features/spreadsheet/what-if-solver";

export function SolverModelSettings({
  disabled,
  engine,
  objective,
  targetCellKey,
  targetValue,
  onEngineChange,
  onObjectiveChange,
  onTargetCellKeyChange,
  onTargetValueChange,
}: {
  disabled?: boolean;
  engine: SolverEngine;
  objective: SolverObjective;
  targetCellKey: string;
  targetValue: string;
  onEngineChange: (engine: SolverEngine) => void;
  onObjectiveChange: (objective: SolverObjective) => void;
  onTargetCellKeyChange: (cellKey: string) => void;
  onTargetValueChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="block text-xs font-medium">
        Formula cell
        <Input
          value={targetCellKey}
          disabled={disabled}
          placeholder="C5"
          className="mt-1 h-8 px-2 font-mono text-xs"
          onChange={(event) => onTargetCellKeyChange(event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium">
        Engine
        <select
          value={engine}
          disabled={disabled}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
          onChange={(event) => onEngineChange(event.target.value as SolverEngine)}
        >
          <option value="grid">Grid</option>
          <option value="adaptive">Adaptive</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Objective
        <select
          value={objective}
          disabled={disabled}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
          onChange={(event) =>
            onObjectiveChange(event.target.value as SolverObjective)
          }
        >
          <option value="max">Maximize</option>
          <option value="min">Minimize</option>
          <option value="value">Target value</option>
        </select>
      </label>
      {objective === "value" ? (
        <label className="block text-xs font-medium">
          Target value
          <Input
            value={targetValue}
            disabled={disabled}
            inputMode="decimal"
            placeholder="1000"
            className="mt-1 h-8 px-2 font-mono text-xs"
            onChange={(event) => onTargetValueChange(event.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}
