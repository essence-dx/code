import { parseCellKey } from "@/features/workbooks/addresses";
import { getNamedRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import type {
  ChartRange,
  SheetData,
  SheetPrintSettings,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookCompatibilitySeverity = "warning" | "info";

export type WorkbookCompatibilityIssue = {
  id: string;
  title: string;
  details: string;
  severity: WorkbookCompatibilitySeverity;
  category: "Export loss" | "Import limit" | "Round trip";
  formats: string[];
  count?: number;
  sheetId?: string;
  sheetName?: string;
  range?: ChartRange;
};

const FLAT_FORMATS = ["CSV", "TSV", "HTML", "XML"];
const TEXT_FORMATS = ["CSV", "TSV"];
const WORKBOOK_FORMATS = ["XLSX", "XLSM", "XLS", "ODS"];
const ALL_NON_JSON_FORMATS = [...WORKBOOK_FORMATS, ...FLAT_FORMATS];

function cellRange(rowIndex: number, columnIndex: number): ChartRange {
  return {
    startRowIndex: rowIndex,
    startColumnIndex: columnIndex,
    endRowIndex: rowIndex,
    endColumnIndex: columnIndex,
  };
}

function firstCellRange(
  sheet: SheetData,
  predicate: (cell: SheetData["cells"][string]) => boolean,
) {
  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (!predicate(cell)) {
      continue;
    }

    const position = parseCellKey(key);

    if (
      position &&
      position.rowIndex >= 0 &&
      position.rowIndex < sheet.rowCount &&
      position.columnIndex >= 0 &&
      position.columnIndex < sheet.columnCount
    ) {
      return cellRange(position.rowIndex, position.columnIndex);
    }
  }

  return undefined;
}

function countWorkbookCells(
  document: WorkbookDocument,
  predicate: (cell: SheetData["cells"][string]) => boolean,
) {
  return document.sheets.reduce(
    (total, sheet) =>
      total +
      Object.values(sheet.cells).filter((cell) => predicate(cell)).length,
    0,
  );
}

function firstWorkbookCellRange(
  document: WorkbookDocument,
  predicate: (cell: SheetData["cells"][string]) => boolean,
) {
  for (const sheet of document.sheets) {
    const range = firstCellRange(sheet, predicate);

    if (range) {
      return {
        sheetId: sheet.id,
        sheetName: sheet.name,
        range,
      };
    }
  }

  return {};
}

function nativeObjectRange(
  object: WorkbookDocument["nativeObjects"][number] | undefined,
): ChartRange | undefined {
  const anchor = object?.anchor;

  if (
    anchor?.fromRowIndex === undefined ||
    anchor.fromColumnIndex === undefined
  ) {
    return undefined;
  }

  return {
    startRowIndex: anchor.fromRowIndex,
    startColumnIndex: anchor.fromColumnIndex,
    endRowIndex: anchor.toRowIndex ?? anchor.fromRowIndex,
    endColumnIndex: anchor.toColumnIndex ?? anchor.fromColumnIndex,
  };
}

function hasCustomPrintSettings(settings: SheetPrintSettings) {
  return (
    settings.orientation !== "portrait" ||
    settings.scale !== 100 ||
    settings.margins !== "normal" ||
    Boolean(settings.printArea) ||
    settings.rowPageBreaks.length > 0 ||
    settings.columnPageBreaks.length > 0 ||
    settings.repeatHeaderRows ||
    settings.repeatFirstColumn ||
    settings.printGridlines ||
    settings.headerText.trim().length > 0 ||
    settings.footerText.trim().length > 0
  );
}

function addIssue(
  issues: WorkbookCompatibilityIssue[],
  issue: WorkbookCompatibilityIssue,
) {
  if (issue.count === 0) {
    return;
  }

  issues.push(issue);
}

export function getWorkbookCompatibilityIssues(document: WorkbookDocument) {
  const issues: WorkbookCompatibilityIssue[] = [];
  const styledCellCount = countWorkbookCells(
    document,
    (cell) => cell.style !== undefined,
  );
  const formulaCellCount = countWorkbookCells(document, (cell) =>
    cell.raw.trimStart().startsWith("="),
  );
  const visualObjectCount =
    document.charts.length + (document.sparklines ?? []).length;
  const chartDataTableCount = document.charts.filter(
    (chart) => chart.format?.dataTable?.enabled,
  ).length;
  const chart3DMetadataCount = document.charts.filter(
    (chart) => chart.format?.threeDimensional?.enabled,
  ).length;
  const firstChartDataTable = document.charts.find(
    (chart) => chart.format?.dataTable?.enabled,
  );
  const firstChart3DMetadata = document.charts.find(
    (chart) => chart.format?.threeDimensional?.enabled,
  );
  const structuredFeatureCount =
    document.tables.length +
    (document.tableSlicers ?? []).length +
    (document.tableTimelines ?? []).length +
    (document.pivotTables ?? []).length +
    document.conditionalFormats.length +
    document.dataValidations.length +
    document.filters.length +
    document.filterPresets.length +
    document.namedRanges.length;
  const reviewHistoryCount =
    document.cellNotes.length +
    document.versionHistory.length +
    document.versionRestores.length +
    document.customViews.length;
  const protectionCount =
    document.sheetProtections.length + (document.workbookProtection ? 1 : 0);
  const printSetupCount = document.sheetPrintSettings.filter(
    hasCustomPrintSettings,
  ).length;
  const externalLinkCount = document.cellLinks.length;
  const macroProjectCount = document.macroProjects.length;
  const unsupportedPartCount = document.unsupportedParts.length;
  const nativeObjectCount = (document.nativeObjects ?? []).length;
  const automationScriptCount = document.automationScripts.length;
  const extensionCount =
    (document.customFunctions ?? []).length + (document.addIns ?? []).length;
  const firstNativeObject = document.nativeObjects?.[0];

  addIssue(issues, {
    id: "preserved-unsupported-import-parts",
    title:
      unsupportedPartCount > 0
        ? "Unsupported imported workbook parts are preserved"
        : "Unsupported workbook parts are preserved when present",
    details:
      "XLSX/XLSM imports keep opaque package parts for embedded objects, form controls, ActiveX metadata, Excel 4.0 macro sheets, custom XML, external links, workbook connections, drawings, media, content types, and OOXML relationships so they can be reattached on workbook export. Unsupported parts remain disabled and are not executed.",
    severity: unsupportedPartCount > 0 ? "warning" : "info",
    category: "Round trip",
    formats: WORKBOOK_FORMATS,
    count: unsupportedPartCount,
  });

  addIssue(issues, {
    id: "native-ooxml-objects",
    title: "Native Excel objects are indexed for round-tripping",
    details:
      "Imported OOXML charts, images, icons, connectors, shapes, OLE objects, form controls, and drawing anchors are promoted from opaque package parts into workbook metadata while remaining disabled and reattached only through XLSX/XLSM round-trips.",
    severity: "info",
    category: "Round trip",
    formats: WORKBOOK_FORMATS,
    count: nativeObjectCount,
    sheetId: firstNativeObject?.sheetId,
    sheetName: firstNativeObject?.sheetName,
    range: nativeObjectRange(firstNativeObject),
  });

  addIssue(issues, {
    id: "xlsm-vba-projects",
    title: "VBA projects are preserved but disabled",
    details:
      "Imported VBA binaries are stored for XLSM round-tripping and reattached on XLSM export. Essence Excel never executes imported macros.",
    severity: "info",
    category: "Round trip",
    formats: ["XLSM"],
    count: macroProjectCount,
  });

  addIssue(issues, {
    id: "flat-active-sheet-only",
    title: "Flat exports include only the active sheet",
    details:
      "CSV, TSV, HTML, and SpreadsheetML XML exports are active-sheet exports, so other sheets are not included.",
    severity: "warning",
    category: "Export loss",
    formats: FLAT_FORMATS,
    count: Math.max(document.sheets.length - 1, 0),
  });

  addIssue(issues, {
    id: "text-export-styles",
    title: "Text exports drop formatting",
    details:
      "CSV and TSV preserve cell text, but they cannot store fills, fonts, borders, number formats, merges, hidden state, or workbook objects.",
    severity: "warning",
    category: "Export loss",
    formats: TEXT_FORMATS,
    count: styledCellCount,
    ...firstWorkbookCellRange(document, (cell) => cell.style !== undefined),
  });

  addIssue(issues, {
    id: "formula-export-metadata",
    title: "Flat exports lose formula workbook semantics",
    details:
      "Text, HTML, and XML exports cannot preserve workbook calculation settings, dependency metadata, or formula auditing context.",
    severity: "info",
    category: "Export loss",
    formats: FLAT_FORMATS,
    count: formulaCellCount,
    ...firstWorkbookCellRange(document, (cell) =>
      cell.raw.trimStart().startsWith("="),
    ),
  });

  addIssue(issues, {
    id: "visual-objects",
    title: "Charts and sparklines are not exported as objects",
    details:
      "Current file exports keep worksheet cell content, but chart objects and sparklines are not written as native spreadsheet drawing objects.",
    severity: "warning",
    category: "Round trip",
    formats: ALL_NON_JSON_FORMATS,
    count: visualObjectCount,
    sheetId: document.charts[0]?.sheetId ?? document.sparklines[0]?.sheetId,
    sheetName: document.sheets.find(
      (sheet) =>
        sheet.id === (document.charts[0]?.sheetId ?? document.sparklines[0]?.sheetId),
    )?.name,
    range: document.charts[0]?.range,
  });

  addIssue(issues, {
    id: "chart-data-tables",
    title: "Chart data tables are stored with chart formatting",
    details:
      "Chart data table settings are persisted in workbook metadata and included in chart image exports. Native workbook export still preserves imported Excel chart XML rather than generating new OOXML chart objects.",
    severity: "info",
    category: "Round trip",
    formats: ALL_NON_JSON_FORMATS,
    count: chartDataTableCount,
    sheetId: firstChartDataTable?.sheetId,
    sheetName: document.sheets.find(
      (sheet) => sheet.id === firstChartDataTable?.sheetId,
    )?.name,
    range: firstChartDataTable?.range,
  });

  addIssue(issues, {
    id: "chart-3d-compatibility-metadata",
    title: "3D chart settings use native round-trip metadata",
    details:
      "Supported app-created 3D bar, stacked bar, pie, and surface charts render with projected depth and export companion native chart/drawing OOXML so they can be re-imported as reviewable native 3D chart metadata. Unsupported chart families keep their 3D settings as workbook metadata.",
    severity: "info",
    category: "Round trip",
    formats: WORKBOOK_FORMATS,
    count: chart3DMetadataCount,
    sheetId: firstChart3DMetadata?.sheetId,
    sheetName: document.sheets.find(
      (sheet) => sheet.id === firstChart3DMetadata?.sheetId,
    )?.name,
    range: firstChart3DMetadata?.range,
  });

  addIssue(issues, {
    id: "structured-features",
    title: "Structured spreadsheet features are flattened",
    details:
      "Tables, slicers, timelines, PivotTables, validation rules, conditional formats, filters, filter presets, and named ranges are not exported as native workbook objects yet.",
    severity: "warning",
    category: "Round trip",
    formats: ALL_NON_JSON_FORMATS,
    count: structuredFeatureCount,
    sheetId:
      document.tables[0]?.sheetId ??
      document.tableSlicers?.[0]?.sheetId ??
      document.tableTimelines?.[0]?.sheetId ??
      document.pivotTables?.[0]?.sheetId ??
      document.conditionalFormats[0]?.sheetId ??
      document.dataValidations[0]?.sheetId ??
      document.filters[0]?.sheetId ??
      document.namedRanges[0]?.sheetId,
    sheetName: document.sheets.find(
      (sheet) =>
        sheet.id ===
        (document.tables[0]?.sheetId ??
          document.tableSlicers?.[0]?.sheetId ??
          document.tableTimelines?.[0]?.sheetId ??
          document.pivotTables?.[0]?.sheetId ??
          document.conditionalFormats[0]?.sheetId ??
          document.dataValidations[0]?.sheetId ??
          document.filters[0]?.sheetId ??
          document.namedRanges[0]?.sheetId),
    )?.name,
    range:
      document.tables[0]?.range ??
      document.pivotTables?.[0]?.outputRange ??
      document.conditionalFormats[0]?.range ??
      document.dataValidations[0]?.range ??
      document.filters[0]?.range ??
      (document.namedRanges[0]
        ? getNamedRangeAreas(document.namedRanges[0])[0]
        : undefined),
  });

  addIssue(issues, {
    id: "notes-history-views",
    title: "Review state and version history are app-only",
    details:
      "Cell comment threads, saved versions, restore history, and custom worksheet views are preserved in Essence JSON but not in spreadsheet file exports.",
    severity: "info",
    category: "Export loss",
    formats: ALL_NON_JSON_FORMATS,
    count: reviewHistoryCount,
  });

  addIssue(issues, {
    id: "protection-settings",
    title: "Protection settings are not exported",
    details:
      "Sheet and workbook protection settings affect editing inside Essence Excel, but current file exports do not write native protection records.",
    severity: "warning",
    category: "Round trip",
    formats: WORKBOOK_FORMATS,
    count: protectionCount,
  });

  addIssue(issues, {
    id: "print-setup",
    title: "Print setup has limited round-trip support",
    details:
      "HTML print output uses the active sheet print setup, but workbook file exports do not preserve all print areas, headers, footers, scale, or page breaks yet.",
    severity: "info",
    category: "Round trip",
    formats: WORKBOOK_FORMATS,
    count: printSetupCount,
  });

  addIssue(issues, {
    id: "cell-links",
    title: "Cell links are not native hyperlinks on export",
    details:
      "Essence cell links are stored as workbook annotations and are not emitted as native Excel hyperlinks in current workbook exports.",
    severity: "warning",
    category: "Round trip",
    formats: ALL_NON_JSON_FORMATS,
    count: externalLinkCount,
  });

  addIssue(issues, {
    id: "automation-scripts",
    title: "Recorded scripts are Essence-only",
    details:
      "Safe script recordings capture repeatable workbook actions and run only through Essence permissions. They are not exported as native Excel macros.",
    severity: "info",
    category: "Export loss",
    formats: ALL_NON_JSON_FORMATS,
    count: automationScriptCount,
  });

  addIssue(issues, {
    id: "automation-extensions",
    title: "Automation extensions are Essence-only",
    details:
      "Workbook custom functions and add-in manifests are preserved in Essence JSON backups but are not emitted as native Excel add-ins.",
    severity: "info",
    category: "Export loss",
    formats: ALL_NON_JSON_FORMATS,
    count: extensionCount,
  });

  return issues;
}
