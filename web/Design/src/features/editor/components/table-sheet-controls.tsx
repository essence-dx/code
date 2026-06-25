"use client";

import { Copy, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  addTableSheet,
  duplicateTableSheet,
  getActiveTableSheet,
  getTableSheets,
  removeTableSheet,
  renameTableSheet,
  switchTableSheet,
} from "@/features/editor/table-sheets";
import type { TableElement } from "@/features/editor/types";

export function TableSheetControls({
  element,
  onUpdateWorkbook,
}: {
  element: TableElement;
  onUpdateWorkbook: (updates: Partial<TableElement>) => void;
}) {
  const sheets = getTableSheets(element);
  const activeSheet = getActiveTableSheet(element);

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Sheets</Label>
        <span className="text-xs text-muted-foreground">
          {sheets.length} {sheets.length === 1 ? "sheet" : "sheets"}
        </span>
      </div>
      <ScrollArea showHorizontalScrollBar>
        <div className="flex gap-2 pb-1">
          {sheets.map((sheet) => (
            <Button
              key={sheet.id}
              type="button"
              variant={sheet.id === activeSheet.id ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() =>
                onUpdateWorkbook(switchTableSheet(element, sheet.id))
              }
            >
              {sheet.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">
          Active sheet name
        </Label>
        <Input
          value={activeSheet.name}
          onChange={(event) =>
            onUpdateWorkbook(
              renameTableSheet(element, activeSheet.id, event.target.value),
            )
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdateWorkbook(addTableSheet(element))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdateWorkbook(duplicateTableSheet(element))}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sheets.length <= 1}
          onClick={() =>
            onUpdateWorkbook(removeTableSheet(element, activeSheet.id))
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}
