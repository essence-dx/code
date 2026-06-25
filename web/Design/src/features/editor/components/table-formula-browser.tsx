"use client";

import { FunctionSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { tableFormulaFunctionCatalog } from "@/features/editor/table-formulas";

type TableFormulaBrowserProps = {
  onInsertFormula: (formula: string) => void;
};

export function TableFormulaBrowser({
  onInsertFormula,
}: TableFormulaBrowserProps) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <FunctionSquare className="h-4 w-4 text-muted-foreground" />
        <Label>Formula browser</Label>
      </div>
      <div className="space-y-2">
        {tableFormulaFunctionCatalog.map((formula) => (
          <div
            key={formula.name}
            className="rounded-md border border-border bg-background p-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold">
                  {formula.syntax}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formula.description}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onInsertFormula(formula.example)}
              >
                Insert
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
