import { strict as assert } from "node:assert";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import { normalizeExcelFormulaCompatibility } from "@/features/spreadsheet/formula-compatibility-normalization";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";

function createSheet(cells: SheetData["cells"]): SheetData {
  return {
    id: "sheet_1",
    name: "Sheet 1",
    rowCount: 24,
    columnCount: 16,
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
      lastOpenedAt: "2026-05-16T00:00:00.000Z",
      tags: [],
      updatedAt: "2026-05-16T00:00:00.000Z",
    },
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

assert.equal(
  normalizeExcelFormulaCompatibility("=LET(rate,2,SUM(A1:A2)*rate)"),
  "=SUM(A1:A2)*(2)",
  "LET variables rewrite to plain formulas before evaluation",
);
assert.equal(
  normalizeExcelFormulaCompatibility("=LAMBDA(x,x+1)(4)"),
  "=(4)+1",
  "inline LAMBDA calls rewrite to plain formulas before evaluation",
);
assert.equal(
  normalizeExcelFormulaCompatibility('=LET(label,"North",label&" Region")'),
  '=("North")&" Region"',
  "LET substitution preserves quoted strings",
);

const sheet = createSheet({
  A1: { raw: "North" },
  B1: { raw: "10" },
  C1: { raw: "East" },
  A2: { raw: "South" },
  B2: { raw: "20" },
  C2: { raw: "West" },
  A3: { raw: "West" },
  B3: { raw: "30" },
  C3: { raw: "North" },
  E1: { raw: "=TAKE(A1:C3,2,2)" },
  H1: { raw: "=DROP(A1:C3,1,1)" },
  K1: { raw: "=CHOOSECOLS(A1:C3,3,1)" },
  A5: { raw: "=CHOOSEROWS(A1:C3,3,1)" },
  E5: { raw: "=TAKE(SEQUENCE(4,3,1,1),-2,2)" },
  J5: { raw: "=LET(rate,2,SUM(B1:B3)*rate)" },
  J6: { raw: "=LAMBDA(x,x+1)(4)" },
  J7: { raw: "=LET(double,LAMBDA(x,x*2),double(7))" },
});
const values = evaluateWorkbook(createDocument(sheet));

assert.equal(values.E1, "North", "TAKE spills the top-left item");
assert.equal(values.F1, "10", "TAKE spills selected columns");
assert.equal(values.E2, "South", "TAKE spills selected rows");
assert.equal(values.H1, "20", "DROP removes leading rows and columns");
assert.equal(values.I2, "North", "DROP preserves the remaining lower-right area");
assert.equal(values.K1, "East", "CHOOSECOLS can reorder selected columns");
assert.equal(values.L2, "South", "CHOOSECOLS spills chosen columns across rows");
assert.equal(values.A5, "West", "CHOOSEROWS can select rows by one-based index");
assert.equal(values.A6, "North", "CHOOSEROWS preserves requested row order");
assert.equal(values.E5, "7", "TAKE can slice a nested SEQUENCE from the end");
assert.equal(values.F6, "11", "nested dynamic arrays spill their sliced matrix");
assert.equal(values.J5, "120", "LET formulas evaluate through HyperFormula");
assert.equal(values.J6, "5", "inline LAMBDA formulas evaluate");
assert.equal(values.J7, "14", "LET-bound LAMBDA formulas evaluate");

console.log("Formula compatibility pack checks passed.");
