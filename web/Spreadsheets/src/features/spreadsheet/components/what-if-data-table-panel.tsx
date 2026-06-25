"use client";

import { CheckCircle2, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DataTableRequest,
  DataTableResult,
} from "@/features/spreadsheet/what-if-data-table";

export function WhatIfDataTablePanel({
  disabled,
  selectedKey,
  selectedRaw,
  onCreateDataTable,
}: {
  disabled?: boolean;
  selectedKey: string;
  selectedRaw: string;
  onCreateDataTable: (request: DataTableRequest) => DataTableResult;
}) {
  const [formulaCellKey, setFormulaCellKey] = useState(selectedKey);
  const [inputCellKey, setInputCellKey] = useState("");
  const [result, setResult] = useState<DataTableResult | null>(null);
  const selectedCellIsFormula = selectedRaw.trim().startsWith("=");

  useEffect(() => {
    if (selectedCellIsFormula) {
      setFormulaCellKey(selectedKey);
    }
  }, [selectedCellIsFormula, selectedKey]);

  function createDataTable() {
    setResult(
      onCreateDataTable({
        formulaCellKey,
        inputCellKey,
      }),
    );
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Data table</h2>
        <Badge variant="secondary">1 variable</Badge>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="grid gap-2">
          <label className="block text-xs font-medium">
            Formula cell
            <Input
              value={formulaCellKey}
              disabled={disabled}
              placeholder="C5"
              className="mt-1 h-8 px-2 font-mono text-xs"
              onChange={(event) => setFormulaCellKey(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium">
            Input cell
            <Input
              value={inputCellKey}
              disabled={disabled}
              placeholder="B5"
              className="mt-1 h-8 px-2 font-mono text-xs"
              onChange={(event) => setInputCellKey(event.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !selectedCellIsFormula}
            onClick={() => setFormulaCellKey(selectedKey)}
          >
            <Table2 />
            Use selected
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled || !formulaCellKey.trim() || !inputCellKey.trim()}
            onClick={createDataTable}
          >
            Create
          </Button>
        </div>
        {result ? (
          <p
            className={`rounded-md border p-2 text-xs ${
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="mr-2 inline size-3" />
            ) : null}
            {result.message}
          </p>
        ) : (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            Select candidate input values, then create a result table from one
            formula and one changing input cell.
          </p>
        )}
      </div>
    </section>
  );
}
