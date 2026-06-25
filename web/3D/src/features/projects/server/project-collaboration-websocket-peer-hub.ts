import {
  isProjectCollaborationOperationStreamMessage,
  type ProjectCollaborationOperationWebSocketMessage,
} from "@/features/projects/collaboration-types";

export interface ProjectCollaborationWebSocketDelivery {
  broadcastMessages: ProjectCollaborationOperationWebSocketMessage[];
  directMessages: ProjectCollaborationOperationWebSocketMessage[];
}

export interface ProjectCollaborationWebSocketFanOutConfig {
  activeBurstRefreshes: number;
  activeRefreshMs: number;
  idleRefreshMs: number;
}

export interface ProjectCollaborationWebSocketFanOutState {
  nextRefreshMs: (messages: ProjectCollaborationOperationWebSocketMessage[]) => number;
}

export function createProjectCollaborationWebSocketTopic(projectId: string) {
  return `project-collaboration:${projectId}`;
}

export function encodeProjectCollaborationWebSocketMessage(message: ProjectCollaborationOperationWebSocketMessage) {
  return JSON.stringify(message);
}

export function createProjectCollaborationWebSocketDelivery(
  messages: ProjectCollaborationOperationWebSocketMessage[],
): ProjectCollaborationWebSocketDelivery {
  const directMessages: ProjectCollaborationOperationWebSocketMessage[] = [];
  const broadcastMessages: ProjectCollaborationOperationWebSocketMessage[] = [];

  for (const message of messages) {
    if (isProjectCollaborationOperationStreamMessage(message)) {
      broadcastMessages.push(message);
    } else {
      directMessages.push(message);
    }
  }

  return { broadcastMessages, directMessages };
}

export function hasProjectCollaborationOperationFanOut(messages: ProjectCollaborationOperationWebSocketMessage[]) {
  return messages.some((message) => {
    return isProjectCollaborationOperationStreamMessage(message) && message.operationBatches.length > 0;
  });
}

export function createProjectCollaborationWebSocketFanOutState({
  activeBurstRefreshes,
  activeRefreshMs,
  idleRefreshMs,
}: ProjectCollaborationWebSocketFanOutConfig): ProjectCollaborationWebSocketFanOutState {
  let activeRefreshesRemaining = 0;

  return {
    nextRefreshMs(messages) {
      if (hasProjectCollaborationOperationFanOut(messages)) {
        activeRefreshesRemaining = Math.max(0, activeBurstRefreshes);
        return activeRefreshMs;
      }

      if (activeRefreshesRemaining > 0) {
        activeRefreshesRemaining -= 1;
        return activeRefreshMs;
      }

      return idleRefreshMs;
    },
  };
}
