import { strict as assert } from "node:assert";
import { updateRangeCellStyle } from "@/features/spreadsheet/state/format-state";
import {
  deleteWorkbookCellStyleFromDocument,
  saveWorkbookCellStyleInDocument,
  updateWorkbookCellStyleInDocument,
  updateWorkbookThemeInDocument,
} from "@/features/spreadsheet/state/theme-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  getWorkbookCellStylePresets,
  normalizeWorkbookTheme,
} from "@/features/workbooks/workbook-themes";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert(sheet, "default workbook has a sheet");
assert.equal(document.theme.id, "essence", "default workbook has a theme");

updateWorkbookThemeInDocument(document, {
  colors: {
    accent1: "#0284c7",
    headerFill: "#ccfbf1",
    headerText: "#134e4a",
  },
  fonts: {
    body: "verdana",
    heading: "georgia",
  },
});

assert.equal(document.theme.colors.headerFill, "#ccfbf1");
assert.equal(document.theme.fonts.heading, "georgia");

updateRangeCellStyle(
  sheet,
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 0,
    endColumnIndex: 0,
  },
  {
    background: document.theme.colors.headerFill,
    bold: true,
    fontFamily: document.theme.fonts.heading,
    foreground: document.theme.colors.headerText,
  },
);

const styleId = saveWorkbookCellStyleInDocument(
  document,
  "Executive header",
  sheet.cells[cellKey(0, 0)]?.style ?? {},
);

const replacementStyleId = saveWorkbookCellStyleInDocument(
  document,
  " Executive    header ",
  {
    foreground: "#dc2626",
    italic: true,
  },
);

assert.equal(
  replacementStyleId,
  styleId,
  "saving a managed style by name updates the existing style id",
);
assert.equal(document.cellStyles.length, 1, "managed style names are unique");
assert.equal(document.cellStyles[0]?.style.italic, true);

assert.equal(
  updateWorkbookCellStyleInDocument(document, styleId, {
    name: "Finance header",
    style: {
      background: "#dbeafe",
      bold: true,
      fontSize: 16,
      foreground: "#111827",
    },
  }),
  styleId,
  "managed styles update by stable id",
);
assert.equal(document.cellStyles[0]?.name, "Finance header");
assert.equal(document.cellStyles[0]?.style.fontSize, 16);

let normalizedDocument = normalizeWorkbookDocument({
  ...document,
  theme: {
    ...document.theme,
    colors: {
      ...document.theme.colors,
      accent1: "not-a-color",
    },
  },
  cellStyles: [
    ...document.cellStyles,
    {
      id: "bad",
      name: "",
      style: null,
    },
  ],
});

assert.equal(
  normalizedDocument.theme.colors.accent1,
  "#2563eb",
  "invalid theme colors fall back to the stored preset color",
);
assert.equal(
  normalizedDocument.cellStyles.length,
  1,
  "invalid managed styles are skipped",
);
assert.equal(
  getWorkbookCellStylePresets(
    normalizedDocument.theme,
    normalizedDocument.cellStyles,
  ).some((preset) => preset.label === "Finance header"),
  true,
  "managed styles appear in workbook style presets",
);

deleteWorkbookCellStyleFromDocument(normalizedDocument, styleId);

assert.equal(normalizedDocument.cellStyles.length, 0, "managed styles delete");
assert.equal(
  normalizeWorkbookTheme({ fonts: { body: "mono" } }).fonts.body,
  "mono",
  "partial themes normalize",
);

console.log("Workbook theme checks passed.");
