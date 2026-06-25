"use client";

import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp, EyeOff, X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> extends React.ComponentProps<typeof Button> {
  column: Column<TData, TValue>;
  label: string;
}

export function DataTableColumnHeader<TData, TValue>({ column, label, className, ...props }: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{label}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className={cn("-ml-2 h-8 justify-start gap-1.5 px-2", className)} size="sm" variant="ghost" {...props}>
            {label}
            {column.getCanSort() ? column.getIsSorted() === "desc" ? <ChevronDown /> : column.getIsSorted() === "asc" ? <ChevronUp /> : <ChevronsUpDown /> : null}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-32">
        {column.getCanSort() ? (
          <>
            <DropdownMenuCheckboxItem checked={column.getIsSorted() === "asc"} onClick={() => column.toggleSorting(false)}>
              <ChevronUp />
              Asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={column.getIsSorted() === "desc"} onClick={() => column.toggleSorting(true)}>
              <ChevronDown />
              Desc
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() ? (
              <DropdownMenuItem onClick={() => column.clearSorting()}>
                <X />
                Reset
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        {column.getCanHide() ? (
          <DropdownMenuCheckboxItem checked={!column.getIsVisible()} onClick={() => column.toggleVisibility(false)}>
            <EyeOff />
            Hide
          </DropdownMenuCheckboxItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
