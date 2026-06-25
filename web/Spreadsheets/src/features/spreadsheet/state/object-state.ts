import {
  createInsertedObject,
  updateInsertedObject,
  type InsertedObjectCreateInput,
  type InsertedObjectLayerAction,
  type InsertedObjectUpdate,
} from "@/features/spreadsheet/inserted-objects";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";
import type {
  InsertedObjectDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function addInsertedObjectToDocument(
  document: WorkbookDocument,
  selection: CellSelection,
  input: InsertedObjectCreateInput,
) {
  const sheet = getActiveSheet(document);
  const zIndex = getNextObjectZIndex(document, sheet.id);
  const object = createInsertedObject(sheet.id, selection, zIndex, input);

  document.insertedObjects ??= [];
  document.insertedObjects.push(object);

  return object.id;
}

export function deleteInsertedObjectFromDocument(
  document: WorkbookDocument,
  objectId: string,
) {
  document.insertedObjects = (document.insertedObjects ?? []).filter(
    (object) => object.id !== objectId,
  );
}

export function updateInsertedObjectInDocument(
  document: WorkbookDocument,
  objectId: string,
  updates: InsertedObjectUpdate,
) {
  document.insertedObjects = (document.insertedObjects ?? []).map((object) =>
    object.id === objectId ? updateInsertedObject(object, updates) : object,
  );
}

export function moveInsertedObjectToSelectionInDocument(
  document: WorkbookDocument,
  objectId: string,
  selection: CellSelection,
) {
  updateInsertedObjectInDocument(document, objectId, {
    anchor: {
      columnIndex: selection.columnIndex,
      offsetX: 8,
      offsetY: 8,
      rowIndex: selection.rowIndex,
    },
  });
}

export function reorderInsertedObjectInDocument(
  document: WorkbookDocument,
  objectId: string,
  action: InsertedObjectLayerAction,
) {
  const sheetId = getObjectSheetId(document, objectId);

  if (!sheetId) {
    return;
  }

  const objects = (document.insertedObjects ?? [])
    .filter((object) => object.sheetId === sheetId)
    .sort((left, right) => left.zIndex - right.zIndex);
  const currentIndex = objects.findIndex((object) => object.id === objectId);

  if (currentIndex === -1) {
    return;
  }

  const [object] = objects.splice(currentIndex, 1);
  const nextIndex = getNextLayerIndex(action, currentIndex, objects.length);

  objects.splice(nextIndex, 0, object);
  applyLayerOrder(document, sheetId, objects);
}

function getNextObjectZIndex(document: WorkbookDocument, sheetId: string) {
  return (
    Math.max(
      0,
      ...(document.insertedObjects ?? [])
        .filter((object) => object.sheetId === sheetId)
        .map((object) => object.zIndex),
    ) + 1
  );
}

function getObjectSheetId(document: WorkbookDocument, objectId: string) {
  return (document.insertedObjects ?? []).find((object) => object.id === objectId)
    ?.sheetId;
}

function getNextLayerIndex(
  action: InsertedObjectLayerAction,
  currentIndex: number,
  lastIndex: number,
) {
  if (action === "bringToFront") {
    return lastIndex;
  }

  if (action === "sendToBack") {
    return 0;
  }

  if (action === "bringForward") {
    return Math.min(currentIndex + 1, lastIndex);
  }

  return Math.max(currentIndex - 1, 0);
}

function applyLayerOrder(
  document: WorkbookDocument,
  sheetId: string,
  sortedSheetObjects: InsertedObjectDefinition[],
) {
  const zIndexById = new Map(
    sortedSheetObjects.map((object, index) => [object.id, index + 1]),
  );

  document.insertedObjects = (document.insertedObjects ?? []).map((object) =>
    object.sheetId === sheetId
      ? {
          ...object,
          zIndex: zIndexById.get(object.id) ?? object.zIndex,
        }
      : object,
  );
}
