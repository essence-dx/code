import { cellKey } from "@/features/workbooks/addresses";
import { createCellRichTextRunsFromStyle } from "@/features/workbooks/rich-text";
import { mergeBorderStyle } from "@/features/spreadsheet/state/cell-state";
import {
  forEachCellInRange,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import type { CellStyle, SheetData } from "@/features/workbooks/types";

export function updateRangeCellStyle(
  sheet: SheetData,
  range: CellRange,
  style: Partial<CellStyle>,
) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key] ?? { raw: "" };

    const nextStyle: CellStyle = {
      ...current.style,
      ...style,
    };

    for (const [styleKey, styleValue] of Object.entries(nextStyle)) {
      if (styleValue === undefined) {
        delete nextStyle[styleKey as keyof CellStyle];
      }
    }

    sheet.cells[key] = {
      ...current,
      style: nextStyle,
    };
  });
}

export function setRangeCellsLocked(
  sheet: SheetData,
  range: CellRange,
  locked: boolean,
) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key];

    if (!current && locked) {
      return;
    }

    const nextCell = current ?? { raw: "" };
    const nextStyle: CellStyle = {
      ...nextCell.style,
    };

    if (locked) {
      delete nextStyle.locked;
    } else {
      nextStyle.locked = false;
    }

    sheet.cells[key] = {
      ...nextCell,
      style: nextStyle,
    };
  });
}

export function setRangeFormulasHidden(
  sheet: SheetData,
  range: CellRange,
  hidden: boolean,
) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key];

    if (!current && !hidden) {
      return;
    }

    const nextCell = current ?? { raw: "" };
    const nextStyle: CellStyle = {
      ...nextCell.style,
    };

    if (hidden) {
      nextStyle.formulaHidden = true;
    } else {
      delete nextStyle.formulaHidden;
    }

    sheet.cells[key] = {
      ...nextCell,
      style: nextStyle,
    };
  });
}

export function clearRangeFormatting(sheet: SheetData, range: CellRange) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key];

    if (!current?.style && !current?.richTextRuns?.length) {
      return;
    }

    if (!current.raw) {
      delete sheet.cells[key];
      return;
    }

    sheet.cells[key] = { raw: current.raw };
  });
}

export function applyRichTextRunsToRange({
  sheet,
  range,
  style,
  computedValues,
}: {
  sheet: SheetData;
  range: CellRange;
  style: CellStyle;
  computedValues: Record<string, string>;
}) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key] ?? { raw: "" };

    if (current.raw.startsWith("=")) {
      return;
    }

    const text = computedValues[key] ?? current.raw;
    const richTextRuns = createCellRichTextRunsFromStyle(text, style);

    if (!richTextRuns.length) {
      return;
    }

    sheet.cells[key] = {
      ...current,
      richTextRuns,
    };
  });
}

export function clearRangeRichTextRuns(sheet: SheetData, range: CellRange) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key];

    if (!current?.richTextRuns?.length) {
      return;
    }

    if (!current.raw && !current.style) {
      delete sheet.cells[key];
      return;
    }

    const nextCell = { ...current };

    delete nextCell.richTextRuns;
    sheet.cells[key] = nextCell;
  });
}

export function paintRangeStyle(
  sheet: SheetData,
  range: CellRange,
  style: CellStyle,
) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key] ?? { raw: "" };

    sheet.cells[key] = {
      ...current,
      style: structuredClone(style),
    };
  });
}

export function updateRangeBorders(
  sheet: SheetData,
  range: CellRange,
  kind: "all" | "outline" | "clear",
) {
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const current = sheet.cells[key] ?? { raw: "" };

    if (kind === "clear") {
      sheet.cells[key] = {
        ...current,
        style: {
          ...current.style,
          borders: undefined,
        },
      };
      return;
    }

    const borderColor = current.style?.borders?.color ?? "#111827";
    const borders =
      kind === "all"
        ? {
            top: true,
            right: true,
            bottom: true,
            left: true,
            color: borderColor,
          }
        : {
            top: rowIndex === range.startRowIndex || undefined,
            right: columnIndex === range.endColumnIndex || undefined,
            bottom: rowIndex === range.endRowIndex || undefined,
            left: columnIndex === range.startColumnIndex || undefined,
            color: borderColor,
          };

    sheet.cells[key] = {
      ...current,
      style: {
        ...current.style,
        borders: mergeBorderStyle(current.style?.borders, borders),
      },
    };
  });
}
