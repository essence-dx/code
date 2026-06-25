import { strict as assert } from "node:assert";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  addInsertedObjectToDocument,
  deleteInsertedObjectFromDocument,
  moveInsertedObjectToSelectionInDocument,
  reorderInsertedObjectInDocument,
  updateInsertedObjectInDocument,
} from "@/features/spreadsheet/state/object-state";
import {
  moveInsertedObjectAnchor,
  resizeInsertedObjectAnchor,
} from "@/features/spreadsheet/worksheet-object-transform";
import { getWorkbookStatistics } from "@/features/spreadsheet/workbook-statistics";

const document = createDefaultWorkbookDocument();
const activeSheet = document.sheets[0];

assert(activeSheet, "default workbook has a sheet");

const shapeId = addInsertedObjectToDocument(
  document,
  { columnIndex: 2, rowIndex: 4 },
  { kind: "shape", shapeType: "roundedRectangle" },
);
const textBoxId = addInsertedObjectToDocument(
  document,
  { columnIndex: 3, rowIndex: 8 },
  { kind: "textBox", text: "Quarterly note" },
);
const imageId = addInsertedObjectToDocument(
  document,
  { columnIndex: 5, rowIndex: 10 },
  {
    kind: "image",
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    fileName: "logo.png",
    mimeType: "image/png",
    originalSizeBytes: 12,
  },
);
const connectorId = addInsertedObjectToDocument(
  document,
  { columnIndex: 7, rowIndex: 4 },
  { kind: "shape", shapeType: "connector" },
);

updateInsertedObjectInDocument(document, shapeId, {
  anchor: { height: 90, offsetX: 24, width: 260 },
  format: { fillColor: "#16a34a", strokeColor: "#111827" },
  name: "Status callout",
  text: "On track",
});
moveInsertedObjectToSelectionInDocument(
  document,
  textBoxId,
  { columnIndex: 1, rowIndex: 1 },
);
reorderInsertedObjectInDocument(document, shapeId, "bringToFront");

const connector = document.insertedObjects.find(
  (object) => object.id === connectorId,
);

assert(connector, "connector object is created");

const movedAnchor = moveInsertedObjectAnchor({
  deltaX: -48,
  deltaY: 40,
  object: connector,
  sheet: activeSheet,
});
const resizedAnchor = resizeInsertedObjectAnchor({
  deltaX: 48,
  deltaY: 24,
  handle: "southEast",
  object: connector,
  sheet: activeSheet,
});

assert.equal(
  movedAnchor.columnIndex,
  6,
  "keyboard/object movement can cross into the previous column",
);
assert.equal(
  resizedAnchor.width,
  connector.anchor.width + 48,
  "object resize handles widen the object",
);
assert.equal(
  resizedAnchor.height,
  connector.anchor.height + 24,
  "object resize handles heighten the object",
);

let normalized = normalizeWorkbookDocument({
  ...document,
  insertedObjects: [
    ...document.insertedObjects,
    { id: "bad", kind: "image", sheetId: activeSheet.id },
  ],
});

assert.equal(normalized.insertedObjects.length, 4, "invalid objects are skipped");
assert.equal(
  normalized.insertedObjects.find((object) => object.id === shapeId)?.name,
  "Status callout",
  "object names survive normalization",
);
assert.equal(
  normalized.insertedObjects.find((object) => object.id === imageId)?.metadata
    .fileName,
  "logo.png",
  "image metadata survives normalization",
);
assert.equal(
  normalized.insertedObjects.find((object) => object.id === textBoxId)?.anchor
    .rowIndex,
  1,
  "objects can move to the selected cell",
);
assert.equal(
  normalized.insertedObjects.find((object) => object.id === connectorId)
    ?.shapeType,
  "connector",
  "connector objects survive normalization",
);

deleteInsertedObjectFromDocument(normalized, imageId);

const statistics = getWorkbookStatistics(normalized);

assert.equal(statistics.insertedObjectCount, 3, "object statistics are counted");
assert.equal(statistics.insertedImageCount, 0, "image statistics are counted");

console.log("Inserted object checks passed.");
