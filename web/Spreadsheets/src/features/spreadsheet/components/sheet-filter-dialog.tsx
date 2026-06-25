"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
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
import {
  filterOptions,
  getFilterOption,
  secondaryFilterOptions,
} from "@/features/spreadsheet/filter-rule-options";
import {
  formatFilterColumnLabel,
  type FilterColumnLabels,
} from "@/features/spreadsheet/filter-column-labels";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { FilterValueOption } from "@/features/spreadsheet/filter-values";
import type { StyleCriterionOptions } from "@/features/spreadsheet/style-criteria";
import type {
  SheetFilterCondition,
  SheetFilterRuleType,
} from "@/features/workbooks/types";

export function SheetFilterDialog({
  disabled,
  columnLabels,
  filterValueOptions,
  styleFilterOptions,
  selectedRange,
  onCreate,
}: {
  disabled?: boolean;
  columnLabels: FilterColumnLabels;
  filterValueOptions: Record<number, FilterValueOption[]>;
  styleFilterOptions: Record<number, StyleCriterionOptions>;
  selectedRange: CellRange;
  onCreate: (rule: {
    columnIndex: number;
    headerName?: string;
    type: SheetFilterRuleType;
    value: string;
    values?: string[];
    joiner?: "and" | "or";
    conditions?: SheetFilterCondition[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [columnIndex, setColumnIndex] = useState(selectedRange.startColumnIndex);
  const [type, setType] = useState<SheetFilterRuleType>("contains");
  const [value, setValue] = useState("");
  const [valueSearch, setValueSearch] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const [joiner, setJoiner] = useState<"and" | "or">("and");
  const [secondaryType, setSecondaryType] =
    useState<SheetFilterRuleType>("contains");
  const [secondaryValue, setSecondaryValue] = useState("");
  const option = getFilterOption(type);
  const secondaryOption = getFilterOption(secondaryType);
  const columnValueOptions = filterValueOptions[columnIndex] ?? [];
  const activeValueOptions = option.styleValueKind
    ? (styleFilterOptions[columnIndex]?.[option.styleValueKind] ?? [])
    : columnValueOptions;
  const normalizedValueSearch = valueSearch.trim().toLocaleLowerCase();
  const visibleValueOptions = useMemo(
    () =>
      normalizedValueSearch
        ? activeValueOptions.filter((item) =>
            item.label.toLocaleLowerCase().includes(normalizedValueSearch),
          )
        : activeValueOptions,
    [activeValueOptions, normalizedValueSearch],
  );
  const canCreate = option.usesValueList
    ? selectedValues.length > 0
    : !option.needsValue || value.trim().length > 0;
  const canCreateAdvanced =
    !advancedEnabled ||
    !secondaryOption.needsValue ||
    secondaryValue.trim().length > 0;
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

  function getSelectableValues(
    nextColumnIndex: number,
    nextType: SheetFilterRuleType,
  ) {
    const nextOption = getFilterOption(nextType);

    if (nextOption.styleValueKind) {
      return (
        styleFilterOptions[nextColumnIndex]?.[nextOption.styleValueKind] ?? []
      ).map((item) => item.value);
    }

    if (nextOption.usesValueList) {
      return (filterValueOptions[nextColumnIndex] ?? []).map(
        (item) => item.value,
      );
    }

    return [];
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setColumnIndex(selectedRange.startColumnIndex);
      setType("contains");
      setValue("");
      setValueSearch("");
      setAdvancedEnabled(false);
      setJoiner("and");
      setSecondaryType("contains");
      setSecondaryValue("");
      setSelectedValues(
        getSelectableValues(selectedRange.startColumnIndex, "contains"),
      );
    }

    setOpen(nextOpen);
  }

  function handleColumnChange(nextColumnIndex: number) {
    setColumnIndex(nextColumnIndex);
    setValueSearch("");
    setAdvancedEnabled(false);
    setSecondaryValue("");
    setSelectedValues(getSelectableValues(nextColumnIndex, type));
  }

  function handleTypeChange(nextType: SheetFilterRuleType) {
    setType(nextType);

    if (getFilterOption(nextType).usesValueList) {
      setValueSearch("");
      setSelectedValues(getSelectableValues(columnIndex, nextType));
    }
  }

  function toggleSelectedValue(nextValue: string) {
    setSelectedValues((currentValues) =>
      currentValues.includes(nextValue)
        ? currentValues.filter((item) => item !== nextValue)
        : [...currentValues, nextValue],
    );
  }

  function handleCreate() {
    if (!canCreate || !canCreateAdvanced) {
      return;
    }

    const primaryCondition = {
      type,
      value: option.needsValue ? value.trim() : "",
      values: option.usesValueList ? selectedValues : undefined,
    };

    onCreate({
      columnIndex,
      headerName: columnLabels[columnIndex],
      type,
      value: option.needsValue ? value.trim() : "",
      values: option.usesValueList ? selectedValues : undefined,
      joiner: advancedEnabled ? joiner : undefined,
      conditions: advancedEnabled
        ? [
            primaryCondition,
            {
              type: secondaryType,
              value: secondaryOption.needsValue ? secondaryValue.trim() : "",
            },
          ]
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
              <Filter />
              <span className="sr-only">Filter selected range</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Filter selected range</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter selected range</DialogTitle>
          <DialogDescription>First selected row is kept visible as the header.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sheet-filter-column">Column</Label>
            <select
              id="sheet-filter-column"
              value={columnIndex}
              onChange={(event) => handleColumnChange(Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {columns.map((item) => (
                <option key={item} value={item}>
                  {formatFilterColumnLabel(item, columnLabels)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sheet-filter-rule">Rule</Label>
            <select
              id="sheet-filter-rule"
              value={type}
              onChange={(event) =>
                handleTypeChange(event.target.value as SheetFilterRuleType)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {filterOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {option.needsValue ? (
            <div className="grid gap-2">
              <Label htmlFor="sheet-filter-value">Value</Label>
              <Input
                id="sheet-filter-value"
                value={value}
                placeholder={option.placeholder}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          ) : null}
          {option.usesValueList ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="sheet-filter-value-search">Values</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setSelectedValues(activeValueOptions.map((item) => item.value))
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
              </div>
              <Input
                id="sheet-filter-value-search"
                value={valueSearch}
                placeholder="Search values"
                onChange={(event) => setValueSearch(event.target.value)}
              />
              <div className="max-h-52 space-y-1 overflow-auto rounded-md border bg-background p-2">
                {visibleValueOptions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No matching values in this column.
                  </p>
                ) : (
                  visibleValueOptions.map((item) => (
                    <label
                      key={`${item.value}-${item.count}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(item.value)}
                          onChange={() => toggleSelectedValue(item.value)}
                          className="size-4 accent-primary"
                        />
                        {"color" in item && typeof item.color === "string" ? (
                          <span
                            className="size-4 shrink-0 rounded-sm border"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : null}
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.count}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <div className="rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={advancedEnabled}
                onChange={(event) => setAdvancedEnabled(event.target.checked)}
                className="size-4 accent-primary"
              />
              Advanced criteria
            </label>
            {advancedEnabled ? (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="sheet-filter-joiner">Match</Label>
                  <select
                    id="sheet-filter-joiner"
                    value={joiner}
                    onChange={(event) =>
                      setJoiner(event.target.value as "and" | "or")
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="and">All criteria</option>
                    <option value="or">Any criteria</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sheet-filter-secondary-rule">
                    Second rule
                  </Label>
                  <select
                    id="sheet-filter-secondary-rule"
                    value={secondaryType}
                    onChange={(event) =>
                      setSecondaryType(event.target.value as SheetFilterRuleType)
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {secondaryFilterOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {secondaryOption.needsValue ? (
                  <div className="grid gap-2">
                    <Label htmlFor="sheet-filter-secondary-value">
                      Second value
                    </Label>
                    <Input
                      id="sheet-filter-secondary-value"
                      value={secondaryValue}
                      placeholder={secondaryOption.placeholder}
                      onChange={(event) => setSecondaryValue(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || !canCreateAdvanced}
          >
            Apply filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
