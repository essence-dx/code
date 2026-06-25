import { getAdminCollaborationPresenterState } from "@/features/admin/admin-collaboration-handoff-operations-presenter";
import {
  isCollaborationHandoffActionCurrent,
  type CollaborationHandoffActionState,
} from "@/features/admin/admin-collaboration-handoff-actions";
import {
  getEmptyCollaborationHandoffRow,
  sortAdminCollaborationHandoffRows,
  toAdminCollaborationHandoffRows,
} from "@/features/admin/admin-collaboration-handoff-operations-rows";
import type {
  AdminCollaborationHandoffFile,
  AdminCollaborationHandoffInput,
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRoom,
  AdminCollaborationHandoffStatus,
} from "@/features/admin/admin-collaboration-handoff-operations-types";
import {
  getChatMentionCount,
  getLatestCollaborationIso,
  getLatestPresenceEventIso,
  getLatestUnresolvedDocumentMentionIso,
  getUnresolvedDocumentMentionCount,
  getWorstCollaborationHandoffStatus,
  toIsoFromMs,
} from "@/features/admin/admin-collaboration-handoff-operations-utils";
import { getCollaborationSyncReplayReport } from "@/features/editor/collaboration-sync-replay";
import { toCollaborationRoomSnapshot } from "@/features/editor/collaboration-room-state";

export type {
  AdminCollaborationHandoffCategory,
  AdminCollaborationHandoffFile,
  AdminCollaborationHandoffInput,
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRoom,
  AdminCollaborationHandoffRow,
  AdminCollaborationHandoffStatus,
  AdminCollaborationPresenterState,
} from "@/features/admin/admin-collaboration-handoff-operations-types";

export function getAdminCollaborationHandoffOperationsReport({
  actionStates,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
}: AdminCollaborationHandoffInput): AdminCollaborationHandoffOperationsReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const rooms = activeFiles.map((file) =>
    toHandoffRoom(file, now, actionStates?.get(file.fileId)),
  );
  const rows = rooms
    .flatMap(toAdminCollaborationHandoffRows)
    .sort(sortAdminCollaborationHandoffRows);
  const blockedCount = rooms.filter((room) => room.status === "blocked").length;
  const reviewCount = rooms.filter((room) => room.status === "review").length;
  const readyCount = rooms.filter((room) => room.status === "ready").length;
  const finalRows = rows.length > 0 ? rows : [getEmptyCollaborationHandoffRow()];

  return {
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    fileCount: activeFiles.length,
    roomCount: rooms.length,
    capturedRoomCount: rooms.filter((room) => room.roomCaptured).length,
    activeRoomCount: rooms.filter(
      (room) => room.chatMessageCount > 0 || room.presenceEventCount > 0,
    ).length,
    staleRoomCount: rooms.filter(
      (room) =>
        room.roomAgeMinutes === null ||
        room.roomAgeMinutes > 60 * 24,
    ).length,
    unresolvedMentionCount: rooms.reduce(
      (total, room) => total + room.unresolvedMentionCount,
      0,
    ),
    presenterConflictCount: rooms.filter(
      (room) => room.presenter.status === "conflict",
    ).length,
    presenterOwnedCount: rooms.filter(
      (room) => room.presenter.status === "owned",
    ).length,
    conflictQueueCount: rooms.reduce(
      (total, room) =>
        total + room.operationConflictCount + room.targetConflictCount,
      0,
    ),
    escalationQueueCount: rooms.reduce(
      (total, room) => total + room.escalationCount,
      0,
    ),
    assignedOwnerCount: rooms.filter((room) => room.handoffAssignedAt).length,
    archivedEvidenceCount: rooms.filter((room) => room.evidenceArchivedAt)
      .length,
    clearedSnapshotCount: rooms.filter((room) => room.staleSnapshotClearedAt)
      .length,
    resolvedQueueCount: rooms.filter(
      (room) => room.mentionQueueResolvedAt || room.escalationQueueResolvedAt,
    ).length,
    replayFreshCount: rooms.filter(
      (room) =>
        room.roomCaptured &&
        room.roomAgeMinutes !== null &&
        room.roomAgeMinutes <= 60 * 24,
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    rooms,
    rows: finalRows,
    commands: getCollaborationHandoffCommands(),
  };
}

function toHandoffRoom(
  file: AdminCollaborationHandoffFile,
  now: number,
  actionState?: CollaborationHandoffActionState,
): AdminCollaborationHandoffRoom {
  const snapshot = toCollaborationRoomSnapshot(file.document.collaborationRoom);
  const syncReplay = getCollaborationSyncReplayReport(file.document, now);
  const presenter = getAdminCollaborationPresenterState(snapshot.presenceEvents);
  const latestChatAt = toIsoFromMs(
    snapshot.chatMessages.reduce(
      (latest, message) => Math.max(latest, message.createdAt),
      0,
    ),
  );
  const latestSignalAt = [
    snapshot.updatedAt,
    getLatestPresenceEventIso(snapshot.presenceEvents),
    latestChatAt,
    getLatestUnresolvedDocumentMentionIso(file.document),
  ].reduce(getLatestCollaborationIso, null as string | null);
  const mentionQueueResolved = isCollaborationHandoffActionCurrent(
    actionState?.mentionQueueResolvedAt,
    latestSignalAt,
  );
  const escalationQueueResolved = isCollaborationHandoffActionCurrent(
    actionState?.escalationQueueResolvedAt,
    latestSignalAt,
  );
  const rawUnresolvedMentionCount =
    getChatMentionCount(snapshot.chatMessages) +
    getUnresolvedDocumentMentionCount(file.document);
  const unresolvedMentionCount = mentionQueueResolved
    ? 0
    : rawUnresolvedMentionCount;
  const conflictCount =
    syncReplay.operationConflictCount + syncReplay.targetConflictCount;
  const staleRoom =
    syncReplay.roomAgeMinutes === null || syncReplay.roomAgeMinutes > 60 * 24;
  const presenterNeedsReview =
    presenter.status === "conflict" ||
    ((snapshot.chatMessages.length > 0 || snapshot.presenceEvents.length > 0) &&
      presenter.status === "idle");
  const rawEscalationCount = [
    !syncReplay.roomCaptured,
    staleRoom,
    rawUnresolvedMentionCount > 0,
    presenterNeedsReview,
    conflictCount > 0,
    syncReplay.eventDriftCount > 0,
    syncReplay.offlineReplayQueueCount > 0,
  ].filter(Boolean).length;
  const escalationCount = escalationQueueResolved ? 0 : rawEscalationCount;
  const status = getRoomStatus({
    escalationCount,
    presenterStatus: presenter.status,
    staleRoom,
    syncStatus: syncReplay.status,
  });
  const latestAt = [
    snapshot.updatedAt,
    getLatestPresenceEventIso(snapshot.presenceEvents),
    latestChatAt,
    getLatestUnresolvedDocumentMentionIso(file.document),
    actionState?.latestActionAt ?? null,
    file.updatedAt,
  ].reduce(getLatestCollaborationIso, null as string | null);

  return {
    id: `collaboration-room-${file.fileId}`,
    status,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    roomCaptured: syncReplay.roomCaptured,
    roomUpdatedAt: snapshot.updatedAt,
    roomAgeMinutes: syncReplay.roomAgeMinutes,
    chatMessageCount: snapshot.chatMessages.length,
    presenceEventCount: snapshot.presenceEvents.length,
    unresolvedMentionCount,
    rawUnresolvedMentionCount,
    presenter,
    operationConflictCount: syncReplay.operationConflictCount,
    targetConflictCount: syncReplay.targetConflictCount,
    eventDriftCount: syncReplay.eventDriftCount,
    offlineReplayQueueCount: syncReplay.offlineReplayQueueCount,
    escalationCount,
    rawEscalationCount,
    syncReplay,
    latestAt,
    latestSignalAt,
    handoffOwnerName: actionState?.ownerName ?? null,
    handoffOwnerEmail: actionState?.ownerEmail ?? null,
    handoffAssignedAt: actionState?.assignedAt ?? null,
    evidenceArchivedAt: isCollaborationHandoffActionCurrent(
      actionState?.evidenceArchivedAt,
      latestSignalAt,
    )
      ? (actionState?.evidenceArchivedAt ?? null)
      : null,
    staleSnapshotClearedAt: actionState?.staleSnapshotClearedAt ?? null,
    mentionQueueResolvedAt: mentionQueueResolved
      ? (actionState?.mentionQueueResolvedAt ?? null)
      : null,
    escalationQueueResolvedAt: escalationQueueResolved
      ? (actionState?.escalationQueueResolvedAt ?? null)
      : null,
    actionCount: actionState?.actionCount ?? 0,
    recommendation: getRoomRecommendation(status, escalationCount),
  };
}

function getRoomStatus({
  escalationCount,
  presenterStatus,
  staleRoom,
  syncStatus,
}: {
  escalationCount: number;
  presenterStatus: "idle" | "owned" | "conflict";
  staleRoom: boolean;
  syncStatus: AdminCollaborationHandoffStatus;
}) {
  return getWorstCollaborationHandoffStatus([
    syncStatus,
    presenterStatus === "conflict" ? "blocked" : "ready",
    staleRoom ? "review" : "ready",
    escalationCount > 0 ? "review" : "ready",
  ]);
}

function getRoomRecommendation(
  status: AdminCollaborationHandoffStatus,
  escalationCount: number,
) {
  if (status === "blocked") {
    return "Escalate this room before release handoff and attach the conflict export.";
  }

  if (status === "review" || escalationCount > 0) {
    return "Refresh replay, resolve mentions, confirm presenter ownership, and export the room evidence.";
  }

  return "Room handoff evidence is ready for the production collaboration packet.";
}

function getCollaborationHandoffCommands() {
  return [
    "Refresh collaboration rooms before release handoff and confirm replay age is under 24 hours.",
    "Resolve or assign chat and comment mentions before exporting handoff evidence.",
    "Use room actions to assign handoff owners, archive evidence, clear stale snapshots, and resolve queues with audit trails.",
    "Confirm one presenter owner for spotlight/follow sessions before live review.",
    "Review operation and target conflict queues before publishing branch or share updates.",
    "Export this report with collaboration replay, public links, and access budget evidence.",
  ];
}
