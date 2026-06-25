"use client";

import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import type { ProjectCollaborationLivePublishTransport } from "./collaboration-live-publish";
import {
  createProjectCollaborationOperationPublishEnvelope,
  createProjectCollaborationOperationPublishAcknowledgement,
  isProjectCollaborationOperationPublishAcknowledgement,
  isProjectCollaborationOperationPublishRejection,
  isProjectCollaborationOperationStreamMessage,
  type ProjectCollaborationOperationPublishAcknowledgement,
  type ProjectCollaborationOperationPublishEnvelope,
  type ProjectCollaborationOperationBatchResponse,
} from "./collaboration-types";
import { getProjectCollaborationWebSocketChannel } from "./collaboration-websocket-channel";
import { createProjectCollaborationOperationBatch } from "./project-api";

export { createProjectCollaborationOperationPublishEnvelope };
export type { ProjectCollaborationOperationPublishEnvelope };

export interface ProjectCollaborationOperationPublishInput {
  baseUpdatedAt?: string | null;
  batchId?: string;
  causalId?: string;
  clientId: string;
  clientSequence?: number;
  operations: SceneCollaborationOperation[];
  requestId?: string;
}

export interface ProjectCollaborationOperationPublishResult {
  acknowledgement: ProjectCollaborationOperationPublishAcknowledgement;
  fallbackReason?: string;
  response: ProjectCollaborationOperationBatchResponse;
  transport: ProjectCollaborationLivePublishTransport;
}

const collaborationWebSocketUrl = process.env.NEXT_PUBLIC_ESSENCE_COLLABORATION_WS_URL;
const websocketPublishAckTimeoutMs = 1_800;

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `publish-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseMessage(data: string) {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}

function createPublishWebSocketUrl(projectId: string) {
  if (!collaborationWebSocketUrl) {
    return null;
  }

  try {
    const url = new URL(collaborationWebSocketUrl);

    url.searchParams.set("projectId", projectId);
    return url.toString();
  } catch {
    return null;
  }
}

function createPublishSuccessResponse(
  requestId: string,
  operationBatch: ProjectCollaborationOperationBatchResponse["operationBatch"],
): ProjectCollaborationOperationBatchResponse {
  return {
    operationBatch,
    publishAcknowledgement: createProjectCollaborationOperationPublishAcknowledgement(requestId, operationBatch),
  };
}

function resolvePublishMessage(
  message: unknown,
  request: ProjectCollaborationOperationPublishEnvelope,
  input: ProjectCollaborationOperationPublishInput,
  resolve: (response: ProjectCollaborationOperationBatchResponse) => void,
  reject: (reason: Error) => void,
) {
  if (isProjectCollaborationOperationPublishAcknowledgement(message) && message.requestId === request.requestId) {
    resolve({ operationBatch: message.operationBatch, publishAcknowledgement: message });
    return true;
  }

  if (isProjectCollaborationOperationPublishRejection(message) && message.requestId === request.requestId) {
    reject(new Error(message.error));
    return true;
  }

  if (isProjectCollaborationOperationStreamMessage(message)) {
    const operationBatch = message.operationBatches.find((batch) => batch.batchId === input.batchId);

    if (operationBatch) {
      resolve(createPublishSuccessResponse(request.requestId, operationBatch));
      return true;
    }
  }

  return false;
}

async function publishProjectCollaborationOperationBatchViaOpenChannel(
  projectId: string,
  input: ProjectCollaborationOperationPublishInput,
): Promise<ProjectCollaborationOperationBatchResponse> {
  const channel = getProjectCollaborationWebSocketChannel(projectId);

  if (!channel) {
    throw new Error("No open WebSocket collaboration channel is available.");
  }

  const request = createProjectCollaborationOperationPublishEnvelope(projectId, input, input.requestId ?? createRequestId());

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Open WebSocket publish acknowledgement timed out.")));
    }, websocketPublishAckTimeoutMs);

    const unsubscribe = channel.subscribe((message) => {
      resolvePublishMessage(
        message,
        request,
        input,
        (response) => finish(() => resolve(response)),
        (error) => finish(() => reject(error)),
      );
    });

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      unsubscribe();
      callback();
    }

    if (!channel.send(request)) {
      finish(() => reject(new Error("Open WebSocket collaboration channel is not ready.")));
    }
  });
}

async function publishProjectCollaborationOperationBatchViaWebSocket(
  projectId: string,
  input: ProjectCollaborationOperationPublishInput,
): Promise<ProjectCollaborationOperationBatchResponse> {
  if (typeof window === "undefined" || typeof window.WebSocket === "undefined") {
    throw new Error("WebSocket publishing is not available in this browser context.");
  }

  const url = createPublishWebSocketUrl(projectId);

  if (!url) {
    throw new Error("WebSocket publishing is not configured.");
  }

  const request = createProjectCollaborationOperationPublishEnvelope(projectId, input, input.requestId ?? createRequestId());

  return new Promise((resolve, reject) => {
    const socket = new window.WebSocket(url);
    let settled = false;
    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("WebSocket publish acknowledgement timed out.")));
    }, websocketPublishAckTimeoutMs);

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);

      if (socket.readyState === window.WebSocket.CONNECTING || socket.readyState === window.WebSocket.OPEN) {
        socket.close();
      }

      callback();
    }

    socket.onopen = () => {
      socket.send(JSON.stringify(request));
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      const parsed = parseMessage(event.data);
      resolvePublishMessage(
        parsed,
        request,
        input,
        (response) => finish(() => resolve(response)),
        (error) => finish(() => reject(error)),
      );
    };

    socket.onerror = () => {
      finish(() => reject(new Error("WebSocket publish failed.")));
    };

    socket.onclose = () => {
      finish(() => reject(new Error("WebSocket publish connection closed.")));
    };
  });
}

export async function publishProjectCollaborationOperationBatch(
  projectId: string,
  input: ProjectCollaborationOperationPublishInput,
): Promise<ProjectCollaborationOperationPublishResult> {
  const canTryWebSocket = Boolean(createPublishWebSocketUrl(projectId));
  const requestId = input.requestId ?? createRequestId();
  const inputWithRequestId = { ...input, requestId };

  if (canTryWebSocket) {
    try {
      const response = await publishProjectCollaborationOperationBatchViaOpenChannel(projectId, inputWithRequestId);

      return {
        acknowledgement:
          response.publishAcknowledgement ??
          createProjectCollaborationOperationPublishAcknowledgement(requestId, response.operationBatch),
        response,
        transport: "websocket",
      };
    } catch (error) {
      try {
        const response = await publishProjectCollaborationOperationBatchViaWebSocket(projectId, inputWithRequestId);

        return {
          acknowledgement:
            response.publishAcknowledgement ??
            createProjectCollaborationOperationPublishAcknowledgement(requestId, response.operationBatch),
          fallbackReason: error instanceof Error ? error.message : "Open WebSocket publish failed.",
          response,
          transport: "websocket",
        };
      } catch (socketError) {
        const response = await createProjectCollaborationOperationBatch(projectId, inputWithRequestId);

        return {
          acknowledgement:
            response.publishAcknowledgement ??
            createProjectCollaborationOperationPublishAcknowledgement(requestId, response.operationBatch),
          fallbackReason: socketError instanceof Error ? socketError.message : "WebSocket publish failed.",
          response,
          transport: "api",
        };
      }
    }
  }

  const response = await createProjectCollaborationOperationBatch(projectId, inputWithRequestId);

  return {
    acknowledgement:
      response.publishAcknowledgement ??
      createProjectCollaborationOperationPublishAcknowledgement(requestId, response.operationBatch),
    response,
    transport: "api",
  };
}
