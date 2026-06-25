import {
  applySceneCollaborationOperations,
  evaluateSceneCollaborationOperationConflicts,
  normalizeSceneCollaborationOperations,
  type SceneCollaborationOperation,
  type SceneCollaborationOperationConflict,
} from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneDocument } from "@/features/editor/types";
import type { ProjectCollaborationOperationBatchSummary } from "./collaboration-types";

type ObjectLifecycleOperation = Extract<SceneCollaborationOperation, { kind: "object-delete" | "object-upsert" }>;
type ObjectOrderOperation = Extract<SceneCollaborationOperation, { kind: "object-order-set" }>;
type RegisterSetOperation = Extract<SceneCollaborationOperation, { kind: "document-field-set" | "object-field-set" }>;

interface StampedOperation<Operation extends SceneCollaborationOperation = SceneCollaborationOperation> {
  operation: Operation;
  stamp: ProjectCollaborationCrdtStamp;
}

export interface ProjectCollaborationCrdtMergePlan {
  collapsedOperationCount: number;
  cascadedDeleteObjectCount: number;
  lifecycleOperationCount: number;
  objectOrderChanged: boolean;
  objectOrderOperationCount: number;
  objectOrderRecoveredObjectCount: number;
  operationCount: number;
  operations: SceneCollaborationOperation[];
  registerOperationCount: number;
  sourceBatchCount: number;
  sourceOperationCount: number;
  tombstonedOrderObjectCount: number;
  tombstonedRegisterCount: number;
}

export interface ProjectCollaborationCrdtMergePlanSummary {
  detail: string;
  label: string;
  status: "empty" | "merged";
}

export interface ProjectCollaborationCrdtApplyPlan {
  cleanOperationCount: number;
  cleanOperations: SceneCollaborationOperation[];
  conflictCount: number;
  conflicts: SceneCollaborationOperationConflict[];
  document: SceneDocument;
  mergePlan: ProjectCollaborationCrdtMergePlan;
  operationCount: number;
  previewObjectCount: number;
  reviewOperationCount: number;
  reviewOperations: SceneCollaborationOperation[];
  sourceBatchCount: number;
  status: "clean" | "empty" | "review";
}

export interface ProjectCollaborationCrdtApplyPlanSummary {
  detail: string;
  label: string;
  status: ProjectCollaborationCrdtApplyPlan["status"];
}

export interface ProjectCollaborationCrdtStamp {
  batchId: string;
  batchIndex: number;
  causalId: string;
  clientId: string;
  clientSequence: number;
  createdAt: string;
  operationIndex: number;
}

function getStampTime(stamp: ProjectCollaborationCrdtStamp) {
  const time = new Date(stamp.createdAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

function compareCrdtStamps(left: ProjectCollaborationCrdtStamp, right: ProjectCollaborationCrdtStamp) {
  return (
    getStampTime(left) - getStampTime(right) ||
    left.clientSequence - right.clientSequence ||
    left.clientId.localeCompare(right.clientId) ||
    left.causalId.localeCompare(right.causalId) ||
    left.batchId.localeCompare(right.batchId) ||
    left.batchIndex - right.batchIndex ||
    left.operationIndex - right.operationIndex
  );
}

function isNewerStampedOperation(left: StampedOperation, right: StampedOperation | undefined) {
  return !right || compareCrdtStamps(left.stamp, right.stamp) > 0;
}

function isRegisterSetOperation(operation: SceneCollaborationOperation): operation is RegisterSetOperation {
  return operation.kind === "document-field-set" || operation.kind === "object-field-set";
}

function isObjectLifecycleOperation(operation: SceneCollaborationOperation): operation is ObjectLifecycleOperation {
  return operation.kind === "object-delete" || operation.kind === "object-upsert";
}

function createRegisterKey(operation: RegisterSetOperation) {
  if (operation.kind === "document-field-set") {
    return `document:${operation.field}`;
  }

  return `object:${operation.objectId}:${operation.field}`;
}

function createStamp(batch: ProjectCollaborationOperationBatchSummary, batchIndex: number, operationIndex: number): ProjectCollaborationCrdtStamp {
  return {
    batchId: batch.batchId || batch.id,
    batchIndex,
    causalId: batch.causalId || `${batch.projectId}:${batch.clientId}:${batch.clientSequence || batch.id}`,
    clientId: batch.clientId,
    clientSequence: batch.clientSequence,
    createdAt: batch.createdAt,
    operationIndex,
  };
}

function pushLatestOperation<Operation extends SceneCollaborationOperation>(
  operations: Map<string, StampedOperation<Operation>>,
  key: string,
  operation: StampedOperation<Operation>,
) {
  if (isNewerStampedOperation(operation, operations.get(key))) {
    operations.set(key, operation);
  }
}

function sortStampedOperations(operations: StampedOperation[]) {
  return [...operations].sort((left, right) => compareCrdtStamps(left.stamp, right.stamp));
}

function countRegisterOperations(operations: SceneCollaborationOperation[]) {
  return operations.filter(isRegisterSetOperation).length;
}

function countLifecycleOperations(operations: SceneCollaborationOperation[]) {
  return operations.filter(isObjectLifecycleOperation).length;
}

function isObjectRegisterSuppressedByLifecycle(
  registerOperation: StampedOperation<RegisterSetOperation>,
  lifecycleOperation: StampedOperation<ObjectLifecycleOperation> | undefined,
) {
  if (registerOperation.operation.kind !== "object-field-set" || !lifecycleOperation) {
    return false;
  }

  if (lifecycleOperation.operation.kind === "object-delete") {
    return true;
  }

  return compareCrdtStamps(registerOperation.stamp, lifecycleOperation.stamp) < 0;
}

function createMergedObjectOrderOperation(
  objectOrderOperations: StampedOperation<ObjectOrderOperation>[],
  lifecycleOperations: Map<string, StampedOperation<ObjectLifecycleOperation>>,
) {
  const sortedOrderOperations = sortStampedOperations(objectOrderOperations) as StampedOperation<ObjectOrderOperation>[];
  const latestOrderOperation = sortedOrderOperations.at(-1);
  const deletedObjectIds = new Set(
    [...lifecycleOperations.values()]
      .filter((entry) => entry.operation.kind === "object-delete")
      .map((entry) => entry.operation.objectId),
  );
  const mergedObjectIds: string[] = [];
  const mergedObjectIdSet = new Set<string>();
  const tombstonedObjectIds = new Set<string>();
  let recoveredObjectCount = 0;

  function pushObjectId(objectId: string, recovered: boolean) {
    if (deletedObjectIds.has(objectId)) {
      tombstonedObjectIds.add(objectId);
      return;
    }

    if (mergedObjectIdSet.has(objectId)) {
      return;
    }

    mergedObjectIdSet.add(objectId);
    mergedObjectIds.push(objectId);

    if (recovered) {
      recoveredObjectCount += 1;
    }
  }

  if (!latestOrderOperation) {
    return {
      objectOrderOperation: null,
      recoveredObjectCount,
      tombstonedObjectCount: tombstonedObjectIds.size,
    };
  }

  for (const objectId of latestOrderOperation.operation.objectIds) {
    pushObjectId(objectId, false);
  }

  for (const entry of sortedOrderOperations.slice(0, -1).reverse()) {
    for (const objectId of entry.operation.objectIds) {
      pushObjectId(objectId, true);
    }
  }

  for (const entry of sortStampedOperations([...lifecycleOperations.values()])) {
    if (entry.operation.kind === "object-upsert") {
      pushObjectId(entry.operation.objectId, true);
    }
  }

  return {
    objectOrderOperation: {
      operation: {
        ...latestOrderOperation.operation,
        objectIds: mergedObjectIds,
      },
      stamp: latestOrderOperation.stamp,
    } satisfies StampedOperation<ObjectOrderOperation>,
    recoveredObjectCount,
    tombstonedObjectCount: tombstonedObjectIds.size,
  };
}

function getOperationConflictKey(operation: SceneCollaborationOperation) {
  if (operation.kind === "document-field-set") {
    return `${operation.kind}:document:${operation.field}`;
  }

  if (operation.kind === "object-field-set") {
    return `${operation.kind}:${operation.objectId}:${operation.field}`;
  }

  if (operation.kind === "object-upsert" || operation.kind === "object-delete") {
    return `${operation.kind}:${operation.objectId}`;
  }

  return operation.kind;
}

function getConflictOperationKey(conflict: SceneCollaborationOperationConflict) {
  if (conflict.operationKind === "document-field-set") {
    return `${conflict.operationKind}:document:${conflict.field ?? "unknown"}`;
  }

  if (conflict.operationKind === "object-field-set") {
    return `${conflict.operationKind}:${conflict.objectId ?? "unknown"}:${conflict.field ?? "unknown"}`;
  }

  if (conflict.operationKind === "object-upsert" || conflict.operationKind === "object-delete") {
    return `${conflict.operationKind}:${conflict.objectId ?? "unknown"}`;
  }

  return conflict.operationKind;
}

function partitionOperationsByConflicts(
  operations: SceneCollaborationOperation[],
  conflicts: SceneCollaborationOperationConflict[],
) {
  const conflictKeys = new Set(conflicts.map(getConflictOperationKey));
  const cleanOperations: SceneCollaborationOperation[] = [];
  const reviewOperations: SceneCollaborationOperation[] = [];

  for (const operation of operations) {
    if (conflictKeys.has(getOperationConflictKey(operation))) {
      reviewOperations.push(operation);
    } else {
      cleanOperations.push(operation);
    }
  }

  return { cleanOperations, reviewOperations };
}

export function createProjectCollaborationCrdtMergePlan(batches: ProjectCollaborationOperationBatchSummary[]): ProjectCollaborationCrdtMergePlan {
  const registerOperations = new Map<string, StampedOperation<RegisterSetOperation>>();
  const lifecycleOperations = new Map<string, StampedOperation<ObjectLifecycleOperation>>();
  const objectOrderOperations: StampedOperation<ObjectOrderOperation>[] = [];
  let sourceOperationCount = 0;

  batches.forEach((batch, batchIndex) => {
    batch.operations.forEach((operation, operationIndex) => {
      sourceOperationCount += 1;
      const stampedOperation = { operation, stamp: createStamp(batch, batchIndex, operationIndex) };

      if (isRegisterSetOperation(operation)) {
        const registerOperation: StampedOperation<RegisterSetOperation> = { operation, stamp: stampedOperation.stamp };

        pushLatestOperation(registerOperations, createRegisterKey(operation), registerOperation);
        return;
      }

      if (isObjectLifecycleOperation(operation)) {
        const lifecycleOperation: StampedOperation<ObjectLifecycleOperation> = { operation, stamp: stampedOperation.stamp };

        pushLatestOperation(lifecycleOperations, operation.objectId, lifecycleOperation);
        return;
      }

      if (operation.kind === "object-order-set") {
        objectOrderOperations.push({ operation, stamp: stampedOperation.stamp });
      }
    });
  });

  const survivingRegisterOperations = [...registerOperations.values()].filter((entry) => {
    const lifecycleOperation = entry.operation.kind === "object-field-set" ? lifecycleOperations.get(entry.operation.objectId) : undefined;

    return !isObjectRegisterSuppressedByLifecycle(entry, lifecycleOperation);
  });
  const mergedObjectOrder = createMergedObjectOrderOperation(objectOrderOperations, lifecycleOperations);
  const tombstonedRegisterCount = registerOperations.size - survivingRegisterOperations.length;
  const selectedOperations = sortStampedOperations([
    ...lifecycleOperations.values(),
    ...survivingRegisterOperations,
    ...(mergedObjectOrder.objectOrderOperation ? [mergedObjectOrder.objectOrderOperation] : []),
  ]).map((entry) => entry.operation);
  const operations = normalizeSceneCollaborationOperations(selectedOperations);

  return {
    collapsedOperationCount: Math.max(0, sourceOperationCount - operations.length),
    cascadedDeleteObjectCount: 0,
    lifecycleOperationCount: lifecycleOperations.size,
    objectOrderChanged: Boolean(mergedObjectOrder.objectOrderOperation),
    objectOrderOperationCount: objectOrderOperations.length,
    objectOrderRecoveredObjectCount: mergedObjectOrder.recoveredObjectCount,
    operationCount: operations.length,
    operations,
    registerOperationCount: survivingRegisterOperations.length,
    sourceBatchCount: batches.length,
    sourceOperationCount,
    tombstonedOrderObjectCount: mergedObjectOrder.tombstonedObjectCount,
    tombstonedRegisterCount,
  };
}

export function summarizeProjectCollaborationCrdtMergePlan(
  plan: ProjectCollaborationCrdtMergePlan,
): ProjectCollaborationCrdtMergePlanSummary {
  if (plan.sourceOperationCount === 0) {
    return {
      detail: "No remote operations are ready for deterministic merge.",
      label: "No merge",
      status: "empty",
    };
  }

  const collapsedDetail = plan.collapsedOperationCount
    ? `, collapsed ${plan.collapsedOperationCount} superseded ${plan.collapsedOperationCount === 1 ? "operation" : "operations"}`
    : "";
  const tombstoneDetail = plan.tombstonedRegisterCount
    ? `, skipped ${plan.tombstonedRegisterCount} field ${plan.tombstonedRegisterCount === 1 ? "write" : "writes"} behind object lifecycle changes`
    : "";
  const orderMergeDetail = plan.objectOrderOperationCount > 1
    ? `, merged ${plan.objectOrderOperationCount} object-order writes`
    : "";
  const recoveredOrderDetail = plan.objectOrderRecoveredObjectCount
    ? `, retained ${plan.objectOrderRecoveredObjectCount} concurrent order ${plan.objectOrderRecoveredObjectCount === 1 ? "entry" : "entries"}`
    : "";
  const tombstonedOrderDetail = plan.tombstonedOrderObjectCount
    ? `, removed ${plan.tombstonedOrderObjectCount} tombstoned order ${plan.tombstonedOrderObjectCount === 1 ? "entry" : "entries"}`
    : "";
  const cascadedDeleteDetail = plan.cascadedDeleteObjectCount
    ? `, cascaded ${plan.cascadedDeleteObjectCount} child ${plan.cascadedDeleteObjectCount === 1 ? "delete" : "deletes"}`
    : "";

  return {
    detail: `Deterministic merge prepared ${plan.operationCount} ${plan.operationCount === 1 ? "operation" : "operations"} from ${plan.sourceBatchCount} ${plan.sourceBatchCount === 1 ? "batch" : "batches"}${collapsedDetail}${tombstoneDetail}${orderMergeDetail}${recoveredOrderDetail}${tombstonedOrderDetail}${cascadedDeleteDetail}.`,
    label: `${plan.operationCount} merged`,
    status: "merged",
  };
}

function createObjectParentMap(document: SceneDocument, operations: SceneCollaborationOperation[]) {
  const parentMap = new Map<string, string | null>();

  for (const object of document.objects) {
    parentMap.set(object.id, object.parentId ?? null);
  }

  for (const operation of operations) {
    if (operation.kind === "object-upsert") {
      parentMap.set(operation.objectId, operation.object.parentId ?? null);
    }
  }

  return parentMap;
}

function createCascadedObjectDeleteIds(document: SceneDocument, operations: SceneCollaborationOperation[]) {
  const deletedObjectIds = new Set<string>();
  const directDeletedObjectIds = new Set<string>();
  const parentMap = createObjectParentMap(document, operations);

  for (const operation of operations) {
    if (operation.kind === "object-delete") {
      deletedObjectIds.add(operation.objectId);
      directDeletedObjectIds.add(operation.objectId);
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const [objectId, parentId] of parentMap) {
      if (parentId && deletedObjectIds.has(parentId) && !deletedObjectIds.has(objectId)) {
        deletedObjectIds.add(objectId);
        changed = true;
      }
    }
  }

  return {
    cascadedDeleteObjectCount: Math.max(0, deletedObjectIds.size - directDeletedObjectIds.size),
    deletedObjectIds,
  };
}

function createDocumentAwareCrdtMergePlan(
  document: SceneDocument,
  plan: ProjectCollaborationCrdtMergePlan,
): ProjectCollaborationCrdtMergePlan {
  const { cascadedDeleteObjectCount, deletedObjectIds } = createCascadedObjectDeleteIds(document, plan.operations);

  if (deletedObjectIds.size === 0) {
    return plan;
  }

  let tombstonedRegisterCount = 0;
  let tombstonedOrderObjectCount = 0;
  const operations = plan.operations.flatMap((operation): SceneCollaborationOperation[] => {
    if (operation.kind === "object-field-set" && deletedObjectIds.has(operation.objectId)) {
      tombstonedRegisterCount += 1;
      return [];
    }

    if (operation.kind === "object-upsert" && deletedObjectIds.has(operation.objectId)) {
      return [];
    }

    if (operation.kind === "object-order-set") {
      const objectIds = operation.objectIds.filter((objectId) => !deletedObjectIds.has(objectId));

      tombstonedOrderObjectCount += operation.objectIds.length - objectIds.length;

      return [{ ...operation, objectIds }];
    }

    return [operation];
  });

  return {
    ...plan,
    cascadedDeleteObjectCount,
    collapsedOperationCount: plan.collapsedOperationCount + Math.max(0, plan.operations.length - operations.length),
    lifecycleOperationCount: countLifecycleOperations(operations),
    objectOrderChanged: operations.some((operation) => operation.kind === "object-order-set"),
    operationCount: operations.length,
    operations,
    registerOperationCount: countRegisterOperations(operations),
    tombstonedOrderObjectCount: plan.tombstonedOrderObjectCount + tombstonedOrderObjectCount,
    tombstonedRegisterCount: plan.tombstonedRegisterCount + tombstonedRegisterCount,
  };
}

function evaluateProjectCollaborationCrdtOperationConflicts(
  document: SceneDocument,
  operations: SceneCollaborationOperation[],
) {
  let currentDocument = document;
  const conflicts: SceneCollaborationOperationConflict[] = [];

  for (const operation of operations) {
    const operationConflicts = evaluateSceneCollaborationOperationConflicts(currentDocument, [operation]);

    conflicts.push(...operationConflicts);

    if (operationConflicts.length === 0) {
      currentDocument = applySceneCollaborationOperations(currentDocument, [operation]);
    }
  }

  return conflicts;
}

export function createProjectCollaborationCrdtApplyPlan(
  document: SceneDocument,
  batches: ProjectCollaborationOperationBatchSummary[],
): ProjectCollaborationCrdtApplyPlan {
  const mergePlan = createDocumentAwareCrdtMergePlan(document, createProjectCollaborationCrdtMergePlan(batches));
  const conflicts = evaluateProjectCollaborationCrdtOperationConflicts(document, mergePlan.operations);
  const { cleanOperations, reviewOperations } = partitionOperationsByConflicts(mergePlan.operations, conflicts);
  const previewDocument = applySceneCollaborationOperations(document, mergePlan.operations);

  return {
    cleanOperationCount: cleanOperations.length,
    cleanOperations,
    conflictCount: conflicts.length,
    conflicts,
    document: previewDocument,
    mergePlan,
    operationCount: mergePlan.operationCount,
    previewObjectCount: previewDocument.objects.length,
    reviewOperationCount: reviewOperations.length,
    reviewOperations,
    sourceBatchCount: batches.length,
    status: mergePlan.operationCount === 0 ? "empty" : conflicts.length ? "review" : "clean",
  };
}

export function summarizeProjectCollaborationCrdtApplyPlan(
  plan: ProjectCollaborationCrdtApplyPlan,
): ProjectCollaborationCrdtApplyPlanSummary {
  if (plan.status === "empty") {
    return {
      detail: "No deterministic remote operations are ready to apply.",
      label: "No apply",
      status: "empty",
    };
  }

  if (plan.status === "review") {
    const cleanDetail = plan.cleanOperationCount
      ? ` ${plan.cleanOperationCount} clean ${plan.cleanOperationCount === 1 ? "operation can" : "operations can"} merge before review.`
      : "";

    return {
      detail: `Apply preview found ${plan.conflictCount} review ${plan.conflictCount === 1 ? "item" : "items"} before merging ${plan.reviewOperationCount} risky ${plan.reviewOperationCount === 1 ? "operation" : "operations"}.${cleanDetail}`,
      label: `${plan.conflictCount} review`,
      status: "review",
    };
  }

  return {
    detail: `Apply preview can merge ${plan.operationCount} ${plan.operationCount === 1 ? "operation" : "operations"} into ${plan.previewObjectCount} scene ${plan.previewObjectCount === 1 ? "object" : "objects"}.`,
    label: "Clean apply",
    status: "clean",
  };
}
