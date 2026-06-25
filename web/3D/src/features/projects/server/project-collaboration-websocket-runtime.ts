import type { ProjectCollaborationOperationWebSocketMessage } from "@/features/projects/collaboration-types";
import {
  createProjectCollaborationWebSocketDelivery,
  createProjectCollaborationWebSocketFanOutState,
  createProjectCollaborationWebSocketTopic,
  encodeProjectCollaborationWebSocketMessage,
  type ProjectCollaborationWebSocketFanOutState,
} from "./project-collaboration-websocket-peer-hub";
import { createProjectCollaborationWebSocketRuntimeHealth, type ProjectCollaborationWebSocketRuntimeConfig } from "./project-collaboration-websocket-runtime-health";
import type {
  CreateProjectCollaborationWebSocketSessionInput,
  ProjectCollaborationWebSocketSession,
  ProjectCollaborationWebSocketSessionMessageResult,
  ProjectCollaborationWebSocketSessionResult,
} from "./project-collaboration-websocket-session-service";

export interface ProjectCollaborationWebSocketRuntimeSocketData {
  fanOutState: ProjectCollaborationWebSocketFanOutState;
  fanOutTimer?: unknown;
  initialMessages: ProjectCollaborationOperationWebSocketMessage[];
  session: ProjectCollaborationWebSocketSession;
  topic: string;
}

export interface ProjectCollaborationWebSocketRuntimeSocket<TData> {
  close: (code?: number, reason?: string) => void;
  data: TData;
  publish: (topic: string, message: string) => void;
  send: (message: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

export interface ProjectCollaborationWebSocketRuntimeUpgradeServer<TData> {
  publish: (topic: string, message: string) => void;
  upgrade: (request: Request, options: { data: TData }) => boolean;
}

export interface ProjectCollaborationWebSocketRuntimeServeOptions<TData> {
  fetch: (
    request: Request,
    server: ProjectCollaborationWebSocketRuntimeUpgradeServer<TData>,
  ) => Promise<Response | undefined> | Response | undefined;
  port: number;
  websocket: {
    close?: (socket: ProjectCollaborationWebSocketRuntimeSocket<TData>) => void;
    message: (
      socket: ProjectCollaborationWebSocketRuntimeSocket<TData>,
      message: string | ArrayBuffer | Uint8Array,
    ) => Promise<void> | void;
    open: (socket: ProjectCollaborationWebSocketRuntimeSocket<TData>) => void;
  };
}

export interface ProjectCollaborationWebSocketRuntimeServer {
  hostname: string;
  port: number;
}

export interface ProjectCollaborationWebSocketRuntimeDependencies {
  clearSocketTimeout?: (timer: unknown) => void;
  createSession: (input: CreateProjectCollaborationWebSocketSessionInput) => Promise<ProjectCollaborationWebSocketSessionResult>;
  getSessionUserId: (request: Request) => Promise<string | null> | string | null;
  handleSessionMessage: (
    session: ProjectCollaborationWebSocketSession,
    message: unknown,
  ) => Promise<ProjectCollaborationWebSocketSessionMessageResult>;
  now?: () => Date;
  refreshSession: (session: ProjectCollaborationWebSocketSession) => Promise<ProjectCollaborationWebSocketSessionMessageResult>;
  serve: <TData>(options: ProjectCollaborationWebSocketRuntimeServeOptions<TData>) => ProjectCollaborationWebSocketRuntimeServer;
  setSocketTimeout?: (callback: () => Promise<void> | void, delayMs: number) => unknown;
}

function parseJsonMessage(message: string | ArrayBuffer | Uint8Array) {
  if (typeof message !== "string") {
    return null;
  }

  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
}

function defaultSetSocketTimeout(callback: () => Promise<void> | void, delayMs: number) {
  return setTimeout(() => {
    void callback();
  }, delayMs);
}

function defaultClearSocketTimeout(timer: unknown) {
  clearTimeout(timer as ReturnType<typeof setTimeout>);
}

function sendMessages(
  socket: ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData>,
  messages: ProjectCollaborationOperationWebSocketMessage[],
) {
  for (const message of messages) {
    socket.send(encodeProjectCollaborationWebSocketMessage(message));
  }
}

function broadcastMessages(
  socket: ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData>,
  messages: ProjectCollaborationOperationWebSocketMessage[],
) {
  for (const message of messages) {
    socket.publish(socket.data.topic, encodeProjectCollaborationWebSocketMessage(message));
  }
}

export function createProjectCollaborationWebSocketRuntime(
  dependencies: ProjectCollaborationWebSocketRuntimeDependencies,
  config: ProjectCollaborationWebSocketRuntimeConfig,
) {
  const runtimeHealth = createProjectCollaborationWebSocketRuntimeHealth(config, dependencies.now);
  const clearSocketTimeout = dependencies.clearSocketTimeout ?? defaultClearSocketTimeout;
  const setSocketTimeout = dependencies.setSocketTimeout ?? defaultSetSocketTimeout;

  function createHealthResponse() {
    return Response.json(runtimeHealth.snapshot(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  function deliverMessages(
    socket: ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData>,
    messages: ProjectCollaborationOperationWebSocketMessage[],
  ) {
    const delivery = createProjectCollaborationWebSocketDelivery(messages);

    sendMessages(socket, delivery.directMessages);
    broadcastMessages(socket, delivery.broadcastMessages);
    runtimeHealth.recordDelivery(delivery);
  }

  function scheduleSocketFanOutRefresh(
    socket: ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData>,
    delayMs: number,
  ) {
    if (socket.data.fanOutTimer) {
      clearSocketTimeout(socket.data.fanOutTimer);
    }

    socket.data.fanOutTimer = setSocketTimeout(() => refreshSocketSession(socket), delayMs);
  }

  async function refreshSocketSession(socket: ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData>) {
    const result = await dependencies.refreshSession(socket.data.session);

    if ("error" in result) {
      runtimeHealth.recordSocketRuntimeError(result.error);
      socket.close(1008, result.error);
      return;
    }

    socket.data.session = result.session;
    runtimeHealth.recordFanOutRefresh(result.messages);
    deliverMessages(socket, result.messages);
    scheduleSocketFanOutRefresh(socket, socket.data.fanOutState.nextRefreshMs(result.messages));
  }

  const server = dependencies.serve<ProjectCollaborationWebSocketRuntimeSocketData>({
    async fetch(request, runtime) {
      const url = new URL(request.url);

      if (url.pathname === "/healthz" || url.pathname === "/readyz") {
        return createHealthResponse();
      }

      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        runtimeHealth.recordSocketRejected("WebSocket upgrade required.");
        return Response.json({ error: "WebSocket upgrade required" }, { status: 426 });
      }

      const projectId = url.searchParams.get("projectId")?.trim();

      if (!projectId) {
        runtimeHealth.recordSocketRejected("Missing collaboration project id.");
        return Response.json({ error: "Missing collaboration project id" }, { status: 400 });
      }

      const userId = await dependencies.getSessionUserId(request);

      if (!userId) {
        runtimeHealth.recordSocketRejected("Unauthorized collaboration socket upgrade.");
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const sessionResult = await dependencies.createSession({
        after: url.searchParams.get("after"),
        clientCursors: url.searchParams.get("clientCursors"),
        projectId,
        userId,
      });

      if ("error" in sessionResult) {
        runtimeHealth.recordSocketRejected(sessionResult.error);
        return Response.json({ error: sessionResult.error }, { status: sessionResult.status });
      }

      const upgraded = runtime.upgrade(request, {
        data: {
          fanOutState: createProjectCollaborationWebSocketFanOutState({
            activeBurstRefreshes: config.activeFanOutRefreshes,
            activeRefreshMs: config.activeFanOutMs,
            idleRefreshMs: config.idleFanOutMs,
          }),
          initialMessages: sessionResult.messages,
          session: sessionResult.session,
          topic: createProjectCollaborationWebSocketTopic(projectId),
        },
      });

      if (upgraded) {
        return undefined;
      }

      runtimeHealth.recordSocketRejected("WebSocket upgrade failed.");
      return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
    },
    port: config.port,
    websocket: {
      open(socket) {
        socket.subscribe(socket.data.topic);
        sendMessages(socket, socket.data.initialMessages);
        runtimeHealth.recordSocketOpened(socket.data.session.projectId);
        runtimeHealth.recordDelivery(createProjectCollaborationWebSocketDelivery(socket.data.initialMessages));
        scheduleSocketFanOutRefresh(socket, socket.data.fanOutState.nextRefreshMs(socket.data.initialMessages));
      },
      async message(socket, message) {
        const parsed = parseJsonMessage(message);
        const result = await dependencies.handleSessionMessage(socket.data.session, parsed);

        if ("error" in result) {
          runtimeHealth.recordSocketRuntimeError(result.error);
          socket.close(1008, result.error);
          return;
        }

        socket.data.session = result.session;
        deliverMessages(socket, result.messages);
      },
      close(socket) {
        if (socket.data.fanOutTimer) {
          clearSocketTimeout(socket.data.fanOutTimer);
        }
        runtimeHealth.recordSocketClosed(socket.data.session.projectId);
        socket.unsubscribe(socket.data.topic);
      },
    },
  });

  return {
    health: runtimeHealth,
    server,
  };
}
