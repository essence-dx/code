"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { createPrintPreflightReport } from "@/features/editor/print-preflight";
import type {
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PrintPreflightSummaryProps = {
  document: DesignDocument;
  page: DesignPage;
};

export function PrintPreflightSummary({
  document,
  page,
}: PrintPreflightSummaryProps) {
  const report = createPrintPreflightReport({ document, page });
  const tone =
    report.status === "pass"
      ? "text-emerald-700"
      : report.status === "warning"
        ? "text-amber-700"
        : "text-destructive";

  return (
    <section className="border-t border-border px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Preflight readiness
          </h3>
          <p className="text-xs text-muted-foreground">
            {report.estimatedDpi} DPI / safe margin {report.safeInset}px /
            bleed cue {report.bleedInset}px
          </p>
        </div>
        <Badge
          variant={report.status === "fail" ? "destructive" : "secondary"}
          className={cn("text-xs", tone)}
        >
          {report.score}/100
        </Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <PreflightIcon status={check.status} />
              <span className="text-xs font-medium text-foreground">
                {check.label}
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              {check.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreflightIcon({ status }: { status: "pass" | "warning" | "fail" }) {
  if (status === "pass") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }

  return <XCircle className="h-4 w-4 text-destructive" />;
}
