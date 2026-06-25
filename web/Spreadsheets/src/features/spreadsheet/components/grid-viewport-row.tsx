import type { VirtualItem } from "@tanstack/react-virtual";
import {
  GridCell,
  type GridCellHoverInput,
  type GridCellPointerInput,
  type GridTouchSelectionHandleInput,
} from "@/features/spreadsheet/components/grid-cell";
import {
  getMergedCell,
  getVisibleMergeGeometry,
} from "@/features/spreadsheet/components/grid-geometry";
import { GridRowHeader } from "@/features/spreadsheet/components/grid-headers";
import { getOutlineGroupStartingAt } from "@/features/spreadsheet/outline-groups";
import { cellKey } from "@/features/workbooks/addresses";
import type {
  GridColumnSpacer,
  RenderedGridColumn,
} from "@/features/spreadsheet/components/use-grid-column-sizing";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  CellStyle,
  DataValidationRule,
  SheetData,
  SheetFilterRule,
  SparklineDefinition,
  TableDefinition,
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

export function GridViewportRow({
  virtualRow,
  rowIndex,
  sheet,
  selectedKey,
  selectedRange,
  computedValues,
  conditionalStyles,
  dataValidations,
  filters,
  sparklinesByCellKey,
  tables,
  invalidKeys,
  formulaErrorKeys,
  spillAnchorKeys,
  spillBlockedKeys,
  spillKeys,
  linkedKeys,
  notedKeys,
  highlightedKeys,
  activeHighlightKey,
  editingKey,
  draft,
  zoomScale,
  gridTemplateColumns,
  frozenRowTop,
  visibleRowIndexes,
  leftColumnSpacer,
  renderedColumns,
  rightColumnSpacer,
  columnPageBreaks,
  isProtected,
  isFrozenRow,
  hasRowPageBreak,
  showPageBreaks,
  showGridlines,
  isRightToLeft,
  isCellProtected,
  onToggleRowGroup,
  onToggleRowPageBreak,
  onMoveRowPageBreak,
  onSelectRange,
  onPointerDownCell,
  onPointerEnterCell,
  onStartFillHandle,
  onStartTouchSelectionHandle,
  onEditKeyChange,
  onDraftChange,
  onUpdateCell,
  onUpdateRange,
  onApplyColumnValueFilter,
  onClearColumnFilters,
}: {
  virtualRow: VirtualItem;
  rowIndex: number;
  sheet: SheetData;
  selectedKey: string;
  selectedRange: CellRange;
  computedValues: Record<string, string>;
  conditionalStyles: Record<string, CellStyle>;
  dataValidations: DataValidationRule[];
  filters: SheetFilterRule[];
  sparklinesByCellKey: Map<string, SparklineDefinition>;
  tables: TableDefinition[];
  invalidKeys: Set<string>;
  formulaErrorKeys: Set<string>;
  spillAnchorKeys: Set<string>;
  spillBlockedKeys: Set<string>;
  spillKeys: Set<string>;
  linkedKeys: Set<string>;
  notedKeys: Set<string>;
  highlightedKeys: Set<string>;
  activeHighlightKey: string | null;
  editingKey: string | null;
  draft: string;
  zoomScale: number;
  gridTemplateColumns: string;
  frozenRowTop: number;
  visibleRowIndexes: number[];
  leftColumnSpacer: GridColumnSpacer | null;
  renderedColumns: RenderedGridColumn[];
  rightColumnSpacer: GridColumnSpacer | null;
  columnPageBreaks: Set<number>;
  isProtected: boolean;
  isFrozenRow: boolean;
  hasRowPageBreak: boolean;
  showPageBreaks: boolean;
  showGridlines: boolean;
  isRightToLeft: boolean;
  isCellProtected: (rowIndex: number, columnIndex: number) => boolean;
  onToggleRowGroup: (groupId: string) => void;
  onToggleRowPageBreak?: (rowIndex: number) => void;
  onMoveRowPageBreak?: (fromRowIndex: number, toRowIndex: number) => void;
  onSelectRange: (range: CellRange) => void;
  onPointerDownCell: (input: GridCellPointerInput) => void;
  onPointerEnterCell: (input: GridCellHoverInput) => void;
  onStartFillHandle: () => void;
  onStartTouchSelectionHandle: (input: GridTouchSelectionHandleInput) => void;
  onEditKeyChange: (key: string | null) => void;
  onDraftChange: (draft: string) => void;
  onUpdateCell: (raw: string) => void;
  onUpdateRange: (raw: string) => void;
  onApplyColumnValueFilter: (input: ColumnFilterApplyInput) => void;
  onClearColumnFilters: (input: ColumnFilterClearInput) => void;
}) {
  const renderedColumnIndexes = renderedColumns.map(
    (renderedColumn) => renderedColumn.columnIndex,
  );

  return (
    <div
      key={virtualRow.key}
      role="row"
      aria-rowindex={rowIndex + 2}
      className={cn(
        isFrozenRow
          ? cn(
              "sticky z-[18] grid w-full bg-background",
              isRightToLeft ? "right-0" : "left-0",
            )
          : "absolute left-0 grid w-full",
      )}
      style={{
        height: `${virtualRow.size}px`,
        ...(isFrozenRow
          ? { top: `${frozenRowTop}px` }
          : { transform: `translateY(${virtualRow.start}px)` }),
        gridTemplateColumns,
      }}
    >
      {hasRowPageBreak ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-0.5 bg-primary"
        />
      ) : null}
      <GridRowHeader
        sheet={sheet}
        selectedRange={selectedRange}
        rowIndex={rowIndex}
        zoomScale={zoomScale}
        isFrozen={isFrozenRow}
        isProtected={isProtected}
        hasPageBreak={hasRowPageBreak}
        showPageBreaks={showPageBreaks}
        outlineGroup={getOutlineGroupStartingAt(sheet.rowGroups ?? [], rowIndex)}
        isRightToLeft={isRightToLeft}
        onSelectRange={onSelectRange}
        onTogglePageBreak={onToggleRowPageBreak}
        onMovePageBreak={onMoveRowPageBreak}
        onToggleOutlineGroup={onToggleRowGroup}
      />
      {leftColumnSpacer ? (
        <div
          aria-hidden="true"
          className={cn("h-full", showGridlines && "border-b")}
          style={{ gridColumn: leftColumnSpacer.gridColumnStart }}
        />
      ) : null}
      {renderedColumns.map((column) => {
        const mergedCell = getMergedCell(sheet, rowIndex, column.columnIndex);
        const mergeGeometry = mergedCell
          ? getVisibleMergeGeometry(
              sheet,
              mergedCell,
              visibleRowIndexes,
              renderedColumnIndexes,
              zoomScale,
            )
          : null;
        const isMergeAnchor =
          mergedCell &&
          mergeGeometry &&
          rowIndex === mergeGeometry.anchorRowIndex &&
          column.columnIndex === mergeGeometry.anchorColumnIndex;

        if (mergedCell && !isMergeAnchor) {
          return null;
        }

        const hasColumnPageBreak =
          showPageBreaks && columnPageBreaks.has(column.columnIndex);
        const renderedKey = cellKey(
          mergedCell?.startRowIndex ?? rowIndex,
          mergedCell?.startColumnIndex ?? column.columnIndex,
        );

        return (
          <GridCell
            key={renderedKey}
            sheet={sheet}
            rowIndex={rowIndex}
            columnIndex={column.columnIndex}
            visibleColumnOffset={column.gridColumnStart - 2}
            mergedCell={mergedCell}
            mergeGeometry={mergeGeometry}
            selectedKey={selectedKey}
            selectedRange={selectedRange}
            computedValues={computedValues}
            conditionalStyles={conditionalStyles}
            dataValidations={dataValidations}
            filters={filters}
            sparklinesByCellKey={sparklinesByCellKey}
            tables={tables}
            invalidKeys={invalidKeys}
            formulaErrorKeys={formulaErrorKeys}
            spillAnchorKeys={spillAnchorKeys}
            spillBlockedKeys={spillBlockedKeys}
            spillKeys={spillKeys}
            linkedKeys={linkedKeys}
            notedKeys={notedKeys}
            highlightedKeys={highlightedKeys}
            activeHighlightKey={activeHighlightKey}
            editingKey={editingKey}
            draft={draft}
            zoomScale={zoomScale}
            isProtected={isProtected}
            isFrozenRow={isFrozenRow}
            isFrozenColumn={column.isFrozen}
            frozenColumnLeft={column.frozenLeft}
            hasColumnPageBreak={hasColumnPageBreak}
            showGridlines={showGridlines}
            isRightToLeft={isRightToLeft}
            isCellProtected={isCellProtected}
            onPointerDownCell={onPointerDownCell}
            onPointerEnterCell={onPointerEnterCell}
            onStartFillHandle={onStartFillHandle}
            onStartTouchSelectionHandle={onStartTouchSelectionHandle}
            onEditKeyChange={onEditKeyChange}
            onDraftChange={onDraftChange}
            onUpdateCell={onUpdateCell}
            onUpdateRange={onUpdateRange}
            onApplyColumnValueFilter={onApplyColumnValueFilter}
            onClearColumnFilters={onClearColumnFilters}
          />
        );
      })}
      {rightColumnSpacer ? (
        <div
          aria-hidden="true"
          className={cn("h-full", showGridlines && "border-b")}
          style={{ gridColumn: rightColumnSpacer.gridColumnStart }}
        />
      ) : null}
    </div>
  );
}
