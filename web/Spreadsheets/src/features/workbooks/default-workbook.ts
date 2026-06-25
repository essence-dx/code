import { cellKey } from "@/features/workbooks/addresses";
import {
  STANDARD_SHEET_COLUMNS,
  STANDARD_SHEET_ROWS,
} from "@/features/spreadsheet/sheet-scale";
import { defaultLargeDataModelStorageSettings } from "@/features/spreadsheet/large-data-model";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";
import type {
  SheetData,
  WorkbookCalculationSettings,
  WorkbookDocument,
} from "@/features/workbooks/types";

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createBlankSheet(name = "Sheet 1"): SheetData {
  return {
    id: id("sheet"),
    name,
    scaleMode: "standard",
    rowCount: STANDARD_SHEET_ROWS,
    columnCount: STANDARD_SHEET_COLUMNS,
    columnWidths: {},
    hiddenRows: [],
    hiddenColumns: [],
    showGridlines: true,
    rowGroups: [],
    columnGroups: [],
    mergedCells: [],
    cells: {},
  };
}

export function createDefaultWorkbookCalculationSettings(): WorkbookCalculationSettings {
  return {
    calendarSystem: "gregorian",
    iterativeCalculation: {
      enabled: false,
      maxChange: 0.001,
      maxIterations: 100,
    },
  };
}

export function createDefaultWorkbookDocument(): WorkbookDocument {
  const sheet = createBlankSheet();

  sheet.cells = {
    [cellKey(0, 0)]: { raw: "Essence Excel" },
    [cellKey(1, 0)]: { raw: "Editable starter workbook" },
    [cellKey(3, 0)]: { raw: "Revenue" },
    [cellKey(3, 1)]: { raw: "Cost" },
    [cellKey(3, 2)]: { raw: "Profit" },
    [cellKey(4, 0)]: { raw: "1200" },
    [cellKey(4, 1)]: { raw: "450" },
    [cellKey(4, 2)]: { raw: "=A5-B5" },
    [cellKey(5, 0)]: { raw: "980" },
    [cellKey(5, 1)]: { raw: "315" },
    [cellKey(5, 2)]: { raw: "=A6-B6" },
    [cellKey(7, 1)]: { raw: "Total profit" },
    [cellKey(7, 2)]: { raw: "=SUM(C5:C6)" },
  };

  return {
    version: 1,
    metadata: {
      description: "",
      favorite: false,
      folderName: "",
      isTemplate: false,
      lastOpenedAt: "",
      tags: [],
      updatedAt: "",
    },
    calculationSettings: createDefaultWorkbookCalculationSettings(),
    activeSheetId: sheet.id,
    versionHistory: [],
    versionRestores: [],
    protectedRanges: [],
    trackedChanges: [],
    customViews: [],
    formulaWatches: [],
    whatIfScenarios: [],
    theme: defaultWorkbookTheme,
    cellStyles: [],
    queries: [],
    macroProjects: [],
    unsupportedParts: [],
    nativeObjects: [],
    automationScripts: [],
    customFunctions: [],
    addIns: [],
    workbookProtection: null,
    sheets: [sheet],
    charts: [],
    sparklines: [],
    insertedObjects: [],
    tables: [],
    dataModelRelationships: [],
    dataModelHierarchies: [],
    dataModelKpis: [],
    dataModelPerspectives: [],
    dataModelStorage: defaultLargeDataModelStorageSettings,
    tableSlicers: [],
    tableTimelines: [],
    pivotTables: [],
    conditionalFormats: [],
    dataValidations: [],
    filters: [],
    filterPresets: [],
    cellNotes: [],
    commentNotifications: [],
    cellLinks: [],
    namedRanges: [],
    sheetProtections: [],
    sheetPrintSettings: [],
  };
}
