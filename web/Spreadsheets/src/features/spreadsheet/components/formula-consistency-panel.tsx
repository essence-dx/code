"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormulaConsistencyIssue } from "@/features/spreadsheet/formula-consistency";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";

export function FormulaConsistencyPanel({
  issues,
  onSelectCell,
}: {
  issues: FormulaConsistencyIssue[];
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Formula consistency</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No inconsistent neighboring formulas on this sheet.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Button
              key={`${issue.key}-${issue.direction}`}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start px-3 py-2 text-left"
              onClick={() =>
                onSelectCell({
                  rowIndex: issue.rowIndex,
                  columnIndex: issue.columnIndex,
                })
              }
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-sm">
                  {issue.key} {issue.formula}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {issue.message}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  Expected like {issue.expectedFormula}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
