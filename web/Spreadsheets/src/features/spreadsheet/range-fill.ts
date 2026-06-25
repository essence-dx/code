import { cellKey } from "@/features/workbooks/addresses";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import { parseComparableNumber } from "@/features/spreadsheet/value-parsing";
import type { CellRecord, SheetData } from "@/features/workbooks/types";

type FillRange = {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
};

function cloneFilledCell(
  cell: CellRecord,
  rowOffset: number,
  columnOffset: number,
): CellRecord {
  const raw = cell.raw.startsWith("=")
    ? shiftFormulaReferences({ formula: cell.raw, rowOffset, columnOffset })
    : cell.raw;

  return {
    raw,
    ...(cell.style ? { style: structuredClone(cell.style) } : {}),
  };
}

function writeFilledCell({
  sheet,
  source,
  targetRowIndex,
  targetColumnIndex,
  rowOffset,
  columnOffset,
}: {
  sheet: SheetData;
  source?: CellRecord;
  targetRowIndex: number;
  targetColumnIndex: number;
  rowOffset: number;
  columnOffset: number;
}) {
  const key = cellKey(targetRowIndex, targetColumnIndex);

  if (!source) {
    delete sheet.cells[key];
    return;
  }

  sheet.cells[key] = cloneFilledCell(source, rowOffset, columnOffset);
}

function parseSeriesSeed(raw?: string) {
  const trimmed = raw?.trim() ?? "";

  if (!trimmed || trimmed.startsWith("=")) {
    return null;
  }

  return parseComparableNumber(trimmed);
}

const customFillLists = [
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ["Q1", "Q2", "Q3", "Q4"],
];

function normalizeCustomListValue(raw?: string) {
  return (raw ?? "").trim().toLowerCase();
}

function getCustomListSeed(raw?: string) {
  const normalized = normalizeCustomListValue(raw);

  if (!normalized || normalized.startsWith("=")) {
    return null;
  }

  for (const list of customFillLists) {
    const index = list.findIndex(
      (value) => normalizeCustomListValue(value) === normalized,
    );

    if (index >= 0) {
      return { index, list };
    }
  }

  return null;
}

function getCustomListStep(
  list: string[],
  firstIndex: number,
  secondRaw?: string,
) {
  const normalized = normalizeCustomListValue(secondRaw);

  if (!normalized) {
    return 1;
  }

  const secondIndex = list.findIndex(
    (value) => normalizeCustomListValue(value) === normalized,
  );

  return secondIndex >= 0 ? secondIndex - firstIndex || 1 : 1;
}

function formatSeriesValue(value: number) {
  return Number(value.toFixed(12)).toString();
}

function writeSeriesCell({
  sheet,
  source,
  targetRowIndex,
  targetColumnIndex,
  value,
}: {
  sheet: SheetData;
  source?: CellRecord;
  targetRowIndex: number;
  targetColumnIndex: number;
  value: number;
}) {
  const key = cellKey(targetRowIndex, targetColumnIndex);
  const current = sheet.cells[key];

  sheet.cells[key] = {
    raw: formatSeriesValue(value),
    ...(current?.style
      ? { style: structuredClone(current.style) }
      : source?.style
        ? { style: structuredClone(source.style) }
        : {}),
  };
}

function writeTextSeriesCell({
  sheet,
  source,
  targetRowIndex,
  targetColumnIndex,
  value,
}: {
  sheet: SheetData;
  source?: CellRecord;
  targetRowIndex: number;
  targetColumnIndex: number;
  value: string;
}) {
  const key = cellKey(targetRowIndex, targetColumnIndex);
  const current = sheet.cells[key];

  sheet.cells[key] = {
    raw: value,
    ...(current?.style
      ? { style: structuredClone(current.style) }
      : source?.style
        ? { style: structuredClone(source.style) }
        : {}),
  };
}

function getCustomListValue(
  list: string[],
  startIndex: number,
  step: number,
  offset: number,
) {
  const index = (startIndex + step * offset) % list.length;
  const normalizedIndex = index < 0 ? index + list.length : index;

  return list[normalizedIndex];
}

export function fillRangeDown(sheet: SheetData, range: FillRange) {
  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    const source = sheet.cells[cellKey(range.startRowIndex, columnIndex)];

    for (
      let rowIndex = range.startRowIndex + 1;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      writeFilledCell({
        sheet,
        source,
        targetRowIndex: rowIndex,
        targetColumnIndex: columnIndex,
        rowOffset: rowIndex - range.startRowIndex,
        columnOffset: 0,
      });
    }
  }
}

export function fillRangeRight(sheet: SheetData, range: FillRange) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const source = sheet.cells[cellKey(rowIndex, range.startColumnIndex)];

    for (
      let columnIndex = range.startColumnIndex + 1;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      writeFilledCell({
        sheet,
        source,
        targetRowIndex: rowIndex,
        targetColumnIndex: columnIndex,
        rowOffset: 0,
        columnOffset: columnIndex - range.startColumnIndex,
      });
    }
  }
}

export function fillNumericSeries(sheet: SheetData, range: FillRange) {
  const rowCount = range.endRowIndex - range.startRowIndex + 1;
  const columnCount = range.endColumnIndex - range.startColumnIndex + 1;
  const shouldFillVertically = rowCount >= columnCount;

  fillNumericSeriesByDirection(
    sheet,
    range,
    shouldFillVertically ? "down" : "right",
  );
}

export function fillNumericSeriesByDirection(
  sheet: SheetData,
  range: FillRange,
  direction: "down" | "right",
) {
  if (direction === "down") {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      const source = sheet.cells[cellKey(range.startRowIndex, columnIndex)];
      const first = parseSeriesSeed(source?.raw);
      const second = parseSeriesSeed(
        sheet.cells[cellKey(range.startRowIndex + 1, columnIndex)]?.raw,
      );
      const customSeed = getCustomListSeed(source?.raw);

      if (first === null) {
        if (customSeed) {
          const step = getCustomListStep(
            customSeed.list,
            customSeed.index,
            sheet.cells[cellKey(range.startRowIndex + 1, columnIndex)]?.raw,
          );

          for (
            let rowIndex = range.startRowIndex + 1;
            rowIndex <= range.endRowIndex;
            rowIndex += 1
          ) {
            writeTextSeriesCell({
              sheet,
              source,
              targetRowIndex: rowIndex,
              targetColumnIndex: columnIndex,
              value: getCustomListValue(
                customSeed.list,
                customSeed.index,
                step,
                rowIndex - range.startRowIndex,
              ),
            });
          }

          continue;
        }

        fillRangeDown(sheet, {
          ...range,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex,
        });
        continue;
      }

      const step = second === null ? 1 : second - first;

      for (
        let rowIndex = range.startRowIndex + 1;
        rowIndex <= range.endRowIndex;
        rowIndex += 1
      ) {
        writeSeriesCell({
          sheet,
          source,
          targetRowIndex: rowIndex,
          targetColumnIndex: columnIndex,
          value: first + step * (rowIndex - range.startRowIndex),
        });
      }
    }

    return;
  }

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const source = sheet.cells[cellKey(rowIndex, range.startColumnIndex)];
    const first = parseSeriesSeed(source?.raw);
    const second = parseSeriesSeed(
      sheet.cells[cellKey(rowIndex, range.startColumnIndex + 1)]?.raw,
    );
    const customSeed = getCustomListSeed(source?.raw);

    if (first === null) {
      if (customSeed) {
        const step = getCustomListStep(
          customSeed.list,
          customSeed.index,
          sheet.cells[cellKey(rowIndex, range.startColumnIndex + 1)]?.raw,
        );

        for (
          let columnIndex = range.startColumnIndex + 1;
          columnIndex <= range.endColumnIndex;
          columnIndex += 1
        ) {
          writeTextSeriesCell({
            sheet,
            source,
            targetRowIndex: rowIndex,
            targetColumnIndex: columnIndex,
            value: getCustomListValue(
              customSeed.list,
              customSeed.index,
              step,
              columnIndex - range.startColumnIndex,
            ),
          });
        }

        continue;
      }

      fillRangeRight(sheet, {
        ...range,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex,
      });
      continue;
    }

    const step = second === null ? 1 : second - first;

    for (
      let columnIndex = range.startColumnIndex + 1;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      writeSeriesCell({
        sheet,
        source,
        targetRowIndex: rowIndex,
        targetColumnIndex: columnIndex,
        value: first + step * (columnIndex - range.startColumnIndex),
      });
    }
  }
}
