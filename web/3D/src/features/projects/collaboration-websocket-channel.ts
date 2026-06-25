"use client";

export type ProjectCollaborationWebSocketMessageListener = (message: unknown) => void;

export interface ProjectCollaborationWebSocketChannel {
  dispatchMessage: (message: unknown) => void;
  projectId: string;
  send: (message: unknown) => boolean;
  subscribe: (listener: ProjectCollaborationWebSocketMessageListener) => () => void;
}

const channels = new Map<string, ProjectCollaborationWebSocketChannel>();

export function createProjectCollaborationWebSocketChannel(
  projectId: string,
  sendMessage: (message: unknown) => boolean,
): ProjectCollaborationWebSocketChannel {
  const listeners = new Set<ProjectCollaborationWebSocketMessageListener>();

  return {
    dispatchMessage(message) {
      for (const listener of listeners) {
        listener(message);
      }
    },
    projectId,
    send(message) {
      return sendMessage(message);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function getProjectCollaborationWebSocketChannel(projectId: string) {
  return channels.get(projectId) ?? null;
}

export function registerProjectCollaborationWebSocketChannel(channel: ProjectCollaborationWebSocketChannel) {
  channels.set(channel.projectId, channel);

  return () => {
    if (channels.get(channel.projectId) === channel) {
      channels.delete(channel.projectId);
    }
  };
}
