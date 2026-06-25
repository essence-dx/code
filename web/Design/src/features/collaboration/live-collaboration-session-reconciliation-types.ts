export type LiveCollaborationSessionStatus = "ready" | "review" | "blocked";

export type LiveCollaborationOperationStatus = "merged" | "conflict";

export type LiveCollaborationParticipantState =
  | "active"
  | "reconnect"
  | "stale";

export type LiveCollaborationParticipant = {
  id: string;
  userId: string;
  userName: string;
  color: string;
  pageId: string;
  cursorX: number | null;
  cursorY: number | null;
  lastSeenAt: string;
  ageSeconds: number;
  state: LiveCollaborationParticipantState;
};

export type LiveCollaborationReconnectRecovery = {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  pageId: string;
  lastSeenAt: string;
  offlineMinutes: number;
  status: LiveCollaborationSessionStatus;
  taskCount: number;
  recoverySteps: string[];
};

export type LiveCollaborationCursorConflict = {
  id: string;
  projectId: string;
  projectName: string;
  pageId: string;
  participantNames: string[];
  distance: number;
  status: LiveCollaborationSessionStatus;
  detail: string;
  recoverySteps: string[];
};

export type LiveCollaborationOperationHistoryItem = {
  id: string;
  operationId: string;
  operationKind: string;
  status: LiveCollaborationOperationStatus;
  actorUserId: string | null;
  actorName: string;
  pageId: string | null;
  elementIds: string[];
  baseUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  mergedAt: string | null;
  clientRevision: number | null;
  auditLogId: string;
  createdAt: string;
  detail: string;
};

export type LiveCollaborationReviewerLock = {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string;
  pageId: string;
  elementId: string | null;
  lockTarget: string;
  assigneeName: string;
  status: LiveCollaborationSessionStatus;
  detail: string;
  recoverySteps: string[];
};

export type LiveCollaborationSessionReplayEvent = {
  id: string;
  kind: "presence" | "operation" | "lock" | "reconnect" | "cursor-conflict";
  status: LiveCollaborationSessionStatus | LiveCollaborationOperationStatus;
  actorName: string;
  timestamp: string;
  pageId: string | null;
  detail: string;
};

export type LiveCollaborationSessionReplayPacket = {
  id: string;
  projectId: string;
  projectName: string;
  status: LiveCollaborationSessionStatus;
  timeline: LiveCollaborationSessionReplayEvent[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type LiveCollaborationEvidencePacket = {
  id: string;
  projectId: string;
  projectName: string;
  status: LiveCollaborationSessionStatus;
  auditLogIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type LiveCollaborationSessionReconciliation = {
  id: string;
  projectId: string;
  projectName: string;
  status: LiveCollaborationSessionStatus;
  score: number;
  participants: LiveCollaborationParticipant[];
  presenceHistory: LiveCollaborationParticipant[];
  operationMergeHistory: LiveCollaborationOperationHistoryItem[];
  reviewerLocks: LiveCollaborationReviewerLock[];
  reconnectRecoveries: LiveCollaborationReconnectRecovery[];
  cursorConflictQueue: LiveCollaborationCursorConflict[];
  sessionReplayPacket: LiveCollaborationSessionReplayPacket;
  evidencePacket: LiveCollaborationEvidencePacket;
};

export type LiveCollaborationSessionReconciliationCenter = {
  status: LiveCollaborationSessionStatus;
  score: number;
  generatedAt: string;
  sessions: LiveCollaborationSessionReconciliation[];
  nextActions: string[];
  totals: {
    sessions: number;
    activeSessions: number;
    participants: number;
    activeParticipants: number;
    reconnectRecoveries: number;
    cursorConflicts: number;
    operationMerges: number;
    operationConflicts: number;
    reviewerLocks: number;
    blockedSessions: number;
    reviewSessions: number;
    evidencePackets: number;
    replayPackets: number;
    auditEvents: number;
  };
};
