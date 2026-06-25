"use client";

import type { ChangeEvent } from "react";
import { FileUp, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ExportProofBundleComparison, ExportProofBundleComparisonStatus } from "@/lib/projects/export-proof-bundle";

export function ExportProofBundleImportPanel({
  comparison,
  importedAt,
  message,
  onClear,
  onImport,
}: {
  comparison: ExportProofBundleComparison | null;
  importedAt?: string;
  message?: string;
  onClear: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <FileUp className="size-5 text-muted-foreground" />
            Imported Proof
          </span>
          {comparison ? (
            <Badge variant={comparisonBadgeVariant(comparison.status)}>
              {comparison.matchCount} match / {comparison.attentionCount} review / {comparison.mismatchCount} mismatch
            </Badge>
          ) : (
            <Badge variant="secondary">Optional</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-80" type="file" accept="application/json,.json" aria-label="Import proof bundle" onChange={onImport} />
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X className="size-4" />
            Clear imported
          </Button>
        </div>
        {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
        {importedAt ? <div className="text-xs text-muted-foreground">Latest imported proof: {formatDate(importedAt)}</div> : null}
        {comparison ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {comparison.items.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{item.label}</div>
                  <Badge variant={comparisonBadgeVariant(item.status)}>{comparisonStatusLabel(item.status)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
            {comparison.items.length > 8 ? (
              <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                <RotateCcw className="mb-2 size-4" />
                {comparison.items.length - 8} more comparison checks are available in the imported JSON and live bundle.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Import an exported proof bundle to restore reviewer handoff evidence or compare it with this local review package.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function comparisonBadgeVariant(status: ExportProofBundleComparisonStatus) {
  if (status === "mismatch") return "destructive";
  if (status === "attention") return "secondary";
  return "default";
}

function comparisonStatusLabel(status: ExportProofBundleComparisonStatus) {
  if (status === "mismatch") return "Mismatch";
  if (status === "attention") return "Review";
  return "Match";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
