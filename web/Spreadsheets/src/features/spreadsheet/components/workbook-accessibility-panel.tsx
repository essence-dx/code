"use client";

import { BadgeAlert, Eye, Info, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WorkbookAccessibilityIssue,
  WorkbookAccessibilitySeverity,
} from "@/features/spreadsheet/workbook-accessibility";

const severityIcons: Record<WorkbookAccessibilitySeverity, typeof Info> = {
  error: BadgeAlert,
  warning: Eye,
  info: Info,
};

const categoryIcons: Record<WorkbookAccessibilityIssue["category"], typeof Info> =
  {
    Contrast: Eye,
    Readability: Info,
    Navigation: Keyboard,
    "Alternative text": BadgeAlert,
  };

export function WorkbookAccessibilityPanel({
  issues,
  onSelectIssue,
}: {
  issues: WorkbookAccessibilityIssue[];
  onSelectIssue: (issue: WorkbookAccessibilityIssue) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Accessibility checker</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No workbook accessibility review items found.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const SeverityIcon = severityIcons[issue.severity];
            const CategoryIcon = categoryIcons[issue.category];
            const canSelect = Boolean(issue.sheetId && issue.range);

            return (
              <section key={issue.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1">
                    <SeverityIcon className="size-3" />
                    {issue.severity}
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
                  <span className="inline-flex items-center gap-1">
                    <CategoryIcon className="size-3" />
                    {issue.sheetName ?? issue.category}
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
