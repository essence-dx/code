import { strict as assert } from "node:assert";
import { parseClipboardGrid } from "@/features/spreadsheet/clipboard";
import { createSpreadsheetClipboardPayload } from "@/features/spreadsheet/cell-clipboard";
import { pasteClipboardCellsIntoSheet } from "@/features/spreadsheet/state/clipboard-state";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

const sourceRange = {
  startRowIndex: 0,
  startColumnIndex: 0,
  endRowIndex: 3,
  endColumnIndex: 2,
};

sheet.cells.A1 = {
  raw: "Revenue",
  style: { bold: true, background: "#dbeafe" },
};
sheet.cells.B2 = { raw: "=A1*2" };
sheet.cells.C3 = { raw: "Review" };
sheet.mergedCells.push({
  id: "merge_source",
  startRowIndex: 0,
  startColumnIndex: 1,
  endRowIndex: 0,
  endColumnIndex: 2,
});

document.charts.push({
  id: "chart_source",
  sheetId: sheet.id,
  title: "Revenue chart",
  type: "bar",
  range: {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
  showLegend: true,
});
document.insertedObjects.push({
  id: "object_source",
  sheetId: sheet.id,
  name: "Launch badge",
  kind: "shape",
  anchor: {
    rowIndex: 1,
    columnIndex: 1,
    offsetX: 8,
    offsetY: 8,
    width: 160,
    height: 64,
  },
  format: { fillColor: "#dbeafe", textColor: "#1e3a8a" },
  locked: false,
  metadata: {
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  },
  shapeType: "roundedRectangle",
  zIndex: 1,
});
document.cellNotes.push({
  id: "note_source",
  sheetId: sheet.id,
  cellKey: "C3",
  text: "Review before sharing.",
  authorName: "Essence",
  authorEmail: "admin@mail.com",
  mentions: [{ email: "editor@mail.com", label: "Editor" }],
  status: "open",
  replies: [
    {
      id: "reply_source",
      text: "Looks good.",
      authorName: "Editor",
      authorEmail: "editor@mail.com",
      mentions: [],
      createdAt: "2026-05-16T00:05:00.000Z",
      updatedAt: "2026-05-16T00:05:00.000Z",
    },
  ],
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:05:00.000Z",
});
document.cellLinks.push({
  id: "link_source",
  sheetId: sheet.id,
  cellKey: "A1",
  url: "https://example.com/revenue",
  label: "Revenue source",
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
});
document.conditionalFormats.push({
  id: "cf_source",
  sheetId: sheet.id,
  range: sourceRange,
  operator: "contains",
  value: "Review",
  style: { background: "#fef3c7", bold: true },
});
document.dataValidations.push({
  id: "dv_source",
  sheetId: sheet.id,
  range: {
    startRowIndex: 1,
    startColumnIndex: 1,
    endRowIndex: 3,
    endColumnIndex: 1,
  },
  type: "list",
  value: "Open,Closed",
  listSource: "inline",
  showInputMessage: true,
  inputMessage: "Pick a status.",
});

const payload = createSpreadsheetClipboardPayload(
  sheet,
  sourceRange,
  { A1: "Revenue", B2: "200", C3: "Review" },
  { document },
);

assert.equal(payload.metadata?.charts.length, 1, "copies chart metadata");
assert.equal(payload.metadata?.insertedObjects.length, 1, "copies object metadata");
assert.equal(payload.metadata?.cellNotes.length, 1, "copies comment metadata");
assert.equal(payload.metadata?.cellLinks.length, 1, "copies hyperlink metadata");
assert.equal(payload.metadata?.mergedCells.length, 1, "copies merged ranges");
assert.equal(
  payload.metadata?.conditionalFormats.length,
  1,
  "copies conditional formatting ranges",
);
assert.equal(
  payload.metadata?.dataValidations.length,
  1,
  "copies data validation ranges",
);

pasteClipboardCellsIntoSheet({
  document,
  sheet,
  selection: { rowIndex: 6, columnIndex: 4 },
  payload,
  displayValues: parseClipboardGrid(payload.text),
});

assert.equal(sheet.cells.E7?.raw, "Revenue", "pastes source values");
assert.equal(sheet.cells.F8?.raw, "=E7*2", "pastes shifted formulas");

const pastedChart = document.charts.find(
  (chart) => chart.id !== "chart_source" && chart.title === "Revenue chart",
);
assert.equal(pastedChart?.range.startRowIndex, 6);
assert.equal(pastedChart?.range.startColumnIndex, 4);
assert.equal(pastedChart?.range.endRowIndex, 8);
assert.equal(pastedChart?.range.endColumnIndex, 5);

const pastedObject = document.insertedObjects.find(
  (object) => object.id !== "object_source" && object.name === "Launch badge",
);
assert.equal(pastedObject?.anchor.rowIndex, 7);
assert.equal(pastedObject?.anchor.columnIndex, 5);
assert.equal(pastedObject?.zIndex, 2);

const pastedNote = document.cellNotes.find(
  (note) => note.id !== "note_source" && note.cellKey === "G9",
);
assert.equal(pastedNote?.text, "Review before sharing.");
assert.equal(pastedNote?.replies.length, 1);
assert.notEqual(pastedNote?.replies[0]?.id, "reply_source");

const pastedLink = document.cellLinks.find(
  (link) => link.id !== "link_source" && link.cellKey === "E7",
);
assert.equal(pastedLink?.url, "https://example.com/revenue");

assert.ok(
  sheet.mergedCells.some(
    (range) =>
      range.id !== "merge_source" &&
      range.startRowIndex === 6 &&
      range.startColumnIndex === 5 &&
      range.endColumnIndex === 6,
  ),
  "pastes merged range metadata",
);

const pastedConditionalFormat = document.conditionalFormats.find(
  (rule) => rule.id !== "cf_source" && rule.sheetId === sheet.id,
);
assert.equal(pastedConditionalFormat?.range.startRowIndex, 6);
assert.equal(pastedConditionalFormat?.range.startColumnIndex, 4);

const pastedValidation = document.dataValidations.find(
  (rule) => rule.id !== "dv_source" && rule.sheetId === sheet.id,
);
assert.equal(pastedValidation?.range.startRowIndex, 7);
assert.equal(pastedValidation?.range.startColumnIndex, 5);
assert.equal(pastedValidation?.inputMessage, "Pick a status.");

console.log("Clipboard metadata checks passed.");
