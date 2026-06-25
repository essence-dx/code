import { z } from "zod";
import type { SceneDocument, SceneObject } from "../types";
import { sceneObjectSchema } from "../types";
import {
  documentCollaborationFields,
  objectCollaborationFields,
  type DocumentCollaborationField,
  type ObjectCollaborationField,
} from "./scene-collaboration-fields";
import { getDescendantIds } from "./scene-tree-utils";

export interface DocumentFieldSetOperation<Field extends DocumentCollaborationField = DocumentCollaborationField> {
  field: Field;
  kind: "document-field-set";
  previousValue: SceneDocument[Field];
  value: SceneDocument[Field];
}

export interface ObjectFieldSetOperation<Field extends ObjectCollaborationField = ObjectCollaborationField> {
  field: Field;
  kind: "object-field-set";
  objectId: string;
  objectName: string;
  previousValue: SceneObject[Field];
  value: SceneObject[Field];
}

export interface ObjectUpsertOperation {
  kind: "object-upsert";
  object: SceneObject;
  objectId: string;
  objectName: string;
}

export interface ObjectDeleteOperation {
  kind: "object-delete";
  objectId: string;
  objectName: string;
}

export interface ObjectOrderSetOperation {
  kind: "object-order-set";
  objectIds: string[];
}

export type SceneCollaborationOperation =
  | DocumentFieldSetOperation
  | ObjectDeleteOperation
  | ObjectFieldSetOperation
  | ObjectOrderSetOperation
  | ObjectUpsertOperation;

type RegisterSetOperation = DocumentFieldSetOperation | ObjectFieldSetOperation;

export const sceneCollaborationOperationSchema = z.discriminatedUnion("kind", [
  z.object({
    field: z.enum(documentCollaborationFields),
    kind: z.literal("document-field-set"),
    previousValue: z.unknown(),
    value: z.unknown(),
  }),
  z.object({
    field: z.enum(objectCollaborationFields),
    kind: z.literal("object-field-set"),
    objectId: z.string().min(1),
    objectName: z.string().min(1),
    previousValue: z.unknown(),
    value: z.unknown(),
  }),
  z.object({
    kind: z.literal("object-upsert"),
    object: sceneObjectSchema,
    objectId: z.string().min(1),
    objectName: z.string().min(1),
  }),
  z.object({
    kind: z.literal("object-delete"),
    objectId: z.string().min(1),
    objectName: z.string().min(1),
  }),
  z.object({
    kind: z.literal("object-order-set"),
    objectIds: z.array(z.string().min(1)),
  }),
]);

export interface SceneCollaborationOperationSummary {
  detail: string;
  documentFieldCount: number;
  label: string;
  objectDeleteCount: number;
  objectFieldCount: number;
  objectOrderChanged: boolean;
  objectUpsertCount: number;
  operationCount: number;
  status: "empty" | "ready";
}

export interface SceneCollaborationOperationConflict {
  field?: DocumentCollaborationField | ObjectCollaborationField;
  kind: "document-field-mismatch" | "object-exists" | "object-field-mismatch" | "object-missing" | "object-order-missing";
  label: string;
  objectId?: string;
  objectName?: string;
  operationKind: SceneCollaborationOperation["kind"];
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function areEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function mapObjects(objects: SceneObject[]) {
  return new Map(objects.map((object) => [object.id, object]));
}

function createDocumentFieldSetOperation<Field extends DocumentCollaborationField>(
  field: Field,
  previousValue: SceneDocument[Field],
  value: SceneDocument[Field],
): DocumentFieldSetOperation<Field> {
  return {
    field,
    kind: "document-field-set",
    previousValue: cloneValue(previousValue),
    value: cloneValue(value),
  };
}

function createObjectFieldSetOperation<Field extends ObjectCollaborationField>(
  field: Field,
  object: SceneObject,
  previousValue: SceneObject[Field],
  value: SceneObject[Field],
): ObjectFieldSetOperation<Field> {
  return {
    field,
    kind: "object-field-set",
    objectId: object.id,
    objectName: object.name,
    previousValue: cloneValue(previousValue),
    value: cloneValue(value),
  };
}

function getObjectName(base: SceneObject | undefined, next: SceneObject | undefined, objectId: string) {
  return next?.name || base?.name || objectId;
}

function hasObjectOrderChanged(base: SceneObject[], next: SceneObject[]) {
  const baseIds = base.map((object) => object.id);
  const nextIds = next.map((object) => object.id);

  return !areEqual(baseIds, nextIds);
}

function setDocumentField<Field extends DocumentCollaborationField>(document: SceneDocument, field: Field, value: SceneDocument[Field]) {
  (document as unknown as Record<string, unknown>)[field] = cloneValue(value);
}

function setObjectField<Field extends ObjectCollaborationField>(object: SceneObject, field: Field, value: SceneObject[Field]) {
  (object as unknown as Record<string, unknown>)[field] = cloneValue(value);
}

function reorderObjects(objects: SceneObject[], objectIds: string[]) {
  const objectMap = mapObjects(objects);
  const ordered = objectIds.flatMap((objectId) => {
    const object = objectMap.get(objectId);

    return object ? [object] : [];
  });
  const orderedIds = new Set(ordered.map((object) => object.id));
  const remaining = objects.filter((object) => !orderedIds.has(object.id));

  return [...ordered, ...remaining];
}

function getRegisterSetOperationKey(operation: RegisterSetOperation) {
  if (operation.kind === "document-field-set") {
    return `document:${operation.field}`;
  }

  return `object:${operation.objectId}:${operation.field}`;
}

function mergeRegisterSetOperation(existing: RegisterSetOperation, next: RegisterSetOperation): RegisterSetOperation {
  return {
    ...next,
    previousValue: cloneValue(existing.previousValue),
    value: cloneValue(next.value),
  } as RegisterSetOperation;
}

export function normalizeSceneCollaborationOperations(operations: SceneCollaborationOperation[]) {
  const keptOperations: Array<SceneCollaborationOperation | null> = new Array(operations.length).fill(null);
  const registerOperations = new Map<string, { index: number; operation: RegisterSetOperation }>();
  let lastObjectOrderIndex = -1;

  operations.forEach((operation, index) => {
    if (operation.kind === "document-field-set" || operation.kind === "object-field-set") {
      const key = getRegisterSetOperationKey(operation);
      const existing = registerOperations.get(key);

      registerOperations.set(key, {
        index,
        operation: existing ? mergeRegisterSetOperation(existing.operation, operation) : cloneValue(operation),
      });
      return;
    }

    if (operation.kind === "object-order-set") {
      lastObjectOrderIndex = index;
      return;
    }

    keptOperations[index] = operation;
  });

  for (const { index, operation } of registerOperations.values()) {
    keptOperations[index] = operation;
  }

  if (lastObjectOrderIndex >= 0) {
    keptOperations[lastObjectOrderIndex] = operations[lastObjectOrderIndex];
  }

  return keptOperations.filter((operation): operation is SceneCollaborationOperation => Boolean(operation));
}

export function createSceneCollaborationOperations(base: SceneDocument, next: SceneDocument): SceneCollaborationOperation[] {
  const operations: SceneCollaborationOperation[] = [];

  for (const field of documentCollaborationFields) {
    const previousValue = base[field];
    const value = next[field];

    if (!areEqual(previousValue, value)) {
      operations.push(createDocumentFieldSetOperation(field, previousValue, value));
    }
  }

  const baseObjects = mapObjects(base.objects);
  const nextObjects = mapObjects(next.objects);
  const objectIds = new Set([...baseObjects.keys(), ...nextObjects.keys()]);

  for (const objectId of objectIds) {
    const baseObject = baseObjects.get(objectId);
    const nextObject = nextObjects.get(objectId);
    const objectName = getObjectName(baseObject, nextObject, objectId);

    if (!baseObject && nextObject) {
      operations.push({
        kind: "object-upsert",
        object: cloneValue(nextObject),
        objectId,
        objectName,
      });
      continue;
    }

    if (baseObject && !nextObject) {
      operations.push({
        kind: "object-delete",
        objectId,
        objectName,
      });
      continue;
    }

    if (!baseObject || !nextObject) {
      continue;
    }

    for (const field of objectCollaborationFields) {
      const previousValue = baseObject[field];
      const value = nextObject[field];

      if (!areEqual(previousValue, value)) {
        operations.push(createObjectFieldSetOperation(field, nextObject, previousValue, value));
      }
    }
  }

  if (hasObjectOrderChanged(base.objects, next.objects)) {
    operations.push({
      kind: "object-order-set",
      objectIds: next.objects.map((object) => object.id),
    });
  }

  return operations;
}

export function applySceneCollaborationOperations(document: SceneDocument, operations: SceneCollaborationOperation[]) {
  const nextDocument = cloneValue(document);

  for (const operation of operations) {
    if (operation.kind === "document-field-set") {
      setDocumentField(nextDocument, operation.field, operation.value);
      continue;
    }

    if (operation.kind === "object-upsert") {
      const existingIndex = nextDocument.objects.findIndex((object) => object.id === operation.objectId);

      if (existingIndex >= 0) {
        nextDocument.objects[existingIndex] = cloneValue(operation.object);
      } else {
        nextDocument.objects.push(cloneValue(operation.object));
      }
      continue;
    }

    if (operation.kind === "object-delete") {
      const removeIds = new Set([operation.objectId, ...getDescendantIds(nextDocument.objects, operation.objectId)]);

      nextDocument.activeCameraId = nextDocument.activeCameraId && removeIds.has(nextDocument.activeCameraId) ? null : nextDocument.activeCameraId;
      nextDocument.animationTracks = (nextDocument.animationTracks ?? []).filter((track) => !removeIds.has(track.objectId));
      nextDocument.objects = nextDocument.objects.filter((object) => !removeIds.has(object.id));
      continue;
    }

    if (operation.kind === "object-field-set") {
      const object = nextDocument.objects.find((entry) => entry.id === operation.objectId);

      if (object) {
        setObjectField(object, operation.field, operation.value);
      }
      continue;
    }

    nextDocument.objects = reorderObjects(nextDocument.objects, operation.objectIds);
  }

  return nextDocument;
}

export function evaluateSceneCollaborationOperationConflicts(document: SceneDocument, operations: SceneCollaborationOperation[]) {
  const conflicts: SceneCollaborationOperationConflict[] = [];
  const objects = mapObjects(document.objects);

  for (const operation of operations) {
    if (operation.kind === "document-field-set") {
      const currentValue = document[operation.field];

      if (!areEqual(currentValue, operation.previousValue) && !areEqual(currentValue, operation.value)) {
        conflicts.push({
          field: operation.field,
          kind: "document-field-mismatch",
          label: `Document ${operation.field} changed locally before the remote operation was applied.`,
          operationKind: operation.kind,
        });
      }
      continue;
    }

    if (operation.kind === "object-field-set") {
      const object = objects.get(operation.objectId);

      if (!object) {
        conflicts.push({
          field: operation.field,
          kind: "object-missing",
          label: `${operation.objectName} is missing locally before the remote operation was applied.`,
          objectId: operation.objectId,
          objectName: operation.objectName,
          operationKind: operation.kind,
        });
        continue;
      }

      const currentValue = object[operation.field];

      if (!areEqual(currentValue, operation.previousValue) && !areEqual(currentValue, operation.value)) {
        conflicts.push({
          field: operation.field,
          kind: "object-field-mismatch",
          label: `${operation.objectName} ${operation.field} changed locally before the remote operation was applied.`,
          objectId: operation.objectId,
          objectName: operation.objectName,
          operationKind: operation.kind,
        });
      }
      continue;
    }

    if (operation.kind === "object-upsert") {
      const object = objects.get(operation.objectId);

      if (object && !areEqual(object, operation.object)) {
        conflicts.push({
          kind: "object-exists",
          label: `${operation.objectName} already exists locally with different values.`,
          objectId: operation.objectId,
          objectName: operation.objectName,
          operationKind: operation.kind,
        });
      }
      continue;
    }

    if (operation.kind === "object-order-set") {
      const missingObjectIds = operation.objectIds.filter((objectId) => !objects.has(objectId));

      if (missingObjectIds.length > 0) {
        conflicts.push({
          kind: "object-order-missing",
          label: `${missingObjectIds.length} ordered ${missingObjectIds.length === 1 ? "object is" : "objects are"} missing locally.`,
          operationKind: operation.kind,
        });
      }
    }
  }

  return conflicts;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  if (count === 0) {
    return null;
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

export function summarizeSceneCollaborationOperations(operations: SceneCollaborationOperation[]): SceneCollaborationOperationSummary {
  const documentFieldCount = operations.filter((operation) => operation.kind === "document-field-set").length;
  const objectFieldCount = operations.filter((operation) => operation.kind === "object-field-set").length;
  const objectUpsertCount = operations.filter((operation) => operation.kind === "object-upsert").length;
  const objectDeleteCount = operations.filter((operation) => operation.kind === "object-delete").length;
  const objectOrderChanged = operations.some((operation) => operation.kind === "object-order-set");
  const operationCount = operations.length;

  if (operationCount === 0) {
    return {
      detail: "No local collaboration operations since the saved baseline.",
      documentFieldCount,
      label: "No sync ops",
      objectDeleteCount,
      objectFieldCount,
      objectOrderChanged,
      objectUpsertCount,
      operationCount,
      status: "empty",
    };
  }

  const parts = [
    formatCount(documentFieldCount, "document field"),
    formatCount(objectFieldCount, "object field"),
    formatCount(objectUpsertCount, "object add"),
    formatCount(objectDeleteCount, "object removal", "object removals"),
    objectOrderChanged ? "object order" : null,
  ].filter((part): part is string => Boolean(part));

  return {
    detail: `Prepared ${parts.join(", ")} for collaboration sync.`,
    documentFieldCount,
    label: `${operationCount} sync ${operationCount === 1 ? "op" : "ops"}`,
    objectDeleteCount,
    objectFieldCount,
    objectOrderChanged,
    objectUpsertCount,
    operationCount,
    status: "ready",
  };
}
