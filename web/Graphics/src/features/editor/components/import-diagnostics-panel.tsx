"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getImportReportSummary,
  type ImportDiagnosticReport,
} from "@/features/editor/importers/import-diagnostics";

type ImportDiagnosticsPanelProps = {
  report: ImportDiagnosticReport;
  onDismiss: () => void;
};

export function ImportDiagnosticsPanel({
  report,
  onDismiss,
}: ImportDiagnosticsPanelProps) {
  return (
    <section className="absolute right-3 top-14 z-40 w-[min(440px,calc(100vw-1.5rem))] rounded-md border border-destructive/30 bg-popover p-3 text-sm shadow-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{getImportReportSummary(report)}</div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {report.issues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
          {report.hints.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs">
              {report.hints.map((hint) => (
                <div key={hint}>{hint}</div>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss import diagnostics"
        >
          <X className="size-4" />
        </Button>
      </div>
    </section>
  );
}
