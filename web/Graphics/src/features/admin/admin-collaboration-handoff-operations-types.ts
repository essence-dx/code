import type { CollaborationSyncReplayReport } from "@/features/editor/collaboration-sync-replay";
import type {
  CollaborationHandoffActionState,
} from "@/features/admin/admin-collaboration-handoff-actions";
import type { DesignDocument } from "@/features/editor/types";

export type AdminCollaborationHandoffStatus = "ready" | "review" | "blocked";

export type AdminCollaborationHandoffCategory =
  | "conflicts"
  | "escalation"
  | "mentions"
  | "presenter"
  | "replay"
  | "room";

export type AdminCollaborationHandoffFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminCollaborationHandoffInput = {
  files: AdminCollaborationHandoffFile[];
  actionStates?: Map<string, CollaborationHandoffActionState>;
  generatedAt?: string;
  now?: number;
};

export type AdminCollaborationPresenterState = {
  status: "idle" | "owned" | "conflict";
  ownerName: string | null;
  ownerEmail: string | null;
  activePresenterCount: number;
  spotlightEventCount: number;
  followEventCount: number;
  replayEventCount: number;
  lastHandoffAt: string | null;
  summary: string;
};

export type AdminCollaborationHandoffRoom = {
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
  presenter: AdminCollaborationPresenterState;
  operationConflictCount: number;
  targetConflictCount: number;
  eventDriftCount: number;
  offlineReplayQueueCount: number;
  escalationCount: number;
  rawEscalationCount: number;
  syncReplay: CollaborationSyncReplayReport;
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

export type AdminCollaborationHandoffRow = {
  id: string;
  roomId: string;
  category: AdminCollaborationHandoffCategory;
  status: AdminCollaborationHandoffStatus;
  fileName: string;
  ownerEmail: string;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  latestAt: string | null;
};

export type AdminCollaborationHandoffOperationsReport = {
  generatedAt: string;
  status: AdminCollaborationHandoffStatus;
  score: number;
  fileCount: number;
  roomCount: number;
  capturedRoomCount: number;
  activeRoomCount: number;
  staleRoomCount: number;
  unresolvedMentionCount: number;
  presenterConflictCount: number;
  presenterOwnedCount: number;
  conflictQueueCount: number;
  escalationQueueCount: number;
  assignedOwnerCount: number;
  archivedEvidenceCount: number;
  clearedSnapshotCount: number;
  resolvedQueueCount: number;
  replayFreshCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rooms: AdminCollaborationHandoffRoom[];
  rows: AdminCollaborationHandoffRow[];
  commands: string[];
};
