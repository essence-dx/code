import {
  createProjectCollaborationOperationPublishAcknowledgement,
  createProjectCollaborationOperationPublishRejection,
  projectCollaborationOperationPublishEnvelopeSchema,
  type ProjectCollaborationOperationPublishAcknowledgement,
  type ProjectCollaborationOperationPublishEnvelope,
  type ProjectCollaborationOperationPublishRejection,
} from "@/features/projects/collaboration-types";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import { createProjectCollaborationOperationBatch } from "./project-collaboration-operation-service";

export interface ProjectCollaborationWebSocketPublishInput {
  envelope: unknown;
  projectId?: string;
  userId: string;
}

export type ProjectCollaborationWebSocketPublishResult =
  | {
      message: ProjectCollaborationOperationPublishAcknowledgement;
      status: 200;
      type: "acknowledged";
    }
  | {
      message: ProjectCollaborationOperationPublishRejection;
      status: 400 | 403 | 404 | 409;
      type: "rejected";
    };

function extractRequestId(envelope: unknown) {
  if (typeof envelope === "object" && envelope !== null && "requestId" in envelope) {
    const requestId = envelope.requestId;

    if (typeof requestId === "string" && requestId.trim().length > 0) {
      return requestId;
    }
  }

  return "invalid-request";
}

function rejectPublish(
  requestId: string,
  error: string,
  status: 400 | 403 | 404 | 409,
): ProjectCollaborationWebSocketPublishResult {
  return {
    message: createProjectCollaborationOperationPublishRejection(requestId, error),
    status,
    type: "rejected",
  };
}

function parseBaseUpdatedAt(envelope: ProjectCollaborationOperationPublishEnvelope) {
  return envelope.input.baseUpdatedAt ? new Date(envelope.input.baseUpdatedAt) : null;
}

export async function handleProjectCollaborationWebSocketPublish(
  input: ProjectCollaborationWebSocketPublishInput,
): Promise<ProjectCollaborationWebSocketPublishResult> {
  const parsedEnvelope = projectCollaborationOperationPublishEnvelopeSchema.safeParse(input.envelope);
  const requestId = parsedEnvelope.success ? parsedEnvelope.data.requestId : extractRequestId(input.envelope);

  if (!parsedEnvelope.success) {
    return rejectPublish(requestId, "Invalid collaboration publish envelope.", 400);
  }

  const envelope = parsedEnvelope.data;

  if (input.projectId && envelope.projectId !== input.projectId) {
    return rejectPublish(requestId, "Collaboration publish project did not match the socket session.", 403);
  }

  if (input.userId.trim().length === 0) {
    return rejectPublish(requestId, "Collaboration publish requires an authenticated user.", 403);
  }

  const result = await createProjectCollaborationOperationBatch({
    baseUpdatedAt: parseBaseUpdatedAt(envelope),
    batchId: envelope.input.batchId,
    causalId: envelope.input.causalId,
    clientId: envelope.input.clientId,
    clientSequence: envelope.input.clientSequence,
    operations: envelope.input.operations as SceneCollaborationOperation[],
    projectId: envelope.projectId,
    userId: input.userId,
  });

  if ("error" in result) {
    return rejectPublish(requestId, result.error, result.status);
  }

  return {
    message: createProjectCollaborationOperationPublishAcknowledgement(requestId, result.operationBatch),
    status: 200,
    type: "acknowledged",
  };
}
