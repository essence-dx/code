"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

function formatRange(range: CellRange) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

function getDefaultOutputCell(range: CellRange) {
  return cellKey(range.startRowIndex, range.endColumnIndex + 2);
}

export function AdvancedFilterCopyDialog({
  disabled,
  selectedRange,
  onCopy,
}: {
  disabled?: boolean;
  selectedRange: CellRange;
  onCopy: (destinationReference: string) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [destinationReference, setDestinationReference] = useState("");
  const [error, setError] = useState("");
  const selectedRangeLabel = useMemo(
    () => formatRange(selectedRange),
    [selectedRange],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDestinationReference(getDefaultOutputCell(selectedRange));
      setError("");
    }

    setOpen(nextOpen);
  }

  function handleCopy() {
    const message = onCopy(destinationReference);

    if (message) {
      setError(message);
      return;
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <ClipboardCopy />
              <span className="sr-only">Copy criteria matches</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Copy criteria matches</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy criteria matches</DialogTitle>
          <DialogDescription>
            Uses {selectedRangeLabel} as the criteria range and copies matching
            rows from the list above it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="advanced-filter-output">Destination cell</Label>
          <Input
            id="advanced-filter-output"
            value={destinationReference}
            placeholder="J1"
            onChange={(event) => {
              setDestinationReference(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCopy();
              }
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDestinationReference(getDefaultOutputCell(selectedRange))}
          >
            Reset
          </Button>
          <Button type="button" onClick={handleCopy}>
            Copy rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
