import { cellKey } from "@/features/workbooks/addresses";
import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import { serializeClipboardGrid } from "@/features/spreadsheet/clipboard";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import { getEffectiveHiddenColumns } from "@/features/spreadsheet/outline-groups";
import { cellStyleToExcelNumberFormat } from "@/features/workbooks/number-formats";
import { cellRichTextRunsToHtml } from "@/features/workbooks/rich-text";
import {
  createSpreadsheetClipboardMetadata,
  type ClipboardRange,
  type SpreadsheetClipboardMetadata,
} from "@/features/spreadsheet/clipboard-metadata";
import type {
  CellRecord,
  CellStyle,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type SpreadsheetClipboardPayload = {
  text: string;
  html: string;
  sourceSheetId: string;
  sourceRange: ClipboardRange;
  cells: (CellRecord | null)[][];
  metadata?: SpreadsheetClipboardMetadata;
};

export type PasteSpecialMode = "all" | "values" | "formulas" | "formats";

function hasStyle(cell: CellRecord) {
  return Boolean(
    (cell.style && Object.keys(cell.style).length > 0) ||
      cell.richTextRuns?.length,
  );
}

export function clonePastedCell({
  source,
  current,
  displayValue,
  rowOffset,
  columnOffset,
  mode,
}: {
  source: CellRecord;
  current?: CellRecord;
  displayValue: string;
  rowOffset: number,
  columnOffset: number,
  mode: PasteSpecialMode;
}): CellRecord | null {
  if (mode === "values") {
    if (!displayValue && !current?.style) {
      return null;
    }

    return {
      raw: displayValue,
      ...(current?.style ? { style: structuredClone(current.style) } : {}),
    };
  }

  if (mode === "formats") {
    const raw = current?.raw ?? "";

    if (!raw && !hasStyle(source)) {
      return null;
    }

    return {
      raw,
      ...(source.style ? { style: structuredClone(source.style) } : {}),
    };
  }

  const sourceRaw = canonicalizeFormulaInput(source.raw);
  const raw = sourceRaw.startsWith("=")
    ? shiftFormulaReferences({ formula: sourceRaw, rowOffset, columnOffset })
    : sourceRaw;

  if (mode === "formulas") {
    if (!raw && !current?.style) {
      return null;
    }

    return {
      raw,
      ...(current?.style ? { style: structuredClone(current.style) } : {}),
    };
  }

  return {
    raw,
    ...(source.style ? { style: structuredClone(source.style) } : {}),
    ...(source.richTextRuns
      ? { richTextRuns: structuredClone(source.richTextRuns) }
      : {}),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textDecorationToCss(style: CellStyle) {
  const decorations = [
    style.underline ? "underline" : null,
    style.strikethrough ? "line-through" : null,
  ].filter(Boolean);

  return decorations.length ? `text-decoration:${decorations.join(" ")}` : null;
}

function cellStyleToCss(style?: CellStyle) {
  if (!style) {
    return "";
  }

  const numberFormat = cellStyleToExcelNumberFormat(style);
  const rules = [
    style.bold ? "font-weight:700" : null,
    style.italic ? "font-style:italic" : null,
    textDecorationToCss(style),
    style.align ? `text-align:${style.align}` : null,
    style.verticalAlign ? `vertical-align:${style.verticalAlign}` : null,
    style.background ? `background-color:${style.background}` : null,
    style.foreground ? `color:${style.foreground}` : null,
    style.fontFamily ? `font-family:${cellFontFamilyToCss(style.fontFamily)}` : null,
    style.fontSize ? `font-size:${style.fontSize}px` : null,
    style.wrap ? "white-space:pre-wrap" : null,
    style.shrinkToFit ? "font-stretch:condensed" : null,
    style.verticalText ? "writing-mode:vertical-rl;text-orientation:mixed" : null,
    style.textRotation && !style.verticalText
      ? `transform:rotate(${style.textRotation}deg);transform-origin:center`
      : null,
    numberFormat ? `mso-number-format:'${numberFormat}'` : null,
  ].filter(Boolean);

  return rules.length ? ` style="${escapeHtml(rules.join(";"))}"` : "";
}

function createHtmlTable(cells: (CellRecord | null)[][], values: string[][]) {
  const rows = cells
    .map((row, rowIndex) => {
      const columns = row
        .map((cell, columnIndex) => {
          const value = values[rowIndex]?.[columnIndex] ?? cell?.raw ?? "";
          const formula =
            cell?.raw.startsWith("=")
              ? ` data-formula="${escapeHtml(cell.raw)}"`
              : "";
          const content = cell?.richTextRuns?.length
            ? cellRichTextRunsToHtml(cell.richTextRuns, escapeHtml)
            : escapeHtml(value);

          return `<td${formula}${cellStyleToCss(cell?.style)}>${content}</td>`;
        })
        .join("");

      return `<tr>${columns}</tr>`;
    })
    .join("");

  return `<meta charset="utf-8"><table>${rows}</table>`;
}

export function createSpreadsheetClipboardPayload(
  sheet: SheetData,
  range: ClipboardRange,
  computedValues: Record<string, string>,
  options: { document?: WorkbookDocument; hideHiddenFormulas?: boolean } = {},
): SpreadsheetClipboardPayload {
  const cells: (CellRecord | null)[][] = [];
  const values: string[][] = [];
  const metadata = options.document
    ? createSpreadsheetClipboardMetadata({
        document: options.document,
        range,
        sheet,
      })
    : null;

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const cellRow: (CellRecord | null)[] = [];
    const valueRow: string[] = [];

    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const sourceCell = sheet.cells[key];
      const cell =
        options.hideHiddenFormulas &&
        sourceCell?.style?.formulaHidden &&
        sourceCell.raw.startsWith("=")
          ? {
              ...sourceCell,
              raw: computedValues[key] ?? "",
            }
          : sourceCell;

      cellRow.push(cell ? structuredClone(cell) : null);
      valueRow.push(computedValues[key] ?? cell?.raw ?? "");
    }

    cells.push(cellRow);
    values.push(valueRow);
  }

  return {
    text: serializeClipboardGrid(values),
    html: createHtmlTable(cells, values),
    sourceSheetId: sheet.id,
    sourceRange: range,
    cells,
    ...(metadata ? { metadata } : {}),
  };
}

function createClipboardCell({
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
  hideHiddenFormulas,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
  hideHiddenFormulas?: boolean;
}) {
  const key = cellKey(rowIndex, columnIndex);
  const sourceCell = sheet.cells[key];
  const cell =
    hideHiddenFormulas &&
    sourceCell?.style?.formulaHidden &&
    sourceCell.raw.startsWith("=")
      ? {
          ...sourceCell,
          raw: computedValues[key] ?? "",
        }
      : sourceCell;

  return {
    cell: cell ? structuredClone(cell) : null,
    value: computedValues[key] ?? cell?.raw ?? "",
  };
}

export function createSpreadsheetVisibleRowsClipboardPayload({
  sheet,
  range,
  computedValues,
  visibleRowIndexes,
  options = {},
}: {
  sheet: SheetData;
  range: ClipboardRange;
  computedValues: Record<string, string>;
  visibleRowIndexes: number[];
  options?: { hideHiddenFormulas?: boolean };
}): SpreadsheetClipboardPayload | null {
  const visibleRows = new Set(visibleRowIndexes);
  const hiddenColumns = getEffectiveHiddenColumns(sheet);
  const rowIndexes = Array.from(
    { length: range.endRowIndex - range.startRowIndex + 1 },
    (_, offset) => range.startRowIndex + offset,
  ).filter((rowIndex) => visibleRows.has(rowIndex));
  const columnIndexes = Array.from(
    { length: range.endColumnIndex - range.startColumnIndex + 1 },
    (_, offset) => range.startColumnIndex + offset,
  ).filter((columnIndex) => !hiddenColumns.has(columnIndex));

  if (rowIndexes.length === 0 || columnIndexes.length === 0) {
    return null;
  }

  const cells: (CellRecord | null)[][] = [];
  const values: string[][] = [];

  for (const rowIndex of rowIndexes) {
    const cellRow: (CellRecord | null)[] = [];
    const valueRow: string[] = [];

    for (const columnIndex of columnIndexes) {
      const clipboardCell = createClipboardCell({
        sheet,
        computedValues,
        rowIndex,
        columnIndex,
        hideHiddenFormulas: options.hideHiddenFormulas,
      });

      cellRow.push(clipboardCell.cell);
      valueRow.push(clipboardCell.value);
    }

    cells.push(cellRow);
    values.push(valueRow);
  }

  return {
    text: serializeClipboardGrid(values),
    html: createHtmlTable(cells, values),
    sourceSheetId: sheet.id,
    sourceRange: range,
    cells,
  };
}
