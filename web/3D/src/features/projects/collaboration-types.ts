import { z } from "zod";
import {
  sceneCollaborationOperationSchema,
  type SceneCollaborationOperation,
} from "@/features/editor/scene/scene-collaboration-operations";
import { isProjectCollaborationClientCursorArray, type ProjectCollaborationClientCursor } from "./collaboration-client-cursors";
import {
  isProjectCollaborationReplayCheckpoint,
  type ProjectCollaborationReplayCheckpoint,
} from "./collaboration-replay-checkpoint";

export const projectCollaborationOperationBatchSchema = z.object({
  baseUpdatedAt: z.string().datetime().nullable().optional(),
  batchId: z.string().trim().min(8).max(160).optional(),
  causalId: z.string().trim().min(1).max(260).optional(),
  clientId: z.string().trim().min(1).max(120),
  clientSequence: z.number().int().positive().max(2_147_483_647).optional(),
  operations: z.array(sceneCollaborationOperationSchema).min(1).max(200),
});

export const projectCollaborationOperationPublishRequestSchema = projectCollaborationOperationBatchSchema.extend({
  requestId: z.string().trim().min(1).max(160).optional(),
});

export const projectCollaborationOperationPublishEnvelopeSchema = z
  .object({
    input: projectCollaborationOperationPublishRequestSchema,
    projectId: z.string().trim().min(1).max(160),
    requestId: z.string().trim().min(1).max(160),
    type: z.literal("publish-operation-batch"),
  })
  .superRefine((envelope, context) => {
    if (envelope.input.requestId && envelope.input.requestId !== envelope.requestId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Publish envelope request id must match the payload request id.",
        path: ["input", "requestId"],
      });
    }
  });

export const projectCollaborationOperationQuerySchema = z.object({
  after: z.string().datetime().optional(),
  clientCursors: z.string().trim().max(12_000).optional(),
});

export type ProjectCollaborationOperationPublishRequest = z.infer<
  typeof projectCollaborationOperationPublishRequestSchema
>;

export interface ProjectCollaborationOperationBatchSummary {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  batchId: string;
  clientId: string;
  clientSequence: number;
  causalId: string;
  baseUpdatedAt: string | null;
  operations: SceneCollaborationOperation[];
  operationCount: number;
  createdAt: string;
}

export interface ProjectCollaborationOperationsResponse {
  clientCursors: ProjectCollaborationClientCursor[];
  operationBatches: ProjectCollaborationOperationBatchSummary[];
  replayCheckpoint: ProjectCollaborationReplayCheckpoint;
}

export interface ProjectCollaborationOperationBatchResponse {
  operationBatch: ProjectCollaborationOperationBatchSummary;
  publishAcknowledgement?: ProjectCollaborationOperationPublishAcknowledgement;
  publishRejection?: ProjectCollaborationOperationPublishRejection;
}

export interface ProjectCollaborationOperationPublishAcknowledgement {
  operationBatch: ProjectCollaborationOperationBatchSummary;
  requestId: string;
  type: "operation-batch-published";
}

export interface ProjectCollaborationOperationPublishRejection {
  error: string;
  requestId: string;
  type: "operation-batch-publish-error";
}

export interface ProjectCollaborationOperationPublishEnvelope {
  input: ProjectCollaborationOperationPublishRequest;
  projectId: string;
  requestId: string;
  type: "publish-operation-batch";
}

export interface ProjectCollaborationOperationTransportControlMessage {
  checkedAt: string;
  clientCursors?: ProjectCollaborationClientCursor[];
  replayCheckpoint?: ProjectCollaborationReplayCheckpoint;
  type: "connected" | "heartbeat";
}

export interface ProjectCollaborationOperationStreamMessage {
  checkedAt: string;
  clientCursors?: ProjectCollaborationClientCursor[];
  operationBatches: ProjectCollaborationOperationBatchSummary[];
  replayCheckpoint?: ProjectCollaborationReplayCheckpoint;
}

export type ProjectCollaborationOperationWebSocketMessage =
  | ProjectCollaborationOperationPublishAcknowledgement
  | ProjectCollaborationOperationPublishRejection
  | ProjectCollaborationOperationStreamMessage
  | ProjectCollaborationOperationTransportControlMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProjectCollaborationOperationBatchSummary(value: unknown): value is ProjectCollaborationOperationBatchSummary {
  return isRecord(value) && typeof value.id === "string" && typeof value.batchId === "string" && Array.isArray(value.operations);
}

export function createProjectCollaborationOperationPublishAcknowledgement(
  requestId: string,
  operationBatch: ProjectCollaborationOperationBatchSummary,
): ProjectCollaborationOperationPublishAcknowledgement {
  return {
    operationBatch,
    requestId,
    type: "operation-batch-published",
  };
}

export function createProjectCollaborationOperationPublishRejection(
  requestId: string,
  error: string,
): ProjectCollaborationOperationPublishRejection {
  return {
    error,
    requestId,
    type: "operation-batch-publish-error",
  };
}

export function createProjectCollaborationOperationPublishEnvelope(
  projectId: string,
  input: ProjectCollaborationOperationPublishRequest,
  requestId: string,
): ProjectCollaborationOperationPublishEnvelope {
  return {
    input: { ...input, requestId },
    projectId,
    requestId,
    type: "publish-operation-batch",
  };
}

export function isProjectCollaborationOperationPublishEnvelope(
  value: unknown,
): value is ProjectCollaborationOperationPublishEnvelope {
  return projectCollaborationOperationPublishEnvelopeSchema.safeParse(value).success;
}

export function isProjectCollaborationOperationPublishAcknowledgement(
  value: unknown,
): value is ProjectCollaborationOperationPublishAcknowledgement {
  return (
    isRecord(value) &&
    value.type === "operation-batch-published" &&
    typeof value.requestId === "string" &&
    isProjectCollaborationOperationBatchSummary(value.operationBatch)
  );
}

export function isProjectCollaborationOperationPublishRejection(
  value: unknown,
): value is ProjectCollaborationOperationPublishRejection {
  return (
    isRecord(value) &&
    value.type === "operation-batch-publish-error" &&
    typeof value.requestId === "string" &&
    typeof value.error === "string"
  );
}

export function isProjectCollaborationOperationTransportControlMessage(
  value: unknown,
): value is ProjectCollaborationOperationTransportControlMessage {
  return (
    isRecord(value) &&
    (value.type === "connected" || value.type === "heartbeat") &&
    typeof value.checkedAt === "string" &&
    (!("clientCursors" in value) || isProjectCollaborationClientCursorArray(value.clientCursors)) &&
    (!("replayCheckpoint" in value) || isProjectCollaborationReplayCheckpoint(value.replayCheckpoint))
  );
}

export function isProjectCollaborationOperationStreamMessage(value: unknown): value is ProjectCollaborationOperationStreamMessage {
  return (
    isRecord(value) &&
    typeof value.checkedAt === "string" &&
    (!("clientCursors" in value) || isProjectCollaborationClientCursorArray(value.clientCursors)) &&
    (!("replayCheckpoint" in value) || isProjectCollaborationReplayCheckpoint(value.replayCheckpoint)) &&
    Array.isArray(value.operationBatches) &&
    value.operationBatches.every((batch) => {
      return isProjectCollaborationOperationBatchSummary(batch) && typeof batch.projectId === "string";
    })
  );
}
