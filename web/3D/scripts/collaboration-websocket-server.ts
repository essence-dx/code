import "dotenv/config";
import { createProjectCollaborationWebSocketRuntime, type ProjectCollaborationWebSocketRuntimeServeOptions } from "../src/features/projects/server/project-collaboration-websocket-runtime";
import {
  createProjectCollaborationWebSocketSession,
  handleProjectCollaborationWebSocketSessionMessage,
  refreshProjectCollaborationWebSocketSession,
} from "../src/features/projects/server/project-collaboration-websocket-session-service";
import { auth } from "../src/lib/auth";

declare const Bun: {
  serve: <TData>(options: ProjectCollaborationWebSocketRuntimeServeOptions<TData>) => { hostname: string; port: number };
};

const defaultPort = 3002;
const defaultActiveFanOutMs = 750;
const defaultActiveFanOutRefreshes = 6;
const defaultIdleFanOutMs = 3_000;

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function getSessionUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return session?.user.id ?? null;
}

const activeFanOutMs = parsePositiveInteger(
  process.env.ESSENCE_COLLABORATION_WS_DISTRIBUTED_FANOUT_ACTIVE_MS,
  defaultActiveFanOutMs,
);
const activeFanOutRefreshes = parsePositiveInteger(
  process.env.ESSENCE_COLLABORATION_WS_DISTRIBUTED_FANOUT_ACTIVE_REFRESHES,
  defaultActiveFanOutRefreshes,
);
const idleFanOutMs = parsePositiveInteger(
  process.env.ESSENCE_COLLABORATION_WS_DISTRIBUTED_FANOUT_IDLE_MS ?? process.env.ESSENCE_COLLABORATION_WS_HEARTBEAT_MS,
  defaultIdleFanOutMs,
);
const port = parsePositiveInteger(process.env.ESSENCE_COLLABORATION_WS_PORT ?? process.env.PORT, defaultPort);
const runtime = createProjectCollaborationWebSocketRuntime(
  {
    createSession: createProjectCollaborationWebSocketSession,
    getSessionUserId,
    handleSessionMessage: handleProjectCollaborationWebSocketSessionMessage,
    refreshSession: refreshProjectCollaborationWebSocketSession,
    serve: (options) => Bun.serve(options),
  },
  {
    activeFanOutMs,
    activeFanOutRefreshes,
    idleFanOutMs,
    port,
  },
);

console.log(`Essence Spline collaboration WebSocket server listening on ws://${runtime.server.hostname}:${runtime.server.port}`);
