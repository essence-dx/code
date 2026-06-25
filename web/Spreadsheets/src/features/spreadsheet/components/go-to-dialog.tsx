"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";
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
import type { GoToSpecialTarget } from "@/features/spreadsheet/go-to";

export function GoToDialog({
  currentAddress,
  specialTargets,
  onGoToReference,
  onGoToSpecialTarget,
}: {
  currentAddress: string;
  specialTargets: GoToSpecialTarget[];
  onGoToReference: (input: string) => string | null;
  onGoToSpecialTarget: (target: GoToSpecialTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState(currentAddress);
  const [error, setError] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setReference(currentAddress);
      setError("");
    }

    setOpen(nextOpen);
  }

  function handleGoTo() {
    const message = onGoToReference(reference);

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
            <Button type="button" variant="ghost" size="icon-sm">
              <CircleDot />
              <span className="sr-only">Go to</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Go to</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Go to</DialogTitle>
          <DialogDescription>
            Jump to a cell, range, sheet reference, named range, or special item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="go-to-reference">Reference</Label>
            <div className="flex gap-2">
              <Input
                id="go-to-reference"
                value={reference}
                placeholder="A1, A1:D10, Sheet2!B4, or named range"
                onChange={(event) => {
                  setReference(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleGoTo();
                  }
                }}
              />
              <Button type="button" onClick={handleGoTo}>
                Go
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label>Go to special</Label>
            {specialTargets.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No formulas, notes, links, hidden rows, or hidden columns found.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-2">
                {specialTargets.map((target) => (
                  <Button
                    key={target.id}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start px-3 py-2 text-left"
                    onClick={() => {
                      onGoToSpecialTarget(target);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {target.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {target.description}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setReference(currentAddress)}
          >
            Current cell
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
