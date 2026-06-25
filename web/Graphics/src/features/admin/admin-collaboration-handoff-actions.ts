import type { AdminAuditMetadata } from "@/db/schema";
import type {
  AdminCollaborationHandoffStatus,
} from "@/features/admin/admin-collaboration-handoff-operations-types";

export const COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION =
  "collaboration_handoff.assign_owner";
export const COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION =
  "collaboration_handoff.archive_evidence";
export const COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION =
  "collaboration_handoff.clear_stale_snapshot";
export const COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION =
  "collaboration_handoff.resolve_queue";

export const collaborationHandoffActionNames = [
  COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION,
  COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION,
  COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION,
  COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION,
] as const;

export type CollaborationHandoffActionName =
  (typeof collaborationHandoffActionNames)[number];

export type CollaborationHandoffQueue = "mentions" | "escalations";

export type CollaborationHandoffActionMetadataInput = {
  actionKind: CollaborationHandoffActionName;
  fileId: string;
  fileName: string;
  roomId: string;
  actorEmail: string;
  createdAt: string;
  note?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  queue?: CollaborationHandoffQueue | null;
  roomCaptured?: boolean;
  roomStatus?: AdminCollaborationHandoffStatus;
  roomScore?: number;
  roomAgeMinutes?: number | null;
  chatMessageCount?: number;
  presenceEventCount?: number;
  unresolvedMentionCount?: number;
  resolvedCommentCount?: number;
  escalationCount?: number;
  latestAt?: string | null;
};

export type CollaborationHandoffActionEvent = {
  action: string;
  targetId: string;
  targetLabel: string;
  actorEmail: string;
  metadata: AdminAuditMetadata;
  createdAt: string | Date;
};

export type CollaborationHandoffActionState = {
  fileId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  assignedAt: string | null;
  evidenceArchivedAt: string | null;
  staleSnapshotClearedAt: string | null;
  mentionQueueResolvedAt: string | null;
  escalationQueueResolvedAt: string | null;
  latestActionAt: string | null;
  latestNote: string | null;
  actionCount: number;
};

export function createCollaborationHandoffActionMetadata({
  actionKind,
  actorEmail,
  chatMessageCount = 0,
  createdAt,
  escalationCount = 0,
  fileId,
  fileName,
  latestAt,
  note,
  ownerEmail,
  ownerName,
  presenceEventCount = 0,
  queue,
  resolvedCommentCount = 0,
  roomAgeMinutes,
  roomCaptured = false,
  roomId,
  roomScore = 0,
  roomStatus = "review",
  unresolvedMentionCount = 0,
}: CollaborationHandoffActionMetadataInput): AdminAuditMetadata {
  return {
    actionKind,
    actorEmail,
    chatMessageCount,
    createdAt,
    escalationCount,
    fileId,
    fileName,
    latestAt: latestAt ?? null,
    note: normalizeActionText(note),
    ownerEmail: normalizeActionText(ownerEmail),
    ownerName: normalizeActionText(ownerName),
    presenceEventCount,
    queue: queue ?? null,
    resolvedCommentCount,
    roomAgeMinutes: roomAgeMinutes ?? null,
    roomCaptured,
    roomId,
    roomScore,
    roomStatus,
    unresolvedMentionCount,
  };
}

export function getCollaborationHandoffActionStatesFromEvents(
  events: CollaborationHandoffActionEvent[],
) {
  const states = new Map<string, CollaborationHandoffActionState>();
  const actionNames = new Set<string>(collaborationHandoffActionNames);

  for (const event of [...events].sort(compareActionEventsByCreatedAt)) {
    if (!actionNames.has(event.action)) {
      continue;
    }

    const fileId = getMetadataString(event.metadata.fileId) ?? event.targetId;
    const state = states.get(fileId) ?? getEmptyActionState(fileId);
    const createdAt = toIsoDate(event.createdAt);

    state.actionCount += 1;
    state.latestActionAt = getLatestIso(state.latestActionAt, createdAt);
    state.latestNote =
      getMetadataString(event.metadata.note) ?? state.latestNote;

    if (event.action === COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION) {
      state.ownerName = getMetadataString(event.metadata.ownerName);
      state.ownerEmail = getMetadataString(event.metadata.ownerEmail);
      state.assignedAt = createdAt;
    }

    if (event.action === COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION) {
      state.evidenceArchivedAt = createdAt;
    }

    if (event.action === COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION) {
      state.staleSnapshotClearedAt = createdAt;
    }

    if (event.action === COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION) {
      const queue = getMetadataString(event.metadata.queue);

      if (queue === "mentions") {
        state.mentionQueueResolvedAt = createdAt;
      } else if (queue === "escalations") {
        state.escalationQueueResolvedAt = createdAt;
      }
    }

    states.set(fileId, state);
  }

  return states;
}

export function isCollaborationHandoffActionCurrent(
  actionAt: string | null | undefined,
  latestSignalAt: string | null | undefined,
) {
  if (!actionAt) {
    return false;
  }

  if (!latestSignalAt) {
    return true;
  }

  return Date.parse(actionAt) >= Date.parse(latestSignalAt);
}

function getEmptyActionState(fileId: string): CollaborationHandoffActionState {
  return {
    fileId,
    ownerName: null,
    ownerEmail: null,
    assignedAt: null,
    evidenceArchivedAt: null,
    staleSnapshotClearedAt: null,
    mentionQueueResolvedAt: null,
    escalationQueueResolvedAt: null,
    latestActionAt: null,
    latestNote: null,
    actionCount: 0,
  };
}

function compareActionEventsByCreatedAt(
  left: CollaborationHandoffActionEvent,
  right: CollaborationHandoffActionEvent,
) {
  return Date.parse(toIsoDate(left.createdAt)) - Date.parse(toIsoDate(right.createdAt));
}

function toIsoDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function getLatestIso(left: string | null, right: string | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return Date.parse(right) > Date.parse(left) ? right : left;
}

function getMetadataString(value: AdminAuditMetadata[string]) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeActionText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
