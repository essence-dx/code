"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FilterX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFilterValueOptions } from "@/features/spreadsheet/filter-values";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetData } from "@/features/workbooks/types";

type ColumnFilterMenuProps = {
  label: string;
  headerName?: string;
  sheet: SheetData;
  computedValues: Record<string, string>;
  range: CellRange;
  columnIndex: number;
  active?: boolean;
  activeValues?: string[] | null;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onApplyValueFilter: (input: {
    range: CellRange;
    columnIndex: number;
    headerName?: string;
    values: string[];
  }) => void;
  onClearColumnFilters: (input: {
    range: CellRange;
    columnIndex: number;
  }) => void;
};

export function ColumnFilterMenu({
  label,
  headerName,
  sheet,
  computedValues,
  range,
  columnIndex,
  active,
  activeValues,
  disabled,
  className,
  style,
  onApplyValueFilter,
  onClearColumnFilters,
}: ColumnFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const valueOptions = useMemo(
    () =>
      getFilterValueOptions({
        sheet,
        computedValues,
        range,
        columnIndex,
      }),
    [columnIndex, computedValues, range, sheet],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleOptions = useMemo(
    () =>
      normalizedSearch
        ? valueOptions.filter((option) =>
            option.label.toLocaleLowerCase().includes(normalizedSearch),
          )
        : valueOptions,
    [normalizedSearch, valueOptions],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSearch("");
      setSelectedValues(activeValues ?? valueOptions.map((option) => option.value));
    }

    setOpen(nextOpen);
  }

  function toggleValue(value: string) {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value],
    );
  }

  function applyFilter() {
    onApplyValueFilter({
      range,
      columnIndex,
      headerName,
      values: selectedValues,
    });
    setOpen(false);
  }

  function clearFilter() {
    onClearColumnFilters({ range, columnIndex });
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label} filter menu`}
          disabled={disabled}
          className={cn(
            "flex size-5 items-center justify-center rounded border bg-background/90 text-muted-foreground shadow-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
            active && "border-primary text-primary",
            className,
          )}
          style={style}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-2"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {selectedValues.length} of {valueOptions.length} selected
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={clearFilter}
              disabled={!active}
            >
              <FilterX className="size-3.5" />
              <span className="sr-only">Clear column filter</span>
            </Button>
          </div>
          <Input
            value={search}
            placeholder="Search values"
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                setSelectedValues(valueOptions.map((option) => option.value))
              }
            >
              All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedValues([])}
            >
              Clear
            </Button>
          </div>
          <div className="max-h-52 space-y-1 overflow-auto rounded-md border bg-background p-2">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No values in this column.
              </p>
            ) : (
              visibleOptions.map((option) => (
                <label
                  key={`${option.value}-${option.count}`}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option.value)}
                      onChange={() => toggleValue(option.value)}
                      className="size-4 accent-primary"
                    />
                    <span className="truncate">{option.label}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {option.count}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <Button
          type="button"
          className="mt-2 w-full"
          size="sm"
          onClick={applyFilter}
          disabled={valueOptions.length === 0}
        >
          Apply value filter
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
