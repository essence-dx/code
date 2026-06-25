import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import { createCriteriaRangeFilters } from "@/features/spreadsheet/criteria-range-filter";
import { getVisibleRowIndexes } from "@/features/spreadsheet/sheet-filtering";
import {
  rangesOverlap,
  type CellRange,
  type CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type { SheetData, SheetFilterRule } from "@/features/workbooks/types";

export type AdvancedFilterCopyPlan = {
  sourceRange: CellRange;
  criteriaRange: CellRange;
  targetRange: CellRange;
  sourceRowIndexes: number[];
  copiedRecordCount: number;
};

export type AdvancedFilterCopyPlanResult =
  | { ok: true; plan: AdvancedFilterCopyPlan }
  | { ok: false; message: string };

function toSheetFilterRule(
  sheetId: string,
  filter: ReturnType<typeof createCriteriaRangeFilters>["filters"][number],
): SheetFilterRule {
  return {
    id: "advanced_filter_copy",
    sheetId,
    range: filter.range,
    columnIndex: filter.columnIndex,
    headerName: filter.headerName,
    type: filter.type,
    value: filter.value,
    joiner: filter.joiner,
    conditions: filter.conditions,
    criteriaGroups: filter.criteriaGroups,
  };
}

function getCellText(
  sheet: SheetData,
  computedValues: Record<string, string>,
  rowIndex: number,
  columnIndex: number,
) {
  const key = cellKey(rowIndex, columnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function getEffectiveSourceRange(
  sheet: SheetData,
  range: CellRange,
  filter: SheetFilterRule,
  computedValues: Record<string, string>,
): CellRange {
  let endColumnIndex = range.startColumnIndex;

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (let columnIndex = 0; columnIndex < sheet.columnCount; columnIndex += 1) {
      const key = cellKey(rowIndex, columnIndex);
      const cell = sheet.cells[key];

      if (cell?.style || getCellText(sheet, computedValues, rowIndex, columnIndex)) {
        endColumnIndex = Math.max(endColumnIndex, columnIndex);
      }
    }
  }

  for (const group of filter.criteriaGroups ?? []) {
    for (const condition of group.conditions) {
      endColumnIndex = Math.max(endColumnIndex, condition.columnIndex);
    }
  }

  return {
    ...range,
    endColumnIndex: Math.min(endColumnIndex, sheet.columnCount - 1),
  };
}

function createTargetRange(
  sheet: SheetData,
  target: CellSelection,
  rowCount: number,
  columnCount: number,
): CellRange | null {
  if (
    target.rowIndex < 0 ||
    target.columnIndex < 0 ||
    target.rowIndex >= sheet.rowCount ||
    target.columnIndex >= sheet.columnCount
  ) {
    return null;
  }

  const endRowIndex = target.rowIndex + rowCount - 1;
  const endColumnIndex = target.columnIndex + columnCount - 1;

  if (endRowIndex >= sheet.rowCount || endColumnIndex >= sheet.columnCount) {
    return null;
  }

  return {
    startRowIndex: target.rowIndex,
    startColumnIndex: target.columnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

function formatCell(selection: CellSelection) {
  return `${columnLabel(selection.columnIndex)}${selection.rowIndex + 1}`;
}

export function createAdvancedFilterCopyPlan({
  sheet,
  criteriaRange,
  target,
  computedValues,
}: {
  sheet: SheetData;
  criteriaRange: CellRange;
  target: CellSelection;
  computedValues: Record<string, string>;
}): AdvancedFilterCopyPlanResult {
  const criteriaPlan = createCriteriaRangeFilters({
    sheet,
    criteriaRange,
    computedValues,
  });
  const filter = criteriaPlan.filters[0];

  if (!filter) {
    return {
      ok: false,
      message: criteriaPlan.message ?? "No criteria filters were created.",
    };
  }

  const filterRule = toSheetFilterRule(sheet.id, filter);
  const sourceRange = getEffectiveSourceRange(
    sheet,
    filter.range,
    filterRule,
    computedValues,
  );
  const visibleSourceRowIndexes = getVisibleRowIndexes({
    sheet,
    filters: [filterRule],
    computedValues,
  }).filter(
    (rowIndex) =>
      rowIndex >= sourceRange.startRowIndex && rowIndex <= sourceRange.endRowIndex,
  );
  const sourceRowIndexes = visibleSourceRowIndexes.includes(
    sourceRange.startRowIndex,
  )
    ? visibleSourceRowIndexes
    : [
        sourceRange.startRowIndex,
        ...visibleSourceRowIndexes.filter(
          (rowIndex) => rowIndex > sourceRange.startRowIndex,
        ),
      ];
  const columnCount = sourceRange.endColumnIndex - sourceRange.startColumnIndex + 1;
  const targetRange = createTargetRange(
    sheet,
    target,
    Math.max(sourceRowIndexes.length, 1),
    columnCount,
  );

  if (!targetRange) {
    return {
      ok: false,
      message: `The output range starting at ${formatCell(target)} does not fit on this sheet.`,
    };
  }

  if (
    rangesOverlap(targetRange, sourceRange) ||
    rangesOverlap(targetRange, criteriaRange)
  ) {
    return {
      ok: false,
      message: "Choose an output range that does not overlap the source list or criteria range.",
    };
  }

  return {
    ok: true,
    plan: {
      sourceRange,
      criteriaRange,
      targetRange,
      sourceRowIndexes,
      copiedRecordCount: Math.max(sourceRowIndexes.length - 1, 0),
    },
  };
}

export function copyAdvancedFilterRowsToSheet({
  sheet,
  computedValues,
  plan,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  plan: AdvancedFilterCopyPlan;
}) {
  for (
    let rowIndex = plan.targetRange.startRowIndex;
    rowIndex <= plan.targetRange.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = plan.targetRange.startColumnIndex;
      columnIndex <= plan.targetRange.endColumnIndex;
      columnIndex += 1
    ) {
      delete sheet.cells[cellKey(rowIndex, columnIndex)];
    }
  }

  plan.sourceRowIndexes.forEach((sourceRowIndex, rowOffset) => {
    for (
      let sourceColumnIndex = plan.sourceRange.startColumnIndex;
      sourceColumnIndex <= plan.sourceRange.endColumnIndex;
      sourceColumnIndex += 1
    ) {
      const columnOffset = sourceColumnIndex - plan.sourceRange.startColumnIndex;
      const sourceKey = cellKey(sourceRowIndex, sourceColumnIndex);
      const targetKey = cellKey(
        plan.targetRange.startRowIndex + rowOffset,
        plan.targetRange.startColumnIndex + columnOffset,
      );
      const sourceCell = sheet.cells[sourceKey];
      const raw = computedValues[sourceKey] ?? sourceCell?.raw ?? "";

      if (!raw && !sourceCell?.style && !sourceCell?.richTextRuns?.length) {
        continue;
      }

      sheet.cells[targetKey] = {
        raw,
        ...(sourceCell?.style ? { style: structuredClone(sourceCell.style) } : {}),
        ...(sourceCell?.richTextRuns
          ? { richTextRuns: structuredClone(sourceCell.richTextRuns) }
          : {}),
      };
    }
  });
}
