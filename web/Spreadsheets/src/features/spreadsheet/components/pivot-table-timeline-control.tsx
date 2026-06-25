"use client";

import { CalendarDays, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotSourceModel } from "@/features/spreadsheet/pivot/pivot-types";
import { getPivotTimelineOptions } from "@/features/spreadsheet/pivot/pivot-timelines";
import type {
  PivotTableDefinition,
  PivotTableTimelineFilter,
  TableTimelineMode,
} from "@/features/workbooks/types";

const timelineModes: { label: string; value: TableTimelineMode }[] = [
  { label: "Years", value: "year" },
  { label: "Quarters", value: "quarter" },
  { label: "Months", value: "month" },
];

function togglePeriod(currentPeriods: string[], period: string) {
  if (currentPeriods.length === 0) {
    return [period];
  }

  return currentPeriods.includes(period)
    ? currentPeriods.filter((item) => item !== period)
    : [...currentPeriods, period];
}

function createTimelineFilter(
  fieldId: string,
  mode: TableTimelineMode,
  selectedPeriods: string[],
): PivotTableTimelineFilter[] {
  return fieldId ? [{ fieldId, mode, selectedPeriods }] : [];
}

export function PivotTableTimelineControl({
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
  const dateFields = source.fields.filter((field) => field.valueType === "date");
  const timeline = (pivotTable.timelineFilters ?? []).find((item) =>
    dateFields.some((field) => field.id === item.fieldId),
  );
  const fieldId = timeline?.fieldId ?? "";
  const mode = timeline?.mode ?? "month";
  const selectedPeriods = timeline?.selectedPeriods ?? [];
  const options = fieldId
    ? getPivotTimelineOptions({ fieldId, mode, source })
    : [];

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
        <label className="block text-xs font-medium">
          Timeline
          <select
            value={fieldId}
            disabled={disabled || dateFields.length === 0}
            aria-label={`${pivotTable.name} timeline field`}
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              onUpdateLayout({
                timelineFilters: createTimelineFilter(
                  event.target.value,
                  mode,
                  [],
                ),
              })
            }
          >
            <option value="">None</option>
            {dateFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Group
          <select
            value={mode}
            disabled={disabled || !fieldId}
            aria-label={`${pivotTable.name} timeline group`}
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              onUpdateLayout({
                timelineFilters: createTimelineFilter(
                  fieldId,
                  event.target.value as TableTimelineMode,
                  [],
                ),
              })
            }
          >
            {timelineModes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {fieldId ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={selectedPeriods.length ? "outline" : "secondary"}>
              {selectedPeriods.length
                ? `${selectedPeriods.length} periods`
                : "All periods"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || selectedPeriods.length === 0}
              onClick={() =>
                onUpdateLayout({
                  timelineFilters: createTimelineFilter(fieldId, mode, []),
                })
              }
            >
              <X />
              Clear
            </Button>
          </div>
          <div className="max-h-32 space-y-1 overflow-auto pr-1">
            {options.length === 0 ? (
              <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                No date periods in this field.
              </p>
            ) : (
              options.map((option) => {
                const active =
                  selectedPeriods.length === 0 ||
                  selectedPeriods.includes(option.value);

                return (
                  <Button
                    key={`${fieldId}:${mode}:${option.value}`}
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="h-auto w-full justify-between gap-2 px-2 py-1 text-left"
                    disabled={disabled}
                    onClick={() =>
                      onUpdateLayout({
                        timelineFilters: createTimelineFilter(
                          fieldId,
                          mode,
                          togglePeriod(selectedPeriods, option.value),
                        ),
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
          <CalendarDays className="size-3" />
          {dateFields.length === 0
            ? "No date fields available."
            : "No timeline selected."}
        </p>
      )}
    </div>
  );
}
