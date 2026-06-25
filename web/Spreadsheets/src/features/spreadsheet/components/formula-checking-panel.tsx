"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  FormulaCheckingIssue,
  FormulaCheckingSeverity,
} from "@/features/spreadsheet/formula-checking";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";

const severityIcons: Record<FormulaCheckingSeverity, typeof Info> = {
  warning: AlertTriangle,
  info: Info,
};

const severityLabels: Record<FormulaCheckingSeverity, string> = {
  warning: "Review",
  info: "Info",
};

export function FormulaCheckingPanel({
  issues,
  onSelectCell,
}: {
  issues: FormulaCheckingIssue[];
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Error checking</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No formula checking issues on this sheet.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const Icon = severityIcons[issue.severity];

            return (
              <section key={issue.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Icon className="size-3" />
                    {severityLabels[issue.severity]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() =>
                      onSelectCell({
                        rowIndex: issue.rowIndex,
                        columnIndex: issue.columnIndex,
                      })
                    }
                  >
                    Select
                  </Button>
                </div>
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {issue.key} - {issue.details}
                </p>
                <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                  {issue.formula}
                </p>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
