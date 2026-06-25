import { isCellInRange } from "@/features/spreadsheet/components/grid-geometry";
import type { TableDefinition } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function getTableCell(
  tables: TableDefinition[],
  rowIndex: number,
  columnIndex: number,
) {
  const table = tables.find((item) =>
    isCellInRange(rowIndex, columnIndex, item.range),
  );

  if (!table) {
    return null;
  }

  const isHeader =
    table.showHeaderRow && rowIndex === table.range.startRowIndex;
  const isTotal =
    table.showTotalsRow && rowIndex === table.range.endRowIndex;

  return {
    table,
    kind: isHeader ? "header" : isTotal ? "total" : "body",
  } as const;
}

export function getTableCellClass(
  tableCell: ReturnType<typeof getTableCell>,
  rowIndex: number,
) {
  if (!tableCell) {
    return "";
  }

  const isBanded =
    tableCell.kind === "body" &&
    (rowIndex - tableCell.table.range.startRowIndex) % 2 === 0;
  const styleClasses = {
    blue: {
      header: "bg-primary/20 text-primary",
      body: isBanded ? "bg-primary/5" : "bg-background",
      total: "border-t-2 border-primary/60 bg-primary/10 text-primary",
    },
    green: {
      header:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      body: isBanded ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-background",
      total:
        "border-t-2 border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    },
    slate: {
      header:
        "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
      body: isBanded ? "bg-slate-50 dark:bg-slate-900/50" : "bg-background",
      total:
        "border-t-2 border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    },
  } satisfies Record<
    TableDefinition["style"],
    Record<"header" | "body" | "total", string>
  >;

  return cn(
    styleClasses[tableCell.table.style][tableCell.kind],
    tableCell.kind !== "body" && "font-semibold",
  );
}
