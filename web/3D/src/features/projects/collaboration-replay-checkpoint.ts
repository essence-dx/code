import {
  isProjectCollaborationClientCursorArray,
  mergeProjectCollaborationClientCursors,
  type ProjectCollaborationClientCursor,
} from "./collaboration-client-cursors";

export interface ProjectCollaborationReplayCheckpoint {
  checkedAt: string;
  clientCursors: ProjectCollaborationClientCursor[];
  streamCursor: string | null;
}

export interface ProjectCollaborationReplayCheckpointSummary {
  detail: string;
  label: string;
  status: "acked" | "cold";
}

interface CreateProjectCollaborationReplayCheckpointInput {
  checkedAt?: string;
  clientCursors?: ProjectCollaborationClientCursor[];
  operationBatches?: Array<{ createdAt: string }>;
  previousStreamCursor?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCursor(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cursor = value.trim();

  return cursor ? cursor : null;
}

export function createProjectCollaborationReplayCheckpoint({
  checkedAt = new Date().toISOString(),
  clientCursors = [],
  operationBatches = [],
  previousStreamCursor = null,
}: CreateProjectCollaborationReplayCheckpointInput): ProjectCollaborationReplayCheckpoint {
  const latestBatch = operationBatches.at(-1);

  return {
    checkedAt,
    clientCursors: mergeProjectCollaborationClientCursors([], clientCursors),
    streamCursor: normalizeCursor(latestBatch?.createdAt) ?? normalizeCursor(previousStreamCursor),
  };
}

export function isProjectCollaborationReplayCheckpoint(value: unknown): value is ProjectCollaborationReplayCheckpoint {
  return (
    isRecord(value) &&
    typeof value.checkedAt === "string" &&
    isProjectCollaborationClientCursorArray(value.clientCursors) &&
    (!("streamCursor" in value) || value.streamCursor === null || typeof value.streamCursor === "string")
  );
}

export function summarizeProjectCollaborationReplayCheckpoint(
  checkpoint: ProjectCollaborationReplayCheckpoint | null,
): ProjectCollaborationReplayCheckpointSummary {
  if (!checkpoint) {
    return {
      detail: "No transport replay checkpoint acknowledged yet.",
      label: "No ack",
      status: "cold",
    };
  }

  const clientCount = checkpoint.clientCursors.length;
  const parts = [
    checkpoint.streamCursor ? "stream cursor" : null,
    clientCount ? `${clientCount} causal ${clientCount === 1 ? "frontier" : "frontiers"}` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    detail: `Transport acknowledged ${parts.join(" and ") || "an empty replay checkpoint"}.`,
    label: "Replay ack",
    status: "acked",
  };
}
