import { getSheetDynamicArrayState } from "@/features/spreadsheet/dynamic-arrays";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function createSheet(cells: SheetData["cells"]): SheetData {
  return {
    id: "sheet_1",
    name: "Sheet 1",
    rowCount: 20,
    columnCount: 12,
    columnWidths: {},
    hiddenRows: [],
    hiddenColumns: [],
    showGridlines: true,
    rowGroups: [],
    columnGroups: [],
    mergedCells: [],
    cells,
  };
}

function createDocument(sheet: SheetData): WorkbookDocument {
  return {
    version: 1,
    metadata: {
      description: "",
      favorite: false,
      folderName: "",
      isTemplate: false,
      lastOpenedAt: "2026-05-15T00:00:00.000Z",
      tags: [],
      updatedAt: "2026-05-15T00:00:00.000Z",
    },
    activeSheetId: sheet.id,
    versionHistory: [],
    versionRestores: [],
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
    workbookProtection: null,
    sheets: [sheet],
    charts: [],
    sparklines: [],
    insertedObjects: [],
    tables: [],
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

const sequenceSheet = createSheet({
  A1: { raw: "=SEQUENCE(2,2,10,5)" },
});
const sequenceValues = evaluateWorkbook(createDocument(sequenceSheet));

assert(sequenceValues.A1 === "10", "SEQUENCE writes the anchor value");
assert(sequenceValues.B1 === "15", "SEQUENCE spills right");
assert(sequenceValues.A2 === "20", "SEQUENCE spills down");
assert(sequenceValues.B2 === "25", "SEQUENCE fills the whole spill range");

const blockedSheet = createSheet({
  A1: { raw: "=SEQUENCE(2,2)" },
  B1: { raw: "blocked" },
});
const blockedState = getSheetDynamicArrayState({
  sheet: blockedSheet,
  computedValues: {},
});

assert(
  blockedState.computedValues.A1 === "#SPILL!",
  "blocked spill anchors show #SPILL!",
);
assert(
  blockedState.spillBlockedKeys.has("B1"),
  "blocked cells are tracked for worksheet feedback",
);

const transformSheet = createSheet({
  A1: { raw: "Beta" },
  A2: { raw: "Alpha" },
  A3: { raw: "Beta" },
  B1: { raw: "=UNIQUE(A1:A3)" },
  C1: { raw: "=SORT(A1:A3)" },
  D1: { raw: "=TRANSPOSE(A1:A3)" },
});
const transformValues = evaluateWorkbook(createDocument(transformSheet));

assert(transformValues.B1 === "Beta", "UNIQUE preserves first value");
assert(transformValues.B2 === "Alpha", "UNIQUE spills unique rows");
assert(transformValues.C1 === "Alpha", "SORT orders ascending values");
assert(transformValues.C2 === "Beta", "SORT spills the second sorted value");
assert(transformValues.D1 === "Beta", "TRANSPOSE writes first value");
assert(transformValues.E1 === "Alpha", "TRANSPOSE spills across columns");

console.log("Dynamic array checks passed.");
