import type {
  AdminCollaborationEventIngestionReport,
  AdminCollaborationEventRecord,
  AdminCollaborationIncidentRow,
  AdminCollaborationReplayWindow,
} from "@/features/admin/admin-collaboration-event-ingestion";
import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffStatus,
  AdminCollaborationPresenterState,
} from "@/features/admin/admin-collaboration-handoff-operations";
import type {
  AdminMultiplayerPresenceReport,
  AdminMultiplayerPresenceRoom,
  AdminMultiplayerPresenceRow,
} from "@/features/admin/admin-multiplayer-presence";

export type AdminCollaborationRecoveryPacketStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminCollaborationRecoveryPacketCategory =
  | "activity-replay"
  | "conflict-summary"
  | "export-readiness"
  | "ownership-handoff";

export type AdminCollaborationRecoveryOwnerHandoffStatus =
  | "assigned"
  | "missing"
  | "stale";

export type AdminCollaborationRecoveryRoomSource = {
  id: string;
  status: AdminCollaborationHandoffStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  roomCaptured: boolean;
  roomUpdatedAt: string | null;
  roomAgeMinutes: number | null;
  chatMessageCount: number;
  presenceEventCount: number;
  unresolvedMentionCount: number;
  rawUnresolvedMentionCount: number;
  presenter: Pick<
    AdminCollaborationPresenterState,
    | "activePresenterCount"
    | "followEventCount"
    | "lastHandoffAt"
    | "ownerEmail"
    | "ownerName"
    | "replayEventCount"
    | "spotlightEventCount"
    | "status"
    | "summary"
  >;
  operationConflictCount: number;
  targetConflictCount: number;
  eventDriftCount: number;
  offlineReplayQueueCount: number;
  escalationCount: number;
  rawEscalationCount: number;
  latestAt: string | null;
  latestSignalAt: string | null;
  handoffOwnerName: string | null;
  handoffOwnerEmail: string | null;
  handoffAssignedAt: string | null;
  evidenceArchivedAt: string | null;
  staleSnapshotClearedAt: string | null;
  mentionQueueResolvedAt: string | null;
  escalationQueueResolvedAt: string | null;
  actionCount: number;
  recommendation: string;
};

export type AdminCollaborationRecoveryInput = {
  generatedAt?: string;
  collaborationHandoffOperations: Pick<
    AdminCollaborationHandoffOperationsReport,
    | "activeRoomCount"
    | "archivedEvidenceCount"
    | "assignedOwnerCount"
    | "capturedRoomCount"
    | "clearedSnapshotCount"
    | "commands"
    | "conflictQueueCount"
    | "escalationQueueCount"
    | "generatedAt"
    | "presenterConflictCount"
    | "presenterOwnedCount"
    | "replayFreshCount"
    | "resolvedQueueCount"
    | "roomCount"
    | "rows"
    | "score"
    | "staleRoomCount"
    | "status"
    | "unresolvedMentionCount"
  > & {
    rooms: AdminCollaborationRecoveryRoomSource[];
  };
  collaborationEventIngestion: Pick<
    AdminCollaborationEventIngestionReport,
    | "activityEventCount"
    | "chatEventCount"
    | "commands"
    | "durableEventCount"
    | "generatedAt"
    | "incidentCount"
    | "latestPurgeAt"
    | "presenceEventCount"
    | "purgeCandidateCount"
    | "redactedEventCount"
    | "roomActionEventCount"
    | "score"
    | "status"
  > & {
    incidents: AdminCollaborationIncidentRow[];
    recentEvents: AdminCollaborationEventRecord[];
    replayWindows: AdminCollaborationReplayWindow[];
  };
  multiplayerPresence: Pick<
    AdminMultiplayerPresenceReport,
    | "activeRoomCount"
    | "blockedRoomCount"
    | "capturedRoomCount"
    | "commands"
    | "cursorEvidenceCount"
    | "durableEventCount"
    | "eventDriftCount"
    | "failedSaveTelemetryCount"
    | "followEventCount"
    | "generatedAt"
    | "handoffTimerReviewCount"
    | "offlineReplayQueueCount"
    | "pendingSaveSignalCount"
    | "presenceEventCount"
    | "presenterConflictCount"
    | "presenterOwnedCount"
    | "purgeCandidateCount"
    | "readyRoomCount"
    | "reconnectQualityScore"
    | "reviewRoomCount"
    | "roomCount"
    | "roomSaveConflictCount"
    | "saveConflictCount"
    | "score"
    | "spotlightEventCount"
    | "staleRecoveryQueueCount"
    | "staleRoomCount"
    | "status"
  > & {
    rooms: AdminMultiplayerPresenceRoom[];
    rows: AdminMultiplayerPresenceRow[];
  };
};

export type AdminCollaborationRecoveryPacket = {
  id: string;
  status: AdminCollaborationRecoveryPacketStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  ownerHandoffStatus: AdminCollaborationRecoveryOwnerHandoffStatus;
  ownerHandoffLabel: string;
  activityReplayEvidenceCount: number;
  replayWindowStatus: AdminCollaborationRecoveryPacketStatus;
  replayWindowLatestAt: string | null;
  roomCaptured: boolean;
  evidenceArchived: boolean;
  exportReady: boolean;
  conflictSummaryCount: number;
  operationConflictCount: number;
  targetConflictCount: number;
  eventDriftCount: number;
  offlineReplayQueueCount: number;
  saveConflictCount: number;
  unresolvedMentionCount: number;
  escalationCount: number;
  recoverySteps: string[];
  latestAt: string | null;
  recommendation: string;
};

export type AdminCollaborationRecoveryRow = {
  id: string;
  category: AdminCollaborationRecoveryPacketCategory;
  status: AdminCollaborationRecoveryPacketStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminCollaborationRecoveryPacketsReport = {
  generatedAt: string;
  status: AdminCollaborationRecoveryPacketStatus;
  score: number;
  packetCount: number;
  readyPacketCount: number;
  reviewPacketCount: number;
  blockedPacketCount: number;
  exportReadyPacketCount: number;
  replayEvidenceCount: number;
  ownershipHandoffCount: number;
  missingOwnershipCount: number;
  conflictSummaryCount: number;
  staleRecoveryCount: number;
  saveConflictCount: number;
  commands: string[];
  rows: AdminCollaborationRecoveryRow[];
  packets: AdminCollaborationRecoveryPacket[];
};
