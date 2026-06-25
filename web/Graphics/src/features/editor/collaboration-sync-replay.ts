import {
  getActivityConflictReview,
} from "@/features/editor/activity-conflict-review";
import {
  toCollaborationRoomSnapshot,
} from "@/features/editor/collaboration-room-state";
import type {
  DesignActivityEvent,
  DesignCollaborationPresenceEvent,
  DesignDocument,
} from "@/features/editor/types";

export type CollaborationSyncReplayStatus = "ready" | "review" | "blocked";

export type CollaborationSyncReplayKind =
  | "activity-conflict"
  | "chat-replay"
  | "event-drift"
  | "latency"
  | "offline-queue"
  | "presence-recovery"
  | "reconnect-quality"
  | "room-snapshot";

export type CollaborationSyncReplayRow = {
  id: string;
  status: CollaborationSyncReplayStatus;
  kind: CollaborationSyncReplayKind;
  label: string;
  detail: string;
  eventCount: number;
  targetId?: string;
  latestActivityAt?: string;
  recommendation: string;
};

export type CollaborationSyncReplayReport = {
  status: CollaborationSyncReplayStatus;
  score: number;
  roomCaptured: boolean;
  roomUpdatedAt: string | null;
  roomAgeMinutes: number | null;
  chatMessageCount: number;
  presenceEventCount: number;
  duplicateMessageCount: number;
  duplicatePresenceEventCount: number;
  disconnectCount: number;
  recoveredPeerCount: number;
  unrecoveredPeerCount: number;
  offlineReplayQueueCount: number;
  eventDriftCount: number;
  reconnectQualityScore: number;
  roomLatencyStatus: CollaborationSyncReplayStatus;
  conflictScore: number;
  operationConflictCount: number;
  targetConflictCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: CollaborationSyncReplayRow[];
};

const staleRoomReviewMinutes = 60 * 24;
const staleRoomBlockedMinutes = 60 * 72;
const busyPresenceEventThreshold = 60;
const busyChatThreshold = 60;

export function getCollaborationSyncReplayReport(
  document: DesignDocument,
  now = Date.now(),
): CollaborationSyncReplayReport {
  const snapshot = toCollaborationRoomSnapshot(document.collaborationRoom);
  const conflictReview = getActivityConflictReview(
    document.activityEvents ?? [],
  );
  const roomAgeMinutes = getRoomAgeMinutes(snapshot.updatedAt, now);
  const duplicateMessageCount = getDuplicateIdCount(snapshot.chatMessages);
  const duplicatePresenceEventCount = getDuplicateIdCount(
    snapshot.presenceEvents,
  );
  const presenceRecovery = getPresenceRecovery(snapshot.presenceEvents);
  const health = getCollaborationHealthMetrics({
    duplicateMessageCount,
    duplicatePresenceEventCount,
    presenceEvents: snapshot.presenceEvents,
    roomAgeMinutes,
    unrecoveredPeerCount: presenceRecovery.unrecoveredPeerCount,
  });
  const rows: CollaborationSyncReplayRow[] = [
    ...getRoomSnapshotRows({
      captured: Boolean(document.collaborationRoom),
      roomAgeMinutes,
      chatMessageCount: snapshot.chatMessages.length,
      presenceEventCount: snapshot.presenceEvents.length,
      duplicateMessageCount,
      duplicatePresenceEventCount,
      updatedAt: snapshot.updatedAt,
    }),
    ...getPresenceRecoveryRows(presenceRecovery),
    ...getCollaborationHealthRows(health),
    ...getConflictReplayRows(document.activityEvents ?? [], conflictReview),
    ...getChatReplayRows(snapshot.chatMessages.length),
  ];
  const finalRows =
    rows.length > 0 ? rows : [getReadyRow(snapshot.presenceEvents.length)];
  const blockedCount = finalRows.filter((row) => row.status === "blocked")
    .length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 7),
    roomCaptured: Boolean(document.collaborationRoom),
    roomUpdatedAt: snapshot.updatedAt,
    roomAgeMinutes,
    chatMessageCount: snapshot.chatMessages.length,
    presenceEventCount: snapshot.presenceEvents.length,
    duplicateMessageCount,
    duplicatePresenceEventCount,
    disconnectCount: presenceRecovery.disconnectCount,
    recoveredPeerCount: presenceRecovery.recoveredPeerCount,
    unrecoveredPeerCount: presenceRecovery.unrecoveredPeerCount,
    offlineReplayQueueCount: health.offlineReplayQueueCount,
    eventDriftCount: health.eventDriftCount,
    reconnectQualityScore: health.reconnectQualityScore,
    roomLatencyStatus: health.roomLatencyStatus,
    conflictScore: conflictReview.score,
    operationConflictCount: conflictReview.operationConflictCount,
    targetConflictCount: conflictReview.targetConflictCount,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows,
  };
}

type CollaborationHealthMetrics = {
  offlineReplayQueueCount: number;
  eventDriftCount: number;
  reconnectQualityScore: number;
  roomLatencyStatus: CollaborationSyncReplayStatus;
};

function getCollaborationHealthMetrics({
  duplicateMessageCount,
  duplicatePresenceEventCount,
  presenceEvents,
  roomAgeMinutes,
  unrecoveredPeerCount,
}: {
  duplicateMessageCount: number;
  duplicatePresenceEventCount: number;
  presenceEvents: DesignCollaborationPresenceEvent[];
  roomAgeMinutes: number | null;
  unrecoveredPeerCount: number;
}): CollaborationHealthMetrics {
  const offlineReplayQueueCount =
    unrecoveredPeerCount + duplicateMessageCount + duplicatePresenceEventCount;
  const eventDriftCount = getEventDriftCount(presenceEvents);
  const reconnectQualityScore = Math.max(
    0,
    100 - unrecoveredPeerCount * 25 - duplicatePresenceEventCount * 12 - eventDriftCount * 6,
  );
  const roomLatencyStatus =
    roomAgeMinutes === null
      ? "review"
      : roomAgeMinutes >= staleRoomBlockedMinutes
        ? "blocked"
        : roomAgeMinutes >= staleRoomReviewMinutes
          ? "review"
          : "ready";

  return {
    offlineReplayQueueCount,
    eventDriftCount,
    reconnectQualityScore,
    roomLatencyStatus,
  };
}

function getCollaborationHealthRows(metrics: CollaborationHealthMetrics) {
  const rows: CollaborationSyncReplayRow[] = [];

  if (metrics.roomLatencyStatus !== "ready") {
    rows.push({
      id: "collaboration-room-latency",
      status: metrics.roomLatencyStatus,
      kind: "latency",
      label: "Room latency needs review",
      detail: "The durable room snapshot is missing or old enough to weaken release evidence.",
      eventCount: 1,
      recommendation:
        "Resync the collaboration room before exporting incident or release evidence.",
    });
  }

  if (metrics.offlineReplayQueueCount > 0) {
    rows.push({
      id: "collaboration-offline-replay-queue",
      status: metrics.offlineReplayQueueCount > 2 ? "blocked" : "review",
      kind: "offline-queue",
      label: "Offline replay queue has unresolved items",
      detail: `${metrics.offlineReplayQueueCount} duplicate or unrecovered replay item${metrics.offlineReplayQueueCount === 1 ? "" : "s"} need operator review.`,
      eventCount: metrics.offlineReplayQueueCount,
      recommendation:
        "Confirm offline collaborators reconnected cleanly before merge or release handoff.",
    });
  }

  if (metrics.eventDriftCount > 0) {
    rows.push({
      id: "collaboration-event-drift",
      status: metrics.eventDriftCount > 4 ? "blocked" : "review",
      kind: "event-drift",
      label: "Presence event drift detected",
      detail: `${metrics.eventDriftCount} presence events arrived out of chronological order.`,
      eventCount: metrics.eventDriftCount,
      recommendation:
        "Export the replay evidence and confirm the final collaboration state before handoff.",
    });
  }

  rows.push({
    id: "collaboration-reconnect-quality",
    status: metrics.reconnectQualityScore < 70 ? "review" : "ready",
    kind: "reconnect-quality",
    label: "Reconnect quality score",
    detail: `Reconnect quality is ${metrics.reconnectQualityScore}/100.`,
    eventCount: metrics.offlineReplayQueueCount + metrics.eventDriftCount,
    recommendation:
      metrics.reconnectQualityScore < 70
        ? "Review reconnect evidence before accepting collaborative edits."
        : "Reconnect evidence is healthy enough for normal handoff.",
  });

  return rows;
}

function getRoomSnapshotRows({
  captured,
  roomAgeMinutes,
  chatMessageCount,
  presenceEventCount,
  duplicateMessageCount,
  duplicatePresenceEventCount,
  updatedAt,
}: {
  captured: boolean;
  roomAgeMinutes: number | null;
  chatMessageCount: number;
  presenceEventCount: number;
  duplicateMessageCount: number;
  duplicatePresenceEventCount: number;
  updatedAt: string | null;
}) {
  const rows: CollaborationSyncReplayRow[] = [];

  if (!captured) {
    rows.push({
      id: "collaboration-room-missing",
      status: "review",
      kind: "room-snapshot",
      label: "Room snapshot missing",
      detail:
        "No durable collaboration room snapshot has been saved with this file yet.",
      eventCount: 0,
      recommendation:
        "Open a collaboration session or run sync before release handoff so replay evidence is available.",
    });
  }

  if (captured && !updatedAt) {
    rows.push({
      id: "collaboration-room-updated-at-missing",
      status: "blocked",
      kind: "room-snapshot",
      label: "Room timestamp missing",
      detail: "The collaboration room exists but does not include an update timestamp.",
      eventCount: chatMessageCount + presenceEventCount,
      recommendation:
        "Resave the collaboration room so release replay can prove when the snapshot was captured.",
    });
  }

  if (roomAgeMinutes !== null && roomAgeMinutes >= staleRoomReviewMinutes) {
    rows.push({
      id: "collaboration-room-stale",
      status:
        roomAgeMinutes >= staleRoomBlockedMinutes ? "blocked" : "review",
      kind: "room-snapshot",
      label: "Room snapshot is stale",
      detail: `The latest collaboration room snapshot is ${roomAgeMinutes} minutes old.`,
      eventCount: chatMessageCount + presenceEventCount,
      latestActivityAt: updatedAt ?? undefined,
      recommendation:
        "Sync the room again before using this file for release or handoff review.",
    });
  }

  if (duplicateMessageCount > 0 || duplicatePresenceEventCount > 0) {
    rows.push({
      id: "collaboration-room-duplicates",
      status: "blocked",
      kind: "room-snapshot",
      label: "Duplicate room events",
      detail: `${duplicateMessageCount} chat and ${duplicatePresenceEventCount} presence duplicate ids were found.`,
      eventCount: duplicateMessageCount + duplicatePresenceEventCount,
      recommendation:
        "Replay and merge the room snapshot again so duplicated event ids do not corrupt review history.",
    });
  }

  if (presenceEventCount >= busyPresenceEventThreshold) {
    rows.push({
      id: "collaboration-presence-heavy-replay",
      status: "review",
      kind: "presence-recovery",
      label: "Presence replay is busy",
      detail: `${presenceEventCount} presence events are stored in the latest room snapshot.`,
      eventCount: presenceEventCount,
      recommendation:
        "Export the collaboration replay Markdown and summarize the session before release handoff.",
    });
  }

  return rows;
}

function getPresenceRecoveryRows(recovery: PresenceRecoverySummary) {
  const rows: CollaborationSyncReplayRow[] = [];

  if (recovery.unrecoveredPeerCount > 0) {
    rows.push({
      id: "presence-recovery-unresolved",
      status: "review",
      kind: "presence-recovery",
      label: "Presence recovery needs review",
      detail: `${recovery.unrecoveredPeerCount} peer${recovery.unrecoveredPeerCount === 1 ? "" : "s"} left or disconnected without a later join event.`,
      eventCount: recovery.unrecoveredPeerCount,
      recommendation:
        "Confirm disconnected collaborators did not leave unsynced edits before release.",
    });
  }

  if (recovery.recoveredPeerCount > 0) {
    rows.push({
      id: "presence-recovery-ready",
      status: "ready",
      kind: "presence-recovery",
      label: "Presence recovery replayed",
      detail: `${recovery.recoveredPeerCount} peer${recovery.recoveredPeerCount === 1 ? "" : "s"} left and later rejoined in the stored room history.`,
      eventCount: recovery.recoveredPeerCount,
      recommendation:
        "Keep the replay attached to the release bundle for collaborator recovery evidence.",
    });
  }

  return rows;
}

function getConflictReplayRows(
  events: DesignActivityEvent[],
  conflictReview: ReturnType<typeof getActivityConflictReview>,
) {
  if (events.length === 0) {
    return [
      {
        id: "collaboration-activity-missing",
        status: "review",
        kind: "activity-conflict",
        label: "Activity replay missing",
        detail:
          "No activity events are available to replay conflict review for this file.",
        eventCount: 0,
        recommendation:
          "Capture at least one collaboration or handoff activity event before release review.",
      } satisfies CollaborationSyncReplayRow,
    ];
  }

  return conflictReview.rows
    .filter(
      (row) =>
        row.status !== "ready" &&
        (row.kind === "operation" ||
          row.kind === "target" ||
          row.kind === "burst"),
    )
    .slice(0, 4)
    .map(
      (row) =>
        ({
          id: `sync-replay-${row.id}`,
          status: row.status,
          kind: "activity-conflict",
          label: row.label,
          detail: row.detail,
          eventCount: row.eventCount,
          targetId: row.targetId,
          latestActivityAt: row.latestActivityAt,
          recommendation:
            row.resolutionHint ??
            "Replay the activity sequence and confirm the final collaborator-owned state.",
        }) satisfies CollaborationSyncReplayRow,
    );
}

function getChatReplayRows(chatMessageCount: number) {
  if (chatMessageCount < busyChatThreshold) {
    return [];
  }

  return [
    {
      id: "collaboration-chat-heavy-replay",
      status: "review",
      kind: "chat-replay",
      label: "Chat replay is long",
      detail: `${chatMessageCount} chat messages are stored in the collaboration room snapshot.`,
      eventCount: chatMessageCount,
      recommendation:
        "Summarize the chat before release handoff so design decisions are easier to review.",
    } satisfies CollaborationSyncReplayRow,
  ];
}

type PresenceRecoverySummary = {
  disconnectCount: number;
  recoveredPeerCount: number;
  unrecoveredPeerCount: number;
};

function getPresenceRecovery(
  presenceEvents: DesignCollaborationPresenceEvent[],
): PresenceRecoverySummary {
  const peerEvents = new Map<string, DesignCollaborationPresenceEvent[]>();

  for (const event of presenceEvents) {
    const peerKey = event.peerId ?? event.peerEmail ?? event.peerName;
    peerEvents.set(peerKey, [...(peerEvents.get(peerKey) ?? []), event]);
  }

  let disconnectCount = 0;
  let recoveredPeerCount = 0;
  let unrecoveredPeerCount = 0;

  for (const events of peerEvents.values()) {
    const sortedEvents = [...events].sort(
      (first, second) => first.createdAt - second.createdAt,
    );
    const leftEvents = sortedEvents.filter((event) => event.kind === "left");

    if (leftEvents.length === 0) {
      continue;
    }

    disconnectCount += leftEvents.length;
    const lastLeft = leftEvents.at(-1);
    const recovered = Boolean(
      lastLeft &&
        sortedEvents.some(
          (event) =>
            event.kind === "joined" && event.createdAt > lastLeft.createdAt,
        ),
    );

    if (recovered) {
      recoveredPeerCount += 1;
    } else {
      unrecoveredPeerCount += 1;
    }
  }

  return {
    disconnectCount,
    recoveredPeerCount,
    unrecoveredPeerCount,
  };
}

function getReadyRow(eventCount: number): CollaborationSyncReplayRow {
  return {
    id: "collaboration-sync-replay-ready",
    status: "ready",
    kind: "room-snapshot",
    label: "Collaboration replay ready",
    detail:
      eventCount > 0
        ? "Room snapshot, presence recovery, and activity conflict replay have no open blockers."
        : "The collaboration room is empty and has no replay blockers.",
    eventCount,
    recommendation:
      "Keep replay exports attached to release review when collaboration is active.",
  };
}

function getRoomAgeMinutes(value: string | null, now: number) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, Math.round((now - timestamp) / 60000));
}

function getDuplicateIdCount(items: Array<{ id: string }>) {
  const ids = new Set<string>();
  let duplicateCount = 0;

  for (const item of items) {
    if (ids.has(item.id)) {
      duplicateCount += 1;
    }

    ids.add(item.id);
  }

  return duplicateCount;
}

function getEventDriftCount(events: DesignCollaborationPresenceEvent[]) {
  let driftCount = 0;
  let latest = 0;

  for (const event of events) {
    if (event.createdAt < latest) {
      driftCount += 1;
    }

    latest = Math.max(latest, event.createdAt);
  }

  return driftCount;
}
