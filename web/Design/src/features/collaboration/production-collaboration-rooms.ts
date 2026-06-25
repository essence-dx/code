import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type {
  LiveCollaborationCursorConflict,
  LiveCollaborationOperationHistoryItem,
  LiveCollaborationParticipant,
  LiveCollaborationReviewerLock,
  LiveCollaborationSessionReconciliation,
  LiveCollaborationSessionStatus,
} from "@/features/collaboration/live-collaboration-session-reconciliation";
import type {
  ProductionCollaborationAsyncUpdate,
  ProductionCollaborationConflictOwnership,
  ProductionCollaborationEvidenceBundle,
  ProductionCollaborationRoleHandoff,
  ProductionCollaborationRoom,
  ProductionCollaborationRoomCenter,
  ProductionCollaborationRoomInput,
  ProductionCollaborationRoomStatus,
  ProductionCollaborationSessionGoal,
} from "@/features/collaboration/production-collaboration-rooms-types";

export type {
  ProductionCollaborationAsyncUpdate,
  ProductionCollaborationAsyncUpdateKind,
  ProductionCollaborationConflictKind,
  ProductionCollaborationConflictOwnership,
  ProductionCollaborationEvidenceBundle,
  ProductionCollaborationRoleHandoff,
  ProductionCollaborationRoom,
  ProductionCollaborationRoomCenter,
  ProductionCollaborationRoomInput,
  ProductionCollaborationRoomRole,
  ProductionCollaborationRoomStatus,
  ProductionCollaborationSessionGoal,
} from "@/features/collaboration/production-collaboration-rooms-types";

export function createProductionCollaborationRoomCenter(
  input: ProductionCollaborationRoomInput,
): ProductionCollaborationRoomCenter {
  const generatedAt = normalizeDate(
    input.now ?? input.sessionReconciliation.generatedAt,
  ).toISOString();
  const rooms = input.sessionReconciliation.sessions
    .map((session) =>
      createRoom({
        session,
        reviewTasks: input.reviewTasks.filter(
          (task) => task.projectId === session.projectId && !task.resolved,
        ),
        auditLogs: input.auditLogs.filter((log) =>
          isProjectAuditLog(log, session.projectId),
        ),
        generatedAt,
      }),
    )
    .sort(compareRooms);
  const status = aggregateStatus(rooms.map((room) => room.status));
  const score = average(
    rooms.map((room) => room.score),
    100,
  );
  const nextActions = rooms
    .flatMap((room) => room.nextActions)
    .filter(Boolean)
    .slice(0, 8);

  return {
    generatedAt,
    status,
    score,
    rooms,
    nextActions,
    totals: {
      rooms: rooms.length,
      readyRooms: rooms.filter((room) => room.status === "ready").length,
      reviewRooms: rooms.filter((room) => room.status === "review").length,
      blockedRooms: rooms.filter((room) => room.status === "blocked").length,
      sessionGoals: rooms.length,
      roleHandoffs: rooms.reduce(
        (total, room) => total + room.roleHandoffs.length,
        0,
      ),
      conflictOwners: rooms.reduce(
        (total, room) => total + room.conflictOwnership.length,
        0,
      ),
      asyncUpdates: rooms.reduce(
        (total, room) => total + room.asyncUpdates.length,
        0,
      ),
      evidenceBundles: rooms.length,
      openReviewTasks: rooms.reduce(
        (total, room) =>
          total +
          room.asyncUpdates.filter((update) => update.kind === "review-task")
            .length,
        0,
      ),
      auditEvents: rooms.reduce(
        (total, room) =>
          total +
          room.asyncUpdates.filter((update) => update.kind === "audit").length,
        0,
      ),
    },
  };
}

function createRoom(input: {
  session: LiveCollaborationSessionReconciliation;
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
}): ProductionCollaborationRoom {
  const roomId = `production-room-${input.session.projectId}`;
  const conflictOwnership = createConflictOwnership({
    roomId,
    session: input.session,
  });
  const status = aggregateStatus([
    input.session.status,
    ...conflictOwnership.map((ownership) => ownership.status),
  ]);
  const sessionGoal = createSessionGoal({
    roomId,
    session: input.session,
    status,
    conflictOwnership,
  });
  const roleHandoffs = createRoleHandoffs({
    roomId,
    session: input.session,
    status,
    conflictOwnership,
  });
  const asyncUpdates = createAsyncUpdates({
    roomId,
    session: input.session,
    reviewTasks: input.reviewTasks,
    auditLogs: input.auditLogs,
  });
  const nextActions = createRoomNextActions({
    session: input.session,
    sessionGoal,
    conflictOwnership,
    roleHandoffs,
  });
  const evidenceBundle = createEvidenceBundle({
    generatedAt: input.generatedAt,
    session: input.session,
    sessionGoal,
    roleHandoffs,
    conflictOwnership,
    asyncUpdates,
    nextActions,
  });

  return {
    id: roomId,
    projectId: input.session.projectId,
    projectName: input.session.projectName,
    status,
    score: scoreRoom({
      sessionScore: input.session.score,
      conflictOwnership,
      roleHandoffs,
      asyncUpdates,
    }),
    sourceSession: input.session,
    sessionGoal,
    roleHandoffs,
    conflictOwnership,
    asyncUpdates,
    evidenceBundle,
    nextActions,
  };
}

function createSessionGoal(input: {
  roomId: string;
  session: LiveCollaborationSessionReconciliation;
  status: ProductionCollaborationRoomStatus;
  conflictOwnership: ProductionCollaborationConflictOwnership[];
}): ProductionCollaborationSessionGoal {
  const ownerName = getPrimaryOwner(input);
  const conflictCount = input.conflictOwnership.length;

  if (
    input.session.operationMergeHistory.some(
      (operation) => operation.status === "conflict",
    )
  ) {
    return {
      id: `${input.roomId}-goal-operation`,
      roomId: input.roomId,
      title: `Resolve stale collaboration operations before production handoff`,
      detail: `${input.session.projectName} has ${conflictCount} owned collaboration blockers before the next export, publish, or client review.`,
      ownerName,
      status: input.status,
    };
  }

  if (input.session.reviewerLocks.length) {
    return {
      id: `${input.roomId}-goal-reviewer-lock`,
      roomId: input.roomId,
      title: "Finish reviewer-owned locks before live editing continues",
      detail: `${input.session.projectName} has reviewer locks that need explicit handoff before collaborators resume editing.`,
      ownerName,
      status: input.status,
    };
  }

  if (input.session.reconnectRecoveries.length) {
    return {
      id: `${input.roomId}-goal-reconnect`,
      roomId: input.roomId,
      title: "Reconnect missing collaborators before release review",
      detail: `${input.session.projectName} has participants who need recovery steps before the room can move to production review.`,
      ownerName,
      status: input.status,
    };
  }

  return {
    id: `${input.roomId}-goal-ready`,
    roomId: input.roomId,
    title: "Coordinate production collaboration handoff",
    detail: `${input.session.projectName} is ready for a goal-led collaboration room with evidence captured for the next handoff.`,
    ownerName,
    status: input.status,
  };
}

function createConflictOwnership(input: {
  roomId: string;
  session: LiveCollaborationSessionReconciliation;
}): ProductionCollaborationConflictOwnership[] {
  return [
    ...input.session.operationMergeHistory
      .filter((operation) => operation.status === "conflict")
      .map((operation) =>
        createOperationOwnership({
          roomId: input.roomId,
          projectName: input.session.projectName,
          operation,
        }),
      ),
    ...input.session.cursorConflictQueue.map((conflict) =>
      createCursorOwnership({
        roomId: input.roomId,
        conflict,
      }),
    ),
    ...input.session.reviewerLocks.map((lock) =>
      createReviewerLockOwnership({
        roomId: input.roomId,
        lock,
      }),
    ),
    ...input.session.reconnectRecoveries.map((recovery) => ({
      id: `${input.roomId}-ownership-${recovery.id}`,
      roomId: input.roomId,
      kind: "reconnect" as const,
      ownerName: recovery.userName,
      projectName: recovery.projectName,
      pageId: recovery.pageId,
      target: recovery.pageId,
      status: recovery.status,
      detail: recovery.recoverySteps[0] ?? "Reconnect participant.",
      nextStep: `Ask ${recovery.userName} to reopen ${recovery.pageId} and confirm latest changes before the room continues.`,
      evidenceIds: [recovery.id],
    })),
  ].sort(
    (left, right) =>
      statusWeight(right.status) - statusWeight(left.status) ||
      conflictKindWeight(left.kind) - conflictKindWeight(right.kind) ||
      left.ownerName.localeCompare(right.ownerName),
  );
}

function createOperationOwnership(input: {
  roomId: string;
  projectName: string;
  operation: LiveCollaborationOperationHistoryItem;
}): ProductionCollaborationConflictOwnership {
  const target =
    input.operation.elementIds[0] ??
    input.operation.pageId ??
    input.operation.operationId;

  return {
    id: `${input.roomId}-ownership-operation-${input.operation.operationId}`,
    roomId: input.roomId,
    kind: "operation",
    ownerName: input.operation.actorName,
    projectName: input.projectName,
    pageId: input.operation.pageId,
    target,
    status: "blocked",
    detail: input.operation.detail,
    nextStep: `Assign ${input.operation.actorName} to resolve ${input.operation.operationKind} in ${input.projectName} from the latest merged document.`,
    evidenceIds: [input.operation.auditLogId, input.operation.operationId],
  };
}

function createCursorOwnership(input: {
  roomId: string;
  conflict: LiveCollaborationCursorConflict;
}): ProductionCollaborationConflictOwnership {
  const ownerName = input.conflict.participantNames[1]
    ? input.conflict.participantNames[1]
    : (input.conflict.participantNames[0] ?? "Collaborator");

  return {
    id: `${input.roomId}-ownership-${input.conflict.id}`,
    roomId: input.roomId,
    kind: "cursor",
    ownerName,
    projectName: input.conflict.projectName,
    pageId: input.conflict.pageId,
    target: input.conflict.pageId,
    status: input.conflict.status,
    detail: input.conflict.detail,
    nextStep: `Assign ${ownerName} to separate active cursor focus on ${input.conflict.pageId}.`,
    evidenceIds: [input.conflict.id],
  };
}

function createReviewerLockOwnership(input: {
  roomId: string;
  lock: LiveCollaborationReviewerLock;
}): ProductionCollaborationConflictOwnership {
  return {
    id: `${input.roomId}-ownership-${input.lock.id}`,
    roomId: input.roomId,
    kind: "review-lock",
    ownerName: input.lock.assigneeName,
    projectName: input.lock.projectName,
    pageId: input.lock.pageId,
    target: input.lock.lockTarget,
    status: input.lock.status,
    detail: input.lock.detail,
    nextStep: `Keep ${input.lock.lockTarget} reserved for ${input.lock.assigneeName} until the review handoff clears.`,
    evidenceIds: [input.lock.id, input.lock.taskId],
  };
}

function createRoleHandoffs(input: {
  roomId: string;
  session: LiveCollaborationSessionReconciliation;
  status: ProductionCollaborationRoomStatus;
  conflictOwnership: ProductionCollaborationConflictOwnership[];
}): ProductionCollaborationRoleHandoff[] {
  const facilitator = getMostRecentParticipant(input.session.participants);
  const firstLock = input.session.reviewerLocks[0] ?? null;
  const firstOperation = input.conflictOwnership.find(
    (ownership) => ownership.kind === "operation",
  );
  const firstReconnect = input.conflictOwnership.find(
    (ownership) => ownership.kind === "reconnect",
  );
  const handoffs: ProductionCollaborationRoleHandoff[] = [];

  if (facilitator) {
    handoffs.push({
      id: `${input.roomId}-handoff-facilitator`,
      roomId: input.roomId,
      role: "facilitator",
      ownerName: facilitator.userName,
      fromName: null,
      toName: facilitator.userName,
      pageId: facilitator.pageId,
      target: input.session.projectName,
      status: input.status,
      detail: `${facilitator.userName} is the most recent active participant and should coordinate the production room.`,
    });
  }

  if (firstLock) {
    handoffs.push({
      id: `${input.roomId}-handoff-reviewer-${firstLock.taskId}`,
      roomId: input.roomId,
      role: "reviewer",
      ownerName: firstLock.assigneeName,
      fromName: facilitator?.userName ?? null,
      toName: firstLock.assigneeName,
      pageId: firstLock.pageId,
      target: firstLock.lockTarget,
      status: input.status,
      detail: `${firstLock.assigneeName} owns reviewer handoff for ${firstLock.lockTarget}.`,
    });
  }

  if (firstOperation) {
    handoffs.push({
      id: `${input.roomId}-handoff-conflict-${firstOperation.id}`,
      roomId: input.roomId,
      role: "conflict-owner",
      ownerName: firstOperation.ownerName,
      fromName: facilitator?.userName ?? null,
      toName: firstOperation.ownerName,
      pageId: firstOperation.pageId,
      target: firstOperation.target,
      status: firstOperation.status,
      detail: firstOperation.nextStep,
    });
  }

  if (firstReconnect) {
    handoffs.push({
      id: `${input.roomId}-handoff-reconnect-${firstReconnect.id}`,
      roomId: input.roomId,
      role: "reconnect-owner",
      ownerName: firstReconnect.ownerName,
      fromName: facilitator?.userName ?? null,
      toName: firstReconnect.ownerName,
      pageId: firstReconnect.pageId,
      target: firstReconnect.target,
      status: firstReconnect.status,
      detail: firstReconnect.nextStep,
    });
  }

  return handoffs;
}

function createAsyncUpdates(input: {
  roomId: string;
  session: LiveCollaborationSessionReconciliation;
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): ProductionCollaborationAsyncUpdate[] {
  const auditUpdates = input.auditLogs.map((log) => ({
    id: `${input.roomId}-async-audit-${log.id}`,
    roomId: input.roomId,
    kind: "audit" as const,
    ownerName: getAuditOwner(log),
    summary: log.summary,
    status:
      log.action === "collaboration.operation.conflicted"
        ? ("blocked" as const)
        : ("review" as const),
    createdAt: log.createdAt,
    evidenceId: log.id,
  }));
  const taskUpdates = input.reviewTasks
    .filter((task) => task.taskStatus !== "done" && task.taskStatus !== "none")
    .map((task) => ({
      id: `${input.roomId}-async-task-${task.id}`,
      roomId: input.roomId,
      kind: "review-task" as const,
      ownerName: task.taskAssigneeName ?? task.authorName,
      summary: task.body,
      status: "review" as const,
      createdAt: task.updatedAt,
      evidenceId: task.id,
    }));

  return [...auditUpdates, ...taskUpdates]
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        asyncKindWeight(left.kind) - asyncKindWeight(right.kind) ||
        left.summary.localeCompare(right.summary),
    )
    .slice(0, 8);
}

function createRoomNextActions(input: {
  session: LiveCollaborationSessionReconciliation;
  sessionGoal: ProductionCollaborationSessionGoal;
  conflictOwnership: ProductionCollaborationConflictOwnership[];
  roleHandoffs: ProductionCollaborationRoleHandoff[];
}) {
  const ownerActions = input.conflictOwnership.map(
    (ownership) => ownership.nextStep,
  );
  const handoffActions = input.roleHandoffs
    .filter((handoff) => handoff.role === "reviewer")
    .map(
      (handoff) =>
        `Confirm ${handoff.ownerName}'s ${handoff.role} handoff on ${input.session.projectName} ${handoff.target}.`,
    );

  return [
    ...ownerActions,
    ...handoffActions,
    `Use the ${input.sessionGoal.title.toLowerCase()} goal before exporting ${input.session.projectName}.`,
  ].slice(0, 6);
}

function createEvidenceBundle(input: {
  generatedAt: string;
  session: LiveCollaborationSessionReconciliation;
  sessionGoal: ProductionCollaborationSessionGoal;
  roleHandoffs: ProductionCollaborationRoleHandoff[];
  conflictOwnership: ProductionCollaborationConflictOwnership[];
  asyncUpdates: ProductionCollaborationAsyncUpdate[];
  nextActions: string[];
}): ProductionCollaborationEvidenceBundle {
  const payload = {
    kind: "essence-studio.production-collaboration-room",
    version: 1,
    generatedAt: input.generatedAt,
    room: {
      id: `production-room-${input.session.projectId}`,
      projectId: input.session.projectId,
      projectName: input.session.projectName,
      status: input.session.status,
      score: input.session.score,
    },
    sessionGoal: input.sessionGoal,
    roleHandoffs: input.roleHandoffs,
    conflictOwnership: input.conflictOwnership,
    asyncUpdates: input.asyncUpdates,
    nextActions: input.nextActions,
    sourcePackets: {
      sessionReplayPacketId: input.session.sessionReplayPacket.id,
      evidencePacketId: input.session.evidencePacket.id,
      auditLogIds: input.session.evidencePacket.auditLogIds,
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const fileName = `production-collaboration-room-${slugify(
    input.session.projectName,
  )}.json`;

  return {
    id: `production-room-evidence-${input.session.projectId}`,
    roomId: `production-room-${input.session.projectId}`,
    fileName,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

function scoreRoom(input: {
  sessionScore: number;
  conflictOwnership: ProductionCollaborationConflictOwnership[];
  roleHandoffs: ProductionCollaborationRoleHandoff[];
  asyncUpdates: ProductionCollaborationAsyncUpdate[];
}) {
  const handoffPenalty = input.roleHandoffs.length ? 0 : 8;
  const asyncPenalty = input.asyncUpdates.length ? 0 : 6;

  return Math.max(0, input.sessionScore - handoffPenalty - asyncPenalty);
}

function getPrimaryOwner(input: {
  session: LiveCollaborationSessionReconciliation;
  conflictOwnership: ProductionCollaborationConflictOwnership[];
}) {
  return (
    input.conflictOwnership[0]?.ownerName ??
    getMostRecentParticipant(input.session.participants)?.userName ??
    "Workspace owner"
  );
}

function getMostRecentParticipant(
  participants: LiveCollaborationParticipant[],
) {
  return participants
    .slice()
    .sort(
      (left, right) =>
        Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt) ||
        left.userName.localeCompare(right.userName),
    )[0];
}

function getAuditOwner(log: WorkspaceAuditLogSummary) {
  const actorName = stringOrNull(log.metadata.actorName);

  if (actorName) return actorName;
  if (log.actorEmail) return log.actorEmail;

  return "Workspace";
}

function isProjectAuditLog(log: WorkspaceAuditLogSummary, projectId: string) {
  return (
    log.targetId === projectId ||
    stringOrNull(log.metadata.projectId) === projectId
  );
}

function aggregateStatus(statuses: LiveCollaborationSessionStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function statusWeight(status: LiveCollaborationSessionStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function conflictKindWeight(
  kind: ProductionCollaborationConflictOwnership["kind"],
) {
  if (kind === "operation") return 0;
  if (kind === "cursor") return 1;
  if (kind === "review-lock") return 2;

  return 3;
}

function asyncKindWeight(kind: ProductionCollaborationAsyncUpdate["kind"]) {
  return kind === "audit" ? 0 : 1;
}

function compareRooms(
  left: ProductionCollaborationRoom,
  right: ProductionCollaborationRoom,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.conflictOwnership.length - left.conflictOwnership.length ||
    left.projectName.localeCompare(right.projectName)
  );
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "room"
  );
}
