"use client";

import { useMemo, useState } from "react";
import {
  ClipboardPaste,
  Copy,
  Eraser,
  MousePointer,
  Paintbrush,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  countMultiRangeCells,
  formatMultiRangeLabel,
  rangeAddress,
} from "@/features/spreadsheet/multi-range-selection";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

export function MultiRangeSelectionPanel({
  disabled,
  ranges,
  selectedRange,
  onAddSelectedRange,
  onApplySelectedStyle,
  onClearFormatting,
  onClearRanges,
  onCopyRanges,
  onNameRanges,
  onPasteRanges,
  onRemoveRange,
  onSelectRange,
}: {
  disabled?: boolean;
  ranges: CellRange[];
  selectedRange: CellRange;
  onAddSelectedRange: () => void;
  onApplySelectedStyle: () => void;
  onClearFormatting: () => void;
  onClearRanges: () => void;
  onCopyRanges: () => void;
  onNameRanges: (name: string) => void;
  onPasteRanges: () => void;
  onRemoveRange: (index: number) => void;
  onSelectRange: (range: CellRange) => void;
}) {
  const [name, setName] = useState("");
  const cellCount = useMemo(() => countMultiRangeCells(ranges), [ranges]);
  const cleanName = useMemo(
    () =>
      name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9_.]/g, "")
        .replace(/^[^A-Za-z_]+/, "")
        .slice(0, 80),
    [name],
  );

  function saveNamedRange() {
    if (!cleanName || ranges.length === 0) {
      return;
    }

    onNameRanges(name);
    setName("");
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Multi-range selection</h2>
        <Badge variant="secondary" className="font-mono">
          {ranges.length}
        </Badge>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Current selection</p>
            <p className="truncate font-mono text-xs">
              {rangeAddress(selectedRange)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSelectedRange}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {ranges.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Add non-overlapping ranges to format, copy, or save them together.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="rounded-md bg-muted/50 p-2 text-xs leading-5 text-muted-foreground">
              {cellCount.toLocaleString()} cells across {ranges.length} areas
            </div>
            <div className="space-y-1.5">
              {ranges.map((range, index) => (
                <div
                  key={`${range.startRowIndex}:${range.startColumnIndex}:${range.endRowIndex}:${range.endColumnIndex}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-w-0 flex-1 justify-start px-1 font-mono text-xs"
                    onClick={() => onSelectRange(range)}
                  >
                    <MousePointer className="size-3" />
                    <span className="truncate">{rangeAddress(range)}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${rangeAddress(range)}`}
                    onClick={() => onRemoveRange(index)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {formatMultiRangeLabel(ranges)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={ranges.length === 0}
            onClick={onCopyRanges}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || ranges.length === 0}
            onClick={onPasteRanges}
          >
            <ClipboardPaste className="size-3.5" />
            Paste
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || ranges.length === 0}
            onClick={onApplySelectedStyle}
          >
            <Paintbrush className="size-3.5" />
            Style
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || ranges.length === 0}
            onClick={onClearFormatting}
          >
            <Eraser className="size-3.5" />
            Clear format
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={ranges.length === 0}
            onClick={onClearRanges}
          >
            <Trash2 className="size-3.5" />
            Clear list
          </Button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="multi-range-name">Save as named range</Label>
          <div className="flex gap-2">
            <Input
              id="multi-range-name"
              value={name}
              placeholder="Q1_Audit_Areas"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveNamedRange();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={disabled || !cleanName || ranges.length === 0}
              aria-label="Save multi-area named range"
              onClick={saveNamedRange}
            >
              <Save className="size-4" />
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {cleanName || "Use letters, numbers, underscores, or periods."}
          </p>
        </div>
      </div>
    </section>
  );
}
