import {
  mergeProjectCollaborationClientCursors,
  type ProjectCollaborationClientCursor,
} from "./collaboration-client-cursors";
import type { ProjectCollaborationOperationBatchSummary } from "./collaboration-types";

const maxAppliedFrontierBatchIds = 200;

type AppliedFrontierBatch = Pick<ProjectCollaborationOperationBatchSummary, "clientId" | "clientSequence">;

export interface ProjectCollaborationAppliedFrontier {
  appliedBatchIds: string[];
  clientCursors: ProjectCollaborationClientCursor[];
  updatedAt: string;
}

export interface ProjectCollaborationAppliedFrontierSummary {
  appliedBatchCount: number;
  clientCount: number;
  detail: string;
  highestSequence: number;
  label: string;
  status: "empty" | "tracking";
}

interface CreateProjectCollaborationAppliedFrontierInput {
  appliedBatchIds: Iterable<string>;
  appliedBatches?: AppliedFrontierBatch[];
  previousFrontier?: ProjectCollaborationAppliedFrontier | null;
  updatedAt?: string;
}

function createClientCursorsFromAppliedBatches(batches: AppliedFrontierBatch[]) {
  const cursors = new Map<string, number>();

  for (const batch of batches) {
    const clientId = batch.clientId.trim();

    if (!clientId || batch.clientSequence <= 0) {
      continue;
    }

    cursors.set(clientId, Math.max(cursors.get(clientId) ?? 0, batch.clientSequence));
  }

  return [...cursors.entries()]
    .map(([clientId, afterSequence]) => ({ afterSequence, clientId }))
    .sort((left, right) => left.clientId.localeCompare(right.clientId));
}

function normalizeAppliedBatchIds(batchIds: Iterable<string>) {
  return [...new Set([...batchIds].map((batchId) => batchId.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .slice(-maxAppliedFrontierBatchIds);
}

export function createProjectCollaborationAppliedFrontier({
  appliedBatchIds,
  appliedBatches = [],
  previousFrontier = null,
  updatedAt = new Date().toISOString(),
}: CreateProjectCollaborationAppliedFrontierInput): ProjectCollaborationAppliedFrontier {
  return {
    appliedBatchIds: normalizeAppliedBatchIds(appliedBatchIds),
    clientCursors: mergeProjectCollaborationClientCursors(
      previousFrontier?.clientCursors ?? [],
      createClientCursorsFromAppliedBatches(appliedBatches),
    ),
    updatedAt,
  };
}

export function summarizeProjectCollaborationAppliedFrontier(
  frontier: ProjectCollaborationAppliedFrontier,
): ProjectCollaborationAppliedFrontierSummary {
  const clientCount = frontier.clientCursors.length;
  const appliedBatchCount = frontier.appliedBatchIds.length;
  const highestSequence = frontier.clientCursors.reduce((highest, cursor) => Math.max(highest, cursor.afterSequence), 0);

  if (!appliedBatchCount && !clientCount) {
    return {
      appliedBatchCount,
      clientCount,
      detail: "No applied remote batches acknowledged yet.",
      highestSequence,
      label: "No ack",
      status: "empty",
    };
  }

  const batchLabel = `${appliedBatchCount} applied ${appliedBatchCount === 1 ? "batch" : "batches"}`;

  if (!clientCount) {
    return {
      appliedBatchCount,
      clientCount,
      detail: `Applied frontier acknowledges ${batchLabel}.`,
      highestSequence,
      label: `${appliedBatchCount} ${appliedBatchCount === 1 ? "ack" : "acks"}`,
      status: "tracking",
    };
  }

  return {
    appliedBatchCount,
    clientCount,
    detail: `Applied frontier acknowledges ${batchLabel} across ${clientCount} client ${clientCount === 1 ? "history" : "histories"}, latest sequence ${highestSequence}.`,
    highestSequence,
    label: `${clientCount} ${clientCount === 1 ? "history" : "histories"}`,
    status: "tracking",
  };
}
