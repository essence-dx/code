"use client";

import type { Column } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  EyeOff,
  X,
} from "lucide-react";
import type * as React from "react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DataTableColumnHeaderCopy = {
  asc: string;
  desc: string;
  reset: string;
  hide: string;
};

const defaultColumnHeaderCopy: DataTableColumnHeaderCopy = {
  asc: "Asc",
  desc: "Desc",
  reset: "Reset",
  hide: "Hide",
};

type DataTableColumnHeaderProps<TData, TValue> = React.ComponentProps<
  typeof DropdownMenuTrigger
> & {
  column: Column<TData, TValue>;
  label: string;
  copy?: DataTableColumnHeaderCopy;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  label,
  copy = defaultColumnHeaderCopy,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{label}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {label}
        {column.getCanSort() &&
          (column.getIsSorted() === "desc" ? (
            <ChevronDown />
          ) : column.getIsSorted() === "asc" ? (
            <ChevronUp />
          ) : (
            <ChevronsUpDown />
          ))}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28">
        {column.getCanSort() ? (
          <>
            <DropdownMenuCheckboxItem
              className="relative pl-2 pr-8 [&>span:first-child]:left-auto [&>span:first-child]:right-2 [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === "asc"}
              onClick={() => column.toggleSorting(false)}
            >
              <ChevronUp />
              {copy.asc}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="relative pl-2 pr-8 [&>span:first-child]:left-auto [&>span:first-child]:right-2 [&_svg]:text-muted-foreground"
              checked={column.getIsSorted() === "desc"}
              onClick={() => column.toggleSorting(true)}
            >
              <ChevronDown />
              {copy.desc}
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() ? (
              <DropdownMenuItem
                className="pl-2 [&_svg]:text-muted-foreground"
                onClick={() => column.clearSorting()}
              >
                <X />
                {copy.reset}
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        {column.getCanHide() ? (
          <DropdownMenuCheckboxItem
            className="relative pl-2 pr-8 [&>span:first-child]:left-auto [&>span:first-child]:right-2 [&_svg]:text-muted-foreground"
            checked={!column.getIsVisible()}
            onClick={() => column.toggleVisibility(false)}
          >
            <EyeOff />
            {copy.hide}
          </DropdownMenuCheckboxItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
