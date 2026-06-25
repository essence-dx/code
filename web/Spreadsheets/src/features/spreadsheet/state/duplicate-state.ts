import { cellKey } from "@/features/workbooks/addresses";
import type { CellRecord, SheetData } from "@/features/workbooks/types";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

type RemoveDuplicatesInput = {
  computedValues: Record<string, string>;
  range: CellRange;
  sheet: SheetData;
};

type RowSnapshot = (CellRecord | null)[];

function getRangeColumns(range: CellRange) {
  return Array.from(
    { length: range.endColumnIndex - range.startColumnIndex + 1 },
    (_, index) => range.startColumnIndex + index,
  );
}

function getComparableValue({
  columnIndex,
  computedValues,
  rowIndex,
  sheet,
}: {
  columnIndex: number;
  computedValues: Record<string, string>;
  rowIndex: number;
  sheet: SheetData;
}) {
  const key = cellKey(rowIndex, columnIndex);
  const raw = sheet.cells[key]?.raw ?? "";

  return (computedValues[key] ?? raw).trim().toLocaleLowerCase();
}

function getRowSignature(input: RemoveDuplicatesInput, rowIndex: number) {
  return JSON.stringify(
    getRangeColumns(input.range).map((columnIndex) =>
      getComparableValue({ ...input, columnIndex, rowIndex }),
    ),
  );
}

function snapshotRangeRow(sheet: SheetData, range: CellRange, rowIndex: number) {
  return getRangeColumns(range).map((columnIndex) => {
    const cell = sheet.cells[cellKey(rowIndex, columnIndex)];

    return cell ? structuredClone(cell) : null;
  });
}

function writeRangeRow({
  range,
  rowIndex,
  sheet,
  snapshot,
}: {
  range: CellRange;
  rowIndex: number;
  sheet: SheetData;
  snapshot: RowSnapshot;
}) {
  getRangeColumns(range).forEach((columnIndex, offset) => {
    const key = cellKey(rowIndex, columnIndex);
    const cell = snapshot[offset];

    if (cell) {
      sheet.cells[key] = structuredClone(cell);
      return;
    }

    delete sheet.cells[key];
  });
}

function getUniqueRowSnapshots(input: RemoveDuplicatesInput) {
  const seen = new Set<string>();
  const uniqueRows: RowSnapshot[] = [];
  let duplicateCount = 0;

  for (
    let rowIndex = input.range.startRowIndex;
    rowIndex <= input.range.endRowIndex;
    rowIndex += 1
  ) {
    const signature = getRowSignature(input, rowIndex);

    if (seen.has(signature)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(signature);
    uniqueRows.push(snapshotRangeRow(input.sheet, input.range, rowIndex));
  }

  return { duplicateCount, uniqueRows };
}

export function getDuplicateRowCountInRange(input: RemoveDuplicatesInput) {
  return getUniqueRowSnapshots(input).duplicateCount;
}

export function removeDuplicateRowsInRange(input: RemoveDuplicatesInput) {
  const { duplicateCount, uniqueRows } = getUniqueRowSnapshots(input);

  if (duplicateCount === 0) {
    return 0;
  }

  uniqueRows.forEach((snapshot, offset) => {
    writeRangeRow({
      range: input.range,
      rowIndex: input.range.startRowIndex + offset,
      sheet: input.sheet,
      snapshot,
    });
  });

  for (
    let rowIndex = input.range.startRowIndex + uniqueRows.length;
    rowIndex <= input.range.endRowIndex;
    rowIndex += 1
  ) {
    writeRangeRow({
      range: input.range,
      rowIndex,
      sheet: input.sheet,
      snapshot: [],
    });
  }

  return duplicateCount;
}
