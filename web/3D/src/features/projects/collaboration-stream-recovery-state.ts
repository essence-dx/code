import { isProjectCollaborationClientCursorArray, type ProjectCollaborationClientCursor } from "./collaboration-client-cursors";

const recoveryStatePrefix = "essence-spline-collaboration-stream-recovery";

export interface ProjectCollaborationStreamRecoveryState {
  clientCursors: ProjectCollaborationClientCursor[];
  streamCursor: string | null;
}

export interface ProjectCollaborationStreamRecoverySummary {
  cursorCount: number;
  detail: string;
  label: string;
  status: "cold" | "resumed";
  streamCursor: string | null;
}

function getProjectRecoveryStatePrefix(projectId: string) {
  return `${recoveryStatePrefix}:${projectId}:`;
}

function getProjectBaselineRecoveryKey(projectId: string, since: string) {
  return `${getProjectRecoveryStatePrefix(projectId)}${since}`;
}

function isCurrentBaselineRecoveryKey(key: string, projectId: string, since: string) {
  const baselineKey = getProjectBaselineRecoveryKey(projectId, since);

  return key === baselineKey || key.startsWith(`${baselineKey}:scene:`);
}

function normalizeStreamCursor(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cursor = value.trim();

  return cursor && cursor.length <= 120 ? cursor : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getProjectCollaborationStreamRecoveryKey(projectId: string | null, since: string | null, sceneId?: string | null) {
  if (!projectId || !since) {
    return null;
  }

  const baselineKey = getProjectBaselineRecoveryKey(projectId, since);

  return sceneId ? `${baselineKey}:scene:${sceneId}` : baselineKey;
}

export function readProjectCollaborationStreamRecoveryState(key: string | null): ProjectCollaborationStreamRecoveryState {
  if (!key || typeof window === "undefined") {
    return { clientCursors: [], streamCursor: null };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown;

    if (!isRecord(parsed)) {
      return { clientCursors: [], streamCursor: null };
    }

    return {
      clientCursors: isProjectCollaborationClientCursorArray(parsed.clientCursors) ? parsed.clientCursors : [],
      streamCursor: normalizeStreamCursor(parsed.streamCursor),
    };
  } catch {
    return { clientCursors: [], streamCursor: null };
  }
}

export function writeProjectCollaborationStreamRecoveryState(key: string | null, state: ProjectCollaborationStreamRecoveryState) {
  if (!key || typeof window === "undefined") {
    return;
  }

  if (!state.streamCursor && state.clientCursors.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify({
      clientCursors: state.clientCursors.slice(0, 100),
      streamCursor: state.streamCursor,
    }),
  );
}

export function summarizeProjectCollaborationStreamRecoveryState(
  state: ProjectCollaborationStreamRecoveryState,
): ProjectCollaborationStreamRecoverySummary {
  const cursorCount = state.clientCursors.length;

  if (!state.streamCursor && cursorCount === 0) {
    return {
      cursorCount,
      detail: "No persisted stream resume point yet.",
      label: "Cold start",
      status: "cold",
      streamCursor: null,
    };
  }

  const parts = [
    state.streamCursor ? "a saved stream cursor" : null,
    cursorCount ? `${cursorCount} causal ${cursorCount === 1 ? "cursor" : "cursors"}` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    cursorCount,
    detail: `Stream recovery can resume from ${parts.join(" and ")}.`,
    label: "Resume ready",
    status: "resumed",
    streamCursor: state.streamCursor,
  };
}

export function pruneProjectCollaborationStreamRecoveryStates(projectId: string | null, activeKey: string | null, activeSince?: string | null) {
  if (!projectId || typeof window === "undefined") {
    return;
  }

  const projectPrefix = getProjectRecoveryStatePrefix(projectId);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(projectPrefix) && key !== activeKey && (!activeSince || !isCurrentBaselineRecoveryKey(key, projectId, activeSince))) {
      window.localStorage.removeItem(key);
    }
  }
}
