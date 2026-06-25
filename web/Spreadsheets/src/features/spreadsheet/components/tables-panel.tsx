"use client";

import { Table2, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { columnLabel } from "@/features/workbooks/addresses";
import type { TableDefinition } from "@/features/workbooks/types";

const tableStyles: Array<{
  label: string;
  value: TableDefinition["style"];
}> = [
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
  { label: "Slate", value: "slate" },
];

function formatRange(table: TableDefinition) {
  const start = `${columnLabel(table.range.startColumnIndex)}${
    table.range.startRowIndex + 1
  }`;
  const end = `${columnLabel(table.range.endColumnIndex)}${
    table.range.endRowIndex + 1
  }`;

  return `${start}:${end}`;
}

export function TablesPanel({
  disabled,
  tables,
  onDeleteTable,
  onRenameTable,
  onResizeTableToSelection,
  onSelectTable,
  onToggleTableFilterButtons,
  onToggleTableHeaderRow,
  onToggleTableTotals,
  onUpdateTableStyle,
}: {
  disabled?: boolean;
  tables: TableDefinition[];
  onDeleteTable: (tableId: string) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onResizeTableToSelection: (tableId: string) => void;
  onSelectTable: (table: TableDefinition) => void;
  onToggleTableFilterButtons: (tableId: string) => void;
  onToggleTableHeaderRow: (tableId: string) => void;
  onToggleTableTotals: (tableId: string) => void;
  onUpdateTableStyle: (
    tableId: string,
    style: TableDefinition["style"],
  ) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tables</h2>
        <Badge variant="secondary" className="font-mono">
          {tables.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {tables.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No structured tables on this sheet.
          </p>
        ) : (
          tables.map((table) => (
            <section key={table.id} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 font-mono"
                  onClick={() => onSelectTable(table)}
                >
                  <Table2 />
                  {formatRange(table)}
                </Button>
                <ConfirmDestructiveButton
                  title="Delete this table?"
                  description="This removes the structured table definition and keeps the cell values in place."
                  label="Delete table"
                  disabled={disabled}
                  onConfirm={() => onDeleteTable(table.id)}
                >
                  <Trash2 />
                </ConfirmDestructiveButton>
              </div>
              <Input
                defaultValue={table.name}
                disabled={disabled}
                aria-label="Table name"
                className="mb-2 h-8 font-mono text-xs"
                onBlur={(event) => onRenameTable(table.id, event.target.value)}
              />
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <select
                  value={table.style}
                  disabled={disabled}
                  aria-label="Table style"
                  className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) =>
                    onUpdateTableStyle(
                      table.id,
                      event.target.value as TableDefinition["style"],
                    )
                  }
                >
                  {tableStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant={table.showTotalsRow ? "secondary" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onToggleTableTotals(table.id)}
                >
                  Totals
                </Button>
              </div>
              <Button
                type="button"
                variant={table.showFilterButtons ? "secondary" : "outline"}
                size="sm"
                className="mt-2 w-full"
                disabled={disabled}
                onClick={() => onToggleTableFilterButtons(table.id)}
              >
                Filter buttons
              </Button>
              <Button
                type="button"
                variant={table.showHeaderRow ? "secondary" : "outline"}
                size="sm"
                className="mt-2 w-full"
                disabled={disabled}
                onClick={() => onToggleTableHeaderRow(table.id)}
              >
                Header row
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                disabled={disabled}
                onClick={() => onResizeTableToSelection(table.id)}
              >
                Resize to selection
              </Button>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
