"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChartDataTable } from "@/features/spreadsheet/chart-data-table";

export function ChartDataTableView({
  dataTable,
  showLegendKeys,
}: {
  dataTable: ChartDataTable;
  showLegendKeys: boolean;
}) {
  if (dataTable.headers.length === 0 || dataTable.rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-7 w-24 px-2 text-[10px]">Category</TableHead>
            {dataTable.headers.map((header, index) => (
              <TableHead
                key={`${header}-${index}`}
                className="h-7 px-2 text-right text-[10px]"
              >
                {showLegendKeys ? (
                  <span className="mr-1 inline-block size-2 rounded-sm bg-current align-middle" />
                ) : null}
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataTable.rows.map((row, rowIndex) => (
            <TableRow key={`${row.label}-${rowIndex}`}>
              <TableCell className="h-7 max-w-28 truncate px-2 text-[11px] text-muted-foreground">
                {row.label}
              </TableCell>
              {row.values.map((value, index) => (
                <TableCell
                  key={`${row.label}-${rowIndex}-${index}`}
                  className="h-7 px-2 text-right font-mono text-[11px]"
                >
                  {value || "-"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {dataTable.truncated ? (
        <p className="border-t px-2 py-1 text-[10px] text-muted-foreground">
          Showing the first rows and series from the chart range.
        </p>
      ) : null}
    </div>
  );
}
