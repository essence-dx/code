import type { SceneCollaborationOperationConflict } from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import type { ProjectCollaborationOperationBatchSummary } from "./collaboration-types";

function getBatchSignature(batch: ProjectCollaborationOperationBatchSummary) {
  return [batch.id, batch.causalId, batch.clientId, batch.clientSequence, batch.operationCount].join(":");
}

function getConflictSignature(conflict: SceneCollaborationOperationConflict) {
  return [conflict.operationKind, conflict.objectId ?? "document", conflict.field ?? "none", conflict.label].join(":");
}

export function createProjectCollaborationReadyApplySignature(input: {
  plannedOperations?: SceneCollaborationOperation[];
  readyBatches: ProjectCollaborationOperationBatchSummary[];
  remoteConflicts: SceneCollaborationOperationConflict[];
}) {
  const batchSignature = input.readyBatches.map(getBatchSignature).join("|");
  const conflictSignature = input.remoteConflicts.map(getConflictSignature).join("|");
  const operationSignature = input.plannedOperations ? JSON.stringify(input.plannedOperations) : "";

  return `${batchSignature}::${operationSignature}::${conflictSignature}`;
}
