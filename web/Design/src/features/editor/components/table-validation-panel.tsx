"use client";

import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type {
  TableSheetValidationReport,
  TableSheetValidationStatus,
} from "@/features/editor/table-validation";

type TableValidationPanelProps = {
  report: TableSheetValidationReport;
};

export function TableValidationPanel({ report }: TableValidationPanelProps) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <Label>Sheet validation</Label>
        </div>
        <Badge variant={getValidationVariant(report.status)}>
          {report.score}/100
        </Badge>
      </div>
      <div className="space-y-2">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-md border border-border bg-background p-2"
          >
            <div className="flex items-start gap-2">
              {check.status === "ready" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
              )}
              <div>
                <p className="text-xs font-medium">{check.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getValidationVariant(status: TableSheetValidationStatus) {
  if (status === "ready") return "secondary" as const;
  if (status === "blocked") return "destructive" as const;

  return "outline" as const;
}
