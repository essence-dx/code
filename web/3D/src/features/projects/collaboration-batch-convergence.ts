import type { ProjectCollaborationClientCursor } from "./collaboration-client-cursors";
import type { ProjectCollaborationOperationBatchSummary } from "./collaboration-types";

export interface ProjectCollaborationBatchConvergenceIssue {
  actualSequence?: number;
  clientId: string;
  expectedSequence?: number;
  kind: "client-sequence-duplicate" | "client-sequence-gap";
  label: string;
  userName: string;
}

export interface ProjectCollaborationCausalBatchPartition {
  blockedBatches: ProjectCollaborationOperationBatchSummary[];
  readyBatches: ProjectCollaborationOperationBatchSummary[];
}

function getBatchTime(batch: ProjectCollaborationOperationBatchSummary) {
  return new Date(batch.createdAt).getTime();
}

function getBatchIdentity(batch: ProjectCollaborationOperationBatchSummary) {
  return batch.causalId || batch.batchId || batch.id;
}

function compareBatchIdentity(left: ProjectCollaborationOperationBatchSummary, right: ProjectCollaborationOperationBatchSummary) {
  const identityComparison = getBatchIdentity(left).localeCompare(getBatchIdentity(right));

  return identityComparison || left.id.localeCompare(right.id);
}

function hasClientSequence(batch: ProjectCollaborationOperationBatchSummary) {
  return batch.clientSequence > 0;
}

function compareProjectCollaborationOperationBatches(left: ProjectCollaborationOperationBatchSummary, right: ProjectCollaborationOperationBatchSummary) {
  if (left.clientId === right.clientId && hasClientSequence(left) && hasClientSequence(right) && left.clientSequence !== right.clientSequence) {
    return left.clientSequence - right.clientSequence;
  }

  const timeComparison = getBatchTime(left) - getBatchTime(right);

  if (timeComparison !== 0) {
    return timeComparison;
  }

  return compareBatchIdentity(left, right);
}

function sortProjectCollaborationOperationBatches(batches: ProjectCollaborationOperationBatchSummary[]) {
  return [...batches].sort(compareProjectCollaborationOperationBatches);
}

function formatCollaborator(batch: ProjectCollaborationOperationBatchSummary) {
  return batch.userName || batch.userEmail || batch.clientId;
}

function getCausalReplayKey(batch: ProjectCollaborationOperationBatchSummary) {
  if (!hasClientSequence(batch)) {
    return `batch:${batch.id}`;
  }

  return `causal:${batch.projectId}:${batch.clientId}:${batch.clientSequence}`;
}

function getCausalReplayPayloadSignature(batch: ProjectCollaborationOperationBatchSummary) {
  return JSON.stringify({
    baseUpdatedAt: batch.baseUpdatedAt,
    clientId: batch.clientId,
    clientSequence: batch.clientSequence,
    operationCount: batch.operationCount,
    operations: batch.operations,
    projectId: batch.projectId,
  });
}

function isEquivalentCausalReplay(left: ProjectCollaborationOperationBatchSummary, right: ProjectCollaborationOperationBatchSummary) {
  return getCausalReplayKey(left) === getCausalReplayKey(right) && getCausalReplayPayloadSignature(left) === getCausalReplayPayloadSignature(right);
}

export function normalizeProjectCollaborationOperationBatchReplays(batches: ProjectCollaborationOperationBatchSummary[]) {
  const normalizedBatches: ProjectCollaborationOperationBatchSummary[] = [];
  const batchesByReplayKey = new Map<string, ProjectCollaborationOperationBatchSummary>();

  for (const batch of sortProjectCollaborationOperationBatches(batches)) {
    const replayKey = getCausalReplayKey(batch);
    const existingBatch = batchesByReplayKey.get(replayKey);

    if (!existingBatch) {
      batchesByReplayKey.set(replayKey, batch);
      normalizedBatches.push(batch);
      continue;
    }

    if (!isEquivalentCausalReplay(existingBatch, batch)) {
      normalizedBatches.push(batch);
    }
  }

  return normalizedBatches;
}

export function sortProjectCollaborationOperationBatchesForConvergence(batches: ProjectCollaborationOperationBatchSummary[]) {
  return sortProjectCollaborationOperationBatches(normalizeProjectCollaborationOperationBatchReplays(batches));
}

export function partitionProjectCollaborationBatchesByCausalReadiness(
  batches: ProjectCollaborationOperationBatchSummary[],
): ProjectCollaborationCausalBatchPartition {
  const sortedBatches = sortProjectCollaborationOperationBatchesForConvergence(batches);
  const blockedBatches: ProjectCollaborationOperationBatchSummary[] = [];
  const readyBatches: ProjectCollaborationOperationBatchSummary[] = [];
  const clientStates = new Map<string, { blocked: boolean; lastReadySequence: number | null; sequences: Set<number> }>();

  for (const batch of sortedBatches) {
    if (!hasClientSequence(batch)) {
      readyBatches.push(batch);
      continue;
    }

    const clientState = clientStates.get(batch.clientId) ?? { blocked: false, lastReadySequence: null, sequences: new Set<number>() };
    const hasDuplicateSequence = clientState.sequences.has(batch.clientSequence);
    const hasSequenceGap = clientState.lastReadySequence !== null && batch.clientSequence > clientState.lastReadySequence + 1;

    clientState.sequences.add(batch.clientSequence);

    if (clientState.blocked || hasDuplicateSequence || hasSequenceGap) {
      clientState.blocked = true;
      blockedBatches.push(batch);
      clientStates.set(batch.clientId, clientState);
      continue;
    }

    clientState.lastReadySequence = Math.max(clientState.lastReadySequence ?? batch.clientSequence, batch.clientSequence);
    readyBatches.push(batch);
    clientStates.set(batch.clientId, clientState);
  }

  return {
    blockedBatches,
    readyBatches,
  };
}

export function evaluateProjectCollaborationBatchConvergence(batches: ProjectCollaborationOperationBatchSummary[]) {
  const issues: ProjectCollaborationBatchConvergenceIssue[] = [];
  const batchesByClient = new Map<string, ProjectCollaborationOperationBatchSummary[]>();

  for (const batch of batches) {
    if (!hasClientSequence(batch)) {
      continue;
    }

    const clientBatches = batchesByClient.get(batch.clientId) ?? [];
    clientBatches.push(batch);
    batchesByClient.set(batch.clientId, clientBatches);
  }

  for (const [clientId, clientBatches] of batchesByClient) {
    const sortedBatches = sortProjectCollaborationOperationBatchesForConvergence(clientBatches);
    const batchesBySequence = new Map<number, ProjectCollaborationOperationBatchSummary>();
    let previousSequence: number | null = null;

    for (const batch of sortedBatches) {
      const existingBatch = batchesBySequence.get(batch.clientSequence);

      if (existingBatch && existingBatch.id !== batch.id) {
        issues.push({
          actualSequence: batch.clientSequence,
          clientId,
          kind: "client-sequence-duplicate",
          label: `${formatCollaborator(batch)} has duplicate remote batch sequence ${batch.clientSequence}.`,
          userName: formatCollaborator(batch),
        });
        continue;
      }

      batchesBySequence.set(batch.clientSequence, batch);

      if (previousSequence !== null && batch.clientSequence > previousSequence + 1) {
        issues.push({
          actualSequence: batch.clientSequence,
          clientId,
          expectedSequence: previousSequence + 1,
          kind: "client-sequence-gap",
          label: `${formatCollaborator(batch)} is missing remote batch sequence ${previousSequence + 1} before ${batch.clientSequence}.`,
          userName: formatCollaborator(batch),
        });
      }

      previousSequence = Math.max(previousSequence ?? batch.clientSequence, batch.clientSequence);
    }
  }

  return issues;
}

export function createProjectCollaborationCausalRecoveryCursors(issues: ProjectCollaborationBatchConvergenceIssue[]): ProjectCollaborationClientCursor[] {
  const cursors = new Map<string, number>();

  for (const issue of issues) {
    if (issue.kind !== "client-sequence-gap" || !issue.expectedSequence) {
      continue;
    }

    const afterSequence = Math.max(0, issue.expectedSequence - 1);
    const currentAfterSequence = cursors.get(issue.clientId);

    cursors.set(issue.clientId, currentAfterSequence === undefined ? afterSequence : Math.min(currentAfterSequence, afterSequence));
  }

  return [...cursors.entries()]
    .map(([clientId, afterSequence]) => ({ afterSequence, clientId }))
    .sort((left, right) => left.clientId.localeCompare(right.clientId));
}
