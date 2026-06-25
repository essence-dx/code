"use client";

import { useMemo, useState } from "react";
import { Filter, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTableSlicerColumnOptions,
  getTableSlicerValueOptions,
} from "@/features/spreadsheet/table-slicers";
import type {
  SheetData,
  TableDefinition,
  TableSlicer,
} from "@/features/workbooks/types";

function toggleValue(currentValues: string[], value: string) {
  if (currentValues.length === 0) {
    return [value];
  }

  return currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];
}

export function TableSlicersPanel({
  disabled,
  sheet,
  tables,
  slicers,
  computedValues,
  onAddSlicer,
  onDeleteSlicer,
  onSelectTable,
  onUpdateSlicerValues,
}: {
  disabled?: boolean;
  sheet: SheetData;
  tables: TableDefinition[];
  slicers: TableSlicer[];
  computedValues: Record<string, string>;
  onAddSlicer: (tableId: string, columnIndex: number) => void;
  onDeleteSlicer: (slicerId: string) => void;
  onSelectTable: (table: TableDefinition) => void;
  onUpdateSlicerValues: (slicerId: string, selectedValues: string[]) => void;
}) {
  const headerTables = tables.filter((table) => table.showHeaderRow);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(
    null,
  );
  const selectedTable =
    headerTables.find((table) => table.id === selectedTableId) ??
    headerTables[0] ??
    null;
  const columnOptions = useMemo(
    () =>
      selectedTable
        ? getTableSlicerColumnOptions({
            sheet,
            table: selectedTable,
            computedValues,
          })
        : [],
    [computedValues, selectedTable, sheet],
  );
  const effectiveColumnIndex =
    selectedColumnIndex !== null &&
    columnOptions.some((option) => option.columnIndex === selectedColumnIndex)
      ? selectedColumnIndex
      : (columnOptions[0]?.columnIndex ?? 0);
  const slicerTables = new Map(tables.map((table) => [table.id, table]));

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Table slicers</h2>
        <Badge variant="secondary" className="font-mono">
          {slicers.length}
        </Badge>
      </div>
      {tables.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Create a structured table before adding slicers.
        </p>
      ) : headerTables.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Turn on a table header row before adding slicers.
        </p>
      ) : (
        <div className="space-y-2 rounded-md border bg-background p-2">
          <select
            value={selectedTable?.id ?? ""}
            disabled={disabled}
            aria-label="Slicer table"
            className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setSelectedTableId(event.target.value);
              setSelectedColumnIndex(null);
            }}
          >
            {headerTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              value={effectiveColumnIndex}
              disabled={disabled || columnOptions.length === 0}
              aria-label="Slicer column"
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
                  onAddSlicer(selectedTable.id, effectiveColumnIndex);
                }
              }}
            >
              <Filter />
              Add
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {slicers.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No slicers on this sheet.
          </p>
        ) : (
          slicers.map((slicer) => {
            const table = slicerTables.get(slicer.tableId);
            const options = table
              ? getTableSlicerValueOptions({
                  sheet,
                  table,
                  columnIndex: slicer.columnIndex,
                  computedValues,
                })
              : [];

            return (
              <section key={slicer.id} className="rounded-lg border bg-card p-3">
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
                      {slicer.name}
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
                    onClick={() => onDeleteSlicer(slicer.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete slicer</span>
                  </Button>
                </div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant={slicer.selectedValues.length ? "outline" : "secondary"}>
                    {slicer.selectedValues.length
                      ? `${slicer.selectedValues.length} selected`
                      : "All"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || slicer.selectedValues.length === 0}
                    onClick={() => onUpdateSlicerValues(slicer.id, [])}
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-48 space-y-1 overflow-auto pr-1">
                  {options.length === 0 ? (
                    <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                      No values in this table column.
                    </p>
                  ) : (
                    options.map((option) => {
                      const active =
                        slicer.selectedValues.length === 0 ||
                        slicer.selectedValues.includes(option.value);

                      return (
                        <Button
                          key={`${slicer.id}:${option.value}`}
                          type="button"
                          variant={active ? "secondary" : "ghost"}
                          size="sm"
                          className="h-auto w-full justify-between gap-2 px-2 py-1 text-left"
                          disabled={disabled}
                          onClick={() =>
                            onUpdateSlicerValues(
                              slicer.id,
                              toggleValue(slicer.selectedValues, option.value),
                            )
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
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
