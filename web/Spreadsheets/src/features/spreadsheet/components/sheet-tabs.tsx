"use client";

import { useState } from "react";
import { Copy, Palette, Plus, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SelectionSummaryBar } from "@/features/spreadsheet/components/selection-summary-bar";
import { cn } from "@/lib/utils";
import type { SelectionSummary } from "@/features/spreadsheet/selection-summary";
import type { SheetData } from "@/features/workbooks/types";

const sheetTabColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function SheetTabs({
  sheets,
  activeSheetId,
  isWorkbookProtected,
  onSelect,
  onAdd,
  onRename,
  onSetTabColor,
  onDuplicate,
  onDelete,
  selectionSummary,
  readOnly = false,
  isActiveSheetProtected = false,
  className,
}: {
  sheets: SheetData[];
  activeSheetId: string;
  isWorkbookProtected: boolean;
  onSelect: (sheetId: string) => void;
  onAdd: () => void;
  onRename: (sheetId: string, name: string) => void;
  onSetTabColor: (sheetId: string, color?: string) => void;
  onDuplicate: (sheetId: string) => void;
  onDelete: (sheetId: string) => void;
  selectionSummary: SelectionSummary;
  readOnly?: boolean;
  isActiveSheetProtected?: boolean;
  className?: string;
}) {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId);
  const tabActionsDisabled = readOnly || isWorkbookProtected;
  const canDeleteActiveSheet =
    !tabActionsDisabled && !isActiveSheetProtected && Boolean(activeSheet) && sheets.length > 1;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 border-t bg-card px-3 py-2",
        className,
      )}
    >
      <ScrollArea
        className="min-w-0 flex-1"
        viewportClassName="h-9"
        showHorizontalScrollBar
        showVerticalScrollBar={false}
      >
        <div className="flex h-9 w-max min-w-full items-center gap-1 pr-2">
          {sheets.map((sheet) => (
            editingSheetId === sheet.id ? (
              <Input
                key={sheet.id}
                autoFocus
                defaultValue={sheet.name}
                className="h-8 w-36 shrink-0"
                onBlur={(event) => {
                  if (!tabActionsDisabled) {
                    onRename(sheet.id, event.target.value);
                  }
                  setEditingSheetId(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (!tabActionsDisabled) {
                      onRename(sheet.id, event.currentTarget.value);
                    }
                    setEditingSheetId(null);
                  }
                  if (event.key === "Escape") {
                    setEditingSheetId(null);
                  }
                }}
              />
            ) : (
              <button
                key={sheet.id}
                type="button"
                onClick={() => onSelect(sheet.id)}
                onDoubleClick={() => {
                  if (!tabActionsDisabled) {
                    setEditingSheetId(sheet.id);
                  }
                }}
                className={cn(
                  "h-8 max-w-[45vw] shrink-0 truncate rounded-md border-b-2 px-3 text-sm transition-colors sm:max-w-56",
                  activeSheetId === sheet.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                style={{ borderBottomColor: sheet.tabColor ?? "transparent" }}
              >
                {sheet.name}
              </button>
            )
          ))}
        </div>
      </ScrollArea>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={tabActionsDisabled || !activeSheet}
              >
                <Palette />
                <span className="sr-only">Color active sheet tab</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Color active sheet tab</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-48">
          <div className="grid grid-cols-4 gap-2 p-2">
            {sheetTabColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set sheet tab color ${color}`}
                className="size-7 rounded-md border transition-transform hover:scale-105"
                style={{ backgroundColor: color }}
                disabled={tabActionsDisabled}
                onClick={() =>
                  !tabActionsDisabled && activeSheet
                    ? onSetTabColor(activeSheet.id, color)
                    : undefined
                }
              />
            ))}
          </div>
          <DropdownMenuItem
            disabled={tabActionsDisabled || !activeSheet?.tabColor}
            onClick={() =>
              !tabActionsDisabled && activeSheet
                ? onSetTabColor(activeSheet.id)
                : undefined
            }
          >
            Clear color
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={tabActionsDisabled}
            onClick={onAdd}
          >
            <Plus />
            <span className="sr-only">Add sheet</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add sheet</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={tabActionsDisabled || !activeSheet}
            onClick={() => activeSheet && onDuplicate(activeSheet.id)}
          >
            <Copy />
            <span className="sr-only">Duplicate sheet</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate active sheet</TooltipContent>
      </Tooltip>
      <ConfirmDestructiveButton
        title="Delete active sheet?"
        description="This permanently removes the active worksheet and its charts, rules, notes, links, and saved settings."
        label="Delete sheet"
        disabled={!canDeleteActiveSheet}
        onConfirm={() => activeSheet && onDelete(activeSheet.id)}
      >
        <Trash2 />
      </ConfirmDestructiveButton>
      <div className="hidden min-w-0 overflow-hidden sm:block">
        <SelectionSummaryBar summary={selectionSummary} />
      </div>
    </div>
  );
}
