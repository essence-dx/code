"use client";

import {
  encodeProjectCollaborationClientCursors,
  type ProjectCollaborationClientCursor,
} from "./collaboration-client-cursors";
import type { ProjectCollaborationReplayCheckpoint } from "./collaboration-replay-checkpoint";
import {
  isProjectCollaborationOperationStreamMessage,
  isProjectCollaborationOperationTransportControlMessage,
  type ProjectCollaborationOperationBatchSummary,
} from "./collaboration-types";
import {
  createProjectCollaborationWebSocketChannel,
  registerProjectCollaborationWebSocketChannel,
} from "./collaboration-websocket-channel";

export type CollaborationOperationTransportKind = "websocket" | "event-source" | "polling";

export type CollaborationOperationTransportEvent =
  | {
      checkedAt: string;
      clientCursors?: ProjectCollaborationClientCursor[];
      kind: "connected" | "heartbeat";
      replayCheckpoint?: ProjectCollaborationReplayCheckpoint;
      transport: CollaborationOperationTransportKind;
    }
  | {
      checkedAt: string;
      clientCursors?: ProjectCollaborationClientCursor[];
      kind: "operation-batches";
      operationBatches: ProjectCollaborationOperationBatchSummary[];
      replayCheckpoint?: ProjectCollaborationReplayCheckpoint;
      transport: CollaborationOperationTransportKind;
    }
  | {
      error: string;
      kind: "error";
      transport: CollaborationOperationTransportKind;
    };

export interface CollaborationOperationTransport {
  close: () => void;
  kind: CollaborationOperationTransportKind;
}

interface CreateProjectCollaborationTransportOptions {
  after: string;
  clientCursors?: ProjectCollaborationClientCursor[];
  onEvent: (event: CollaborationOperationTransportEvent) => void;
  projectId: string;
}

const collaborationWebSocketUrl = process.env.NEXT_PUBLIC_ESSENCE_COLLABORATION_WS_URL;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCheckedAt(value: unknown) {
  if (isRecord(value) && typeof value.checkedAt === "string") {
    return value.checkedAt;
  }

  return new Date().toISOString();
}

function parseMessage(data: string) {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}

function appendClientCursors(url: URL, clientCursors: ProjectCollaborationClientCursor[] | undefined) {
  if (clientCursors?.length) {
    url.searchParams.set("clientCursors", encodeProjectCollaborationClientCursors(clientCursors));
  }
}

function getEventSourceUrl(projectId: string, after: string, clientCursors: ProjectCollaborationClientCursor[] | undefined) {
  const url = new URL(`/api/projects/${encodeURIComponent(projectId)}/collaboration/stream`, window.location.origin);
  url.searchParams.set("after", after);
  appendClientCursors(url, clientCursors);

  return `${url.pathname}${url.search}`;
}

function getWebSocketUrl(projectId: string, after: string, clientCursors: ProjectCollaborationClientCursor[] | undefined) {
  if (!collaborationWebSocketUrl) {
    return null;
  }

  try {
    const url = new URL(collaborationWebSocketUrl);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("after", after);
    appendClientCursors(url, clientCursors);
    return url.toString();
  } catch {
    return null;
  }
}

function createWebSocketTransport({ after, clientCursors, onEvent, projectId }: CreateProjectCollaborationTransportOptions): CollaborationOperationTransport | null {
  if (typeof window === "undefined" || typeof window.WebSocket === "undefined") {
    return null;
  }

  const url = getWebSocketUrl(projectId, after, clientCursors);

  if (!url) {
    return null;
  }

  const socket = new window.WebSocket(url);
  const channel = createProjectCollaborationWebSocketChannel(projectId, (message) => {
    if (socket.readyState !== window.WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  });
  let closed = false;
  let unregisterChannel: (() => void) | null = null;

  function unregister() {
    unregisterChannel?.();
    unregisterChannel = null;
  }

  socket.onopen = () => {
    if (!closed) {
      unregisterChannel = registerProjectCollaborationWebSocketChannel(channel);
      onEvent({ checkedAt: new Date().toISOString(), kind: "connected", transport: "websocket" });
    }
  };

  socket.onmessage = (event) => {
    if (closed || typeof event.data !== "string") {
      return;
    }

    const parsed = parseMessage(event.data);
    channel.dispatchMessage(parsed);

    if (isProjectCollaborationOperationTransportControlMessage(parsed)) {
      onEvent({
        checkedAt: getCheckedAt(parsed),
        clientCursors: parsed.clientCursors,
        kind: parsed.type,
        replayCheckpoint: parsed.replayCheckpoint,
        transport: "websocket",
      });
      return;
    }

    if (isProjectCollaborationOperationStreamMessage(parsed)) {
      onEvent({
        checkedAt: parsed.checkedAt,
        clientCursors: parsed.clientCursors,
        kind: "operation-batches",
        operationBatches: parsed.operationBatches,
        replayCheckpoint: parsed.replayCheckpoint,
        transport: "websocket",
      });
    }
  };

  socket.onerror = () => {
    if (!closed) {
      unregister();
      onEvent({ error: "WebSocket collaboration transport failed.", kind: "error", transport: "websocket" });
    }
  };

  socket.onclose = () => {
    if (!closed) {
      unregister();
      onEvent({ error: "WebSocket collaboration transport closed.", kind: "error", transport: "websocket" });
    }
  };

  return {
    close() {
      closed = true;
      unregister();
      socket.close();
    },
    kind: "websocket",
  };
}

function createEventSourceTransport({ after, clientCursors, onEvent, projectId }: CreateProjectCollaborationTransportOptions): CollaborationOperationTransport | null {
  if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
    return null;
  }

  const stream = new window.EventSource(getEventSourceUrl(projectId, after, clientCursors));
  let closed = false;

  stream.addEventListener("connected", (event) => {
    if (!closed) {
      const parsed = parseMessage(event.data);
      onEvent({
        checkedAt: getCheckedAt(parsed),
        clientCursors: isProjectCollaborationOperationTransportControlMessage(parsed) ? parsed.clientCursors : undefined,
        kind: "connected",
        replayCheckpoint: isProjectCollaborationOperationTransportControlMessage(parsed) ? parsed.replayCheckpoint : undefined,
        transport: "event-source",
      });
    }
  });

  stream.addEventListener("heartbeat", (event) => {
    if (!closed) {
      const parsed = parseMessage(event.data);
      onEvent({
        checkedAt: getCheckedAt(parsed),
        clientCursors: isProjectCollaborationOperationTransportControlMessage(parsed) ? parsed.clientCursors : undefined,
        kind: "heartbeat",
        replayCheckpoint: isProjectCollaborationOperationTransportControlMessage(parsed) ? parsed.replayCheckpoint : undefined,
        transport: "event-source",
      });
    }
  });

  stream.addEventListener("operation-batches", (event) => {
    if (closed) {
      return;
    }

    const parsed = parseMessage(event.data);

    if (isProjectCollaborationOperationStreamMessage(parsed)) {
      onEvent({
        checkedAt: parsed.checkedAt,
        clientCursors: parsed.clientCursors,
        kind: "operation-batches",
        operationBatches: parsed.operationBatches,
        replayCheckpoint: parsed.replayCheckpoint,
        transport: "event-source",
      });
    }
  });

  stream.onerror = () => {
    if (!closed) {
      onEvent({ error: "Server-sent collaboration stream failed.", kind: "error", transport: "event-source" });
    }
  };

  return {
    close() {
      closed = true;
      stream.close();
    },
    kind: "event-source",
  };
}

export function createProjectCollaborationOperationTransport(options: CreateProjectCollaborationTransportOptions): CollaborationOperationTransport {
  return (
    createWebSocketTransport(options) ??
    createEventSourceTransport(options) ?? {
      close() {},
      kind: "polling",
    }
  );
}
