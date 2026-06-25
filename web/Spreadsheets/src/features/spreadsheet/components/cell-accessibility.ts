import { columnLabel } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

function sanitizeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function getCellElementId(sheetId: string, key: string) {
  return `cell-${sanitizeIdPart(sheetId)}-${sanitizeIdPart(key)}`;
}

export function getCellDescriptionId(sheetId: string, key: string) {
  return `cell-description-${sanitizeIdPart(sheetId)}-${sanitizeIdPart(key)}`;
}

export function getGridKeyboardInstructionsId(sheetId: string) {
  return `grid-keyboard-instructions-${sanitizeIdPart(sheetId)}`;
}

export function getGridSelectionDescriptionId(sheetId: string) {
  return `grid-selection-description-${sanitizeIdPart(sheetId)}`;
}

export function getCellAriaLabel({
  address,
  value,
  rowIndex,
  columnIndex,
  isSelected,
  isInRange,
  isInvalid,
  isFormulaError,
  hasLink,
  hasNote,
  tableName,
  tableCellKind,
}: {
  address: string;
  value: string;
  rowIndex?: number;
  columnIndex?: number;
  isSelected: boolean;
  isInRange: boolean;
  isInvalid: boolean;
  isFormulaError: boolean;
  hasLink: boolean;
  hasNote: boolean;
  tableName?: string;
  tableCellKind?: "header" | "body" | "total";
}) {
  return [
    address,
    typeof rowIndex === "number" ? `row ${rowIndex + 1}` : null,
    typeof columnIndex === "number" ? `column ${columnLabel(columnIndex)}` : null,
    value ? `Value ${value}` : "Blank",
    isSelected ? "active cell" : null,
    !isSelected && isInRange ? "selected range" : null,
    isInvalid ? "invalid value" : null,
    isFormulaError ? "formula error" : null,
    hasLink ? "has link" : null,
    hasNote ? "has note" : null,
    tableName && tableCellKind ? `${tableName} ${tableCellKind} cell` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function getCellStatusDescription({
  validationFeedback,
  formulaErrorMessage,
  spillMessage,
  isProtected,
  listOptionCount,
  tableName,
  tableCellKind,
  isFrozenRow,
  isFrozenColumn,
}: {
  validationFeedback?: string | null;
  formulaErrorMessage?: string | null;
  spillMessage?: string | null;
  isProtected: boolean;
  listOptionCount: number;
  tableName?: string;
  tableCellKind?: "header" | "body" | "total";
  isFrozenRow: boolean;
  isFrozenColumn: boolean;
}) {
  return [
    validationFeedback,
    formulaErrorMessage,
    spillMessage,
    isProtected ? "This cell is protected and cannot be edited." : null,
    listOptionCount > 0
      ? `Validation dropdown with ${listOptionCount} option${
          listOptionCount === 1 ? "" : "s"
        }.`
      : null,
    tableName && tableCellKind
      ? `Inside ${tableName}, ${tableCellKind} area.`
      : null,
    isFrozenRow && isFrozenColumn
      ? "Frozen row and column."
      : isFrozenRow
        ? "Frozen row."
        : isFrozenColumn
          ? "Frozen column."
          : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getGridSelectionDescription({
  selectedRange,
  selectedKey,
  isProtected,
  canEditSelection,
}: {
  selectedRange: CellRange;
  selectedKey: string;
  isProtected: boolean;
  canEditSelection: boolean;
}) {
  const rowCount =
    selectedRange.endRowIndex - selectedRange.startRowIndex + 1;
  const columnCount =
    selectedRange.endColumnIndex - selectedRange.startColumnIndex + 1;
  const rangeLabel =
    rowCount === 1 && columnCount === 1
      ? selectedKey
      : `${columnLabel(selectedRange.startColumnIndex)}${
          selectedRange.startRowIndex + 1
        }:${columnLabel(selectedRange.endColumnIndex)}${
          selectedRange.endRowIndex + 1
        }`;

  return [
    `Selected ${rangeLabel}.`,
    rowCount > 1 || columnCount > 1
      ? `${rowCount} rows by ${columnCount} columns.`
      : null,
    isProtected
      ? "Sheet protection is on."
      : canEditSelection
        ? "Selection can be edited."
        : "Selection is protected.",
  ]
    .filter(Boolean)
    .join(" ");
}
