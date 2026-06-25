import { getConditionalCellStyles } from "@/features/spreadsheet/conditional-formatting";
import { resolvePivotConditionalFormatRules } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import { getInvalidCellIssues } from "@/features/spreadsheet/data-validation";
import { getSheetDynamicArrayState } from "@/features/spreadsheet/dynamic-arrays";
import { createTableSlicerFilterRules } from "@/features/spreadsheet/table-slicers";
import { createTableTimelineFilterRules } from "@/features/spreadsheet/table-timelines";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import { getFormulaErrorIssues } from "@/features/spreadsheet/formula-errors";
import { getVisibleRowIndexes } from "@/features/spreadsheet/sheet-filtering";
import { isSheetProtected } from "@/features/spreadsheet/state/protection-state";
import type { SpreadsheetGridProps } from "@/features/spreadsheet/components/spreadsheet-grid";
import { getEffectiveSheetPrintSettings } from "@/features/workbooks/print-settings";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookWindowGridState = Pick<
  SpreadsheetGridProps,
  | "computedValues"
  | "conditionalStyles"
  | "charts"
  | "dataValidations"
  | "filters"
  | "formulaErrorKeys"
  | "insertedObjects"
  | "invalidKeys"
  | "linkedKeys"
  | "notedKeys"
  | "printSettings"
  | "sparklines"
  | "spillAnchorKeys"
  | "spillBlockedKeys"
  | "spillKeys"
  | "tables"
  | "visibleRowIndexes"
>;

export function createWorkbookWindowGridState({
  document,
  sheet,
}: {
  document: WorkbookDocument;
  sheet: SheetData;
}): WorkbookWindowGridState {
  const computedValues = getWindowComputedValues(document, sheet);
  const tables = document.tables.filter((table) => table.sheetId === sheet.id);
  const tableSlicers = document.tableSlicers.filter((slicer) =>
    tables.some((table) => table.id === slicer.tableId),
  );
  const tableTimelines = document.tableTimelines.filter((timeline) =>
    tables.some((table) => table.id === timeline.tableId),
  );
  const manualFilters = document.filters.filter(
    (filter) => filter.sheetId === sheet.id,
  );
  const slicerFilters = createTableSlicerFilterRules({
    slicers: tableSlicers,
    tables,
  });
  const timelineFilters = createTableTimelineFilterRules({
    computedValues,
    sheet,
    tables,
    timelines: tableTimelines,
  });
  const filters = [...manualFilters, ...slicerFilters, ...timelineFilters];
  const dataValidations = document.dataValidations.filter(
    (rule) => rule.sheetId === sheet.id,
  );
  const formulaErrorIssues = getFormulaErrorIssues({
    computedValues,
    hideHiddenFormulas: isSheetProtected(document, sheet.id),
    sheet,
  });
  const dynamicArrayState = getSheetDynamicArrayState({
    computedValues,
    sheet,
  });

  return {
    computedValues,
    conditionalStyles: getConditionalCellStyles({
      computedValues,
      rules: resolvePivotConditionalFormatRules({
        pivotTables: document.pivotTables ?? [],
        rules: document.conditionalFormats ?? [],
      }).filter(
        (rule) => rule.sheetId === sheet.id,
      ),
      sheet,
    }),
    charts: document.charts.filter((chart) => chart.sheetId === sheet.id),
    dataValidations,
    filters,
    formulaErrorKeys: new Set(formulaErrorIssues.map((issue) => issue.key)),
    insertedObjects: document.insertedObjects.filter(
      (object) => object.sheetId === sheet.id,
    ),
    invalidKeys: new Set(
      getInvalidCellIssues({
        computedValues,
        rules: dataValidations,
        sheet,
      })
        .filter((issue) => issue.circleInvalid)
        .map((issue) => issue.key),
    ),
    linkedKeys: new Set(
      document.cellLinks
        .filter((link) => link.sheetId === sheet.id)
        .map((link) => link.cellKey),
    ),
    notedKeys: new Set(
      document.cellNotes
        .filter((note) => note.sheetId === sheet.id)
        .map((note) => note.cellKey),
    ),
    printSettings: getEffectiveSheetPrintSettings(
      sheet.id,
      document.sheetPrintSettings.find((settings) => settings.sheetId === sheet.id),
    ),
    sparklines: document.sparklines.filter(
      (sparkline) => sparkline.sheetId === sheet.id,
    ),
    spillAnchorKeys: dynamicArrayState.spillAnchorKeys,
    spillBlockedKeys: dynamicArrayState.spillBlockedKeys,
    spillKeys: dynamicArrayState.spillKeys,
    tables,
    visibleRowIndexes: getVisibleRowIndexes({
      computedValues,
      filters,
      sheet,
    }),
  };
}

function getWindowComputedValues(
  document: WorkbookDocument,
  sheet: SheetData,
): Record<string, string> {
  try {
    return evaluateWorkbook(document, sheet.id);
  } catch {
    return Object.fromEntries(
      Object.entries(sheet.cells).map(([key, cell]) => [key, cell.raw]),
    );
  }
}
