import { strict as assert } from "node:assert";
import {
  createProjectCollaborationOperationPublishAcknowledgement,
  createProjectCollaborationOperationPublishEnvelope,
  isProjectCollaborationOperationPublishAcknowledgement,
  isProjectCollaborationOperationStreamMessage,
  type ProjectCollaborationOperationBatchSummary,
  type ProjectCollaborationOperationWebSocketMessage,
} from "../src/features/projects/collaboration-types";
import type { SceneCollaborationOperation } from "../src/features/editor/scene/scene-collaboration-operations";
import {
  createProjectCollaborationWebSocketRuntime,
  type ProjectCollaborationWebSocketRuntimeServeOptions,
  type ProjectCollaborationWebSocketRuntimeSocket,
  type ProjectCollaborationWebSocketRuntimeSocketData,
  type ProjectCollaborationWebSocketRuntimeUpgradeServer,
} from "../src/features/projects/server/project-collaboration-websocket-runtime";
import type { ProjectCollaborationWebSocketSession } from "../src/features/projects/server/project-collaboration-websocket-session-service";

interface FakeSocket extends ProjectCollaborationWebSocketRuntimeSocket<ProjectCollaborationWebSocketRuntimeSocketData> {
  closed: { code?: number; reason?: string } | null;
  publishedMessages: Array<{ message: string; topic: string }>;
  sentMessages: string[];
  subscribedTopics: string[];
  unsubscribedTopics: string[];
}

type TimerCallback = () => Promise<void> | void;

let nowMs = Date.parse("2026-01-01T00:00:00.000Z");
const now = () => new Date(nowMs);
const projectId = "project-smoke";
const userId = "user-smoke";
const timers: Array<{ callback: TimerCallback; delayMs: number }> = [];
let serveOptions: ProjectCollaborationWebSocketRuntimeServeOptions<ProjectCollaborationWebSocketRuntimeSocketData> | null = null;
let upgradedSocketData: ProjectCollaborationWebSocketRuntimeSocketData | null = null;

const operation: SceneCollaborationOperation = {
  field: "name",
  kind: "document-field-set",
  previousValue: "Smoke Scene",
  value: "Smoke Scene Updated",
};

function createSession(): ProjectCollaborationWebSocketSession {
  return {
    clientCursors: [],
    cursor: null,
    projectId,
    replayCursor: null,
    sentBatchIds: new Set(),
    userId,
  };
}

function createBatch(batchId: string, clientSequence: number, operations: SceneCollaborationOperation[]): ProjectCollaborationOperationBatchSummary {
  return {
    baseUpdatedAt: null,
    batchId,
    causalId: `smoke-causal-${clientSequence}`,
    clientId: "smoke-client",
    clientSequence,
    createdAt: now().toISOString(),
    id: `smoke-log-${clientSequence}`,
    operationCount: operations.length,
    operations,
    projectId,
    userEmail: "smoke@example.com",
    userId,
    userName: "Smoke User",
  };
}

function createStreamMessage(batch: ProjectCollaborationOperationBatchSummary): ProjectCollaborationOperationWebSocketMessage {
  return {
    checkedAt: now().toISOString(),
    operationBatches: [batch],
  };
}

function createSocket(data: ProjectCollaborationWebSocketRuntimeSocketData): FakeSocket {
  return {
    closed: null,
    data,
    publishedMessages: [],
    sentMessages: [],
    subscribedTopics: [],
    unsubscribedTopics: [],
    close(code, reason) {
      this.closed = { code, reason };
    },
    publish(topic, message) {
      this.publishedMessages.push({ message, topic });
    },
    send(message) {
      this.sentMessages.push(message);
    },
    subscribe(topic) {
      this.subscribedTopics.push(topic);
    },
    unsubscribe(topic) {
      this.unsubscribedTopics.push(topic);
    },
  };
}

function parseSocketMessages(messages: string[]) {
  return messages.map((message) => JSON.parse(message) as ProjectCollaborationOperationWebSocketMessage);
}

function readServeOptions() {
  if (!serveOptions) {
    throw new Error("Smoke runtime did not register serve options.");
  }

  return serveOptions;
}

function readUpgradedSocketData() {
  if (!upgradedSocketData) {
    throw new Error("Smoke runtime did not prepare upgraded socket data.");
  }

  return upgradedSocketData;
}

const upgradeServer: ProjectCollaborationWebSocketRuntimeUpgradeServer<ProjectCollaborationWebSocketRuntimeSocketData> = {
  publish() {},
  upgrade(_request, options) {
    upgradedSocketData = options.data;
    return true;
  },
};

const runtime = createProjectCollaborationWebSocketRuntime(
  {
    async createSession(input) {
      assert.equal(input.projectId, projectId);
      assert.equal(input.userId, userId);

      return {
        messages: [
          {
            checkedAt: now().toISOString(),
            type: "connected",
          },
        ],
        session: createSession(),
      };
    },
    getSessionUserId() {
      return userId;
    },
    async handleSessionMessage(session, message) {
      assert.equal(session.projectId, projectId);

      if (typeof message !== "object" || message === null || !("requestId" in message)) {
        throw new Error("Expected parsed publish envelope.");
      }

      const envelope = message as ReturnType<typeof createProjectCollaborationOperationPublishEnvelope>;
      const batch = createBatch("smoke-batch-published", 1, envelope.input.operations as SceneCollaborationOperation[]);

      session.sentBatchIds.add(batch.id);

      return {
        messages: [createProjectCollaborationOperationPublishAcknowledgement(envelope.requestId, batch), createStreamMessage(batch)],
        session,
      };
    },
    now,
    async refreshSession(session) {
      const batch = createBatch("smoke-batch-refresh", 2, [operation]);

      session.sentBatchIds.add(batch.id);

      return {
        messages: [createStreamMessage(batch)],
        session,
      };
    },
    serve(options) {
      serveOptions = options as unknown as ProjectCollaborationWebSocketRuntimeServeOptions<ProjectCollaborationWebSocketRuntimeSocketData>;
      return { hostname: "127.0.0.1", port: options.port };
    },
    setSocketTimeout(callback, delayMs) {
      timers.push({ callback, delayMs });
      return { callback, delayMs };
    },
  },
  {
    activeFanOutMs: 25,
    activeFanOutRefreshes: 2,
    idleFanOutMs: 100,
    port: 4321,
  },
);

assert.equal(runtime.server.hostname, "127.0.0.1");
assert.equal(runtime.server.port, 4321);

const options = readServeOptions();
const healthResponse = await options.fetch(new Request("http://127.0.0.1:4321/healthz"), upgradeServer);
assert.ok(healthResponse instanceof Response);
assert.equal(healthResponse.headers.get("Cache-Control"), "no-store");
assert.equal((await healthResponse.json() as { status: string }).status, "ready");

const rejectedResponse = await options.fetch(new Request(`http://127.0.0.1:4321/?projectId=${projectId}`), upgradeServer);
assert.ok(rejectedResponse instanceof Response);
assert.equal(rejectedResponse.status, 426);
assert.equal(runtime.health.snapshot().rejectedSocketCount, 1);

const upgradeResponse = await options.fetch(
  new Request(`http://127.0.0.1:4321/?projectId=${projectId}`, {
    headers: {
      upgrade: "websocket",
    },
  }),
  upgradeServer,
);
assert.equal(upgradeResponse, undefined);

const socket = createSocket(readUpgradedSocketData());
options.websocket.open(socket);
assert.deepEqual(socket.subscribedTopics, [`project-collaboration:${projectId}`]);
assert.equal(parseSocketMessages(socket.sentMessages).some((message) => "type" in message && message.type === "connected"), true);
assert.equal(runtime.health.snapshot().activeSocketCount, 1);
assert.equal(timers.at(-1)?.delayMs, 100);

const publishEnvelope = createProjectCollaborationOperationPublishEnvelope(
  projectId,
  {
    batchId: "smoke-batch-published",
    clientId: "smoke-client",
    clientSequence: 1,
    operations: [operation],
  },
  "smoke-request-1",
);

await options.websocket.message(socket, JSON.stringify(publishEnvelope));
const directMessages = parseSocketMessages(socket.sentMessages);
const broadcastMessages = parseSocketMessages(socket.publishedMessages.map((entry) => entry.message));
assert.equal(directMessages.some(isProjectCollaborationOperationPublishAcknowledgement), true);
assert.equal(broadcastMessages.some(isProjectCollaborationOperationStreamMessage), true);
assert.equal(runtime.health.snapshot().broadcastMessagesSent, 1);

const refreshTimer = timers.at(-1);
assert.ok(refreshTimer);
nowMs += refreshTimer.delayMs;
await refreshTimer.callback();
assert.equal(runtime.health.snapshot().fanOutRefreshCount, 1);
assert.equal(runtime.health.snapshot().fanOutBatchRefreshCount, 1);
assert.equal(socket.publishedMessages.length, 2);

options.websocket.close?.(socket);
const finalSnapshot = runtime.health.snapshot();
assert.equal(finalSnapshot.activeSocketCount, 0);
assert.equal(finalSnapshot.closedSocketCount, 1);
assert.equal(socket.unsubscribedTopics[0], `project-collaboration:${projectId}`);
assert.equal(socket.closed, null);

console.log("collaboration websocket smoke passed");
