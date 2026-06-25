import type {
  AdminCollaborationHandoffRoom,
  AdminCollaborationHandoffRow,
} from "@/features/admin/admin-collaboration-handoff-operations-types";
import {
  collaborationHandoffStatusWeight,
  getLatestCollaborationIso,
} from "@/features/admin/admin-collaboration-handoff-operations-utils";

export function toAdminCollaborationHandoffRows(
  room: AdminCollaborationHandoffRoom,
) {
  return [
    getRoomSnapshotRow(room),
    getReplayFreshnessRow(room),
    getMentionRow(room),
    getPresenterRow(room),
    getConflictRow(room),
    getEscalationRow(room),
  ]
    .filter((row): row is AdminCollaborationHandoffRow => Boolean(row))
    .sort(sortAdminCollaborationHandoffRows);
}

export function getEmptyCollaborationHandoffRow(): AdminCollaborationHandoffRow {
  return {
    id: "collaboration-handoff-empty",
    roomId: "none",
    category: "room",
    status: "review",
    fileName: "No collaboration rooms",
    ownerEmail: "workspace",
    label: "No collaboration room activity",
    detail:
      "No saved collaboration room snapshots are available for admin handoff operations.",
    recommendation:
      "Open a collaborative file, exchange presence or chat, and let the room sync before release handoff.",
    count: 0,
    latestAt: null,
  };
}

export function sortAdminCollaborationHandoffRows(
  left: AdminCollaborationHandoffRow,
  right: AdminCollaborationHandoffRow,
) {
  return (
    collaborationHandoffStatusWeight[left.status] -
      collaborationHandoffStatusWeight[right.status] ||
    right.count - left.count ||
    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -
      (left.latestAt ? new Date(left.latestAt).getTime() : 0)
  );
}

function getRoomSnapshotRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  if (room.roomCaptured) {
    return null;
  }

  return {
    id: `${room.id}-room`,
    roomId: room.id,
    category: "room",
    status: "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Room snapshot missing",
    detail: "No durable collaboration room snapshot is stored for this file.",
    recommendation:
      "Open the room and sync chat/presence before using this file for live handoff.",
    count: 0,
    latestAt: room.latestAt,
  };
}

function getReplayFreshnessRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  if (room.syncReplay.roomAgeMinutes !== null && room.syncReplay.roomAgeMinutes <= 60 * 24) {
    return null;
  }

  return {
    id: `${room.id}-replay`,
    roomId: room.id,
    category: "replay",
    status:
      room.syncReplay.roomAgeMinutes !== null &&
      room.syncReplay.roomAgeMinutes > 60 * 72
        ? "blocked"
        : "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Replay freshness",
    detail:
      room.syncReplay.roomAgeMinutes === null
        ? "No replay timestamp is available."
        : `Room replay is ${Math.round(room.syncReplay.roomAgeMinutes)} minutes old.`,
    recommendation: "Refresh the room before release or attach the stale replay note.",
    count: room.syncReplay.roomAgeMinutes ?? 0,
    latestAt: room.roomUpdatedAt,
  };
}

function getMentionRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  if (room.unresolvedMentionCount === 0) {
    return null;
  }

  return {
    id: `${room.id}-mentions`,
    roomId: room.id,
    category: "mentions",
    status: "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Unresolved mention queue",
    detail: `${room.unresolvedMentionCount} chat or comment mentions need handoff review.`,
    recommendation: "Assign the mention owner or resolve the thread before handoff.",
    count: room.unresolvedMentionCount,
    latestAt: room.latestAt,
  };
}

function getPresenterRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  if (room.presenter.status === "owned" && room.presenter.replayEventCount > 0) {
    return null;
  }

  return {
    id: `${room.id}-presenter`,
    roomId: room.id,
    category: "presenter",
    status: room.presenter.status === "conflict" ? "blocked" : "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Presenter ownership",
    detail: room.presenter.summary,
    recommendation:
      room.presenter.status === "conflict"
        ? "Stop duplicate spotlights and identify the single presenter owner."
        : "Record presenter ownership or replay evidence before live handoff.",
    count: room.presenter.activePresenterCount,
    latestAt: room.presenter.lastHandoffAt,
  };
}

function getConflictRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  const conflictCount = room.operationConflictCount + room.targetConflictCount;

  if (conflictCount === 0) {
    return null;
  }

  return {
    id: `${room.id}-conflicts`,
    roomId: room.id,
    category: "conflicts",
    status: room.syncReplay.conflictScore < 70 ? "blocked" : "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Collaboration conflict queue",
    detail: `${room.operationConflictCount} operation and ${room.targetConflictCount} target conflicts need review.`,
    recommendation: "Resolve conflict-review rows before exporting collaboration evidence.",
    count: conflictCount,
    latestAt: room.latestAt,
  };
}

function getEscalationRow(
  room: AdminCollaborationHandoffRoom,
): AdminCollaborationHandoffRow | null {
  if (room.escalationCount === 0) {
    return null;
  }

  return {
    id: `${room.id}-escalation`,
    roomId: room.id,
    category: "escalation",
    status: room.status === "blocked" ? "blocked" : "review",
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    label: "Admin escalation export",
    detail: `${room.escalationCount} collaboration handoff signals require admin review.`,
    recommendation: room.recommendation,
    count: room.escalationCount,
    latestAt: getLatestCollaborationIso(room.latestAt, room.presenter.lastHandoffAt),
  };
}
