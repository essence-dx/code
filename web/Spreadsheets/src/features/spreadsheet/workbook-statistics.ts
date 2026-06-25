import type { WorkbookDocument } from "@/features/workbooks/types";

export type WorkbookStatistics = {
  sheetCount: number;
  rowCapacity: number;
  columnCapacity: number;
  cellCapacity: number;
  populatedCellCount: number;
  formulaCellCount: number;
  styledCellCount: number;
  mergedCellCount: number;
  hiddenRowCount: number;
  hiddenColumnCount: number;
  outlineGroupCount: number;
  chartCount: number;
  chartDataTableCount: number;
  chart3DMetadataCount: number;
  sparklineCount: number;
  insertedObjectCount: number;
  insertedImageCount: number;
  nativeObjectCount: number;
  tableCount: number;
  tableSlicerCount: number;
  tableTimelineCount: number;
  pivotTableCount: number;
  managedCellStyleCount: number;
  themeName: string;
  namedRangeCount: number;
  noteCount: number;
  linkCount: number;
  conditionalFormatCount: number;
  dataValidationCount: number;
  filterCount: number;
  filterPresetCount: number;
  protectedSheetCount: number;
  workbookProtected: boolean;
  customViewCount: number;
  versionCount: number;
  restoreCount: number;
  printAreaCount: number;
  pageBreakCount: number;
};

function isFormula(raw: string) {
  return raw.trimStart().startsWith("=");
}

export function getWorkbookStatistics(
  document: WorkbookDocument,
): WorkbookStatistics {
  return {
    sheetCount: document.sheets.length,
    rowCapacity: document.sheets.reduce(
      (total, sheet) => total + sheet.rowCount,
      0,
    ),
    columnCapacity: document.sheets.reduce(
      (total, sheet) => total + sheet.columnCount,
      0,
    ),
    cellCapacity: document.sheets.reduce(
      (total, sheet) => total + sheet.rowCount * sheet.columnCount,
      0,
    ),
    populatedCellCount: document.sheets.reduce(
      (total, sheet) =>
        total +
        Object.values(sheet.cells).filter((cell) => cell.raw !== "").length,
      0,
    ),
    formulaCellCount: document.sheets.reduce(
      (total, sheet) =>
        total +
        Object.values(sheet.cells).filter((cell) => isFormula(cell.raw)).length,
      0,
    ),
    styledCellCount: document.sheets.reduce(
      (total, sheet) =>
        total +
        Object.values(sheet.cells).filter(
          (cell) => cell.style && Object.keys(cell.style).length > 0,
        ).length,
      0,
    ),
    mergedCellCount: document.sheets.reduce(
      (total, sheet) => total + sheet.mergedCells.length,
      0,
    ),
    hiddenRowCount: document.sheets.reduce(
      (total, sheet) => total + sheet.hiddenRows.length,
      0,
    ),
    hiddenColumnCount: document.sheets.reduce(
      (total, sheet) => total + sheet.hiddenColumns.length,
      0,
    ),
    outlineGroupCount: document.sheets.reduce(
      (total, sheet) =>
        total + sheet.rowGroups.length + sheet.columnGroups.length,
      0,
    ),
    chartCount: document.charts.length,
    chartDataTableCount: document.charts.filter(
      (chart) => chart.format?.dataTable?.enabled,
    ).length,
    chart3DMetadataCount: document.charts.filter(
      (chart) => chart.format?.threeDimensional?.enabled,
    ).length,
    sparklineCount: document.sparklines.length,
    insertedObjectCount: (document.insertedObjects ?? []).length,
    insertedImageCount: (document.insertedObjects ?? []).filter(
      (object) => object.kind === "image",
    ).length,
    nativeObjectCount: (document.nativeObjects ?? []).length,
    tableCount: document.tables.length,
    tableSlicerCount: (document.tableSlicers ?? []).length,
    tableTimelineCount: (document.tableTimelines ?? []).length,
    pivotTableCount: (document.pivotTables ?? []).length,
    managedCellStyleCount: (document.cellStyles ?? []).length,
    themeName: document.theme?.name ?? "Essence",
    namedRangeCount: document.namedRanges.length,
    noteCount: document.cellNotes.length,
    linkCount: document.cellLinks.length,
    conditionalFormatCount: document.conditionalFormats.length,
    dataValidationCount: document.dataValidations.length,
    filterCount: document.filters.length,
    filterPresetCount: document.filterPresets.length,
    protectedSheetCount: document.sheetProtections.length,
    workbookProtected: Boolean(document.workbookProtection),
    customViewCount: document.customViews.length,
    versionCount: document.versionHistory.length,
    restoreCount: document.versionRestores.length,
    printAreaCount: document.sheetPrintSettings.filter(
      (settings) => settings.printArea,
    ).length,
    pageBreakCount: document.sheetPrintSettings.reduce(
      (total, settings) =>
        total + settings.rowPageBreaks.length + settings.columnPageBreaks.length,
      0,
    ),
  };
}
