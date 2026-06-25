"use client";

import { Bookmark, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMultiRangeLabel,
  getNamedRangeAreas,
} from "@/features/spreadsheet/multi-range-selection";
import type { NamedRange } from "@/features/workbooks/types";

function formatRange(namedRange: NamedRange) {
  return formatMultiRangeLabel(getNamedRangeAreas(namedRange));
}

export function NamedRangesPanel({
  disabled,
  namedRanges,
  onDeleteNamedRange,
  onSelectNamedRange,
}: {
  disabled?: boolean;
  namedRanges: NamedRange[];
  onDeleteNamedRange: (rangeId: string) => void;
  onSelectNamedRange: (namedRange: NamedRange) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Named ranges</h2>
        <Badge variant="secondary" className="font-mono">
          {namedRanges.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {namedRanges.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No named ranges on this sheet.
          </p>
        ) : (
          namedRanges.map((namedRange) => (
            <section
              key={namedRange.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-w-0 flex-1 justify-start px-2"
                onClick={() => onSelectNamedRange(namedRange)}
              >
                <Bookmark />
                <span className="truncate">{namedRange.name}</span>
              </Button>
              <div className="flex shrink-0 items-center gap-2">
                {getNamedRangeAreas(namedRange).length > 1 ? (
                  <Badge variant="outline">
                    {getNamedRangeAreas(namedRange).length} areas
                  </Badge>
                ) : null}
                <span className="font-mono text-xs text-muted-foreground">
                  {formatRange(namedRange)}
                </span>
                <ConfirmDestructiveButton
                  title="Delete this named range?"
                  description="Formulas that use this name may stop resolving after it is deleted."
                  label="Delete named range"
                  disabled={disabled}
                  onConfirm={() => onDeleteNamedRange(namedRange.id)}
                >
                  <Trash2 />
                </ConfirmDestructiveButton>
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
