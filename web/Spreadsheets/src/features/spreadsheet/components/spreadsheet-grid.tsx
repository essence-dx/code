"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
  getFrozenRowTop,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import {
  GridColumnHeader,
  GridSelectAllCorner,
} from "@/features/spreadsheet/components/grid-headers";
import { GridViewportRow } from "@/features/spreadsheet/components/grid-viewport-row";
import { MobileSelectionToolbar } from "@/features/spreadsheet/components/mobile-selection-toolbar";
import { WorksheetChartObjectsLayer } from "@/features/spreadsheet/components/worksheet-chart-objects-layer";
import { WorksheetObjectsLayer } from "@/features/spreadsheet/components/worksheet-objects-layer";
import {
  getCellElementId,
  getGridKeyboardInstructionsId,
  getGridSelectionDescription,
  getGridSelectionDescriptionId,
} from "@/features/spreadsheet/components/cell-accessibility";
import { useGridColumnSizing } from "@/features/spreadsheet/components/use-grid-column-sizing";
import { useGridRowVirtualizer } from "@/features/spreadsheet/components/use-grid-row-virtualizer";
import { useGridSelectionDrag } from "@/features/spreadsheet/components/use-grid-selection-drag";
import type { InsertedObjectUpdate } from "@/features/spreadsheet/inserted-objects";
import { getOutlineGroupStartingAt } from "@/features/spreadsheet/outline-groups";
import { cellKey } from "@/features/workbooks/addresses";
import {
  type FillRangeMode,
  type CellRange,
  type CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type {
  CellStyle,
  ChartDefinition,
  DataValidationRule,
  InsertedObjectAnchor,
  InsertedObjectDefinition,
  SheetData,
  SheetFilterRule,
  SheetPrintSettings,
  SparklineDefinition,
  TableDefinition,
} from "@/features/workbooks/types";

export type SpreadsheetGridProps = {
  sheet: SheetData;
  selected: CellSelection;
  selectedRange: CellRange;
  computedValues: Record<string, string>;
  conditionalStyles: Record<string, CellStyle>;
  dataValidations: DataValidationRule[];
  filters: SheetFilterRule[];
  charts: ChartDefinition[];
  sparklines: SparklineDefinition[];
  insertedObjects: InsertedObjectDefinition[];
  selectedObjectId: string | null;
  tables: TableDefinition[];
  invalidKeys: Set<string>;
  formulaErrorKeys: Set<string>;
  spillAnchorKeys: Set<string>;
  spillBlockedKeys: Set<string>;
  spillKeys: Set<string>;
  linkedKeys: Set<string>;
  notedKeys: Set<string>;
  visibleRowIndexes: number[];
  highlightedKeys: Set<string>;
  activeHighlightKey: string | null;
  editingKey: string | null;
  zoomPercent: number;
  frozenColumnCount: number;
  frozenRowCount: number;
  showPageBreaks: boolean;
  printSettings: SheetPrintSettings;
  isProtected: boolean;
  isRightToLeft: boolean;
  isCellProtected: (rowIndex: number, columnIndex: number) => boolean;
  autoScrollSelection?: boolean;
  onEditKeyChange: (key: string | null) => void;
  onSelectCell: (selection: CellSelection, options?: { extend?: boolean }) => void;
  onSelectObject: (objectId: string) => void;
  onUpdateChartAnchor: (
    chartId: string,
    anchor: Partial<InsertedObjectAnchor>,
  ) => void;
  onUpdateObject: (objectId: string, updates: InsertedObjectUpdate) => void;
  onSelectRange: (range: CellRange) => void;
  onSelectionCommit?: (range: CellRange) => void;
  onFillRange: (range: CellRange, mode: FillRangeMode) => void;
  onResizeColumn: (columnIndex: number, width: number) => void;
  onToggleRowGroup: (groupId: string) => void;
  onToggleColumnGroup: (groupId: string) => void;
  onToggleRowPageBreak?: (rowIndex: number) => void;
  onToggleColumnPageBreak?: (columnIndex: number) => void;
  onMoveRowPageBreak?: (fromRowIndex: number, toRowIndex: number) => void;
  onMoveColumnPageBreak?: (
    fromColumnIndex: number,
    toColumnIndex: number,
  ) => void;
  onUpdateCell: (raw: string) => void;
  onUpdateRange: (raw: string) => void;
  onApplyColumnValueFilter: (input: {
    range: CellRange;
    columnIndex: number;
    headerName?: string;
    values: string[];
  }) => void;
  onClearColumnFilters: (input: {
    range: CellRange;
    columnIndex: number;
  }) => void;
};

export function SpreadsheetGrid({
  sheet,
  selected,
  selectedRange,
  computedValues,
  conditionalStyles,
  dataValidations,
  filters,
  charts,
  sparklines,
  insertedObjects,
  selectedObjectId,
  tables,
  invalidKeys,
  formulaErrorKeys,
  spillAnchorKeys,
  spillBlockedKeys,
  spillKeys,
  linkedKeys,
  notedKeys,
  visibleRowIndexes,
  highlightedKeys,
  activeHighlightKey,
  editingKey,
  zoomPercent,
  frozenColumnCount,
  frozenRowCount,
  showPageBreaks,
  printSettings,
  isProtected,
  isRightToLeft,
  isCellProtected,
  autoScrollSelection = true,
  onEditKeyChange,
  onSelectCell,
  onSelectObject,
  onUpdateChartAnchor,
  onUpdateObject,
  onSelectRange,
  onSelectionCommit,
  onFillRange,
  onResizeColumn,
  onToggleRowGroup,
  onToggleColumnGroup,
  onToggleRowPageBreak,
  onToggleColumnPageBreak,
  onMoveRowPageBreak,
  onMoveColumnPageBreak,
  onUpdateCell,
  onUpdateRange,
  onApplyColumnValueFilter,
  onClearColumnFilters,
}: SpreadsheetGridProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const zoomScale = zoomPercent / 100;
  const showGridlines = sheet.showGridlines !== false;
  const selectedKey = cellKey(selected.rowIndex, selected.columnIndex);
  const canEditSelection = !isCellProtected(
    selected.rowIndex,
    selected.columnIndex,
  );
  const keyboardInstructionsId = getGridKeyboardInstructionsId(sheet.id);
  const selectionDescriptionId = getGridSelectionDescriptionId(sheet.id);
  const selectedCellElementId = getCellElementId(sheet.id, selectedKey);
  const selectionDescription = getGridSelectionDescription({
    selectedRange,
    selectedKey,
    isProtected,
    canEditSelection,
  });
  const {
    handleGridCellPointerDown,
    handleGridCellPointerEnter,
    selectRangeAndCommit,
    startFillHandleDrag,
    startTouchSelectionHandle,
  } = useGridSelectionDrag({
    gridRootRef: scrollAreaRef,
    selectedRange,
    onSelectCell,
    onSelectRange,
    onSelectionCommit,
    onFillRange,
  });
  const sparklineByCellKey = useMemo(
    () =>
      new Map(
        sparklines.map((sparkline) => [sparkline.targetCellKey, sparkline]),
      ),
    [sparklines],
  );
  const rowPageBreaks = useMemo(
    () => new Set(printSettings.rowPageBreaks),
    [printSettings.rowPageBreaks],
  );
  const columnPageBreaks = useMemo(
    () => new Set(printSettings.columnPageBreaks),
    [printSettings.columnPageBreaks],
  );
  const {
    gridTemplateColumns,
    leftColumnSpacer,
    renderedColumns,
    rightColumnSpacer,
    startColumnResize,
    totalColumnWidth,
    visibleColumnIndexes,
  } = useGridColumnSizing({
    scrollAreaRef,
    autoScrollSelection,
    sheet,
    selectedColumnIndex: selected.columnIndex,
    frozenColumnCount,
    isRightToLeft,
    zoomScale,
    onResizeColumn,
  });
  const rowVirtualizer = useGridRowVirtualizer({
    scrollAreaRef,
    autoScrollSelection,
    sheet,
    selectedRowIndex: selected.rowIndex,
    visibleRowIndexes,
    frozenRowCount,
    zoomScale,
  });

  useEffect(() => {
    if (editingKey) {
      setDraft(sheet.cells[editingKey]?.raw ?? "");
    }
  }, [editingKey, sheet.cells]);

  return (
    <div
      ref={scrollAreaRef}
      dir={isRightToLeft ? "rtl" : "ltr"}
      className="spreadsheet-scroll-container relative h-full min-h-0 w-full flex-1 overflow-auto overscroll-contain bg-background pb-12 [scrollbar-gutter:stable] md:pb-0"
    >
      <p id={keyboardInstructionsId} className="sr-only">
        Use arrow keys to move cells, Shift plus arrow keys to extend the
        selection, Enter to edit, Escape to cancel editing, and Ctrl+C or Ctrl+V
        to copy and paste.
      </p>
      <p id={selectionDescriptionId} aria-live="polite" className="sr-only">
        {selectionDescription}
      </p>
      <div
        role="grid"
        aria-label={`${sheet.name} spreadsheet grid`}
        aria-describedby={`${keyboardInstructionsId} ${selectionDescriptionId}`}
        aria-activedescendant={selectedCellElementId}
        aria-rowcount={sheet.rowCount + 1}
        aria-colcount={sheet.columnCount + 1}
        aria-readonly={isProtected}
        tabIndex={0}
        className="spreadsheet-grid inline-block min-w-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        <div
          role="row"
          aria-rowindex={1}
          className="grid sticky top-0 z-20 bg-card"
          style={{
            gridTemplateColumns,
            height: `${scaleSize(HEADER_HEIGHT, zoomScale)}px`,
          }}
        >
          <GridSelectAllCorner
            sheet={sheet}
            isRightToLeft={isRightToLeft}
            onSelectRange={selectRangeAndCommit}
          />
          {leftColumnSpacer ? (
            <div
              aria-hidden="true"
              className="border-b bg-card"
              style={{ gridColumn: leftColumnSpacer.gridColumnStart }}
            />
          ) : null}
          {renderedColumns.map((column) => {
            const hasColumnPageBreak =
              showPageBreaks && columnPageBreaks.has(column.columnIndex);

            return (
              <GridColumnHeader
                key={column.columnIndex}
                sheet={sheet}
                selectedRange={selectedRange}
                filters={filters}
                computedValues={computedValues}
                columnIndex={column.columnIndex}
                frozenLeft={column.frozenLeft}
                gridColumnStart={column.gridColumnStart}
                zoomScale={zoomScale}
                isProtected={isProtected}
                isFrozen={column.isFrozen}
                hasPageBreak={hasColumnPageBreak}
                showPageBreaks={showPageBreaks}
                isRightToLeft={isRightToLeft}
                outlineGroup={getOutlineGroupStartingAt(
                  sheet.columnGroups ?? [],
                  column.columnIndex,
                )}
                onSelectRange={selectRangeAndCommit}
                onStartResize={startColumnResize}
                onTogglePageBreak={onToggleColumnPageBreak}
                onMovePageBreak={onMoveColumnPageBreak}
                onToggleOutlineGroup={onToggleColumnGroup}
                onApplyColumnValueFilter={onApplyColumnValueFilter}
                onClearColumnFilters={onClearColumnFilters}
              />
            );
          })}
          {rightColumnSpacer ? (
            <div
              aria-hidden="true"
              className="border-b bg-card"
              style={{ gridColumn: rightColumnSpacer.gridColumnStart }}
            />
          ) : null}
        </div>
        <div
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          <WorksheetObjectsLayer
            objects={insertedObjects}
            selectedObjectId={selectedObjectId}
            sheet={sheet}
            totalColumnWidth={
              scaleSize(ROW_HEADER_WIDTH, zoomScale) + totalColumnWidth
            }
            visibleColumnIndexes={visibleColumnIndexes}
            visibleRowIndexes={visibleRowIndexes}
            zoomScale={zoomScale}
            onSelectObject={onSelectObject}
            onUpdateObject={onUpdateObject}
          />
          <WorksheetChartObjectsLayer
            charts={charts}
            computedValues={computedValues}
            selectedObjectId={selectedObjectId}
            sheet={sheet}
            totalColumnWidth={
              scaleSize(ROW_HEADER_WIDTH, zoomScale) + totalColumnWidth
            }
            totalHeight={rowVirtualizer.getTotalSize()}
            visibleColumnIndexes={visibleColumnIndexes}
            visibleRowIndexes={visibleRowIndexes}
            zoomScale={zoomScale}
            onSelectObject={onSelectObject}
            onUpdateChartAnchor={onUpdateChartAnchor}
          />
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = visibleRowIndexes[virtualRow.index] ?? virtualRow.index;
            const isFrozenRow =
              virtualRow.index < Math.min(frozenRowCount, visibleRowIndexes.length);
            const frozenVirtualRowIndex = isFrozenRow ? virtualRow.index : 0;
            const currentFrozenRowTop = isFrozenRow
              ? getFrozenRowTop(
                  sheet,
                  visibleRowIndexes,
                  frozenVirtualRowIndex,
                  zoomScale,
                )
              : 0;
            const hasRowPageBreak =
              showPageBreaks && rowPageBreaks.has(rowIndex);

            return (
              <GridViewportRow
                key={virtualRow.key}
                virtualRow={virtualRow}
                rowIndex={rowIndex}
                sheet={sheet}
                selectedKey={selectedKey}
                selectedRange={selectedRange}
                computedValues={computedValues}
                conditionalStyles={conditionalStyles}
                dataValidations={dataValidations}
                filters={filters}
                sparklinesByCellKey={sparklineByCellKey}
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
                gridTemplateColumns={gridTemplateColumns}
                frozenRowTop={currentFrozenRowTop}
                visibleRowIndexes={visibleRowIndexes}
                leftColumnSpacer={leftColumnSpacer}
                renderedColumns={renderedColumns}
                rightColumnSpacer={rightColumnSpacer}
                columnPageBreaks={columnPageBreaks}
                isProtected={isProtected}
                isFrozenRow={isFrozenRow}
                hasRowPageBreak={hasRowPageBreak}
                showPageBreaks={showPageBreaks}
                showGridlines={showGridlines}
                isRightToLeft={isRightToLeft}
                isCellProtected={isCellProtected}
                onToggleRowGroup={onToggleRowGroup}
                onToggleRowPageBreak={onToggleRowPageBreak}
                onMoveRowPageBreak={onMoveRowPageBreak}
                onSelectRange={selectRangeAndCommit}
                onPointerDownCell={handleGridCellPointerDown}
                onPointerEnterCell={handleGridCellPointerEnter}
                onStartFillHandle={startFillHandleDrag}
                onStartTouchSelectionHandle={startTouchSelectionHandle}
                onEditKeyChange={onEditKeyChange}
                onDraftChange={setDraft}
                onUpdateCell={onUpdateCell}
                onUpdateRange={onUpdateRange}
                onApplyColumnValueFilter={onApplyColumnValueFilter}
                onClearColumnFilters={onClearColumnFilters}
              />
            );
          })}
        </div>
      </div>
      <MobileSelectionToolbar
        selectedRange={selectedRange}
        canEditSelection={canEditSelection}
        isEditing={editingKey !== null}
        onEditSelection={() => onEditKeyChange(selectedKey)}
        onClearSelection={() => onUpdateRange("")}
        onFillDown={() => onFillRange(selectedRange, "down")}
        onFillRight={() => onFillRange(selectedRange, "right")}
      />
    </div>
  );
}
