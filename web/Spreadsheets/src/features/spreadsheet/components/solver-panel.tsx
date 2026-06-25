"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SolverConstraintEditor } from "@/features/spreadsheet/components/solver-constraint-editor";
import { parseSolverFormNumber } from "@/features/spreadsheet/components/solver-form-utils";
import {
  cloneSolverConstraints,
  cloneSolverVariables,
  createSolverModelDraft,
  upsertSolverModel,
} from "@/features/spreadsheet/components/solver-model-drafts";
import { SolverModelManager } from "@/features/spreadsheet/components/solver-model-manager";
import { SolverModelSettings } from "@/features/spreadsheet/components/solver-model-settings";
import {
  readSavedSolverModels,
  writeSavedSolverModels,
} from "@/features/spreadsheet/components/solver-model-storage";
import type {
  SolverConstraintDraft,
  SolverModelDraft,
} from "@/features/spreadsheet/components/solver-panel-types";
import { SolverResultCard } from "@/features/spreadsheet/components/solver-result-card";
import {
  initialSolverVariables,
  SolverVariableEditor,
} from "@/features/spreadsheet/components/solver-variable-editor";
import type {
  SolverEngine,
  SolverObjective,
  SolverRequest,
  SolverResult,
} from "@/features/spreadsheet/what-if-solver";

const solverEngineLimits: Record<
  SolverEngine,
  { constraints: number; variables: number }
> = {
  adaptive: { constraints: 8, variables: 6 },
  grid: { constraints: 4, variables: 3 },
};

export function SolverPanel({
  disabled,
  selectedKey,
  selectedRaw,
  onRunSolver,
}: {
  disabled?: boolean;
  selectedKey: string;
  selectedRaw: string;
  onRunSolver: (request: SolverRequest) => Promise<SolverResult>;
}) {
  const [targetCellKey, setTargetCellKey] = useState(selectedKey);
  const [variables, setVariables] = useState(initialSolverVariables);
  const [constraints, setConstraints] = useState<SolverConstraintDraft[]>([]);
  const [engine, setEngine] = useState<SolverEngine>("grid");
  const [objective, setObjective] = useState<SolverObjective>("max");
  const [targetValue, setTargetValue] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [savedModels, setSavedModels] = useState<SolverModelDraft[]>([]);
  const [savedModelsLoaded, setSavedModelsLoaded] = useState(false);
  const selectedCellIsFormula = selectedRaw.trim().startsWith("=");
  const hasVariables = variables.some((row) => row.cellKey.trim());
  const engineLimits = solverEngineLimits[engine];

  useEffect(() => {
    if (selectedCellIsFormula) {
      setTargetCellKey(selectedKey);
    }
  }, [selectedCellIsFormula, selectedKey]);

  useEffect(() => {
    setSavedModels(readSavedSolverModels());
    setSavedModelsLoaded(true);
  }, []);

  useEffect(() => {
    if (savedModelsLoaded) {
      writeSavedSolverModels(savedModels);
    }
  }, [savedModels, savedModelsLoaded]);

  function saveSolverModel(name: string) {
    const model = createSolverModelDraft({
      constraints,
      engine,
      name: name.trim(),
      objective,
      targetCellKey,
      targetValue,
      variables,
    });

    setSavedModels((currentModels) => upsertSolverModel(currentModels, model));
  }

  function loadSolverModel(modelId: string) {
    const model = savedModels.find((savedModel) => savedModel.id === modelId);

    if (!model) {
      return;
    }

    setTargetCellKey(model.targetCellKey);
    setEngine(model.engine);
    setObjective(model.objective);
    setTargetValue(model.targetValue);
    setVariables(
      model.variables.length > 0
        ? cloneSolverVariables(model.variables)
        : cloneSolverVariables(initialSolverVariables),
    );
    setConstraints(cloneSolverConstraints(model.constraints));
    setResult(null);
  }

  function deleteSolverModel(modelId: string) {
    setSavedModels((currentModels) =>
      currentModels.filter((model) => model.id !== modelId),
    );
  }

  async function runSolver() {
    const numericTargetValue = parseSolverFormNumber(targetValue);
    const parsedVariables = variables
      .filter((row) => row.cellKey.trim())
      .map((row) => ({
        cellKey: row.cellKey,
        domain: row.domain,
        lowerBound: parseSolverFormNumber(row.lowerBound),
        upperBound: parseSolverFormNumber(row.upperBound),
      }));
    const parsedConstraints = constraints
      .filter((row) => row.cellKey.trim() || row.value.trim())
      .map((row) => ({
        cellKey: row.cellKey,
        operator: row.operator,
        value: parseSolverFormNumber(row.value),
      }));

    if (
      parsedVariables.length === 0 ||
      parsedVariables.some(
        (row) => row.lowerBound === null || row.upperBound === null,
      ) ||
      parsedConstraints.some((row) => !row.cellKey.trim() || row.value === null) ||
      (objective === "value" && numericTargetValue === null)
    ) {
      setResult({
        changingCellKey: parsedVariables[0]?.cellKey ?? "",
        iterations: 0,
        message: "Enter numeric Solver inputs.",
        objective,
        success: false,
        targetCellKey,
      });
      return;
    }

    setIsSolving(true);
    setResult(null);

    const solverResult = await onRunSolver({
      constraints: parsedConstraints.map((row) => ({
        cellKey: row.cellKey,
        operator: row.operator,
        value: row.value ?? 0,
      })),
      engine,
      objective,
      targetCellKey,
      targetValue: numericTargetValue ?? undefined,
      variables: parsedVariables.map((row) => ({
        cellKey: row.cellKey,
        domain: row.domain,
        lowerBound: row.lowerBound ?? 0,
        upperBound: row.upperBound ?? 0,
      })),
    });

    setResult(solverResult);
    setIsSolving(false);
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Solver</h2>
        <Badge variant="secondary">Constrained</Badge>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <SolverModelSettings
          disabled={disabled}
          engine={engine}
          objective={objective}
          targetCellKey={targetCellKey}
          targetValue={targetValue}
          onEngineChange={setEngine}
          onObjectiveChange={setObjective}
          onTargetCellKeyChange={setTargetCellKey}
          onTargetValueChange={setTargetValue}
        />
        <SolverModelManager
          disabled={disabled}
          models={savedModels}
          onDeleteModel={deleteSolverModel}
          onLoadModel={loadSolverModel}
          onSaveModel={saveSolverModel}
        />
        <SolverVariableEditor
          disabled={disabled}
          maxRows={engineLimits.variables}
          rows={variables}
          onChange={setVariables}
        />
        <SolverConstraintEditor
          disabled={disabled}
          maxRows={engineLimits.constraints}
          rows={constraints}
          onChange={setConstraints}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isSolving || !selectedCellIsFormula}
            onClick={() => setTargetCellKey(selectedKey)}
          >
            <SlidersHorizontal />
            Use selected
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              disabled ||
              isSolving ||
              !targetCellKey.trim() ||
              !hasVariables ||
              (objective === "value" && !targetValue.trim())
            }
            onClick={runSolver}
          >
            {isSolving ? "Solving" : "Solve"}
          </Button>
        </div>
        {result ? (
          <SolverResultCard result={result} />
        ) : (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {isSolving ? "Solver is running." : "No Solver result yet."}
          </p>
        )}
      </div>
    </section>
  );
}
