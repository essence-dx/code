"use client";

import { AlertTriangle, FileSpreadsheet, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WorkbookCompatibilityIssue,
  WorkbookCompatibilitySeverity,
} from "@/features/spreadsheet/workbook-compatibility";

const severityIcons: Record<WorkbookCompatibilitySeverity, typeof Info> = {
  warning: AlertTriangle,
  info: Info,
};

const severityLabels: Record<WorkbookCompatibilitySeverity, string> = {
  warning: "Review",
  info: "Info",
};

export function WorkbookCompatibilityPanel({
  issues,
  onSelectIssue,
}: {
  issues: WorkbookCompatibilityIssue[];
  onSelectIssue: (issue: WorkbookCompatibilityIssue) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Compatibility inspector</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No obvious import or export compatibility issues found.
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
                    <Icon className="size-3" />
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {issue.formats.map((format) => (
                    <Badge key={`${issue.id}-${format}`} variant="secondary">
                      {format}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <FileSpreadsheet className="size-3" />
                    <span className="truncate">
                      {issue.sheetName ?? issue.category}
                    </span>
                  </span>
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
