"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTableTimelineColumnOptions,
  getTableTimelinePeriodOptions,
} from "@/features/spreadsheet/table-timelines";
import type {
  SheetData,
  TableDefinition,
  TableTimeline,
  TableTimelineMode,
} from "@/features/workbooks/types";

const timelineModeOptions: Array<{
  label: string;
  value: TableTimelineMode;
}> = [
  { label: "Years", value: "year" },
  { label: "Quarters", value: "quarter" },
  { label: "Months", value: "month" },
];

function togglePeriod(currentPeriods: string[], periodKey: string) {
  return currentPeriods.includes(periodKey)
    ? currentPeriods.filter((item) => item !== periodKey)
    : [...currentPeriods, periodKey];
}

export function TableTimelinesPanel({
  disabled,
  sheet,
  tables,
  timelines,
  computedValues,
  onAddTimeline,
  onDeleteTimeline,
  onSelectTable,
  onUpdateTimeline,
}: {
  disabled?: boolean;
  sheet: SheetData;
  tables: TableDefinition[];
  timelines: TableTimeline[];
  computedValues: Record<string, string>;
  onAddTimeline: (tableId: string, columnIndex: number) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onSelectTable: (table: TableDefinition) => void;
  onUpdateTimeline: (
    timelineId: string,
    updates: { mode?: TableTimelineMode; selectedPeriods?: string[] },
  ) => void;
}) {
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(
    null,
  );
  const timelineTableOptions = useMemo(
    () =>
      tables
        .filter((table) => table.showHeaderRow)
        .map((table) => ({
          table,
          columns: getTableTimelineColumnOptions({
            sheet,
            table,
            computedValues,
          }),
        }))
        .filter((item) => item.columns.length > 0),
    [computedValues, sheet, tables],
  );
  const selectedTableOption =
    timelineTableOptions.find((item) => item.table.id === selectedTableId) ??
    timelineTableOptions[0] ??
    null;
  const selectedTable = selectedTableOption?.table ?? null;
  const columnOptions = selectedTableOption?.columns ?? [];
  const effectiveColumnIndex =
    selectedColumnIndex !== null &&
    columnOptions.some((option) => option.columnIndex === selectedColumnIndex)
      ? selectedColumnIndex
      : (columnOptions[0]?.columnIndex ?? 0);
  const timelineTables = new Map(tables.map((table) => [table.id, table]));

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Timelines</h2>
        <Badge variant="secondary" className="font-mono">
          {timelines.length}
        </Badge>
      </div>
      {tables.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Create a structured table before adding timelines.
        </p>
      ) : timelineTableOptions.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Add a date column to a headered table before creating a timeline.
        </p>
      ) : (
        <div className="space-y-2 rounded-md border bg-background p-2">
          <select
            value={selectedTable?.id ?? ""}
            disabled={disabled}
            aria-label="Timeline table"
            className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setSelectedTableId(event.target.value);
              setSelectedColumnIndex(null);
            }}
          >
            {timelineTableOptions.map(({ table }) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              value={effectiveColumnIndex}
              disabled={disabled || columnOptions.length === 0}
              aria-label="Timeline date column"
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                setSelectedColumnIndex(Number(event.target.value))
              }
            >
              {columnOptions.map((option) => (
                <option key={option.columnIndex} value={option.columnIndex}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !selectedTable || columnOptions.length === 0}
              onClick={() => {
                if (selectedTable) {
                  onAddTimeline(selectedTable.id, effectiveColumnIndex);
                }
              }}
            >
              <CalendarDays />
              Add
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {timelines.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No timelines on this sheet.
          </p>
        ) : (
          timelines.map((timeline) => {
            const table = timelineTables.get(timeline.tableId);
            const periods = table
              ? getTableTimelinePeriodOptions({
                  sheet,
                  table,
                  columnIndex: timeline.columnIndex,
                  computedValues,
                  mode: timeline.mode,
                })
              : [];

            return (
              <section key={timeline.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => {
                      if (table) {
                        onSelectTable(table);
                      }
                    }}
                  >
                    <span className="block truncate text-sm font-medium">
                      {timeline.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {table?.name ?? "Missing table"}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => onDeleteTimeline(timeline.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete timeline</span>
                  </Button>
                </div>
                <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={timeline.mode}
                    disabled={disabled}
                    aria-label="Timeline period"
                    className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      onUpdateTimeline(timeline.id, {
                        mode: event.target.value as TableTimelineMode,
                      })
                    }
                  >
                    {timelineModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || timeline.selectedPeriods.length === 0}
                    onClick={() =>
                      onUpdateTimeline(timeline.id, { selectedPeriods: [] })
                    }
                  >
                    Clear
                  </Button>
                </div>
                <div className="mb-2">
                  <Badge
                    variant={
                      timeline.selectedPeriods.length ? "outline" : "secondary"
                    }
                  >
                    {timeline.selectedPeriods.length
                      ? `${timeline.selectedPeriods.length} selected`
                      : "All"}
                  </Badge>
                </div>
                <div className="grid max-h-48 grid-cols-2 gap-1 overflow-auto pr-1">
                  {periods.length === 0 ? (
                    <p className="col-span-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                      No date periods in this table column.
                    </p>
                  ) : (
                    periods.map((period) => {
                      const active =
                        timeline.selectedPeriods.length === 0 ||
                        timeline.selectedPeriods.includes(period.key);

                      return (
                        <Button
                          key={`${timeline.id}:${period.key}`}
                          type="button"
                          variant={active ? "secondary" : "ghost"}
                          size="sm"
                          className="h-auto justify-between gap-2 px-2 py-1 text-left"
                          disabled={disabled}
                          onClick={() =>
                            onUpdateTimeline(timeline.id, {
                              selectedPeriods: togglePeriod(
                                timeline.selectedPeriods,
                                period.key,
                              ),
                            })
                          }
                        >
                          <span className="truncate">{period.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {period.count}
                          </span>
                        </Button>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
