import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceProjectPresenceSummary } from "@/db/project-presence";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  LiveCollaborationCursorConflict,
  LiveCollaborationEvidencePacket,
  LiveCollaborationOperationHistoryItem,
  LiveCollaborationParticipant,
  LiveCollaborationReviewerLock,
  LiveCollaborationReconnectRecovery,
  LiveCollaborationSessionReconciliation,
  LiveCollaborationSessionReplayEvent,
  LiveCollaborationSessionReplayPacket,
  LiveCollaborationSessionReconciliationCenter,
  LiveCollaborationSessionStatus,
} from "@/features/collaboration/live-collaboration-session-reconciliation-types";

export type {
  LiveCollaborationCursorConflict,
  LiveCollaborationEvidencePacket,
  LiveCollaborationOperationHistoryItem,
  LiveCollaborationOperationStatus,
  LiveCollaborationParticipant,
  LiveCollaborationParticipantState,
  LiveCollaborationReviewerLock,
  LiveCollaborationReconnectRecovery,
  LiveCollaborationSessionReconciliation,
  LiveCollaborationSessionReplayEvent,
  LiveCollaborationSessionReplayPacket,
  LiveCollaborationSessionReconciliationCenter,
  LiveCollaborationSessionStatus,
} from "@/features/collaboration/live-collaboration-session-reconciliation-types";

export type LiveCollaborationSessionReconciliationInput = {
  projects: ProjectSummary[];
  presence: WorkspaceProjectPresenceSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

const activePresenceSeconds = 45;
const reconnectReviewSeconds = 120;
const reconnectBlockedSeconds = 15 * 60;
const cursorConflictDistance = 48;
const blockedCursorDistance = 16;

export function createLiveCollaborationSessionReconciliationCenter(
  input: LiveCollaborationSessionReconciliationInput,
): LiveCollaborationSessionReconciliationCenter {
  const now = normalizeNow(input.now);
  const generatedAt = now.toISOString();
  const projectById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const presenceByProject = groupByProject(input.presence);
  const sessions = Array.from(presenceByProject.entries())
    .map(([projectId, records]) => {
      const project = projectById.get(projectId);

      return createSession({
        projectId,
        projectName:
          project?.name ?? records[0]?.projectName ?? "Untitled project",
        presence: records,
        reviewTasks: input.reviewTasks.filter(
          (task) => task.projectId === projectId && !task.resolved,
        ),
        auditLogs: input.auditLogs.filter(
          (log) =>
            log.targetId === projectId ||
            String(log.metadata.projectId ?? "") === projectId,
        ),
        now,
        generatedAt,
      });
    })
    .sort(
      (left, right) =>
        statusWeight(right.status) - statusWeight(left.status) ||
        right.participants.length - left.participants.length ||
        left.projectName.localeCompare(right.projectName),
    );
  const status = createStatus({
    blocked: sessions.filter((session) => session.status === "blocked").length,
    review: sessions.filter((session) => session.status === "review").length,
  });
  const auditLogIds = unique(
    sessions.flatMap((session) => session.evidencePacket.auditLogIds),
  );

  return {
    status,
    score: scoreSessions(sessions),
    generatedAt,
    sessions,
    nextActions: createNextActions(sessions),
    totals: {
      sessions: sessions.length,
      activeSessions: sessions.filter((session) =>
        session.participants.some(
          (participant) => participant.state === "active",
        ),
      ).length,
      participants: sessions.reduce(
        (total, session) => total + session.participants.length,
        0,
      ),
      activeParticipants: sessions.reduce(
        (total, session) =>
          total +
          session.participants.filter(
            (participant) => participant.state === "active",
          ).length,
        0,
      ),
      reconnectRecoveries: sessions.reduce(
        (total, session) => total + session.reconnectRecoveries.length,
        0,
      ),
      cursorConflicts: sessions.reduce(
        (total, session) => total + session.cursorConflictQueue.length,
        0,
      ),
      operationMerges: sessions.reduce(
        (total, session) =>
          total +
          session.operationMergeHistory.filter(
            (operation) => operation.status === "merged",
          ).length,
        0,
      ),
      operationConflicts: sessions.reduce(
        (total, session) =>
          total +
          session.operationMergeHistory.filter(
            (operation) => operation.status === "conflict",
          ).length,
        0,
      ),
      reviewerLocks: sessions.reduce(
        (total, session) => total + session.reviewerLocks.length,
        0,
      ),
      blockedSessions: sessions.filter(
        (session) => session.status === "blocked",
      ).length,
      reviewSessions: sessions.filter((session) => session.status === "review")
        .length,
      evidencePackets: sessions.length,
      replayPackets: sessions.length,
      auditEvents: auditLogIds.length,
    },
  };
}

function createSession(input: {
  projectId: string;
  projectName: string;
  presence: WorkspaceProjectPresenceSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now: Date;
  generatedAt: string;
}): LiveCollaborationSessionReconciliation {
  const participants = input.presence
    .map((record) => createParticipant(record, input.now))
    .sort(
      (left, right) =>
        Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt),
    );
  const reconnectRecoveries = createReconnectRecoveries({
    projectId: input.projectId,
    projectName: input.projectName,
    participants,
    reviewTasks: input.reviewTasks,
  });
  const operationMergeHistory = createOperationMergeHistory({
    projectId: input.projectId,
    auditLogs: input.auditLogs,
  });
  const reviewerLocks = createReviewerLocks({
    projectId: input.projectId,
    projectName: input.projectName,
    participants,
    reviewTasks: input.reviewTasks,
  });
  const cursorConflictQueue = createCursorConflictQueue({
    projectId: input.projectId,
    projectName: input.projectName,
    participants,
  });
  const status = createStatus({
    blocked:
      reconnectRecoveries.filter((item) => item.status === "blocked").length +
      cursorConflictQueue.filter((item) => item.status === "blocked").length +
      reviewerLocks.filter((item) => item.status === "blocked").length +
      operationMergeHistory.filter((item) => item.status === "conflict").length,
    review:
      reconnectRecoveries.filter((item) => item.status === "review").length +
      cursorConflictQueue.filter((item) => item.status === "review").length +
      reviewerLocks.filter((item) => item.status === "review").length,
  });
  const sessionReplayPacket = createSessionReplayPacket({
    projectId: input.projectId,
    projectName: input.projectName,
    status,
    participants,
    operationMergeHistory,
    reviewerLocks,
    reconnectRecoveries,
    cursorConflictQueue,
    generatedAt: input.generatedAt,
  });
  const evidencePacket = createEvidencePacket({
    projectId: input.projectId,
    projectName: input.projectName,
    status,
    participants,
    operationMergeHistory,
    reviewerLocks,
    reconnectRecoveries,
    cursorConflictQueue,
    auditLogs: input.auditLogs,
    generatedAt: input.generatedAt,
  });

  return {
    id: `session-${input.projectId}`,
    projectId: input.projectId,
    projectName: input.projectName,
    status,
    score: scoreSession({
      operationMergeHistory,
      reviewerLocks,
      reconnectRecoveries,
      cursorConflictQueue,
    }),
    participants,
    presenceHistory: participants,
    operationMergeHistory,
    reviewerLocks,
    reconnectRecoveries,
    cursorConflictQueue,
    sessionReplayPacket,
    evidencePacket,
  };
}

function createParticipant(
  record: WorkspaceProjectPresenceSummary,
  now: Date,
): LiveCollaborationParticipant {
  const ageSeconds = Math.max(
    0,
    Math.round((now.getTime() - Date.parse(record.lastSeenAt)) / 1000),
  );

  return {
    id: `${record.projectId}-${record.userId}`,
    userId: record.userId,
    userName: record.userName,
    color: record.color,
    pageId: record.pageId,
    cursorX: record.cursorX,
    cursorY: record.cursorY,
    lastSeenAt: record.lastSeenAt,
    ageSeconds,
    state:
      ageSeconds <= activePresenceSeconds
        ? "active"
        : ageSeconds >= reconnectReviewSeconds
          ? "reconnect"
          : "stale",
  };
}

function createReconnectRecoveries(input: {
  projectId: string;
  projectName: string;
  participants: LiveCollaborationParticipant[];
  reviewTasks: ReviewTaskSummary[];
}): LiveCollaborationReconnectRecovery[] {
  return input.participants
    .filter((participant) => participant.state === "reconnect")
    .map((participant) => {
      const relatedTasks = input.reviewTasks.filter(
        (task) =>
          task.taskAssigneeName?.toLowerCase() ===
            participant.userName.toLowerCase() ||
          task.authorName.toLowerCase() === participant.userName.toLowerCase(),
      );
      const offlineMinutes = Math.max(
        1,
        Math.round(participant.ageSeconds / 60),
      );
      const status: LiveCollaborationSessionStatus =
        participant.ageSeconds >= reconnectBlockedSeconds
          ? "blocked"
          : "review";

      return {
        id: `reconnect-${input.projectId}-${participant.userId}`,
        userId: participant.userId,
        userName: participant.userName,
        projectId: input.projectId,
        projectName: input.projectName,
        pageId: participant.pageId,
        lastSeenAt: participant.lastSeenAt,
        offlineMinutes,
        status,
        taskCount: relatedTasks.length,
        recoverySteps: [
          `Restore ${participant.userName} on ${participant.pageId} before resuming live edits.`,
          participant.cursorX !== null && participant.cursorY !== null
            ? `Return cursor near ${Math.round(participant.cursorX)}, ${Math.round(participant.cursorY)}.`
            : "Ask the participant to reopen the last active page.",
          relatedTasks.length
            ? `Review ${relatedTasks.length} open review tasks tied to this participant.`
            : "Confirm no unresolved review task was left mid-session.",
        ],
      };
    });
}

function createCursorConflictQueue(input: {
  projectId: string;
  projectName: string;
  participants: LiveCollaborationParticipant[];
}): LiveCollaborationCursorConflict[] {
  const activeWithCursor = input.participants.filter(
    (participant) =>
      participant.state === "active" &&
      participant.cursorX !== null &&
      participant.cursorY !== null,
  );
  const conflicts: LiveCollaborationCursorConflict[] = [];

  for (let leftIndex = 0; leftIndex < activeWithCursor.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < activeWithCursor.length;
      rightIndex += 1
    ) {
      const left = activeWithCursor[leftIndex];
      const right = activeWithCursor[rightIndex];

      if (!left || !right || left.pageId !== right.pageId) continue;

      const distance = getCursorDistance(left, right);

      if (distance > cursorConflictDistance) continue;

      const status: LiveCollaborationSessionStatus =
        distance <= blockedCursorDistance ? "blocked" : "review";

      conflicts.push({
        id: `cursor-${input.projectId}-${left.userId}-${right.userId}`,
        projectId: input.projectId,
        projectName: input.projectName,
        pageId: left.pageId,
        participantNames: [left.userName, right.userName],
        distance,
        status,
        detail: `${left.userName} and ${right.userName} are editing within ${Math.round(distance)}px on ${left.pageId}.`,
        recoverySteps: [
          `Assign page focus between ${left.userName} and ${right.userName} before replaying the next operation.`,
          `Move one cursor away from ${left.pageId} or wait for the active merge to finish.`,
          "Use the session replay packet to confirm which operation landed first.",
        ],
      });
    }
  }

  return conflicts.sort(
    (left, right) =>
      statusWeight(right.status) - statusWeight(left.status) ||
      left.distance - right.distance,
  );
}

function createOperationMergeHistory(input: {
  projectId: string;
  auditLogs: WorkspaceAuditLogSummary[];
}): LiveCollaborationOperationHistoryItem[] {
  return input.auditLogs
    .filter(
      (log) =>
        log.action === "collaboration.operation.merged" ||
        log.action === "collaboration.operation.conflicted",
    )
    .filter(
      (log) =>
        log.targetId === input.projectId ||
        stringMetadata(log.metadata.projectId) === input.projectId,
    )
    .map((log) => {
      const status =
        log.action === "collaboration.operation.conflicted"
          ? "conflict"
          : "merged";
      const operationId =
        stringMetadata(log.metadata.operationId) || `operation-${log.id}`;
      const operationKind =
        stringMetadata(log.metadata.operationKind) || "document-sync";
      const actorName =
        stringMetadata(log.metadata.actorName) ||
        log.actorEmail ||
        "Collaborator";
      const pageId = nullableStringMetadata(log.metadata.pageId);
      const elementIds = stringArrayMetadata(log.metadata.elementIds);
      const baseUpdatedAt = nullableStringMetadata(log.metadata.baseUpdatedAt);
      const remoteUpdatedAt = nullableStringMetadata(
        log.metadata.remoteUpdatedAt,
      );
      const mergedAt =
        nullableStringMetadata(log.metadata.mergedAt) ??
        (status === "merged" ? log.createdAt : null);
      const clientRevision = numberMetadata(log.metadata.clientRevision);

      return {
        id: `${input.projectId}-${operationId}`,
        operationId,
        operationKind,
        status,
        actorUserId: nullableStringMetadata(log.metadata.actorUserId),
        actorName,
        pageId,
        elementIds,
        baseUpdatedAt,
        remoteUpdatedAt,
        mergedAt,
        clientRevision,
        auditLogId: log.id,
        createdAt: log.createdAt,
        detail:
          status === "conflict"
            ? `${actorName}'s ${operationKind} was held because the project changed after ${baseUpdatedAt ?? "the local base"}.`
            : `${actorName}'s ${operationKind} merged at revision ${clientRevision ?? "unknown"}.`,
      } satisfies LiveCollaborationOperationHistoryItem;
    })
    .sort(
      (left, right) =>
        operationStatusWeight(right.status) -
          operationStatusWeight(left.status) ||
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.operationId.localeCompare(right.operationId),
    )
    .slice(0, 12);
}

function createReviewerLocks(input: {
  projectId: string;
  projectName: string;
  participants: LiveCollaborationParticipant[];
  reviewTasks: ReviewTaskSummary[];
}): LiveCollaborationReviewerLock[] {
  return input.reviewTasks
    .filter(
      (task) =>
        !task.resolved &&
        task.taskStatus !== "none" &&
        task.taskStatus !== "done" &&
        (task.taskStatus === "in-progress" || Boolean(task.elementId)) &&
        Boolean(task.taskAssigneeName?.trim()),
    )
    .map((task) => {
      const lockTarget = task.elementId ?? task.pageId;
      const assigneeName = task.taskAssigneeName ?? "Reviewer";
      const activeEditorsOnTarget = input.participants.filter(
        (participant) =>
          participant.state === "active" &&
          participant.pageId === task.pageId &&
          participant.userName.toLowerCase() !== assigneeName.toLowerCase(),
      );
      const status: LiveCollaborationSessionStatus =
        activeEditorsOnTarget.length > 1
          ? "blocked"
          : activeEditorsOnTarget.length
            ? "review"
            : "ready";

      return {
        id: `reviewer-lock-${input.projectId}-${task.id}`,
        projectId: input.projectId,
        projectName: input.projectName,
        taskId: task.id,
        pageId: task.pageId,
        elementId: task.elementId,
        lockTarget,
        assigneeName,
        status,
        detail:
          status === "ready"
            ? `${assigneeName} owns review on ${lockTarget}.`
            : `${activeEditorsOnTarget
                .map((participant) => participant.userName)
                .join(
                  ", ",
                )} should pause edits while ${assigneeName} reviews ${lockTarget}.`,
        recoverySteps: [
          `Keep ${lockTarget} reserved for ${assigneeName} until the review task is done.`,
          activeEditorsOnTarget.length
            ? `Move ${activeEditorsOnTarget
                .map((participant) => participant.userName)
                .join(", ")} to another page or wait for reviewer handoff.`
            : "No active editor is colliding with this reviewer lock.",
          "Record the next merged operation after the lock clears.",
        ],
      } satisfies LiveCollaborationReviewerLock;
    })
    .sort(
      (left, right) =>
        statusWeight(right.status) - statusWeight(left.status) ||
        left.lockTarget.localeCompare(right.lockTarget),
    )
    .slice(0, 12);
}

function createSessionReplayPacket(input: {
  projectId: string;
  projectName: string;
  status: LiveCollaborationSessionStatus;
  participants: LiveCollaborationParticipant[];
  operationMergeHistory: LiveCollaborationOperationHistoryItem[];
  reviewerLocks: LiveCollaborationReviewerLock[];
  reconnectRecoveries: LiveCollaborationReconnectRecovery[];
  cursorConflictQueue: LiveCollaborationCursorConflict[];
  generatedAt: string;
}): LiveCollaborationSessionReplayPacket {
  const timeline = createReplayTimeline(input);
  const payload = {
    kind: "essence-studio.multi-user-editing-session-replay",
    version: 1,
    generatedAt: input.generatedAt,
    projectId: input.projectId,
    projectName: input.projectName,
    status: input.status,
    timeline,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `session-replay-${input.projectId}`,
    projectId: input.projectId,
    projectName: input.projectName,
    status: input.status,
    timeline,
    download: {
      fileName: `session-replay-${slugify(input.projectName)}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createReplayTimeline(input: {
  participants: LiveCollaborationParticipant[];
  operationMergeHistory: LiveCollaborationOperationHistoryItem[];
  reviewerLocks: LiveCollaborationReviewerLock[];
  reconnectRecoveries: LiveCollaborationReconnectRecovery[];
  cursorConflictQueue: LiveCollaborationCursorConflict[];
}): LiveCollaborationSessionReplayEvent[] {
  const events: LiveCollaborationSessionReplayEvent[] = [
    ...input.participants.map((participant) => ({
      id: `presence-${participant.id}`,
      kind: "presence" as const,
      status:
        participant.state === "active"
          ? ("ready" as const)
          : participant.state === "reconnect"
            ? ("review" as const)
            : ("review" as const),
      actorName: participant.userName,
      timestamp: participant.lastSeenAt,
      pageId: participant.pageId,
      detail: `${participant.userName} was ${participant.state} on ${participant.pageId}.`,
    })),
    ...input.operationMergeHistory.map((operation) => ({
      id: `operation-${operation.operationId}`,
      kind: "operation" as const,
      status: operation.status,
      actorName: operation.actorName,
      timestamp: operation.createdAt,
      pageId: operation.pageId,
      detail: operation.detail,
    })),
    ...input.reviewerLocks.map((lock) => ({
      id: `lock-${lock.id}`,
      kind: "lock" as const,
      status: lock.status,
      actorName: lock.assigneeName,
      timestamp: lock.recoverySteps[0] ? new Date(0).toISOString() : "",
      pageId: lock.pageId,
      detail: lock.detail,
    })),
    ...input.reconnectRecoveries.map((recovery) => ({
      id: `reconnect-${recovery.id}`,
      kind: "reconnect" as const,
      status: recovery.status,
      actorName: recovery.userName,
      timestamp: recovery.lastSeenAt,
      pageId: recovery.pageId,
      detail: recovery.recoverySteps[0] ?? "Reconnect participant.",
    })),
    ...input.cursorConflictQueue.map((conflict) => ({
      id: `cursor-${conflict.id}`,
      kind: "cursor-conflict" as const,
      status: conflict.status,
      actorName: conflict.participantNames.join(" / "),
      timestamp: new Date(0).toISOString(),
      pageId: conflict.pageId,
      detail: conflict.detail,
    })),
  ];

  return events
    .sort(
      (left, right) =>
        Date.parse(right.timestamp) - Date.parse(left.timestamp) ||
        replayKindWeight(left.kind) - replayKindWeight(right.kind) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 40);
}

function createEvidencePacket(input: {
  projectId: string;
  projectName: string;
  status: LiveCollaborationSessionStatus;
  participants: LiveCollaborationParticipant[];
  operationMergeHistory: LiveCollaborationOperationHistoryItem[];
  reviewerLocks: LiveCollaborationReviewerLock[];
  reconnectRecoveries: LiveCollaborationReconnectRecovery[];
  cursorConflictQueue: LiveCollaborationCursorConflict[];
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
}): LiveCollaborationEvidencePacket {
  const auditLogIds = input.auditLogs.map((log) => log.id);
  const payload = {
    kind: "essence-studio.live-collaboration-session-reconciliation",
    version: 1,
    generatedAt: input.generatedAt,
    projectId: input.projectId,
    projectName: input.projectName,
    status: input.status,
    participants: input.participants.map((participant) => ({
      userId: participant.userId,
      userName: participant.userName,
      pageId: participant.pageId,
      state: participant.state,
      lastSeenAt: participant.lastSeenAt,
      cursorX: participant.cursorX,
      cursorY: participant.cursorY,
    })),
    operationMergeHistory: input.operationMergeHistory,
    reviewerLocks: input.reviewerLocks,
    reconnectRecoveries: input.reconnectRecoveries,
    cursorConflictQueue: input.cursorConflictQueue,
    auditLogIds,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `collaboration-session-evidence-${input.projectId}`,
    projectId: input.projectId,
    projectName: input.projectName,
    status: input.status,
    auditLogIds,
    download: {
      fileName: `collaboration-session-${slugify(input.projectName)}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createNextActions(sessions: LiveCollaborationSessionReconciliation[]) {
  return sessions
    .flatMap((session) => [
      ...session.operationMergeHistory
        .filter((operation) => operation.status === "conflict")
        .map(
          (operation) =>
            `Replay ${operation.actorName}'s ${operation.operationKind} in ${session.projectName} from the latest merged document.`,
        ),
      ...session.reviewerLocks.map(
        (lock) =>
          `Respect ${lock.assigneeName}'s reviewer lock on ${session.projectName} ${lock.lockTarget}.`,
      ),
      ...session.reconnectRecoveries.map(
        (recovery) =>
          `Reconnect ${recovery.userName} in ${session.projectName} before live editing continues.`,
      ),
      ...session.cursorConflictQueue.map(
        (conflict) =>
          `Separate ${conflict.participantNames.join(" and ")} on ${session.projectName} ${conflict.pageId}.`,
      ),
    ])
    .slice(0, 6);
}

function scoreSessions(sessions: LiveCollaborationSessionReconciliation[]) {
  if (!sessions.length) return 100;

  return Math.round(
    sessions.reduce((total, session) => total + session.score, 0) /
      sessions.length,
  );
}

function scoreSession(input: {
  operationMergeHistory: LiveCollaborationOperationHistoryItem[];
  reviewerLocks: LiveCollaborationReviewerLock[];
  reconnectRecoveries: LiveCollaborationReconnectRecovery[];
  cursorConflictQueue: LiveCollaborationCursorConflict[];
}) {
  const blocked =
    input.reconnectRecoveries.filter((item) => item.status === "blocked")
      .length +
    input.cursorConflictQueue.filter((item) => item.status === "blocked")
      .length +
    input.reviewerLocks.filter((item) => item.status === "blocked").length +
    input.operationMergeHistory.filter((item) => item.status === "conflict")
      .length;
  const review =
    input.reconnectRecoveries.filter((item) => item.status === "review")
      .length +
    input.cursorConflictQueue.filter((item) => item.status === "review")
      .length +
    input.reviewerLocks.filter((item) => item.status === "review").length;

  return Math.max(0, 100 - blocked * 28 - review * 14);
}

function createStatus(input: {
  blocked: number;
  review: number;
}): LiveCollaborationSessionStatus {
  if (input.blocked > 0) return "blocked";
  if (input.review > 0) return "review";

  return "ready";
}

function getCursorDistance(
  left: LiveCollaborationParticipant,
  right: LiveCollaborationParticipant,
) {
  const leftX = left.cursorX ?? 0;
  const leftY = left.cursorY ?? 0;
  const rightX = right.cursorX ?? 0;
  const rightY = right.cursorY ?? 0;

  return Math.round(Math.hypot(leftX - rightX, leftY - rightY) * 10) / 10;
}

function groupByProject(records: WorkspaceProjectPresenceSummary[]) {
  const grouped = new Map<string, WorkspaceProjectPresenceSummary[]>();

  for (const record of records) {
    grouped.set(record.projectId, [
      ...(grouped.get(record.projectId) ?? []),
      record,
    ]);
  }

  return grouped;
}

function statusWeight(status: LiveCollaborationSessionStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function operationStatusWeight(status: "merged" | "conflict") {
  return status === "conflict" ? 1 : 0;
}

function replayKindWeight(kind: LiveCollaborationSessionReplayEvent["kind"]) {
  if (kind === "operation") return 0;
  if (kind === "lock") return 1;
  if (kind === "cursor-conflict") return 2;
  if (kind === "reconnect") return 3;

  return 4;
}

function stringMetadata(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringMetadata(value: unknown) {
  const normalized = stringMetadata(value);

  return normalized || null;
}

function numberMetadata(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArrayMetadata(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => stringMetadata(item))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "session"
  );
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
