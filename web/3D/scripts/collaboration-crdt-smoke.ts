import { strict as assert } from "node:assert";
import {
  createSceneCollaborationOperations,
  type SceneCollaborationOperation,
} from "../src/features/editor/scene/scene-collaboration-operations";
import { createDefaultDocument, createSceneObject } from "../src/features/editor/scene/default-document";
import { applySceneSnapshot, createSceneSnapshotFromDocument, syncActiveScene } from "../src/features/editor/scene/multi-scene";
import type { SceneDocument, SceneObject } from "../src/features/editor/types";
import {
  createProjectCollaborationCrdtApplyPlan,
  summarizeProjectCollaborationCrdtMergePlan,
} from "../src/features/projects/collaboration-crdt-merge-plan";
import {
  getProjectCollaborationSceneId,
  resolveProjectCollaborationSceneBaseline,
} from "../src/features/projects/collaboration-scene-scope";
import {
  createAppliedCollaborationOperationSignatures,
  hasAcknowledgedAllCollaborationOperations,
} from "../src/features/projects/applied-collaboration-operation-ledger";
import type { ProjectCollaborationOperationBatchSummary } from "../src/features/projects/collaboration-types";

function createObject(id: string, name: string): SceneObject {
  return {
    ...createSceneObject("box", name),
    id,
    name,
  };
}

function createDocument(objects: SceneObject[]): SceneDocument {
  const document = createDefaultDocument("CRDT Smoke");

  return {
    ...document,
    activeCameraId: null,
    objects,
  };
}

function createBatch(
  input: Pick<ProjectCollaborationOperationBatchSummary, "batchId" | "clientId" | "clientSequence" | "createdAt" | "operations" | "userName">,
): ProjectCollaborationOperationBatchSummary {
  return {
    baseUpdatedAt: null,
    batchId: input.batchId,
    causalId: `crdt-smoke:${input.clientId}:${input.clientSequence}`,
    clientId: input.clientId,
    clientSequence: input.clientSequence,
    createdAt: input.createdAt,
    id: `${input.batchId}-log`,
    operationCount: input.operations.length,
    operations: input.operations,
    projectId: "project-crdt-smoke",
    userEmail: `${input.clientId}@example.com`,
    userId: input.clientId,
    userName: input.userName,
  };
}

const alpha = createObject("alpha", "Alpha");
const alphaChild: SceneObject = {
  ...createObject("alpha-child", "Alpha Child"),
  parentId: alpha.id,
};
const beta = createObject("beta", "Beta");
const gamma = createObject("gamma", "Gamma");
const delta = createObject("delta", "Delta");
const document = createDocument([alpha, alphaChild, beta, gamma]);

const betaRenameOperation: SceneCollaborationOperation = {
  field: "name",
  kind: "object-field-set",
  objectId: beta.id,
  objectName: beta.name,
  previousValue: beta.name,
  value: "Beta Remote",
};
const alphaStaleRenameOperation: SceneCollaborationOperation = {
  field: "name",
  kind: "object-field-set",
  objectId: alpha.id,
  objectName: alpha.name,
  previousValue: alpha.name,
  value: "Alpha Ghost",
};
const alphaChildStaleRenameOperation: SceneCollaborationOperation = {
  field: "name",
  kind: "object-field-set",
  objectId: alphaChild.id,
  objectName: alphaChild.name,
  previousValue: alphaChild.name,
  value: "Alpha Child Ghost",
};

const batches: ProjectCollaborationOperationBatchSummary[] = [
  createBatch({
    batchId: "batch-order-a",
    clientId: "client-a",
    clientSequence: 1,
    createdAt: "2026-01-01T00:00:01.000Z",
    operations: [
      {
        kind: "object-order-set",
        objectIds: [beta.id, alpha.id, alphaChild.id, gamma.id],
      },
    ],
    userName: "Client A",
  }),
  createBatch({
    batchId: "batch-upsert-b",
    clientId: "client-b",
    clientSequence: 1,
    createdAt: "2026-01-01T00:00:02.000Z",
    operations: [
      {
        kind: "object-upsert",
        object: delta,
        objectId: delta.id,
        objectName: delta.name,
      },
      {
        kind: "object-order-set",
        objectIds: [alpha.id, delta.id, beta.id, alphaChild.id],
      },
    ],
    userName: "Client B",
  }),
  createBatch({
    batchId: "batch-register-c",
    clientId: "client-c",
    clientSequence: 1,
    createdAt: "2026-01-01T00:00:03.000Z",
    operations: [betaRenameOperation, alphaStaleRenameOperation, alphaChildStaleRenameOperation],
    userName: "Client C",
  }),
  createBatch({
    batchId: "batch-delete-d",
    clientId: "client-d",
    clientSequence: 1,
    createdAt: "2026-01-01T00:00:04.000Z",
    operations: [
      {
        kind: "object-delete",
        objectId: alpha.id,
        objectName: alpha.name,
      },
      {
        kind: "object-order-set",
        objectIds: [alpha.id, delta.id, beta.id, alphaChild.id],
      },
    ],
    userName: "Client D",
  }),
];

const applyPlan = createProjectCollaborationCrdtApplyPlan(document, batches);
const mergePlan = applyPlan.mergePlan;
const orderOperation = mergePlan.operations.find((operation) => operation.kind === "object-order-set");
const partialOperationAcknowledgements = new Set(createAppliedCollaborationOperationSignatures(mergePlan.operations.slice(0, 1)));
const fullOperationAcknowledgements = new Set(createAppliedCollaborationOperationSignatures(mergePlan.operations));

assert.ok(orderOperation);
assert.equal(mergePlan.lifecycleOperationCount, 2);
assert.equal(mergePlan.registerOperationCount, 1);
assert.equal(mergePlan.tombstonedRegisterCount, 2);
assert.equal(mergePlan.objectOrderOperationCount, 3);
assert.equal(mergePlan.objectOrderRecoveredObjectCount, 1);
assert.equal(mergePlan.tombstonedOrderObjectCount, 2);
assert.equal(mergePlan.cascadedDeleteObjectCount, 1);
assert.deepEqual(orderOperation.objectIds, [delta.id, beta.id, gamma.id]);
assert.equal(
  mergePlan.operations.some((operation) => operation.kind === "object-field-set" && operation.objectId === alpha.id),
  false,
);
const betaAfterApply = applyPlan.document.objects.find((object) => object.id === beta.id);

assert.equal(applyPlan.status, "clean");
assert.equal(applyPlan.conflictCount, 0);
assert.deepEqual(applyPlan.document.objects.map((object) => object.id), [delta.id, beta.id, gamma.id]);
assert.equal(betaAfterApply?.name, "Beta Remote");
assert.match(summarizeProjectCollaborationCrdtMergePlan(mergePlan).detail, /merged 3 object-order writes/);
assert.match(summarizeProjectCollaborationCrdtMergePlan(mergePlan).detail, /cascaded 1 child delete/);
assert.equal(hasAcknowledgedAllCollaborationOperations(mergePlan.operations, partialOperationAcknowledgements), false);
assert.equal(hasAcknowledgedAllCollaborationOperations(mergePlan.operations, fullOperationAcknowledgements), true);

const sceneADocument: SceneDocument = {
  ...createDocument([alpha]),
  activeSceneId: "scene-a",
  id: "scene-a",
  name: "Scene A",
};
const sceneBDocument: SceneDocument = {
  ...createDocument([beta]),
  activeSceneId: "scene-b",
  id: "scene-b",
  name: "Scene B",
};
const sceneASnapshot = createSceneSnapshotFromDocument(sceneADocument, "scene-a", "Scene A");
const sceneBSnapshot = createSceneSnapshotFromDocument(sceneBDocument, "scene-b", "Scene B");
const multiSceneBaseline = syncActiveScene({
  ...sceneADocument,
  scenes: [sceneASnapshot, sceneBSnapshot],
});
const currentSceneB = syncActiveScene(applySceneSnapshot({ ...multiSceneBaseline, activeSceneId: "scene-b" }, sceneBSnapshot));
const sceneBBaseline = resolveProjectCollaborationSceneBaseline(multiSceneBaseline, currentSceneB);

assert.ok(sceneBBaseline);
assert.equal(getProjectCollaborationSceneId(currentSceneB), "scene-b");
assert.equal(sceneBBaseline.activeSceneId, "scene-b");
assert.deepEqual(createSceneCollaborationOperations(sceneBBaseline, currentSceneB), []);

const editedSceneB = syncActiveScene({
  ...currentSceneB,
  objects: currentSceneB.objects.map((object) => (object.id === beta.id ? { ...object, name: "Beta Edited" } : object)),
});
const sceneBEditOperations = createSceneCollaborationOperations(sceneBBaseline, editedSceneB);

assert.equal(sceneBEditOperations.some((operation) => operation.kind === "object-delete" || operation.kind === "object-upsert" || operation.kind === "object-order-set"), false);
assert.equal(sceneBEditOperations.some((operation) => operation.kind === "document-field-set" && operation.field === "activeSceneId"), false);
assert.equal(
  sceneBEditOperations.some((operation) => operation.kind === "object-field-set" && operation.objectId === beta.id && operation.field === "name"),
  true,
);

console.log("collaboration crdt merge smoke passed");
