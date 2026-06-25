"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TablecnColumn<TData> = {
  id: string;
  header: string;
  accessor: (row: TData) => React.ReactNode;
  cell?: (row: TData) => React.ReactNode;
  filterValue?: (row: TData) => string;
  sortValue?: (row: TData) => string | number | Date | null | undefined;
  className?: string;
  sortable?: boolean;
};

type TablecnDataTableProps<TData> = {
  columns: TablecnColumn<TData>[];
  data: TData[];
  emptyText: string;
  searchPlaceholder?: string;
  title?: string;
};

function normalizeSortValue(value: string | number | Date | null | undefined) {
  if (value instanceof Date) {
    return value.getTime();
  }

  return value ?? "";
}

export function TablecnDataTable<TData>({
  columns,
  data,
  emptyText,
  searchPlaceholder = "Search...",
  title,
}: TablecnDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });

  const columnDefs = React.useMemo<ColumnDef<TData>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row) => normalizeSortValue(column.sortValue?.(row)),
        enableSorting: column.sortable ?? true,
        header: ({ column: tableColumn }) => {
          const sorted = tableColumn.getIsSorted();

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2"
              onClick={() => tableColumn.toggleSorting(sorted === "asc")}
              disabled={!tableColumn.getCanSort()}
            >
              {column.header}
              {sorted === "asc" ? (
                <ArrowUp className="size-3.5" />
              ) : sorted === "desc" ? (
                <ArrowDown className="size-3.5" />
              ) : (
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => column.cell?.(row.original) ?? column.accessor(row.original),
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue ?? "").trim().toLowerCase();

      if (!query) {
        return true;
      }

      return columns.some((column) =>
        String(column.filterValue?.(row.original) ?? column.sortValue?.(row.original) ?? "")
          .toLowerCase()
          .includes(query),
      );
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
          <Badge variant="secondary" className="font-mono">
            {table.getFilteredRowModel().rows.length} rows
          </Badge>
        </div>
        <Input
          value={globalFilter}
          onChange={(event) => {
            setGlobalFilter(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder={searchPlaceholder}
          className="sm:max-w-64"
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={cn("bg-muted/40", columns[index]?.className)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell key={cell.id} className={columns[index]?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
