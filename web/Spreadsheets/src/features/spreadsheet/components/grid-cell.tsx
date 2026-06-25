import { Fragment, type CSSProperties, type PointerEvent } from "react";
import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import {
  getListValidationOptions,
  getValidationFeedback,
} from "@/features/spreadsheet/data-validation";
import { getColumnAutocompleteOptions } from "@/features/spreadsheet/column-autocomplete";
import {
  CellBorders,
  CellIndicator,
} from "@/features/spreadsheet/components/cell-adornments";
import {
  getCellAriaLabel,
  getCellDescriptionId,
  getCellElementId,
  getCellStatusDescription,
} from "@/features/spreadsheet/components/cell-accessibility";
import { ColumnFilterMenu } from "@/features/spreadsheet/components/column-filter-menu";
import {
  getActiveColumnFilterValues,
  hasActiveColumnFilter,
} from "@/features/spreadsheet/components/grid-filter-helpers";
import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_FONT_SIZE,
  DEFAULT_ROW_HEIGHT,
  getFrozenColumnStyle,
  isCellInRange,
  scaleSize,
  type VisibleMergeGeometry,
} from "@/features/spreadsheet/components/grid-geometry";
import { CellRichTextRuns } from "@/features/spreadsheet/components/cell-rich-text";
import { SparklineCell } from "@/features/spreadsheet/components/sparkline-cell";
import {
  getTableCell,
  getTableCellClass,
} from "@/features/spreadsheet/components/table-cell-style";
import {
  isSingleCellRange,
  rangesOverlap,
} from "@/features/spreadsheet/state/selection-state";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type { TouchSelectionHandle } from "@/features/spreadsheet/touch-selection";
import type {
  CellStyle,
  DataValidationRule,
  MergedCellRange,
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

export type GridCellPointerInput = {
  event: PointerEvent<HTMLButtonElement>;
  targetSelection: CellSelection;
  selection: CellSelection;
  mergedCell: MergedCellRange | null;
};

export type GridCellHoverInput = {
  targetSelection: CellSelection;
};

export type GridTouchSelectionHandleInput = {
  event: PointerEvent<HTMLSpanElement>;
  handle: TouchSelectionHandle;
};

export function GridCell({
  sheet,
  rowIndex,
  columnIndex,
  visibleColumnOffset,
  mergedCell,
  mergeGeometry,
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
  isProtected,
  isFrozenRow,
  isFrozenColumn,
  frozenColumnLeft,
  hasColumnPageBreak,
  showGridlines,
  isRightToLeft,
  isCellProtected,
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
  sheet: SheetData;
  rowIndex: number;
  columnIndex: number;
  visibleColumnOffset: number;
  mergedCell: MergedCellRange | null;
  mergeGeometry: VisibleMergeGeometry | null;
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
  isProtected: boolean;
  isFrozenRow: boolean;
  isFrozenColumn: boolean;
  frozenColumnLeft?: number;
  hasColumnPageBreak: boolean;
  showGridlines: boolean;
  isRightToLeft: boolean;
  isCellProtected: (rowIndex: number, columnIndex: number) => boolean;
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
  const sourceRowIndex = mergedCell?.startRowIndex ?? rowIndex;
  const sourceColumnIndex = mergedCell?.startColumnIndex ?? columnIndex;
  const key = cellKey(sourceRowIndex, sourceColumnIndex);
  const address = cellKey(rowIndex, columnIndex);
  const isSelected = key === selectedKey;
  const isHighlighted = highlightedKeys.has(key);
  const isActiveHighlight = activeHighlightKey === key;
  const isInvalid = invalidKeys.has(key);
  const isFormulaError = formulaErrorKeys.has(key);
  const isSpillCell = spillKeys.has(key);
  const isSpillAnchor = spillAnchorKeys.has(key);
  const isSpillBlocked = spillBlockedKeys.has(key);
  const hasLink = linkedKeys.has(key);
  const hasNote = notedKeys.has(key);
  const isInRange = mergedCell
    ? rangesOverlap(mergedCell, selectedRange)
    : isCellInRange(rowIndex, columnIndex, selectedRange);
  const canEditCell = !isCellProtected(sourceRowIndex, sourceColumnIndex);
  const isEditing = canEditCell && key === editingKey;
  const isFillHandleCell =
    !mergedCell &&
    canEditCell &&
    !isEditing &&
    rowIndex === selectedRange.endRowIndex &&
    columnIndex === selectedRange.endColumnIndex;
  const showTouchSelectionHandles =
    !isEditing && !isSingleCellRange(selectedRange);
  const isTouchSelectionStartCell =
    showTouchSelectionHandles &&
    rowIndex === selectedRange.startRowIndex &&
    columnIndex === selectedRange.startColumnIndex;
  const isTouchSelectionEndCell =
    showTouchSelectionHandles &&
    rowIndex === selectedRange.endRowIndex &&
    columnIndex === selectedRange.endColumnIndex;
  const cell = sheet.cells[key];
  const effectiveStyle = {
    ...(conditionalStyles[key] ?? {}),
    ...(cell?.style ?? {}),
  };
  const gridColumn = mergedCell
    ? `${visibleColumnOffset + 2} / span ${mergeGeometry?.columnSpan ?? 1}`
    : visibleColumnOffset + 2;
  const cellHeight = mergedCell
    ? `${mergeGeometry?.height ?? scaleSize(DEFAULT_ROW_HEIGHT, zoomScale)}px`
    : undefined;
  const listValidationOptions =
    isSelected && canEditCell
      ? getListValidationOptions({
          rules: dataValidations,
          sheet,
          computedValues,
          rowIndex: sourceRowIndex,
          columnIndex: sourceColumnIndex,
        })
      : [];
  const currentRaw = cell?.raw ?? "";
  const autocompleteOptions = isEditing
    ? getColumnAutocompleteOptions({
        columnIndex: sourceColumnIndex,
        computedValues,
        rowIndex: sourceRowIndex,
        sheet,
      })
    : [];
  const autocompleteListId = autocompleteOptions.length
    ? `autocomplete-${sheet.id}-${key}`
    : undefined;
  const sparkline = sparklinesByCellKey.get(key);
  const tableCell = getTableCell(tables, sourceRowIndex, sourceColumnIndex);
  const tableFilterRange =
    tableCell?.kind === "header" && tableCell.table.showFilterButtons
      ? {
          startRowIndex: tableCell.table.range.startRowIndex,
          startColumnIndex: sourceColumnIndex,
          endRowIndex: tableCell.table.range.endRowIndex,
          endColumnIndex: sourceColumnIndex,
        }
      : null;
  const tableHeaderName =
    tableCell?.kind === "header"
      ? computedValues[key] || columnLabel(sourceColumnIndex)
      : "";
  const tableFilterLabel =
    tableCell?.kind === "header"
      ? `${tableCell.table.name} ${tableHeaderName}`
      : "";
  const validationFeedback = getValidationFeedback({
    rules: dataValidations,
    rowIndex: sourceRowIndex,
    columnIndex: sourceColumnIndex,
    isInvalid,
  });
  const formulaErrorMessage = isFormulaError ? computedValues[key] : null;
  const spillMessage = isSpillBlocked
    ? "Spill blocked by existing content."
    : isSpillCell || isSpillAnchor
      ? "Dynamic array spill range."
      : null;
  const cellElementId = getCellElementId(sheet.id, key);
  const cellDescriptionId = getCellDescriptionId(sheet.id, key);
  const cellDescription = getCellStatusDescription({
    validationFeedback,
    formulaErrorMessage,
    spillMessage,
    isProtected: !canEditCell,
    listOptionCount: listValidationOptions.length,
    tableName: tableCell?.table.name,
    tableCellKind: tableCell?.kind,
    isFrozenRow,
    isFrozenColumn,
  });
  const indentPadding = effectiveStyle.indent
    ? `${scaleSize(8 + effectiveStyle.indent * 12, zoomScale)}px`
    : undefined;
  const displayValue = computedValues[key] ?? "";
  const columnWidth =
    sheet.columnWidths[String(sourceColumnIndex)] ?? DEFAULT_COLUMN_WIDTH;
  const baseFontSize = effectiveStyle.fontSize ?? DEFAULT_FONT_SIZE;
  const availableTextWidth = Math.max(
    columnWidth - 16 - (effectiveStyle.indent ?? 0) * 12,
    20,
  );
  const shrinkFontSize =
    effectiveStyle.shrinkToFit && !effectiveStyle.wrap && displayValue
      ? Math.max(
          8,
          Math.min(
            baseFontSize,
            Math.floor((availableTextWidth / displayValue.length) * 1.7),
          ),
        )
      : baseFontSize;
  const textTransformStyle: CSSProperties = effectiveStyle.verticalText
    ? {
        writingMode: "vertical-rl",
        textOrientation: "mixed",
      }
    : effectiveStyle.textRotation
      ? {
          transform: `rotate(${effectiveStyle.textRotation}deg)`,
          transformOrigin: "center",
        }
      : {};
  const targetSelection = {
    rowIndex: mergedCell?.endRowIndex ?? rowIndex,
    columnIndex: mergedCell?.endColumnIndex ?? columnIndex,
  };

  return (
    <Fragment>
      <button
        id={cellElementId}
        type="button"
        data-grid-row-index={rowIndex}
        data-grid-column-index={columnIndex}
        role="gridcell"
        dir="ltr"
        aria-rowindex={rowIndex + 2}
        aria-colindex={columnIndex + 2}
        aria-label={getCellAriaLabel({
          address,
          value: computedValues[key] ?? "",
          rowIndex,
          columnIndex,
          isSelected,
          isInRange,
          isInvalid,
          isFormulaError,
          hasLink,
          hasNote,
          tableName: tableCell?.table.name,
          tableCellKind: tableCell?.kind,
        })}
        aria-describedby={cellDescription ? cellDescriptionId : undefined}
        aria-readonly={!canEditCell || undefined}
        aria-selected={isInRange}
        aria-invalid={isInvalid || isFormulaError || isSpillBlocked || undefined}
        tabIndex={isSelected ? 0 : -1}
        title={
          validationFeedback ??
          formulaErrorMessage ??
          spillMessage ??
          (!canEditCell ? "Protected cell." : undefined)
        }
        onPointerDown={(event) =>
          onPointerDownCell({
            event,
            targetSelection,
            selection: { rowIndex, columnIndex },
            mergedCell,
          })
        }
        onPointerEnter={() => onPointerEnterCell({ targetSelection })}
        onDoubleClick={() => {
          if (canEditCell) {
            onEditKeyChange(key);
          }
        }}
        className={cn(
          "relative h-full overflow-hidden px-2 py-1 text-left text-sm outline-none transition-colors motion-reduce:transition-none",
          "flex min-w-0",
          showGridlines && "border-b border-r",
          "hover:bg-accent/60",
          !canEditCell && "cursor-not-allowed",
          !canEditCell && !isInRange && "bg-muted/30",
          isFrozenRow && "bg-background shadow-[0_1px_0_var(--border)]",
          isFrozenColumn && "bg-background shadow-[1px_0_0_var(--border)]",
          getTableCellClass(tableCell, sourceRowIndex),
          isInRange && "bg-primary/10",
          isSpillCell && !isInRange && "bg-primary/5",
          isHighlighted && "bg-chart-3/25",
          isActiveHighlight && "ring-2 ring-chart-3",
          isSpillAnchor && "ring-1 ring-primary/50",
          isSpillBlocked && "ring-1 ring-destructive",
          isInvalid && "ring-1 ring-destructive/70",
          isFormulaError && "ring-1 ring-destructive",
          isSelected && "z-10 ring-2 ring-primary",
          effectiveStyle.bold && "font-semibold",
          effectiveStyle.italic && "italic",
          effectiveStyle.underline && "underline",
          effectiveStyle.strikethrough && "line-through",
          effectiveStyle.align === "center" && "justify-center text-center",
          effectiveStyle.align === "right" && "justify-end text-right",
          effectiveStyle.align !== "center" &&
            effectiveStyle.align !== "right" &&
            "justify-start",
          effectiveStyle.verticalAlign === "middle" && "items-center",
          effectiveStyle.verticalAlign === "bottom" && "items-end",
          effectiveStyle.verticalAlign !== "middle" &&
            effectiveStyle.verticalAlign !== "bottom" &&
            "items-start",
          effectiveStyle.indicator && "pl-5",
          listValidationOptions.length > 0 && "pr-8",
        )}
        style={{
          ...getFrozenColumnStyle(
            isFrozenColumn,
            frozenColumnLeft,
            isRightToLeft,
          ),
          background: effectiveStyle.background,
          color: effectiveStyle.foreground,
          fontFamily: cellFontFamilyToCss(effectiveStyle.fontFamily),
          fontSize: `${scaleSize(baseFontSize, zoomScale)}px`,
          paddingLeft: indentPadding,
          gridColumn,
          gridRow: 1,
          height: cellHeight,
          zIndex:
            isFrozenRow && isFrozenColumn
              ? isSelected
                ? 30
                : 22
              : isFrozenColumn
                ? isSelected
                  ? 24
                  : 14
                : isFrozenRow
                  ? isSelected
                    ? 23
                    : 13
                  : mergedCell
                    ? 12
                    : undefined,
        }}
      >
        {cellDescription ? (
          <span id={cellDescriptionId} className="sr-only">
            {cellDescription}
          </span>
        ) : null}
        <CellBorders borders={effectiveStyle.borders} />
        {hasColumnPageBreak ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 z-[2] w-0.5 bg-primary",
              isRightToLeft ? "right-0" : "left-0",
            )}
          />
        ) : null}
        <CellIndicator indicator={effectiveStyle.indicator} />
        {isInvalid ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-1 rounded-full border border-destructive/80"
            />
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-destructive"
            />
          </>
        ) : null}
        {hasNote ? (
          <span className="absolute left-0 top-0 h-0 w-0 border-r-[7px] border-t-[7px] border-r-transparent border-t-chart-4" />
        ) : null}
        {hasLink ? (
          <span className="absolute bottom-0 left-0 h-0 w-0 border-b-[7px] border-r-[7px] border-b-primary border-r-transparent" />
        ) : null}
        {isEditing ? (
          <>
          <input
            autoFocus
            list={autocompleteListId}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={() => {
              onUpdateCell(draft);
              onEditKeyChange(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (event.ctrlKey || event.metaKey) {
                  onUpdateRange(draft);
                } else {
                  onUpdateCell(draft);
                }
                onEditKeyChange(null);
              }
              if (event.key === "Escape") {
                onEditKeyChange(null);
              }
            }}
            className="absolute inset-0 h-full w-full bg-background px-2 font-mono text-sm outline-none"
            style={{
              fontFamily: cellFontFamilyToCss(effectiveStyle.fontFamily),
              fontSize: `${scaleSize(
                effectiveStyle.fontSize ?? DEFAULT_FONT_SIZE,
                zoomScale,
              )}px`,
              paddingLeft: indentPadding,
            }}
          />
          {autocompleteOptions.length > 0 ? (
            <datalist id={autocompleteListId}>
              {autocompleteOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}
          </>
        ) : sparkline ? (
          <SparklineCell
            sheet={sheet}
            computedValues={computedValues}
            sparkline={sparkline}
          />
        ) : (
          <span
            className={cn(
              "max-w-full min-w-0",
              effectiveStyle.verticalText || effectiveStyle.textRotation
                ? "inline-block"
                : "block",
              effectiveStyle.verticalText
                ? "whitespace-nowrap leading-5"
                : effectiveStyle.wrap
                ? "whitespace-pre-wrap break-words leading-5"
                : "truncate",
            )}
            style={{
              ...textTransformStyle,
              fontSize:
                shrinkFontSize !== baseFontSize
                  ? `${scaleSize(shrinkFontSize, zoomScale)}px`
                  : undefined,
            }}
          >
            {cell?.richTextRuns?.length ? (
              <CellRichTextRuns
                runs={cell.richTextRuns}
                zoomScale={zoomScale}
              />
            ) : (
              displayValue
            )}
          </span>
        )}
        {isFillHandleCell ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 z-30 size-2.5 cursor-crosshair border border-background bg-primary shadow-sm",
              isRightToLeft ? "left-0" : "right-0",
            )}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartFillHandle();
            }}
          />
        ) : null}
        {isTouchSelectionStartCell ? (
          <span
            aria-hidden="true"
            title="Resize selection"
            className={cn(
              "absolute top-0 z-40 hidden size-5 touch-none rounded-full border-2 border-background bg-primary shadow-md",
              "[@media(pointer:coarse)]:block",
              isRightToLeft
                ? "right-0 translate-x-1/2 -translate-y-1/2"
                : "left-0 -translate-x-1/2 -translate-y-1/2",
            )}
            onPointerDown={(event) =>
              onStartTouchSelectionHandle({ event, handle: "start" })
            }
          />
        ) : null}
        {isTouchSelectionEndCell ? (
          <span
            aria-hidden="true"
            title="Resize selection"
            className={cn(
              "absolute bottom-0 z-40 hidden size-5 touch-none rounded-full border-2 border-background bg-primary shadow-md",
              "[@media(pointer:coarse)]:block",
              isRightToLeft
                ? "left-0 -translate-x-1/2 translate-y-1/2"
                : "right-0 translate-x-1/2 translate-y-1/2",
            )}
            onPointerDown={(event) =>
              onStartTouchSelectionHandle({ event, handle: "end" })
            }
          />
        ) : null}
      </button>
      {tableFilterRange ? (
        <ColumnFilterMenu
          label={tableFilterLabel}
          headerName={tableHeaderName}
          sheet={sheet}
          computedValues={computedValues}
          range={tableFilterRange}
          columnIndex={sourceColumnIndex}
          active={hasActiveColumnFilter(filters, tableFilterRange, sourceColumnIndex)}
          activeValues={getActiveColumnFilterValues(
            filters,
            tableFilterRange,
            sourceColumnIndex,
          )}
          disabled={isProtected}
          className={cn(
            "z-20 mt-1 bg-background/80",
            isRightToLeft ? "ml-1 justify-self-start" : "mr-1 justify-self-end",
          )}
          style={{
            ...getFrozenColumnStyle(
              isFrozenColumn,
              frozenColumnLeft,
              isRightToLeft,
            ),
            gridColumn,
            gridRow: 1,
            height: `${scaleSize(20, zoomScale)}px`,
            zIndex:
              isFrozenRow && isFrozenColumn
                ? 31
                : isFrozenColumn
                  ? 28
                  : isFrozenRow
                    ? 24
                    : undefined,
          }}
          onApplyValueFilter={onApplyColumnValueFilter}
          onClearColumnFilters={onClearColumnFilters}
        />
      ) : null}
      {listValidationOptions.length > 0 ? (
        <select
          value={listValidationOptions.includes(currentRaw) ? currentRaw : ""}
          aria-label={`Choose value for ${key}`}
          className={cn(
            "relative z-30 h-full w-7 cursor-pointer bg-background text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isRightToLeft
              ? "justify-self-start border-r"
              : "justify-self-end border-l",
          )}
          style={{
            ...getFrozenColumnStyle(
              isFrozenColumn,
              frozenColumnLeft,
              isRightToLeft,
            ),
            gridColumn,
            gridRow: 1,
            height: cellHeight,
            zIndex:
              isFrozenRow && isFrozenColumn
                ? 31
                : isFrozenColumn
                  ? 28
                  : isFrozenRow
                    ? 24
                    : undefined,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onUpdateCell(event.target.value)}
        >
          <option value="" />
          {listValidationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
    </Fragment>
  );
}
