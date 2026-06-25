"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { columnLabel } from "@/features/workbooks/addresses";
import {
  sortCustomOrderOptions,
  type SortCustomOrder,
  type SortOn,
} from "@/features/spreadsheet/sort-orders";
import type {
  CellRange,
  SortCriterion,
} from "@/features/spreadsheet/state/selection-state";

type OptionalColumnIndex = number | "none";
const sortOnOptions: Array<{ label: string; value: SortOn }> = [
  { label: "Values", value: "values" },
  { label: "Cell color", value: "cellColor" },
  { label: "Font color", value: "fontColor" },
  { label: "Icon", value: "icon" },
];

export function CustomSortDialog({
  disabled,
  selectedRange,
  onSort,
}: {
  disabled?: boolean;
  selectedRange: CellRange;
  onSort: (options: {
    columnIndex: number;
    direction: "asc" | "desc";
    customOrder: SortCustomOrder;
    sortOn: SortOn;
    secondary?: SortCriterion;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [columnIndex, setColumnIndex] = useState(selectedRange.startColumnIndex);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [customOrder, setCustomOrder] = useState<SortCustomOrder>("none");
  const [sortOn, setSortOn] = useState<SortOn>("values");
  const [secondaryColumnIndex, setSecondaryColumnIndex] =
    useState<OptionalColumnIndex>("none");
  const [secondaryDirection, setSecondaryDirection] =
    useState<"asc" | "desc">("asc");
  const [secondaryCustomOrder, setSecondaryCustomOrder] =
    useState<SortCustomOrder>("none");
  const [secondarySortOn, setSecondarySortOn] = useState<SortOn>("values");
  const columns = useMemo(
    () =>
      Array.from(
        {
          length:
            selectedRange.endColumnIndex - selectedRange.startColumnIndex + 1,
        },
        (_, offset) => selectedRange.startColumnIndex + offset,
      ),
    [selectedRange],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setColumnIndex(selectedRange.startColumnIndex);
      setDirection("asc");
      setCustomOrder("none");
      setSortOn("values");
      setSecondaryColumnIndex("none");
      setSecondaryDirection("asc");
      setSecondaryCustomOrder("none");
      setSecondarySortOn("values");
    }

    setOpen(nextOpen);
  }

  function handleSort() {
    onSort({
      columnIndex,
      direction,
      customOrder,
      sortOn,
      secondary:
        secondaryColumnIndex !== "none" && secondaryColumnIndex !== columnIndex
          ? {
              columnIndex: secondaryColumnIndex,
              direction: secondaryDirection,
              customOrder: secondaryCustomOrder,
              sortOn: secondarySortOn,
            }
          : undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <ArrowUpDown />
              <span className="sr-only">Custom sort</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Custom sort</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Custom sort</DialogTitle>
          <DialogDescription>Sort the selected range by up to two columns.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="custom-sort-column">Column</Label>
            <select
              id="custom-sort-column"
              value={columnIndex}
              onChange={(event) => setColumnIndex(Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {columns.map((item) => (
                <option key={item} value={item}>
                  {columnLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-sort-on">Sort on</Label>
            <select
              id="custom-sort-on"
              value={sortOn}
              onChange={(event) => setSortOn(event.target.value as SortOn)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sortOnOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-sort-direction">Order</Label>
            <select
              id="custom-sort-direction"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as "asc" | "desc")
              }
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-sort-custom-order">Custom order</Label>
            <select
              id="custom-sort-custom-order"
              value={customOrder}
              onChange={(event) =>
                setCustomOrder(event.target.value as SortCustomOrder)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sortCustomOrderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-sort-secondary-column">Then by</Label>
            <select
              id="custom-sort-secondary-column"
              value={secondaryColumnIndex}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSecondaryColumnIndex(
                  nextValue === "none" ? "none" : Number(nextValue),
                );
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="none">None</option>
              {columns.map((item) => (
                <option key={item} value={item} disabled={item === columnIndex}>
                  {columnLabel(item)}
                </option>
              ))}
            </select>
          </div>
          {secondaryColumnIndex !== "none" &&
          secondaryColumnIndex !== columnIndex ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="custom-sort-secondary-on">Then sort on</Label>
                <select
                  id="custom-sort-secondary-on"
                  value={secondarySortOn}
                  onChange={(event) =>
                    setSecondarySortOn(event.target.value as SortOn)
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sortOnOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custom-sort-secondary-direction">Then order</Label>
                <select
                  id="custom-sort-secondary-direction"
                  value={secondaryDirection}
                  onChange={(event) =>
                    setSecondaryDirection(event.target.value as "asc" | "desc")
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custom-sort-secondary-custom-order">
                  Then custom order
                </Label>
                <select
                  id="custom-sort-secondary-custom-order"
                  value={secondaryCustomOrder}
                  onChange={(event) =>
                    setSecondaryCustomOrder(event.target.value as SortCustomOrder)
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sortCustomOrderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSort}>
            Sort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
