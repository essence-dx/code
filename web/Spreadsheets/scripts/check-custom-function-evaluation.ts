import {
  createWorkbookRecalculationPlan,
  type WorkbookRecalculationPlan,
} from "@/features/spreadsheet/formula-dependency-graph";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import type {
  SheetData,
  WorkbookCustomFunction,
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

function createCustomFunction(
  customFunction: Pick<
    WorkbookCustomFunction,
    "description" | "enabled" | "expression" | "name"
  >,
): WorkbookCustomFunction {
  return {
    id: customFunction.name.toLowerCase(),
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    ...customFunction,
  };
}

function createDocument({
  customFunctions = [],
  sheet,
}: {
  customFunctions?: WorkbookCustomFunction[];
  sheet: SheetData;
}) {
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
    customFunctions,
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

const addTax = createCustomFunction({
  description: "Adds a tax rate to a numeric value.",
  enabled: true,
  expression: "=ARG1*(1+ARG2)",
  name: "ADD_TAX",
});
const normalizeText = createCustomFunction({
  description: "Trims and uppercases a text value.",
  enabled: true,
  expression: "=UPPER(TRIM(ARG1))",
  name: "NORMALIZE_TEXT",
});
const unsafeClock = createCustomFunction({
  description: "Intentionally unsafe volatile function.",
  enabled: true,
  expression: "=NOW()+ARG1",
  name: "UNSAFE_CLOCK",
});

const firstDocument = createDocument({
  customFunctions: [addTax, normalizeText, unsafeClock],
  sheet: createSheet({
    A1: { raw: "100" },
    A2: { raw: " hello " },
    B1: { raw: "0.25" },
    C1: { raw: "=ADD_TAX(A1,B1)" },
    C2: { raw: "=NORMALIZE_TEXT(A2)" },
    C3: { raw: "=UNSAFE_CLOCK(A1)" },
  }),
});
const firstValues = evaluateWorkbook(firstDocument);

assert(firstValues.C1 === "125", "numeric custom functions evaluate");
assert(firstValues.C2 === "HELLO", "text custom functions evaluate");
assert(firstValues.C3 === "#N/A", "unsafe custom functions are blocked");

const changedInputDocument = createDocument({
  customFunctions: [addTax, normalizeText, unsafeClock],
  sheet: createSheet({
    ...firstDocument.sheets[0].cells,
    A1: { raw: "200" },
  }),
});
const changedInputPlan = createWorkbookRecalculationPlan({
  activeSheetId: changedInputDocument.activeSheetId,
  document: changedInputDocument,
  previousDocument: firstDocument,
  previousValues: firstValues,
});
const changedInputValues = evaluateIncrementally({
  document: changedInputDocument,
  plan: changedInputPlan,
  previousValues: firstValues,
});

assert(
  changedInputPlan.kind === "incremental",
  "custom function input edits use incremental recalculation",
);

if (changedInputPlan.kind !== "incremental") {
  throw new Error("Expected an incremental recalculation plan.");
}

assert(changedInputPlan.targetKeys.includes("A1"), "edited input is dirty");
assert(
  changedInputPlan.targetKeys.includes("C1"),
  "custom function dependent is dirty",
);
assert(changedInputValues.C1 === "250", "custom function dependents recalculate");

const updatedDefinitionDocument = createDocument({
  customFunctions: [
    createCustomFunction({
      description: "Adds a larger tax rate to a numeric value.",
      enabled: true,
      expression: "=ARG1*(1+ARG2)+10",
      name: "ADD_TAX",
    }),
    normalizeText,
    unsafeClock,
  ],
  sheet: firstDocument.sheets[0],
});
const updatedDefinitionPlan = createWorkbookRecalculationPlan({
  activeSheetId: updatedDefinitionDocument.activeSheetId,
  document: updatedDefinitionDocument,
  previousDocument: firstDocument,
  previousValues: firstValues,
});

assert(
  updatedDefinitionPlan.kind === "full",
  "custom function definition changes invalidate the workbook plan",
);

console.log("Custom function evaluation checks passed.");
