"use client";

import { Calculator, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  GoalSeekRequest,
  GoalSeekResult,
} from "@/features/spreadsheet/what-if-goal-seek";

function formatNumber(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toPrecision(8);
}

function parseTargetValue(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "").replace(/%$/, "");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function WhatIfAnalysisPanel({
  disabled,
  selectedKey,
  selectedRaw,
  onRunGoalSeek,
}: {
  disabled?: boolean;
  selectedKey: string;
  selectedRaw: string;
  onRunGoalSeek: (request: GoalSeekRequest) => GoalSeekResult;
}) {
  const [targetCellKey, setTargetCellKey] = useState(selectedKey);
  const [changingCellKey, setChangingCellKey] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [result, setResult] = useState<GoalSeekResult | null>(null);
  const selectedCellIsFormula = selectedRaw.trim().startsWith("=");

  useEffect(() => {
    if (selectedCellIsFormula) {
      setTargetCellKey(selectedKey);
    }
  }, [selectedCellIsFormula, selectedKey]);

  function runGoalSeek() {
    const numericTargetValue = parseTargetValue(targetValue);

    if (numericTargetValue === null) {
      setResult({
        changingCellKey,
        iterations: 0,
        message: "Enter a numeric target value.",
        success: false,
        targetCellKey,
        targetValue: 0,
      });
      return;
    }

    setResult(
      onRunGoalSeek({
        changingCellKey,
        targetCellKey,
        targetValue: numericTargetValue,
      }),
    );
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">What-if analysis</h2>
        <Badge variant="secondary">Goal Seek</Badge>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="grid gap-2">
          <label className="block text-xs font-medium">
            Formula cell
            <Input
              value={targetCellKey}
              disabled={disabled}
              placeholder="C5"
              className="mt-1 h-8 px-2 font-mono text-xs"
              onChange={(event) => setTargetCellKey(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium">
            Target value
            <Input
              value={targetValue}
              disabled={disabled}
              inputMode="decimal"
              placeholder="1000"
              className="mt-1 h-8 px-2 font-mono text-xs"
              onChange={(event) => setTargetValue(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium">
            Changing cell
            <Input
              value={changingCellKey}
              disabled={disabled}
              placeholder="B5"
              className="mt-1 h-8 px-2 font-mono text-xs"
              onChange={(event) => setChangingCellKey(event.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !selectedCellIsFormula}
            onClick={() => setTargetCellKey(selectedKey)}
          >
            <Calculator />
            Use selected
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              disabled ||
              !targetCellKey.trim() ||
              !changingCellKey.trim() ||
              !targetValue.trim()
            }
            onClick={runGoalSeek}
          >
            Run
          </Button>
        </div>
        {result ? (
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
              <div>
                <dt>Changing value</dt>
                <dd className="font-mono text-foreground">
                  {formatNumber(result.changingValue)}
                </dd>
              </div>
              <div>
                <dt>Achieved value</dt>
                <dd className="font-mono text-foreground">
                  {formatNumber(result.achievedValue)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            Select a formula cell, enter a numeric target, and choose one input
            cell to change.
          </p>
        )}
      </div>
    </section>
  );
}
