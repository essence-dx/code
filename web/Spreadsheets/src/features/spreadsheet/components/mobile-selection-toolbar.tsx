"use client";

import { ArrowDown, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTouchSelectionLabel } from "@/features/spreadsheet/touch-selection";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import { cn } from "@/lib/utils";

type MobileSelectionToolbarProps = {
  selectedRange: CellRange;
  canEditSelection: boolean;
  isEditing: boolean;
  onClearSelection: () => void;
  onEditSelection: () => void;
  onFillDown: () => void;
  onFillRight: () => void;
};

export function MobileSelectionToolbar({
  selectedRange,
  canEditSelection,
  isEditing,
  onClearSelection,
  onEditSelection,
  onFillDown,
  onFillRight,
}: MobileSelectionToolbarProps) {
  const disabled = !canEditSelection;

  return (
    <div
      className={cn(
        "pointer-events-none sticky bottom-2 z-50 hidden justify-center px-2",
        "[@media(pointer:coarse)]:flex",
      )}
    >
      <div className="pointer-events-auto flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-lg border bg-popover/95 p-1 shadow-lg backdrop-blur">
        <span className="min-w-12 px-2 font-mono text-xs text-muted-foreground">
          {formatTouchSelectionLabel(selectedRange)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || isEditing}
          aria-label="Edit selected cell"
          title="Edit"
          onClick={onEditSelection}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Fill selected range down"
          title="Fill down"
          onClick={onFillDown}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Fill selected range right"
          title="Fill right"
          onClick={onFillRight}
        >
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Clear selected range"
          title="Clear"
          onClick={onClearSelection}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
