"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WorkbookInspectionIssue,
  WorkbookInspectionSeverity,
} from "@/features/spreadsheet/workbook-inspection";

const severityIcons: Record<WorkbookInspectionSeverity, typeof Info> = {
  error: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

const severityLabels: Record<WorkbookInspectionSeverity, string> = {
  error: "Fix",
  warning: "Review",
  info: "Info",
};

export function WorkbookInspectionPanel({
  issues,
  onSelectIssue,
}: {
  issues: WorkbookInspectionIssue[];
  onSelectIssue: (issue: WorkbookInspectionIssue) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Inspect workbook</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No privacy or security review items found.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const Icon = severityIcons[issue.severity];
            const canSelect = Boolean(issue.sheetId && issue.range);

            return (
              <section key={issue.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Icon />
                    {severityLabels[issue.severity]}
                  </Badge>
                  {canSelect ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => onSelectIssue(issue)}
                    >
                      Select
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {issue.details}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{issue.sheetName ?? issue.category}</span>
                  {typeof issue.count === "number" ? (
                    <span className="font-mono">{issue.count}</span>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
