"use client";

import { Funnel, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPivotFilterOptions } from "@/features/spreadsheet/pivot/pivot-filters";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotSourceModel } from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableDefinition } from "@/features/workbooks/types";

function toggleFilterValue(currentValues: string[], value: string) {
  if (currentValues.length === 0) {
    return [value];
  }

  return currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];
}

export function PivotTableFilterControl({
  disabled,
  pivotTable,
  source,
  onUpdateLayout,
}: {
  disabled?: boolean;
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
  onUpdateLayout: (updates: PivotTableLayoutUpdate) => void;
}) {
  const fields = source.fields;
  const fieldIds = new Set(fields.map((field) => field.id));
  const filterFieldId = pivotTable.filterFieldIds.find((fieldId) =>
    fieldIds.has(fieldId),
  );
  const selectedValues = filterFieldId
    ? (pivotTable.filterSelections[filterFieldId] ?? [])
    : [];
  const options = filterFieldId
    ? getPivotFilterOptions({ fieldId: filterFieldId, source })
    : [];

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <label className="block text-xs font-medium">
        Filter / slicer
        <select
          value={filterFieldId ?? ""}
          disabled={disabled}
          aria-label={`${pivotTable.name} filter field`}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onUpdateLayout({
              filterFieldIds: event.target.value ? [event.target.value] : [],
              filterSelections: {},
            })
          }
        >
          <option value="">None</option>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      {filterFieldId ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={selectedValues.length ? "outline" : "secondary"}>
              {selectedValues.length
                ? `${selectedValues.length} selected`
                : "All"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || selectedValues.length === 0}
              onClick={() =>
                onUpdateLayout({
                  filterSelections: {
                    ...pivotTable.filterSelections,
                    [filterFieldId]: [],
                  },
                })
              }
            >
              <X />
              Clear
            </Button>
          </div>
          <div className="max-h-36 space-y-1 overflow-auto pr-1">
            {options.length === 0 ? (
              <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                No values in this filter field.
              </p>
            ) : (
              options.map((option) => {
                const active =
                  selectedValues.length === 0 ||
                  selectedValues.includes(option.value);

                return (
                  <Button
                    key={`${filterFieldId}:${option.value}`}
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="h-auto w-full justify-between gap-2 px-2 py-1 text-left"
                    disabled={disabled}
                    onClick={() =>
                      onUpdateLayout({
                        filterSelections: {
                          ...pivotTable.filterSelections,
                          [filterFieldId]: toggleFilterValue(
                            selectedValues,
                            option.value,
                          ),
                        },
                      })
                    }
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  </Button>
                );
              })
            )}
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          <Funnel className="size-3" />
          No slicer field selected.
        </p>
      )}
    </div>
  );
}
