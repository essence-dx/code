import assert from "node:assert/strict";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  formulaFunctions,
  type FormulaFunctionCategory,
} from "@/features/spreadsheet/formula-functions";
import { normalizeExcelFormulaCompatibility } from "@/features/spreadsheet/formula-compatibility-normalization";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

["North", "", "South"].forEach((value, index) => {
  sheet.cells[`A${index + 1}`] = { raw: value };
  sheet.cells[`B${index + 1}`] = { raw: String((index + 1) * 10) };
});

sheet.cells.C1 = { raw: '=TEXTJOIN("|",TRUE,A1:A3)' };
sheet.cells.C2 = { raw: '=TEXTJOIN("|",FALSE,A1:A3)' };
sheet.cells.C3 = { raw: "=CONCAT(A1:A3)" };
sheet.cells.C4 = { raw: '=ENCODEURL("hello world&x=1")' };
sheet.cells.C5 = { raw: '=XMATCH("South",A1:A3)' };
sheet.cells.C6 = { raw: '=XMATCH("So*",A1:A3,2)' };
sheet.cells.C7 = { raw: '=XMATCH("West",A1:A3,0)' };
sheet.cells.C8 = { raw: '=IF(TRUE,"yes","no")' };
sheet.cells.C9 = { raw: '=IF(FALSE,"yes","no")' };
sheet.cells.D1 = { raw: '=XLOOKUP("South",A1:A3,B1:B3,"missing")' };
sheet.cells.D2 = { raw: '=SUMIFS(B1:B3,A1:A3,"South")' };
sheet.cells.D3 = {
  raw: "=NETWORKDAYS(DATE(2026,5,18),DATE(2026,5,22))",
};
sheet.cells.D4 = { raw: "=BITXOR(5,3)" };
sheet.cells.D5 = { raw: "=NORM.S.DIST(0,TRUE)" };
sheet.cells.D6 = { raw: "=PMT(0.01,12,1000)" };
sheet.cells.D7 = { raw: '=CUBEMEMBER("local","[Measures].[Sales]","Sales")' };
sheet.cells.D8 = { raw: '=CUBESETCOUNT(CUBESET("local","[Region].[All]"))' };
sheet.cells.D9 = { raw: '=CUBEVALUE("local","[Measures].[Sales]")' };

const values = evaluateWorkbook(document);

assert.equal(values.C1, "North|South", "TEXTJOIN ignores empty cells");
assert.equal(values.C2, "North||South", "TEXTJOIN can preserve empty cells");
assert.equal(values.C3, "NorthSouth", "CONCAT flattens range values");
assert.equal(values.C4, "hello%20world%26x%3D1", "ENCODEURL is available");
assert.equal(values.C5, "3", "XMATCH returns one-based exact matches");
assert.equal(values.C6, "3", "XMATCH supports wildcard matching");
assert.equal(values.C7, "#N/A", "XMATCH returns #N/A when no exact match exists");
assert.equal(values.C8, "yes", "bare TRUE constants evaluate like Excel");
assert.equal(values.C9, "no", "bare FALSE constants evaluate like Excel");
assert.equal(values.D1, "30", "XLOOKUP remains covered in lookup formulas");
assert.equal(values.D2, "30", "SUMIFS remains covered in math formulas");
assert.equal(values.D3, "5", "NETWORKDAYS remains covered in date formulas");
assert.equal(values.D4, "6", "BITXOR remains covered in engineering formulas");
assert.equal(values.D5, "0.5", "NORM.S.DIST remains covered in statistics");
assert.ok(
  Number(values.D6) < -88 && Number(values.D6) > -89,
  "PMT remains covered in financial formulas",
);
assert.equal(values.D7, "Sales", "CUBEMEMBER preserves captions safely");
assert.equal(values.D8, "0", "CUBESETCOUNT resolves without a data model");
assert.equal(values.D9, "#N/A", "CUBEVALUE reports missing cube data safely");

assert.equal(
  normalizeExcelFormulaCompatibility('=IF(TRUE,"TRUE",FALSE)'),
  '=IF(TRUE(),"TRUE",FALSE())',
  "formula compatibility rewrites boolean constants outside strings",
);
assert.equal(
  normalizeExcelFormulaCompatibility("='TRUE'!A1&Table1[FALSE]"),
  "='TRUE'!A1&Table1[FALSE]",
  "formula compatibility leaves quoted sheet names and structured references alone",
);

const categories = new Set<FormulaFunctionCategory>(
  formulaFunctions.map((formula) => formula.category),
);

for (const category of [
  "Compatibility",
  "Cube",
  "Date and time",
  "Engineering",
  "Financial",
  "Information",
  "Logical",
  "Lookup and reference",
  "Math",
  "Statistical",
  "Text",
  "Web",
] as const satisfies readonly FormulaFunctionCategory[]) {
  assert.ok(categories.has(category), `${category} functions are suggested`);
}

console.log("Formula function coverage checks passed");
