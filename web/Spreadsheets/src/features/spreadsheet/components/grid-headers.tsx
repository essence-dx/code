import type { DragEvent, PointerEvent } from "react";
import { GripHorizontal, GripVertical, Minus, Plus } from "lucide-react";
import { columnLabel } from "@/features/workbooks/addresses";
import { ColumnFilterMenu } from "@/features/spreadsheet/components/column-filter-menu";
import {
  getActiveColumnFilterValues,
  hasActiveColumnFilter,
} from "@/features/spreadsheet/components/grid-filter-helpers";
import {
  getFrozenColumnStyle,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  SheetFilterRule,
  SheetOutlineGroup,
} from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

type ColumnFilterApplyInput = {
  range: CellRange;
  columnIndex: number;
  headerName?: string;
  values: string[];
};

type ColumnFilterClearInput = {
  range: CellRange;
  columnIndex: number;
};

const PAGE_BREAK_DRAG_TYPE = "application/x-essence-page-break";

type PageBreakAxis = "column" | "row";

function setPageBreakDragData(
  event: DragEvent<HTMLButtonElement>,
  axis: PageBreakAxis,
  index: number,
) {
  const value = `${axis}:${index}`;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(PAGE_BREAK_DRAG_TYPE, value);
  event.dataTransfer.setData("text/plain", value);
}

function getPageBreakDragIndex(
  event: DragEvent,
  axis: PageBreakAxis,
): number | null {
  const value =
    event.dataTransfer.getData(PAGE_BREAK_DRAG_TYPE) ||
    event.dataTransfer.getData("text/plain");
  const [dragAxis, rawIndex] = value.split(":");
  const index = Number(rawIndex);

  if (dragAxis !== axis || !Number.isInteger(index) || index <= 0) {
    return null;
  }

  return index;
}

export function GridSelectAllCorner({
  sheet,
  isRightToLeft,
  onSelectRange,
}: {
  sheet: SheetData;
  isRightToLeft: boolean;
  onSelectRange: (range: CellRange) => void;
}) {
  return (
    <button
      type="button"
      role="columnheader"
      aria-label="Select all cells"
      aria-colindex={1}
      className={cn(
        "sticky z-30 h-full border-b bg-muted hover:bg-accent",
        isRightToLeft ? "right-0 border-l" : "left-0 border-r",
      )}
      onClick={() => {
        onSelectRange({
          startRowIndex: 0,
          startColumnIndex: 0,
          endRowIndex: sheet.rowCount - 1,
          endColumnIndex: sheet.columnCount - 1,
        });
      }}
    />
  );
}

export function GridColumnHeader({
  sheet,
  selectedRange,
  filters,
  computedValues,
  columnIndex,
  frozenLeft,
  gridColumnStart,
  zoomScale,
  isProtected,
  isFrozen,
  hasPageBreak,
  showPageBreaks,
  outlineGroup,
  isRightToLeft,
  onSelectRange,
  onStartResize,
  onTogglePageBreak,
  onMovePageBreak,
  onToggleOutlineGroup,
  onApplyColumnValueFilter,
  onClearColumnFilters,
}: {
  sheet: SheetData;
  selectedRange: CellRange;
  filters: SheetFilterRule[];
  computedValues: Record<string, string>;
  columnIndex: number;
  frozenLeft?: number;
  gridColumnStart?: number;
  zoomScale: number;
  isProtected: boolean;
  isFrozen: boolean;
  hasPageBreak: boolean;
  showPageBreaks: boolean;
  outlineGroup: SheetOutlineGroup | null;
  isRightToLeft: boolean;
  onSelectRange: (range: CellRange) => void;
  onStartResize: (
    event: PointerEvent<HTMLButtonElement>,
    columnIndex: number,
  ) => void;
  onTogglePageBreak?: (columnIndex: number) => void;
  onMovePageBreak?: (fromColumnIndex: number, toColumnIndex: number) => void;
  onToggleOutlineGroup: (groupId: string) => void;
  onApplyColumnValueFilter: (input: ColumnFilterApplyInput) => void;
  onClearColumnFilters: (input: ColumnFilterClearInput) => void;
}) {
  const columnFilterRange = {
    startRowIndex: 0,
    startColumnIndex: columnIndex,
    endRowIndex: sheet.rowCount - 1,
    endColumnIndex: columnIndex,
  };
  const canEditPageBreak =
    showPageBreaks && columnIndex > 0 && !isProtected && onTogglePageBreak;

  return (
    <div
      className={cn(
        "group relative h-full border-b border-r bg-muted text-center font-mono text-xs text-muted-foreground",
        isFrozen && "shadow-[1px_0_0_var(--border)]",
        selectedRange.startColumnIndex <= columnIndex &&
          selectedRange.endColumnIndex >= columnIndex &&
          selectedRange.startRowIndex === 0 &&
          selectedRange.endRowIndex === sheet.rowCount - 1 &&
          "bg-primary/10 text-primary",
      )}
      style={{
        ...getFrozenColumnStyle(isFrozen, frozenLeft, isRightToLeft),
        gridColumn: gridColumnStart,
        zIndex: isFrozen ? 25 : undefined,
      }}
      onDragOver={(event) => {
        if (canEditPageBreak && onMovePageBreak) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (!canEditPageBreak || !onMovePageBreak) {
          return;
        }

        const sourceIndex = getPageBreakDragIndex(event, "column");

        if (sourceIndex === null) {
          return;
        }

        event.preventDefault();
        onMovePageBreak(sourceIndex, columnIndex);
      }}
    >
      {hasPageBreak ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[2] w-0.5 bg-primary",
            isRightToLeft ? "right-0" : "left-0",
          )}
        />
      ) : null}
      <button
        type="button"
        role="columnheader"
        aria-colindex={columnIndex + 2}
        aria-label={`Select column ${columnLabel(columnIndex)}`}
        className={cn(
          "absolute inset-0 px-6 py-1 hover:bg-accent",
          isRightToLeft ? "pl-7" : "pr-7",
        )}
        style={{ fontSize: `${scaleSize(12, zoomScale)}px` }}
        onClick={() => {
          onSelectRange({
            startRowIndex: 0,
            startColumnIndex: columnIndex,
            endRowIndex: sheet.rowCount - 1,
            endColumnIndex: columnIndex,
          });
        }}
      >
        {columnLabel(columnIndex)}
      </button>
      {outlineGroup ? (
        <button
          type="button"
          aria-label={`${
            outlineGroup.collapsed ? "Expand" : "Collapse"
          } column group starting at ${columnLabel(columnIndex)}`}
          className={cn(
            "absolute top-1 z-10 flex h-4 w-4 items-center justify-center rounded-sm border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            isRightToLeft ? "right-1" : "left-1",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleOutlineGroup(outlineGroup.id);
          }}
        >
          {outlineGroup.collapsed ? (
            <Plus className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
        </button>
      ) : null}
      {canEditPageBreak ? (
        <button
          type="button"
          draggable={hasPageBreak}
          aria-label={`Toggle page break before column ${columnLabel(columnIndex)}`}
          className={cn(
            "absolute top-1/2 z-20 flex h-5 w-4 -translate-y-1/2 items-center justify-center rounded-sm border bg-background text-primary shadow-sm transition-opacity hover:bg-primary hover:text-primary-foreground",
            isRightToLeft ? "right-0" : "left-0",
            hasPageBreak
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePageBreak(columnIndex);
          }}
          onDragStart={(event) => {
            event.stopPropagation();
            setPageBreakDragData(event, "column", columnIndex);
          }}
        >
          <GripVertical className="size-3" />
        </button>
      ) : null}
      <ColumnFilterMenu
        label={`Column ${columnLabel(columnIndex)}`}
        sheet={sheet}
        computedValues={computedValues}
        range={columnFilterRange}
        columnIndex={columnIndex}
        active={hasActiveColumnFilter(filters, columnFilterRange, columnIndex)}
        activeValues={getActiveColumnFilterValues(
          filters,
          columnFilterRange,
          columnIndex,
        )}
        disabled={isProtected}
        className={cn(
          "absolute top-1 z-10",
          isRightToLeft ? "left-1" : "right-1",
        )}
        onApplyValueFilter={onApplyColumnValueFilter}
        onClearColumnFilters={onClearColumnFilters}
      />
      <button
        type="button"
        aria-label={`Resize column ${columnLabel(columnIndex)}`}
        className={cn(
          "absolute inset-y-0 w-1 cursor-col-resize hover:bg-primary",
          isRightToLeft ? "left-0" : "right-0",
        )}
        onPointerDown={(event) => onStartResize(event, columnIndex)}
      />
    </div>
  );
}

export function GridRowHeader({
  sheet,
  selectedRange,
  rowIndex,
  zoomScale,
  isFrozen,
  isProtected,
  hasPageBreak,
  showPageBreaks,
  outlineGroup,
  isRightToLeft,
  onSelectRange,
  onTogglePageBreak,
  onMovePageBreak,
  onToggleOutlineGroup,
}: {
  sheet: SheetData;
  selectedRange: CellRange;
  rowIndex: number;
  zoomScale: number;
  isFrozen: boolean;
  isProtected: boolean;
  hasPageBreak: boolean;
  showPageBreaks: boolean;
  outlineGroup: SheetOutlineGroup | null;
  isRightToLeft: boolean;
  onSelectRange: (range: CellRange) => void;
  onTogglePageBreak?: (rowIndex: number) => void;
  onMovePageBreak?: (fromRowIndex: number, toRowIndex: number) => void;
  onToggleOutlineGroup: (groupId: string) => void;
}) {
  const canEditPageBreak =
    showPageBreaks &&
    rowIndex > 0 &&
    !isProtected &&
    onTogglePageBreak &&
    onMovePageBreak;

  return (
    <div
      className={cn(
        "group sticky z-10 h-full border-b bg-muted font-mono text-xs text-muted-foreground",
        isRightToLeft ? "right-0 border-l" : "left-0 border-r",
        isFrozen && "z-20 shadow-[0_1px_0_var(--border)]",
        selectedRange.startRowIndex <= rowIndex &&
          selectedRange.endRowIndex >= rowIndex &&
          selectedRange.startColumnIndex === 0 &&
          selectedRange.endColumnIndex === sheet.columnCount - 1 &&
          "bg-primary/10 text-primary",
      )}
      style={{ fontSize: `${scaleSize(12, zoomScale)}px` }}
      onDragOver={(event) => {
        if (canEditPageBreak) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (!canEditPageBreak || !onMovePageBreak) {
          return;
        }

        const sourceIndex = getPageBreakDragIndex(event, "row");

        if (sourceIndex === null) {
          return;
        }

        event.preventDefault();
        onMovePageBreak(sourceIndex, rowIndex);
      }}
    >
      <button
        type="button"
        role="rowheader"
        aria-colindex={1}
        aria-label={`Select row ${rowIndex + 1}`}
        className={cn(
          "absolute inset-0 px-2 py-1 hover:bg-accent",
          isRightToLeft ? "pr-6 text-left" : "pl-6 text-right",
        )}
        onClick={() => {
          onSelectRange({
            startRowIndex: rowIndex,
            startColumnIndex: 0,
            endRowIndex: rowIndex,
            endColumnIndex: sheet.columnCount - 1,
          });
        }}
      >
        {rowIndex + 1}
      </button>
      {outlineGroup ? (
        <button
          type="button"
          aria-label={`${
            outlineGroup.collapsed ? "Expand" : "Collapse"
          } row group starting at row ${rowIndex + 1}`}
          className={cn(
            "absolute top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-sm border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            isRightToLeft ? "right-1" : "left-1",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleOutlineGroup(outlineGroup.id);
          }}
        >
          {outlineGroup.collapsed ? (
            <Plus className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
        </button>
      ) : null}
      {canEditPageBreak ? (
        <button
          type="button"
          draggable={hasPageBreak}
          aria-label={`Toggle page break before row ${rowIndex + 1}`}
          className={cn(
            "absolute inset-x-1 top-0 z-20 flex h-4 items-center justify-center rounded-sm border bg-background text-primary shadow-sm transition-opacity hover:bg-primary hover:text-primary-foreground",
            hasPageBreak
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePageBreak(rowIndex);
          }}
          onDragStart={(event) => {
            event.stopPropagation();
            setPageBreakDragData(event, "row", rowIndex);
          }}
        >
          <GripHorizontal className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
