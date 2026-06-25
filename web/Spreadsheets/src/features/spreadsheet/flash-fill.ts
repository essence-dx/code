import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";
import { createFlashFillCandidates } from "@/features/spreadsheet/flash-fill-candidates";
import {
  describeFlashFillTemplate,
  flashFillCandidatesById,
  inferFlashFillTemplate,
  renderFlashFillTemplate,
  type FlashFillExample,
  type FlashFillOrientation,
} from "@/features/spreadsheet/flash-fill-template";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

export type FlashFillCell = {
  rowIndex: number;
  columnIndex: number;
  raw: string;
};

export type FlashFillPlan = {
  description: string;
  exampleCount: number;
  filledCells: FlashFillCell[];
  orientation: FlashFillOrientation;
};

type FlashFillInput = {
  computedValues?: Record<string, string>;
  range: CellRange;
  sheet: SheetData;
};

type AxisContext = {
  candidatesForPosition: (index: number) => FlashFillExample["candidates"];
  getTargetRaw: (index: number) => string;
  indexes: number[];
  orientation: FlashFillOrientation;
  toCell: (index: number, raw: string) => FlashFillCell;
};

const columnSourceOffsets = [-4, -3, -2, -1, 1, 2];
const rowSourceOffsets = [-4, -3, -2, -1, 1, 2];

export function createFlashFillPlan({
  computedValues = {},
  range,
  sheet,
}: FlashFillInput): FlashFillPlan | null {
  const context = getAxisContext({ computedValues, range, sheet });

  if (!context) {
    return null;
  }

  const examples: FlashFillExample[] = [];
  const blankIndexes: number[] = [];

  for (const index of context.indexes) {
    const target = context.getTargetRaw(index).trim();
    const candidates = context.candidatesForPosition(index);

    if (target) {
      examples.push({ candidates, target });
    } else {
      blankIndexes.push(index);
    }
  }

  if (examples.length === 0 || blankIndexes.length === 0) {
    return null;
  }

  const template = inferFlashFillTemplate(examples);

  if (!template) {
    return null;
  }

  const filledCells = blankIndexes
    .map((index) => {
      const raw = renderFlashFillTemplate(
        template,
        flashFillCandidatesById(context.candidatesForPosition(index)),
      );

      return raw ? context.toCell(index, raw) : null;
    })
    .filter((cell): cell is FlashFillCell => cell !== null);

  if (filledCells.length === 0) {
    return null;
  }

  return {
    description: describeFlashFillTemplate(context.orientation, template),
    exampleCount: examples.length,
    filledCells,
    orientation: context.orientation,
  };
}

export function applyFlashFillToSheet(input: FlashFillInput) {
  const plan = createFlashFillPlan(input);

  if (!plan) {
    return null;
  }

  for (const cell of plan.filledCells) {
    const key = cellKey(cell.rowIndex, cell.columnIndex);
    input.sheet.cells[key] = {
      ...(input.sheet.cells[key] ?? {}),
      raw: cell.raw,
    };
  }

  return plan;
}

function getAxisContext({
  computedValues,
  range,
  sheet,
}: Required<FlashFillInput>): AxisContext | null {
  if (range.startColumnIndex === range.endColumnIndex) {
    return getColumnFlashFillContext({ computedValues, range, sheet });
  }

  if (range.startRowIndex === range.endRowIndex) {
    return getRowFlashFillContext({ computedValues, range, sheet });
  }

  return null;
}

function getColumnFlashFillContext({
  computedValues,
  range,
  sheet,
}: Required<FlashFillInput>): AxisContext | null {
  const targetColumnIndex = range.startColumnIndex;
  const sourceColumns = columnSourceOffsets
    .map((offset) => targetColumnIndex + offset)
    .filter((columnIndex) => columnIndex >= 0 && columnIndex < sheet.columnCount);

  if (sourceColumns.length === 0) {
    return null;
  }

  return {
    orientation: "column",
    indexes: rangeIndexes(range.startRowIndex, range.endRowIndex),
    getTargetRaw: (rowIndex) => rawCellText(sheet, rowIndex, targetColumnIndex),
    candidatesForPosition: (rowIndex) =>
      sourceColumns.flatMap((columnIndex) =>
        createFlashFillCandidates({
          idPrefix: `c${columnIndex - targetColumnIndex}`,
          value: displayCellText(sheet, rowIndex, columnIndex, computedValues),
        }),
      ),
    toCell: (rowIndex, raw) => ({
      rowIndex,
      columnIndex: targetColumnIndex,
      raw,
    }),
  };
}

function getRowFlashFillContext({
  computedValues,
  range,
  sheet,
}: Required<FlashFillInput>): AxisContext | null {
  const targetRowIndex = range.startRowIndex;
  const sourceRows = rowSourceOffsets
    .map((offset) => targetRowIndex + offset)
    .filter((rowIndex) => rowIndex >= 0 && rowIndex < sheet.rowCount);

  if (sourceRows.length === 0) {
    return null;
  }

  return {
    orientation: "row",
    indexes: rangeIndexes(range.startColumnIndex, range.endColumnIndex),
    getTargetRaw: (columnIndex) => rawCellText(sheet, targetRowIndex, columnIndex),
    candidatesForPosition: (columnIndex) =>
      sourceRows.flatMap((rowIndex) =>
        createFlashFillCandidates({
          idPrefix: `r${rowIndex - targetRowIndex}`,
          value: displayCellText(sheet, rowIndex, columnIndex, computedValues),
        }),
      ),
    toCell: (columnIndex, raw) => ({
      rowIndex: targetRowIndex,
      columnIndex,
      raw,
    }),
  };
}

function rawCellText(sheet: SheetData, rowIndex: number, columnIndex: number) {
  return sheet.cells[cellKey(rowIndex, columnIndex)]?.raw ?? "";
}

function displayCellText(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
  computedValues: Record<string, string>,
) {
  const key = cellKey(rowIndex, columnIndex);
  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function rangeIndexes(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
