import type {
  AdminCollaborationEventIngestionReport,
  AdminCollaborationEventRecord,
  AdminCollaborationReplayWindow,
} from "@/features/admin/admin-collaboration-event-ingestion";
import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRoom,
  AdminCollaborationPresenterState,
} from "@/features/admin/admin-collaboration-handoff-operations";
import type { AdminRealtimeHealthReport } from "@/features/admin/admin-realtime-health-monitor";

export type AdminMultiplayerPresenceStatus = "ready" | "review" | "blocked";

export type AdminMultiplayerPresenceCategory =
  | "handoff-timers"
  | "presence-cursors"
  | "follow-spotlight"
  | "stale-room-recovery"
  | "save-conflicts";

export type AdminMultiplayerPresenceRoomSource = Pick<
  AdminCollaborationHandoffRoom,
  | "chatMessageCount"
  | "eventDriftCount"
  | "fileId"
  | "fileName"
  | "id"
  | "latestAt"
  | "offlineReplayQueueCount"
  | "operationConflictCount"
  | "ownerEmail"
  | "presenceEventCount"
  | "roomAgeMinutes"
  | "roomCaptured"
  | "status"
  | "targetConflictCount"
> & {
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
};

export type AdminMultiplayerPresenceEventSource =
  AdminCollaborationEventRecord;

export type AdminMultiplayerPresenceReplayWindowSource =
  AdminCollaborationReplayWindow;

export type AdminMultiplayerPresenceInput = {
  generatedAt?: string;
  collaborationHandoffOperations: Pick<
    AdminCollaborationHandoffOperationsReport,
    | "activeRoomCount"
    | "capturedRoomCount"
    | "commands"
    | "conflictQueueCount"
    | "generatedAt"
    | "presenterConflictCount"
    | "presenterOwnedCount"
    | "roomCount"
    | "staleRoomCount"
  > & {
    rooms: AdminMultiplayerPresenceRoomSource[];
  };
  collaborationEventIngestion: Pick<
    AdminCollaborationEventIngestionReport,
    | "chatEventCount"
    | "commands"
    | "durableEventCount"
    | "generatedAt"
    | "presenceEventCount"
    | "purgeCandidateCount"
    | "score"
    | "status"
  > & {
    recentEvents: AdminMultiplayerPresenceEventSource[];
    replayWindows: AdminMultiplayerPresenceReplayWindowSource[];
  };
  realtimeHealth: Pick<
    AdminRealtimeHealthReport,
    | "commands"
    | "eventDriftCount"
    | "failedSaveTelemetryCount"
    | "generatedAt"
    | "monitoredRoomCount"
    | "offlineReplayQueueCount"
    | "pendingSaveSignalCount"
    | "reconnectQualityScore"
    | "score"
    | "staleRoomCount"
    | "status"
  >;
};

export type AdminMultiplayerPresenceRoom = {
  id: string;
  status: AdminMultiplayerPresenceStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  roomCaptured: boolean;
  roomAgeMinutes: number | null;
  chatMessageCount: number;
  presenceEventCount: number;
  cursorEvidenceCount: number;
  spotlightEventCount: number;
  followEventCount: number;
  activePresenterCount: number;
  presenterStatus: AdminCollaborationPresenterState["status"];
  presenterSummary: string;
  presenterHandoffAgeMinutes: number | null;
  presenterHandoffTimerStatus: AdminMultiplayerPresenceStatus;
  staleRecoveryStatus: AdminMultiplayerPresenceStatus;
  offlineReplayQueueCount: number;
  eventDriftCount: number;
  saveConflictCount: number;
  replayPurgeCandidate: boolean;
  latestAt: string | null;
  recommendation: string;
};

export type AdminMultiplayerPresenceRow = {
  id: string;
  category: AdminMultiplayerPresenceCategory;
  status: AdminMultiplayerPresenceStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminMultiplayerPresenceReport = {
  generatedAt: string;
  status: AdminMultiplayerPresenceStatus;
  score: number;
  roomCount: number;
  activeRoomCount: number;
  capturedRoomCount: number;
  readyRoomCount: number;
  reviewRoomCount: number;
  blockedRoomCount: number;
  presenceEventCount: number;
  cursorEvidenceCount: number;
  spotlightEventCount: number;
  followEventCount: number;
  presenterConflictCount: number;
  presenterOwnedCount: number;
  handoffTimerReviewCount: number;
  staleRoomCount: number;
  staleRecoveryQueueCount: number;
  offlineReplayQueueCount: number;
  eventDriftCount: number;
  reconnectQualityScore: number;
  saveConflictCount: number;
  roomSaveConflictCount: number;
  pendingSaveSignalCount: number;
  failedSaveTelemetryCount: number;
  durableEventCount: number;
  purgeCandidateCount: number;
  rows: AdminMultiplayerPresenceRow[];
  rooms: AdminMultiplayerPresenceRoom[];
  commands: string[];
};

export type AdminMultiplayerPresenceEventCounts = {
  cursorEvidenceCount: number;
  followEventCount: number;
  latestAt: string | null;
  presenceEventCount: number;
  spotlightEventCount: number;
};
