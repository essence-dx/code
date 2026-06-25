import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";

export type ProjectCollaborationLivePublishState = "idle" | "scheduled" | "publishing" | "synced" | "error";
export type ProjectCollaborationLivePublishTransport = "api" | "websocket";

export interface ProjectCollaborationLivePublishStatusInput {
  errorMessage?: string | null;
  pendingOperationCount: number;
  publishedOperationCount: number;
  state: ProjectCollaborationLivePublishState;
  transport?: ProjectCollaborationLivePublishTransport | null;
}

export interface ProjectCollaborationLivePublishStatusSummary {
  detail: string;
  label: string;
  status: "error" | "idle" | "live" | "pending";
}

interface ProjectCollaborationLivePublishSignatureInput {
  baseUpdatedAt: string | null;
  operations: SceneCollaborationOperation[];
  projectId: string | null;
  scopeId?: string | null;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function createProjectCollaborationLivePublishSignature({
  baseUpdatedAt,
  operations,
  projectId,
  scopeId,
}: ProjectCollaborationLivePublishSignatureInput) {
  if (!projectId || !baseUpdatedAt || operations.length === 0) {
    return null;
  }

  return JSON.stringify({ baseUpdatedAt, operations, projectId, scopeId });
}

export function summarizeProjectCollaborationLivePublishStatus({
  errorMessage,
  pendingOperationCount,
  publishedOperationCount,
  state,
  transport,
}: ProjectCollaborationLivePublishStatusInput): ProjectCollaborationLivePublishStatusSummary {
  if (state === "error") {
    return {
      detail: `Live collaboration sync paused: ${errorMessage || "local edits will retry or publish when you save."}`,
      label: "Sync paused",
      status: "error",
    };
  }

  if (state === "publishing") {
    return {
      detail: `Publishing ${formatCount(pendingOperationCount, "local operation")} to the collaboration log.`,
      label: "Publishing",
      status: "pending",
    };
  }

  if (state === "scheduled" || pendingOperationCount > 0) {
    return {
      detail: `${formatCount(pendingOperationCount, "local operation")} queued for live collaborators.`,
      label: "Queued",
      status: "pending",
    };
  }

  if (state === "synced" || publishedOperationCount > 0) {
    const transportLabel = transport === "websocket" ? "WebSocket" : transport === "api" ? "HTTP" : "live sync";

    return {
      detail: `Live collaboration published ${formatCount(publishedOperationCount, "operation")} over ${transportLabel} for this save baseline.`,
      label: transport === "websocket" ? "Socket synced" : "Live synced",
      status: "live",
    };
  }

  return {
    detail: "Live collaboration is ready to publish local edits before the next save.",
    label: "Live ready",
    status: "idle",
  };
}
