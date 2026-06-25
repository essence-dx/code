import { isProjectCollaborationOperationStreamMessage, type ProjectCollaborationOperationWebSocketMessage } from "@/features/projects/collaboration-types";
import type { ProjectCollaborationWebSocketDelivery } from "./project-collaboration-websocket-peer-hub";

export interface ProjectCollaborationWebSocketRuntimeConfig {
  activeFanOutMs: number;
  activeFanOutRefreshes: number;
  idleFanOutMs: number;
  port: number;
}

export interface ProjectCollaborationWebSocketRuntimeHealthSnapshot {
  activeProjectCount: number;
  activeSocketCount: number;
  broadcastMessagesSent: number;
  closedSocketCount: number;
  config: ProjectCollaborationWebSocketRuntimeConfig;
  directMessagesSent: number;
  fanOutBatchRefreshCount: number;
  fanOutRefreshCount: number;
  lastError: { at: string; message: string } | null;
  openedSocketCount: number;
  operationBatchesSent: number;
  operationBatchMessagesSent: number;
  projects: Array<{ projectId: string; socketCount: number }>;
  rejectedSocketCount: number;
  startedAt: string;
  status: "ready";
  uptimeMs: number;
}

function countOperationBatchMessages(messages: ProjectCollaborationOperationWebSocketMessage[]) {
  return messages.filter(isProjectCollaborationOperationStreamMessage).length;
}

function countOperationBatches(messages: ProjectCollaborationOperationWebSocketMessage[]) {
  return messages.reduce((count, message) => {
    return isProjectCollaborationOperationStreamMessage(message) ? count + message.operationBatches.length : count;
  }, 0);
}

export function createProjectCollaborationWebSocketRuntimeHealth(
  config: ProjectCollaborationWebSocketRuntimeConfig,
  now: () => Date = () => new Date(),
) {
  const startedAt = now();
  const projectSocketCounts = new Map<string, number>();
  let broadcastMessagesSent = 0;
  let closedSocketCount = 0;
  let directMessagesSent = 0;
  let fanOutBatchRefreshCount = 0;
  let fanOutRefreshCount = 0;
  let lastError: { at: string; message: string } | null = null;
  let openedSocketCount = 0;
  let operationBatchesSent = 0;
  let operationBatchMessagesSent = 0;
  let rejectedSocketCount = 0;

  function recordError(message: string) {
    lastError = { at: now().toISOString(), message };
  }

  return {
    recordDelivery(delivery: ProjectCollaborationWebSocketDelivery) {
      const deliveredMessages = [...delivery.directMessages, ...delivery.broadcastMessages];

      directMessagesSent += delivery.directMessages.length;
      broadcastMessagesSent += delivery.broadcastMessages.length;
      operationBatchMessagesSent += countOperationBatchMessages(deliveredMessages);
      operationBatchesSent += countOperationBatches(deliveredMessages);
    },
    recordFanOutRefresh(messages: ProjectCollaborationOperationWebSocketMessage[]) {
      fanOutRefreshCount += 1;

      if (countOperationBatches(messages) > 0) {
        fanOutBatchRefreshCount += 1;
      }
    },
    recordSocketClosed(projectId: string) {
      closedSocketCount += 1;
      const currentCount = projectSocketCounts.get(projectId) ?? 0;

      if (currentCount <= 1) {
        projectSocketCounts.delete(projectId);
        return;
      }

      projectSocketCounts.set(projectId, currentCount - 1);
    },
    recordSocketOpened(projectId: string) {
      openedSocketCount += 1;
      projectSocketCounts.set(projectId, (projectSocketCounts.get(projectId) ?? 0) + 1);
    },
    recordSocketRejected(message: string) {
      rejectedSocketCount += 1;
      recordError(message);
    },
    recordSocketRuntimeError(message: string) {
      recordError(message);
    },
    snapshot(): ProjectCollaborationWebSocketRuntimeHealthSnapshot {
      const checkedAt = now();
      const projects = Array.from(projectSocketCounts, ([projectId, socketCount]) => ({ projectId, socketCount })).sort((left, right) =>
        left.projectId.localeCompare(right.projectId),
      );

      return {
        activeProjectCount: projects.length,
        activeSocketCount: projects.reduce((count, project) => count + project.socketCount, 0),
        broadcastMessagesSent,
        closedSocketCount,
        config,
        directMessagesSent,
        fanOutBatchRefreshCount,
        fanOutRefreshCount,
        lastError,
        openedSocketCount,
        operationBatchesSent,
        operationBatchMessagesSent,
        projects,
        rejectedSocketCount,
        startedAt: startedAt.toISOString(),
        status: "ready",
        uptimeMs: Math.max(0, checkedAt.getTime() - startedAt.getTime()),
      };
    },
  };
}
