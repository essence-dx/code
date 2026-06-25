import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";
import { compareSpreadsheetValues } from "@/features/spreadsheet/sort-orders";
import type { SortCustomOrder } from "@/features/spreadsheet/sort-orders";
import { getCellStyleCriterionValue } from "@/features/spreadsheet/style-criteria";
import type {
  CellRange,
  SortCriterion,
} from "@/features/spreadsheet/state/selection-state";

function getSortValue(
  sheet: SheetData,
  rowIndex: number,
  criterion: SortCriterion,
) {
  const sortOn = criterion.sortOn ?? "values";

  if (sortOn === "values") {
    return sheet.cells[cellKey(rowIndex, criterion.columnIndex)]?.raw ?? "";
  }

  return getCellStyleCriterionValue(
    sheet,
    rowIndex,
    criterion.columnIndex,
    sortOn,
  );
}

export function sortRangeInSheet({
  sheet,
  range,
  direction,
  sortColumnIndex,
  secondaryCriteria = [],
  customOrder = "none",
  sortOn = "values",
}: {
  sheet: SheetData;
  range: CellRange;
  direction: "asc" | "desc";
  sortColumnIndex: number;
  secondaryCriteria?: SortCriterion[];
  customOrder?: SortCustomOrder;
  sortOn?: SortCriterion["sortOn"];
}) {
  const rows = [];
  const criteria = [
    { columnIndex: sortColumnIndex, direction, customOrder, sortOn },
    ...secondaryCriteria,
  ].reduce<SortCriterion[]>((items, item) => {
    const columnIndex = Math.min(
      Math.max(item.columnIndex, range.startColumnIndex),
      range.endColumnIndex,
    );

    if (items.some((criterion) => criterion.columnIndex === columnIndex)) {
      return items;
    }

    items.push({
      columnIndex,
      direction: item.direction,
      customOrder: item.customOrder ?? "none",
      sortOn: item.sortOn ?? "values",
    });
    return items;
  }, []);

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    rows.push({
      sortValues: criteria.map((criterion) =>
        getSortValue(sheet, rowIndex, criterion),
      ),
      cells: Array.from(
        {
          length: range.endColumnIndex - range.startColumnIndex + 1,
        },
        (_, offset) =>
          sheet.cells[cellKey(rowIndex, range.startColumnIndex + offset)],
      ),
    });
  }

  rows.sort((left, right) => {
    for (let index = 0; index < criteria.length; index += 1) {
      const result = compareSpreadsheetValues(
        left.sortValues[index],
        right.sortValues[index],
        criteria[index].customOrder ?? "none",
      );

      if (result !== 0) {
        return criteria[index].direction === "asc" ? result : -result;
      }
    }

    return 0;
  });

  rows.forEach((row, rowOffset) => {
    const rowIndex = range.startRowIndex + rowOffset;

    row.cells.forEach((cell, columnOffset) => {
      const key = cellKey(rowIndex, range.startColumnIndex + columnOffset);

      if (cell) {
        sheet.cells[key] = cell;
      } else {
        delete sheet.cells[key];
      }
    });
  });
}
