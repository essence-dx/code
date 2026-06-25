"use client";

import { Eye, Plus, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormulaWatchRow } from "@/features/spreadsheet/formula-watch";

export function FormulaWatchPanel({
  watches,
  selectedFormulaCount,
  onAddSelectedWatches,
  onDeleteWatch,
  onSelectWatch,
}: {
  watches: FormulaWatchRow[];
  selectedFormulaCount: number;
  onAddSelectedWatches: () => void;
  onDeleteWatch: (watchId: string) => void;
  onSelectWatch: (watch: FormulaWatchRow) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Watch window</h2>
        <Badge variant="secondary" className="font-mono">
          {watches.length}
        </Badge>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mb-3 w-full justify-center gap-2"
        disabled={selectedFormulaCount === 0}
        onClick={onAddSelectedWatches}
      >
        <Plus className="size-4" />
        Watch selected formulas
      </Button>
      {watches.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          Select one or more formula cells to keep their values visible while
          editing the workbook.
        </p>
      ) : (
        <div className="space-y-2">
          {watches.map((watch) => (
            <section key={watch.id} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold">
                    {watch.sheetName}!{watch.cellKey}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {watch.isActiveSheet
                      ? "Live value"
                      : "Open sheet to refresh value"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Select ${watch.sheetName} ${watch.cellKey}`}
                    onClick={() => onSelectWatch(watch)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <ConfirmDestructiveButton
                    title="Remove this watch?"
                    description="This removes the formula from the watch window. The worksheet cell is not changed."
                    label={`Remove ${watch.sheetName} ${watch.cellKey} watch`}
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onConfirm={() => onDeleteWatch(watch.id)}
                  >
                    <Trash2 className="size-4" />
                  </ConfirmDestructiveButton>
                </div>
              </div>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Value</dt>
                  <dd className="mt-1 truncate font-mono text-sm">
                    {watch.value || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Formula</dt>
                  <dd className="mt-1 truncate font-mono">{watch.formula}</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
