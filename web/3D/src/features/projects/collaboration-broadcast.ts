export const projectCollaborationBroadcastChannelName = "essence-spline-project-collaboration";

export interface ProjectCollaborationBroadcastMessage {
  batchCount: number;
  clientId: string;
  createdAt: string;
  kind: "operation-batches-created";
  operationCount: number;
  projectId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createProjectCollaborationBroadcastChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }

  return new window.BroadcastChannel(projectCollaborationBroadcastChannelName);
}

export function isProjectCollaborationBroadcastMessage(value: unknown): value is ProjectCollaborationBroadcastMessage {
  return (
    isRecord(value) &&
    value.kind === "operation-batches-created" &&
    typeof value.batchCount === "number" &&
    typeof value.clientId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.operationCount === "number" &&
    typeof value.projectId === "string"
  );
}

export function publishProjectCollaborationBroadcast(message: ProjectCollaborationBroadcastMessage) {
  const channel = createProjectCollaborationBroadcastChannel();

  if (!channel) {
    return;
  }

  channel.postMessage(message);
  channel.close();
}
