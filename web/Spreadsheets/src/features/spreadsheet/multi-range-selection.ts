import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import {
  parseClipboardGrid,
  serializeClipboardGrid,
} from "@/features/spreadsheet/clipboard";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import { clearCellRaw } from "@/features/spreadsheet/state/cell-state";
import {
  forEachCellInRange,
  normalizeRange,
  rangesOverlap,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import type {
  CellRecord,
  ChartRange,
  NamedRange,
  SheetData,
} from "@/features/workbooks/types";

export type MultiRangeClipboardPayload = {
  text: string;
  html: string;
};

type ClipboardSourceCell = {
  raw: string;
  rowOffset: number;
  columnOffset: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cloneRange(range: ChartRange): CellRange {
  return {
    startRowIndex: range.startRowIndex,
    startColumnIndex: range.startColumnIndex,
    endRowIndex: range.endRowIndex,
    endColumnIndex: range.endColumnIndex,
  };
}

function clampRangeToSheet(range: ChartRange, sheet: SheetData): CellRange | null {
  if (sheet.rowCount <= 0 || sheet.columnCount <= 0) {
    return null;
  }

  const normalized = normalizeRange(
    {
      rowIndex: range.startRowIndex,
      columnIndex: range.startColumnIndex,
    },
    {
      rowIndex: range.endRowIndex,
      columnIndex: range.endColumnIndex,
    },
  );
  const startRowIndex = Math.min(
    Math.max(normalized.startRowIndex, 0),
    sheet.rowCount - 1,
  );
  const startColumnIndex = Math.min(
    Math.max(normalized.startColumnIndex, 0),
    sheet.columnCount - 1,
  );
  const endRowIndex = Math.min(
    Math.max(normalized.endRowIndex, startRowIndex),
    sheet.rowCount - 1,
  );
  const endColumnIndex = Math.min(
    Math.max(normalized.endColumnIndex, startColumnIndex),
    sheet.columnCount - 1,
  );

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

export function rangeAddress(range: ChartRange) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

export function formatMultiRangeLabel(ranges: ChartRange[]) {
  return ranges.map(rangeAddress).join(", ");
}

export function getNamedRangeAreas(namedRange: NamedRange): CellRange[] {
  return (namedRange.ranges?.length ? namedRange.ranges : [namedRange.range]).map(
    cloneRange,
  );
}

export function normalizeMultiRangeAreas(
  sheet: SheetData,
  ranges: ChartRange[],
): CellRange[] {
  const normalizedRanges: CellRange[] = [];

  for (const range of ranges) {
    const normalized = clampRangeToSheet(range, sheet);

    if (!normalized) {
      continue;
    }

    const duplicateOrOverlap = normalizedRanges.some(
      (existing) =>
        rangesOverlap(existing, normalized) ||
        (existing.startRowIndex === normalized.startRowIndex &&
          existing.startColumnIndex === normalized.startColumnIndex &&
          existing.endRowIndex === normalized.endRowIndex &&
          existing.endColumnIndex === normalized.endColumnIndex),
    );

    if (!duplicateOrOverlap) {
      normalizedRanges.push(normalized);
    }
  }

  return normalizedRanges.sort(
    (left, right) =>
      left.startRowIndex - right.startRowIndex ||
      left.startColumnIndex - right.startColumnIndex,
  );
}

function getCellDisplayValue({
  cell,
  computedValue,
  hideHiddenFormulas,
}: {
  cell?: CellRecord;
  computedValue: string | undefined;
  hideHiddenFormulas?: boolean;
}) {
  if (hideHiddenFormulas && cell?.style?.formulaHidden && cell.raw.startsWith("=")) {
    return "";
  }

  return computedValue ?? cell?.raw ?? "";
}

export function createMultiRangeClipboardPayload({
  sheet,
  ranges,
  computedValues,
  hideHiddenFormulas,
}: {
  sheet: SheetData;
  ranges: ChartRange[];
  computedValues: Record<string, string>;
  hideHiddenFormulas?: boolean;
}): MultiRangeClipboardPayload | null {
  const areas = normalizeMultiRangeAreas(sheet, ranges);

  if (areas.length === 0) {
    return null;
  }

  const textRows: string[][] = [];
  const htmlSections: string[] = [];

  areas.forEach((range, areaIndex) => {
    const areaRows: string[][] = [];

    for (
      let rowIndex = range.startRowIndex;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const row: string[] = [];

      for (
        let columnIndex = range.startColumnIndex;
        columnIndex <= range.endColumnIndex;
        columnIndex += 1
      ) {
        const key = cellKey(rowIndex, columnIndex);

        row.push(
          getCellDisplayValue({
            cell: sheet.cells[key],
            computedValue: computedValues[key],
            hideHiddenFormulas,
          }),
        );
      }

      areaRows.push(row);
    }

    if (areaIndex > 0) {
      textRows.push([]);
    }

    textRows.push(...areaRows);
    htmlSections.push(
      `<tbody data-area="${areaIndex + 1}">${areaRows
        .map(
          (row) =>
            `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>`,
    );
  });

  return {
    text: serializeClipboardGrid(textRows),
    html: `<meta charset="utf-8"><table>${htmlSections.join("")}</table>`,
  };
}

function getClipboardSourceCells(text: string): ClipboardSourceCell[] {
  if (!text) {
    return [];
  }

  return parseClipboardGrid(text).flatMap((row, rowOffset) =>
    row.map((raw, columnOffset) => ({
      raw,
      rowOffset,
      columnOffset,
    })),
  );
}

export function pasteClipboardTextIntoMultiRanges({
  sheet,
  ranges,
  text,
}: {
  sheet: SheetData;
  ranges: ChartRange[];
  text: string;
}) {
  const areas = normalizeMultiRangeAreas(sheet, ranges);
  const sourceCells = getClipboardSourceCells(text);

  if (areas.length === 0 || sourceCells.length === 0) {
    return 0;
  }

  const firstArea = areas[0];
  let pastedCellCount = 0;
  let targetCellIndex = 0;
  const shouldRepeatSingleCell = sourceCells.length === 1;

  for (const range of areas) {
    forEachCellInRange(range, (rowIndex, columnIndex) => {
      const source = shouldRepeatSingleCell
        ? sourceCells[0]
        : sourceCells[targetCellIndex];

      targetCellIndex += 1;

      if (!source) {
        return;
      }

      const key = cellKey(rowIndex, columnIndex);
      const normalizedRaw = canonicalizeFormulaInput(source.raw);
      const raw = normalizedRaw.startsWith("=")
        ? shiftFormulaReferences({
            formula: normalizedRaw,
            rowOffset:
              rowIndex - (firstArea.startRowIndex + source.rowOffset),
            columnOffset:
              columnIndex - (firstArea.startColumnIndex + source.columnOffset),
          })
        : normalizedRaw;

      if (raw) {
        sheet.cells[key] = {
          ...sheet.cells[key],
          raw,
        };
      } else {
        clearCellRaw(sheet, key);
      }

      pastedCellCount += 1;
    });
  }

  return pastedCellCount;
}

export function shiftMultiRangeFormulaReferences({
  cells,
  columnOffset,
  rowOffset,
}: {
  cells: Array<CellRecord | null>;
  columnOffset: number;
  rowOffset: number;
}) {
  return cells.map((cell) => {
    if (!cell) {
      return null;
    }

    const raw = cell.raw.startsWith("=")
      ? shiftFormulaReferences({
          formula: cell.raw,
          columnOffset,
          rowOffset,
        })
      : cell.raw;

    return {
      ...cell,
      raw,
    };
  });
}

export function countMultiRangeCells(ranges: ChartRange[]) {
  return ranges.reduce(
    (total, range) =>
      total +
      (range.endRowIndex - range.startRowIndex + 1) *
        (range.endColumnIndex - range.startColumnIndex + 1),
    0,
  );
}

export function forEachMultiRangeCell(
  ranges: ChartRange[],
  callback: (rowIndex: number, columnIndex: number) => void,
) {
  for (const range of ranges) {
    forEachCellInRange(range, callback);
  }
}
