import { strict as assert } from "node:assert";
import {
  canonicalizeFormulaInput,
  getFormulaLocaleSettings,
  localizeFormulaForDisplay,
  localizeFormulaSignature,
} from "@/features/spreadsheet/formula-locale";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import { updateCellRaw } from "@/features/spreadsheet/state/edit-state";
import { pasteClipboardTextRowsIntoSheet } from "@/features/spreadsheet/state/clipboard-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

const germanFormulaLocale = getFormulaLocaleSettings("de-DE");

assert.equal(germanFormulaLocale.decimalSeparator, ",");
assert.equal(germanFormulaLocale.argumentSeparator, ";");
assert.equal(germanFormulaLocale.functionLanguage, "de-DE");

assert.equal(
  canonicalizeFormulaInput("=SUM(1,5;2,5;A1)", germanFormulaLocale),
  "=SUM(1.5,2.5,A1)",
  "localized decimal and argument separators canonicalize together",
);
assert.equal(
  canonicalizeFormulaInput("=SUMME(1;WENN(A1>0;2;3))", germanFormulaLocale),
  "=SUM(1,IF(A1>0,2,3))",
  "translated function names canonicalize before calculation",
);
assert.equal(
  canonicalizeFormulaInput('=CONCATENATE("a;b,c";\'Q1; West\'!A1;Table1[Cost; gross])', germanFormulaLocale),
  '=CONCATENATE("a;b,c",\'Q1; West\'!A1,Table1[Cost; gross])',
  "strings, quoted sheet names, and structured reference labels are preserved",
);
assert.equal(
  localizeFormulaForDisplay("=SUM(1.5,2.5,A1)", germanFormulaLocale),
  "=SUMME(1,5;2,5;A1)",
  "canonical formulas localize separators and function names for display",
);
assert.equal(
  localizeFormulaSignature("IF(test, value_if_true, value_if_false)", germanFormulaLocale),
  "WENN(test; value_if_true; value_if_false)",
  "function signatures use translated names and locale argument separators",
);

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert(sheet, "default workbook has a sheet");

updateCellRaw(sheet, { rowIndex: 0, columnIndex: 0 }, "2");
updateCellRaw(sheet, { rowIndex: 0, columnIndex: 1 }, "=SUM(A1;3)");
pasteClipboardTextRowsIntoSheet(sheet, { rowIndex: 1, columnIndex: 0 }, [
  ["=SUM(1,5;2,5)"],
]);

assert.equal(
  sheet.cells[cellKey(0, 1)]?.raw,
  "=SUM(A1,3)",
  "manual formula edits accept semicolon argument separators",
);
assert.equal(
  sheet.cells[cellKey(1, 0)]?.raw,
  "=SUM(1.5,2.5)",
  "pasted localized formulas normalize before storage",
);

const evaluated = evaluateWorkbook(document);

assert.equal(evaluated.B1, "5", "canonicalized edit formulas evaluate");
assert.equal(evaluated.A2, "4", "canonicalized pasted formulas evaluate");

const restoredDocument = normalizeWorkbookDocument({
  ...document,
  sheets: [
    {
      ...sheet,
      cells: {
        ...sheet.cells,
        C1: {
          raw: "=SUM(4;5)",
        },
      },
    },
  ],
});

assert.equal(
  restoredDocument.sheets[0]?.cells.C1?.raw,
  "=SUM(4,5)",
  "workbook normalization repairs localized formula separators",
);
assert.equal(
  normalizeWorkbookDocument({
    ...document,
    calculationSettings: {
      calendarSystem: "hijri",
      iterativeCalculation: {
        enabled: true,
        maxChange: 0.01,
        maxIterations: 25,
      },
    },
  }).calculationSettings?.calendarSystem,
  "hijri",
  "calendar-system options are normalized with workbook calculation settings",
);
assert.equal(
  normalizeWorkbookDocument({
    ...document,
    calculationSettings: {
      calendarSystem: "invalid",
      iterativeCalculation: {
        enabled: false,
        maxChange: 0.01,
        maxIterations: 25,
      },
    },
  }).calculationSettings?.calendarSystem,
  "gregorian",
  "invalid calendar systems fall back to the default Gregorian workbook setting",
);

console.log("Formula locale checks passed.");
