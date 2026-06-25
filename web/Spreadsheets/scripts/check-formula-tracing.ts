import {
  getFormulaTrace,
  getFormulaTraceKeys,
  getWorkbookCircularReferenceIssues,
} from "@/features/spreadsheet/formula-dependency-graph";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
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

function createSheet({
  cells,
  id,
  name,
}: {
  cells: SheetData["cells"];
  id: string;
  name: string;
}): SheetData {
  return {
    id,
    name,
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

function createDocument(sheets: SheetData[], activeSheetId = sheets[0]?.id ?? "") {
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
    activeSheetId,
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
    sheets,
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
  } satisfies WorkbookDocument;
}

const sheet = createSheet({
  id: "sheet_1",
  name: "Sheet 1",
  cells: {
    A1: { raw: "=B1+1" },
    B1: { raw: "=A1+1" },
    C1: { raw: "=A1+B1" },
    D1: { raw: "=SUM(A1:B1)" },
    E1: { raw: "=E1+1" },
    F1: { raw: "=Inputs!A1+1" },
  },
});
const inputSheet = createSheet({
  id: "inputs",
  name: "Inputs",
  cells: {
    A1: { raw: "10" },
    B1: { raw: "=Sheet 1!C1" },
  },
});
const document = createDocument([sheet, inputSheet]);

const circularReferences = getWorkbookCircularReferenceIssues(document);
const circularAddresses = new Set(
  circularReferences.map((issue) => `${issue.sheetName}!${issue.address}`),
);

assert(
  circularAddresses.has("Sheet 1!A1") &&
    circularAddresses.has("Sheet 1!B1"),
  "multi-cell circular references are detected",
);
assert(
  circularAddresses.has("Sheet 1!E1"),
  "single-cell circular references are detected",
);

const a1Issue = circularReferences.find(
  (issue) => issue.sheetName === "Sheet 1" && issue.address === "A1",
);

assert(Boolean(a1Issue), "A1 circular issue is selectable");
assert(
  a1Issue?.cycle.map((cell) => cell.address).join(",") === "A1,B1",
  "multi-cell cycle is returned in stable sheet order",
);

const c1Trace = getFormulaTrace({
  document,
  key: "C1",
  sheetId: "sheet_1",
});
assert(
  c1Trace.precedents.map((reference) => reference.address).join(",") ===
    "A1,B1",
  "trace precedents resolve direct dependencies",
);

const a1Trace = getFormulaTrace({
  document,
  key: "A1",
  sheetId: "sheet_1",
});
const a1Dependents = a1Trace.dependents.map((reference) => reference.address);

assert(
  a1Dependents.includes("B1") &&
    a1Dependents.includes("C1") &&
    a1Dependents.includes("D1"),
  "trace dependents include direct, formula, and range dependents",
);
assert(
  getFormulaTraceKeys(a1Trace.dependents, "sheet_1").has("D1"),
  "same-sheet trace dependents produce highlight keys",
);

const f1Trace = getFormulaTrace({
  document,
  key: "F1",
  sheetId: "sheet_1",
});

assert(
  f1Trace.precedents[0]?.sheetName === "Inputs" &&
    f1Trace.precedents[0]?.address === "A1",
  "trace precedents resolve cross-sheet references",
);

const normalizedDocument = normalizeWorkbookDocument({
  ...document,
  calculationSettings: {
    iterativeCalculation: {
      enabled: true,
      maxChange: -2,
      maxIterations: 20000.8,
    },
  },
});

assert(
  normalizedDocument.calculationSettings?.iterativeCalculation.enabled === true,
  "iterative calculation setting is preserved",
);
assert(
  normalizedDocument.calculationSettings?.iterativeCalculation.maxIterations ===
    10000,
  "iteration limits are clamped during normalization",
);
assert(
  normalizedDocument.calculationSettings?.iterativeCalculation.maxChange ===
    0.001,
  "invalid max-change values fall back safely during normalization",
);

console.log("Formula tracing checks passed.");
