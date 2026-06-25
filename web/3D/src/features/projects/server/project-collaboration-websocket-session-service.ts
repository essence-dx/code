import {
  createProjectCollaborationClientCursors,
  mergeProjectCollaborationClientCursors,
  parseProjectCollaborationClientCursorsParam,
  type ProjectCollaborationClientCursor,
} from "@/features/projects/collaboration-client-cursors";
import { createProjectCollaborationReplayCheckpoint } from "@/features/projects/collaboration-replay-checkpoint";
import {
  projectCollaborationOperationQuerySchema,
  type ProjectCollaborationOperationBatchSummary,
  type ProjectCollaborationOperationStreamMessage,
  type ProjectCollaborationOperationTransportControlMessage,
  type ProjectCollaborationOperationWebSocketMessage,
} from "@/features/projects/collaboration-types";
import { listProjectCollaborationOperationBatches } from "./project-collaboration-operation-service";
import { handleProjectCollaborationWebSocketPublish } from "./project-collaboration-websocket-publish-service";

export interface ProjectCollaborationWebSocketSession {
  clientCursors: ProjectCollaborationClientCursor[];
  cursor: Date | null;
  projectId: string;
  replayCursor: string | null;
  sentBatchIds: Set<string>;
  userId: string;
}

export interface CreateProjectCollaborationWebSocketSessionInput {
  after?: string | null;
  clientCursors?: string | null;
  projectId: string;
  userId: string;
}

export type ProjectCollaborationWebSocketSessionResult =
  | {
      messages: ProjectCollaborationOperationWebSocketMessage[];
      session: ProjectCollaborationWebSocketSession;
    }
  | {
      error: string;
      status: 400 | 403 | 404;
    };

export type ProjectCollaborationWebSocketSessionMessageResult =
  | {
      messages: ProjectCollaborationOperationWebSocketMessage[];
      session: ProjectCollaborationWebSocketSession;
    }
  | {
      error: string;
      status: 403 | 404;
    };

const cursorOverlapMs = 1;

function parseOptionalDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function createOverlappingCursor(value: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Math.max(0, date.getTime() - cursorOverlapMs));
}

function mergeSessionClientCursors(
  session: ProjectCollaborationWebSocketSession,
  operationBatches: ProjectCollaborationOperationBatchSummary[],
) {
  session.clientCursors = mergeProjectCollaborationClientCursors(
    session.clientCursors,
    createProjectCollaborationClientCursors(operationBatches),
  );
}

function advanceSessionCursor(
  session: ProjectCollaborationWebSocketSession,
  operationBatches: ProjectCollaborationOperationBatchSummary[],
) {
  const lastBatch = operationBatches.at(-1);

  if (!lastBatch) {
    return;
  }

  session.replayCursor = lastBatch.createdAt;
  session.cursor = createOverlappingCursor(lastBatch.createdAt);
}

function markBatchesSent(
  session: ProjectCollaborationWebSocketSession,
  operationBatches: ProjectCollaborationOperationBatchSummary[],
) {
  for (const batch of operationBatches) {
    session.sentBatchIds.add(batch.id);
  }
}

function createControlMessage(
  session: ProjectCollaborationWebSocketSession,
  type: ProjectCollaborationOperationTransportControlMessage["type"],
): ProjectCollaborationOperationTransportControlMessage {
  const checkedAt = new Date().toISOString();

  return {
    checkedAt,
    clientCursors: session.clientCursors,
    replayCheckpoint: createProjectCollaborationReplayCheckpoint({
      checkedAt,
      clientCursors: session.clientCursors,
      previousStreamCursor: session.replayCursor,
    }),
    type,
  };
}

function createOperationBatchesMessage(
  session: ProjectCollaborationWebSocketSession,
  operationBatches: ProjectCollaborationOperationBatchSummary[],
): ProjectCollaborationOperationStreamMessage {
  const checkedAt = new Date().toISOString();

  return {
    checkedAt,
    clientCursors: session.clientCursors,
    operationBatches,
    replayCheckpoint: createProjectCollaborationReplayCheckpoint({
      checkedAt,
      clientCursors: session.clientCursors,
      operationBatches,
      previousStreamCursor: session.replayCursor,
    }),
  };
}

function acknowledgeOperationBatches(
  session: ProjectCollaborationWebSocketSession,
  operationBatches: ProjectCollaborationOperationBatchSummary[],
) {
  mergeSessionClientCursors(session, operationBatches);
  advanceSessionCursor(session, operationBatches);
  markBatchesSent(session, operationBatches);
}

export async function createProjectCollaborationWebSocketSession(
  input: CreateProjectCollaborationWebSocketSessionInput,
): Promise<ProjectCollaborationWebSocketSessionResult> {
  const query = projectCollaborationOperationQuerySchema.safeParse({
    after: input.after ?? undefined,
    clientCursors: input.clientCursors ?? undefined,
  });

  if (!query.success) {
    return { error: "Invalid collaboration socket query", status: 400 };
  }

  const initialClientCursors = parseProjectCollaborationClientCursorsParam(query.data.clientCursors);
  const result = await listProjectCollaborationOperationBatches({
    after: createOverlappingCursor(parseOptionalDate(query.data.after)),
    clientCursors: initialClientCursors,
    projectId: input.projectId,
    userId: input.userId,
  });

  if ("error" in result) {
    return result;
  }

  const session: ProjectCollaborationWebSocketSession = {
    clientCursors: initialClientCursors,
    cursor: createOverlappingCursor(parseOptionalDate(query.data.after)),
    projectId: input.projectId,
    replayCursor: query.data.after ?? null,
    sentBatchIds: new Set(),
    userId: input.userId,
  };

  acknowledgeOperationBatches(session, result.operationBatches);

  const messages: ProjectCollaborationOperationWebSocketMessage[] = [createControlMessage(session, "connected")];

  if (result.operationBatches.length > 0) {
    messages.push(createOperationBatchesMessage(session, result.operationBatches));
  }

  return { messages, session };
}

export async function refreshProjectCollaborationWebSocketSession(
  session: ProjectCollaborationWebSocketSession,
): Promise<ProjectCollaborationWebSocketSessionMessageResult> {
  const result = await listProjectCollaborationOperationBatches({
    after: session.cursor,
    clientCursors: session.clientCursors,
    projectId: session.projectId,
    userId: session.userId,
  });

  if ("error" in result) {
    return result;
  }

  const newBatches = result.operationBatches.filter((batch) => !session.sentBatchIds.has(batch.id));
  acknowledgeOperationBatches(session, result.operationBatches);

  return {
    messages: newBatches.length > 0 ? [createOperationBatchesMessage(session, newBatches)] : [createControlMessage(session, "heartbeat")],
    session,
  };
}

export async function handleProjectCollaborationWebSocketSessionMessage(
  session: ProjectCollaborationWebSocketSession,
  message: unknown,
): Promise<ProjectCollaborationWebSocketSessionMessageResult> {
  const publishResult = await handleProjectCollaborationWebSocketPublish({
    envelope: message,
    projectId: session.projectId,
    userId: session.userId,
  });

  if (publishResult.type === "rejected") {
    return { messages: [publishResult.message], session };
  }

  const operationBatch = publishResult.message.operationBatch;
  acknowledgeOperationBatches(session, [operationBatch]);

  return {
    messages: [publishResult.message, createOperationBatchesMessage(session, [operationBatch])],
    session,
  };
}
