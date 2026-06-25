"use client";

import { useMemo, useState } from "react";
import { Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { formatValueByCellStyle } from "@/features/workbooks/number-formats";

const FORMAT_PRESETS = [
  "#,##0.00",
  "0.0%",
  "$#,##0.00",
  "#,##0;(#,##0);-",
  "yyyy-mm-dd",
];

function normalizeCustomFormat(value: string) {
  return value.trim().slice(0, 120);
}

export function CustomNumberFormatDialog({
  disabled,
  format,
  sampleValue,
  onSave,
}: {
  disabled?: boolean;
  format?: string;
  sampleValue: string;
  onSave: (format: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(format || "#,##0.00");
  const cleanDraft = useMemo(() => normalizeCustomFormat(draft), [draft]);
  const preview = useMemo(() => {
    const fallback = sampleValue || "1234.56";

    return (
      formatValueByCellStyle(fallback, {
        customNumberFormat: cleanDraft,
        numberFormat: "custom",
      }) ?? fallback
    );
  }, [cleanDraft, sampleValue]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraft(format || "#,##0.00");
    }
  }

  function handleSave() {
    if (!cleanDraft) {
      return;
    }

    onSave(cleanDraft);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <Hash />
              <span className="sr-only">Custom number format</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Custom number format</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom number format</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="custom-number-format">Format</Label>
            <Input
              id="custom-number-format"
              value={draft}
              placeholder="#,##0.00"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FORMAT_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
            {preview}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDraft("")}>
            Clear
          </Button>
          <Button type="button" disabled={!cleanDraft} onClick={handleSave}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
