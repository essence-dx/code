import {
  createWorkbookRecalculationPlan,
  type WorkbookRecalculationPlan,
} from "@/features/spreadsheet/formula-dependency-graph";
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

function evaluateIncrementally({
  document,
  plan,
  previousValues,
}: {
  document: WorkbookDocument;
  plan: WorkbookRecalculationPlan;
  previousValues: Record<string, string>;
}) {
  return evaluateWorkbook(document, document.activeSheetId, {
    previousValues: plan.kind === "incremental" ? previousValues : undefined,
    targetKeys:
      plan.kind === "incremental" ? new Set(plan.targetKeys) : undefined,
  });
}

const firstSheet = createSheet({
  id: "sheet_1",
  name: "Sheet 1",
  cells: {
    A1: { raw: "1" },
    B1: { raw: "=A1+1" },
    C1: { raw: "=B1+1" },
    D1: { raw: "=SUM(A1:C1)" },
    F1: { raw: "stable" },
  },
});
const previousDocument = createDocument([firstSheet]);
const previousValues = evaluateWorkbook(previousDocument);
const changedSheet = createSheet({
  id: "sheet_1",
  name: "Sheet 1",
  cells: {
    ...firstSheet.cells,
    A1: { raw: "2" },
  },
});
const changedDocument = createDocument([changedSheet]);
const changedPlan = createWorkbookRecalculationPlan({
  activeSheetId: changedDocument.activeSheetId,
  document: changedDocument,
  previousDocument,
  previousValues,
});
const changedValues = evaluateIncrementally({
  document: changedDocument,
  plan: changedPlan,
  previousValues,
});

assert(changedPlan.kind === "incremental", "simple edits use incremental mode");

if (changedPlan.kind !== "incremental") {
  throw new Error("Expected an incremental recalculation plan.");
}

assert(changedPlan.targetKeys.includes("A1"), "edited cell is dirty");
assert(changedPlan.targetKeys.includes("B1"), "direct dependent is dirty");
assert(changedPlan.targetKeys.includes("C1"), "transitive dependent is dirty");
assert(changedPlan.targetKeys.includes("D1"), "range dependent is dirty");
assert(changedValues.B1 === "3", "direct dependent recalculates");
assert(changedValues.C1 === "4", "transitive dependent recalculates");
assert(changedValues.D1 === "9", "range formula recalculates");
assert(changedValues.F1 === "stable", "unrelated value is preserved");

const inputSheet = createSheet({
  id: "inputs",
  name: "Inputs",
  cells: {
    A1: { raw: "10" },
  },
});
const outputSheet = createSheet({
  id: "outputs",
  name: "Outputs",
  cells: {
    A1: { raw: "=Inputs!A1*2" },
  },
});
const crossSheetPreviousDocument = createDocument(
  [inputSheet, outputSheet],
  "outputs",
);
const crossSheetPreviousValues = evaluateWorkbook(crossSheetPreviousDocument);
const changedInputSheet = createSheet({
  id: "inputs",
  name: "Inputs",
  cells: {
    A1: { raw: "11" },
  },
});
const crossSheetChangedDocument = createDocument(
  [changedInputSheet, outputSheet],
  "outputs",
);
const crossSheetPlan = createWorkbookRecalculationPlan({
  activeSheetId: crossSheetChangedDocument.activeSheetId,
  document: crossSheetChangedDocument,
  previousDocument: crossSheetPreviousDocument,
  previousValues: crossSheetPreviousValues,
});
const crossSheetValues = evaluateIncrementally({
  document: crossSheetChangedDocument,
  plan: crossSheetPlan,
  previousValues: crossSheetPreviousValues,
});

assert(
  crossSheetPlan.kind === "incremental" &&
    crossSheetPlan.targetKeys.includes("A1"),
  "cross-sheet dependents are dirty on the active sheet",
);
assert(crossSheetValues.A1 === "22", "cross-sheet dependent recalculates");

const dynamicArraySheet = createSheet({
  id: "sheet_1",
  name: "Sheet 1",
  cells: {
    A1: { raw: "=SEQUENCE(2,2)" },
  },
});
const dynamicArrayDocument = createDocument([dynamicArraySheet]);
const dynamicArrayPlan = createWorkbookRecalculationPlan({
  activeSheetId: dynamicArrayDocument.activeSheetId,
  document: dynamicArrayDocument,
  previousDocument,
  previousValues,
});

assert(
  dynamicArrayPlan.kind === "full",
  "dynamic array spill ranges stay on full recalculation for correctness",
);

console.log("Dirty recalculation checks passed.");
