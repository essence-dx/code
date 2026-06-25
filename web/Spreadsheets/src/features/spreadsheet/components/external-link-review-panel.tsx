"use client";

import { AlertTriangle, CheckCircle2, Trash2, Wrench } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExternalLinkIssue } from "@/features/spreadsheet/external-link-review";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";

export function ExternalLinkReviewPanel({
  disabled,
  issues,
  onDeleteLink,
  onRepairLink,
  onSelectCell,
}: {
  disabled?: boolean;
  issues: ExternalLinkIssue[];
  onDeleteLink: (linkId: string) => void;
  onRepairLink: (linkId: string, url: string) => void;
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">External link review</h2>
        <Badge variant="secondary" className="font-mono">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No broken or risky links on this sheet.
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const canSelect =
              issue.rowIndex !== null && issue.columnIndex !== null;

            return (
              <section key={issue.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono"
                    disabled={!canSelect}
                    onClick={() => {
                      if (canSelect) {
                        onSelectCell({
                          rowIndex: issue.rowIndex!,
                          columnIndex: issue.columnIndex!,
                        });
                      }
                    }}
                  >
                    {issue.severity === "error" ? (
                      <AlertTriangle />
                    ) : (
                      <CheckCircle2 />
                    )}
                    {issue.cellKey}
                  </Button>
                  <div className="flex items-center gap-1">
                    {issue.repairUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled}
                        onClick={() =>
                          onRepairLink(issue.linkId, issue.repairUrl!)
                        }
                      >
                        <Wrench />
                        <span className="sr-only">Repair link</span>
                      </Button>
                    ) : null}
                    <ConfirmDestructiveButton
                      title="Delete this link?"
                      description="This removes the risky hyperlink metadata from the cell. The cell value is kept."
                      label="Delete link"
                      disabled={disabled}
                      onConfirm={() => onDeleteLink(issue.linkId)}
                    >
                      <Trash2 />
                    </ConfirmDestructiveButton>
                  </div>
                </div>
                <p className="truncate text-sm font-medium">
                  {issue.label || issue.url}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {issue.message}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {issue.repairUrl ?? issue.url}
                </p>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
