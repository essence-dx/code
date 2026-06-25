import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createProjectCollaborationClientCursors,
  mergeProjectCollaborationClientCursors,
  parseProjectCollaborationClientCursorsParam,
} from "@/features/projects/collaboration-client-cursors";
import { createProjectCollaborationReplayCheckpoint } from "@/features/projects/collaboration-replay-checkpoint";
import {
  createProjectCollaborationOperationPublishAcknowledgement,
  createProjectCollaborationOperationPublishRejection,
  projectCollaborationOperationQuerySchema,
  projectCollaborationOperationPublishRequestSchema,
} from "@/features/projects/collaboration-types";
import {
  createProjectCollaborationOperationBatch,
  listProjectCollaborationOperationBatches,
} from "@/features/projects/server/project-collaboration-operation-service";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function parseOptionalDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = projectCollaborationOperationQuerySchema.safeParse({
    after: new URL(request.url).searchParams.get("after") ?? undefined,
    clientCursors: new URL(request.url).searchParams.get("clientCursors") ?? undefined,
  });

  if (!query.success) {
    return Response.json({ error: "Invalid collaboration operation query" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const requestClientCursors = parseProjectCollaborationClientCursorsParam(query.data.clientCursors);
  const result = await listProjectCollaborationOperationBatches({
    after: parseOptionalDate(query.data.after),
    clientCursors: requestClientCursors,
    projectId,
    userId,
  });

  if ("error" in result) {
    const { status, ...payload } = result;
    return Response.json(payload, { status });
  }

  const clientCursors = mergeProjectCollaborationClientCursors(
    requestClientCursors,
    createProjectCollaborationClientCursors(result.operationBatches),
  );

  return Response.json({
    ...result,
    clientCursors,
    replayCheckpoint: createProjectCollaborationReplayCheckpoint({
      clientCursors,
      operationBatches: result.operationBatches,
      previousStreamCursor: query.data.after ?? null,
    }),
  });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = projectCollaborationOperationPublishRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid collaboration operation payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await createProjectCollaborationOperationBatch({
    baseUpdatedAt: parseOptionalDate(payload.data.baseUpdatedAt),
    batchId: payload.data.batchId,
    causalId: payload.data.causalId,
    clientId: payload.data.clientId,
    clientSequence: payload.data.clientSequence,
    operations: payload.data.operations as SceneCollaborationOperation[],
    projectId,
    userId,
  });

  if ("error" in result) {
    const { status, ...errorPayload } = result;
    return Response.json(
      {
        ...errorPayload,
        publishRejection: payload.data.requestId
          ? createProjectCollaborationOperationPublishRejection(payload.data.requestId, result.error)
          : undefined,
      },
      { status },
    );
  }

  return Response.json({
    ...result,
    publishAcknowledgement: payload.data.requestId
      ? createProjectCollaborationOperationPublishAcknowledgement(payload.data.requestId, result.operationBatch)
      : undefined,
  });
}
