"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataValidationIssue } from "@/features/spreadsheet/data-validation";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";

const validationTypeLabels: Record<DataValidationIssue["type"], string> = {
  list: "list",
  numberGreaterThan: "number >",
  numberLessThan: "number <",
  dateAfter: "date after",
  dateBefore: "date before",
  textContains: "text contains",
  notEmpty: "not empty",
  customFormula: "custom formula",
};

export function DataValidationIssuesPanel({
  issues,
  onSelectCell,
}: {
  issues: DataValidationIssue[];
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Invalid data</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No invalid cells on this sheet.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Button
              key={issue.key}
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
                  {issue.key}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {validationTypeLabels[issue.type]} - {issue.errorStyle} -{" "}
                  {issue.message}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
