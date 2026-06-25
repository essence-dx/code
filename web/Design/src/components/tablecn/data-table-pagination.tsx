"use client";

import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataTablePaginationProps<TData> = React.ComponentProps<"div"> & {
  table: Table<TData>;
  pageSizeOptions?: number[];
  copy?: DataTablePaginationCopy;
};

export type DataTablePaginationCopy = {
  selectedRows: (selected: number, total: number) => string;
  rowsPerPage: string;
  pageOf: (page: number, total: number) => string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
};

const defaultPaginationCopy: DataTablePaginationCopy = {
  selectedRows: (selected, total) =>
    `${selected} of ${total} row(s) selected.`,
  rowsPerPage: "Rows per page",
  pageOf: (page, total) => `Page ${page} of ${total}`,
  firstPage: "Go to first page",
  previousPage: "Go to previous page",
  nextPage: "Go to next page",
  lastPage: "Go to last page",
};

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [5, 10, 20, 30],
  copy = defaultPaginationCopy,
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8",
        className,
      )}
      {...props}
    >
      <div className="flex-1 whitespace-nowrap text-sm text-muted-foreground">
        {copy.selectedRows(
          table.getFilteredSelectedRowModel().rows.length,
          table.getFilteredRowModel().rows.length,
        )}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap text-sm font-medium">
            {copy.rowsPerPage}
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-18">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          {copy.pageOf(
            table.getState().pagination.pageIndex + 1,
            table.getPageCount(),
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label={copy.firstPage}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label={copy.previousPage}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label={copy.nextPage}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            aria-label={copy.lastPage}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
