"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus } from "lucide-react";
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
import { columnLabel } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

function formatRange(range: CellRange) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

function cleanPreviewName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.]/g, "")
    .replace(/^[^A-Za-z_]+/, "")
    .slice(0, 80);
}

export function NamedRangeDialog({
  disabled,
  selectedRange,
  onCreate,
}: {
  disabled?: boolean;
  selectedRange: CellRange;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const cleanName = useMemo(() => cleanPreviewName(name), [name]);

  function handleSave() {
    if (!cleanName) {
      return;
    }

    onCreate(name);
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <BookmarkPlus />
              <span className="sr-only">Name selected range</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Name selected range</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name selected range</DialogTitle>
          <DialogDescription>{formatRange(selectedRange)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="named-range-name">Name</Label>
          <Input
            id="named-range-name"
            value={name}
            placeholder="Revenue_Q1"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSave();
              }
            }}
          />
          <p className="font-mono text-xs text-muted-foreground">
            {cleanName || "Use letters, numbers, underscores, or periods."}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setName("")}>
            Clear
          </Button>
          <Button type="button" disabled={!cleanName} onClick={handleSave}>
            Save range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
