import type { ProjectCollaborationOperationBatchSummary } from "./collaboration-types";

export interface ProjectCollaborationClientCursor {
  afterSequence: number;
  clientId: string;
}

export interface ProjectCollaborationClientCursorSummary {
  clientCount: number;
  detail: string;
  highestSequence: number;
  label: string;
  status: "empty" | "tracking";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeClientCursor(value: unknown): ProjectCollaborationClientCursor | null {
  if (!isRecord(value) || typeof value.clientId !== "string" || typeof value.afterSequence !== "number") {
    return null;
  }

  if (!Number.isInteger(value.afterSequence) || value.afterSequence < 0 || value.afterSequence > 2_147_483_647) {
    return null;
  }

  const clientId = value.clientId.trim();

  if (!clientId || clientId.length > 120) {
    return null;
  }

  return {
    afterSequence: value.afterSequence,
    clientId,
  };
}

export function createProjectCollaborationClientCursors(batches: ProjectCollaborationOperationBatchSummary[]) {
  const cursors = new Map<string, number>();

  for (const batch of batches) {
    if (batch.clientSequence <= 0) {
      continue;
    }

    cursors.set(batch.clientId, Math.max(cursors.get(batch.clientId) ?? 0, batch.clientSequence));
  }

  return [...cursors.entries()]
    .map(([clientId, afterSequence]) => ({ afterSequence, clientId }))
    .sort((left, right) => left.clientId.localeCompare(right.clientId));
}

export function mergeProjectCollaborationClientCursors(
  current: ProjectCollaborationClientCursor[],
  incoming: ProjectCollaborationClientCursor[],
) {
  const cursors = new Map(current.map((cursor) => [cursor.clientId, cursor.afterSequence]));

  for (const cursor of incoming) {
    cursors.set(cursor.clientId, Math.max(cursors.get(cursor.clientId) ?? 0, cursor.afterSequence));
  }

  return [...cursors.entries()]
    .map(([clientId, afterSequence]) => ({ afterSequence, clientId }))
    .sort((left, right) => left.clientId.localeCompare(right.clientId));
}

export function encodeProjectCollaborationClientCursors(cursors: ProjectCollaborationClientCursor[]) {
  return JSON.stringify(cursors.slice(0, 100));
}

export function parseProjectCollaborationClientCursorsParam(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.slice(0, 100).flatMap((cursor) => {
    const normalizedCursor = normalizeClientCursor(cursor);

    return normalizedCursor ? [normalizedCursor] : [];
  });
}

export function isProjectCollaborationClientCursorArray(value: unknown): value is ProjectCollaborationClientCursor[] {
  return Array.isArray(value) && value.every((cursor) => Boolean(normalizeClientCursor(cursor)));
}

export function summarizeProjectCollaborationClientCursors(cursors: ProjectCollaborationClientCursor[]): ProjectCollaborationClientCursorSummary {
  const normalizedCursors = mergeProjectCollaborationClientCursors([], cursors);
  const clientCount = normalizedCursors.length;
  const highestSequence = normalizedCursors.reduce((highest, cursor) => Math.max(highest, cursor.afterSequence), 0);

  if (!clientCount) {
    return {
      clientCount,
      detail: "No causal client histories tracked yet.",
      highestSequence,
      label: "No frontier",
      status: "empty",
    };
  }

  return {
    clientCount,
    detail: `Causal frontier is tracking ${clientCount} client ${clientCount === 1 ? "history" : "histories"}, latest sequence ${highestSequence}.`,
    highestSequence,
    label: `${clientCount} ${clientCount === 1 ? "history" : "histories"}`,
    status: "tracking",
  };
}
