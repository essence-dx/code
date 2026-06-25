import type {
  AdminMultiplayerPresenceEventCounts,
  AdminMultiplayerPresenceEventSource,
  AdminMultiplayerPresenceInput,
  AdminMultiplayerPresenceReplayWindowSource,
  AdminMultiplayerPresenceReport,
  AdminMultiplayerPresenceRoom,
  AdminMultiplayerPresenceRoomSource,
  AdminMultiplayerPresenceRow,
  AdminMultiplayerPresenceStatus,
} from "@/features/admin/admin-multiplayer-presence-types";

export type {
  AdminMultiplayerPresenceCategory,
  AdminMultiplayerPresenceEventCounts,
  AdminMultiplayerPresenceEventSource,
  AdminMultiplayerPresenceInput,
  AdminMultiplayerPresenceReplayWindowSource,
  AdminMultiplayerPresenceReport,
  AdminMultiplayerPresenceRoom,
  AdminMultiplayerPresenceRoomSource,
  AdminMultiplayerPresenceRow,
  AdminMultiplayerPresenceStatus,
} from "@/features/admin/admin-multiplayer-presence-types";

export function getAdminMultiplayerPresenceReport({
  collaborationEventIngestion,
  collaborationHandoffOperations,
  generatedAt = new Date().toISOString(),
  realtimeHealth,
}: AdminMultiplayerPresenceInput): AdminMultiplayerPresenceReport {
  const eventCountsByFile = getPresenceEventCountsByFile(
    collaborationEventIngestion.recentEvents,
  );
  const replayWindowsByFile = new Map(
    collaborationEventIngestion.replayWindows.map((window) => [
      window.fileId,
      window,
    ]),
  );
  const rooms = collaborationHandoffOperations.rooms.map((room) =>
    toMultiplayerPresenceRoom({
      eventCounts: eventCountsByFile.get(room.fileId),
      generatedAt,
      replayWindow: replayWindowsByFile.get(room.fileId),
      room,
    }),
  );
  const roomSaveConflictCount = rooms.reduce(
    (total, room) => total + room.saveConflictCount,
    0,
  );
  const saveConflictCount =
    roomSaveConflictCount +
    realtimeHealth.pendingSaveSignalCount +
    realtimeHealth.failedSaveTelemetryCount;
  const staleRecoveryQueueCount = rooms.filter(
    (room) => room.staleRecoveryStatus !== "ready",
  ).length;
  const cursorEvidenceCount = rooms.reduce(
    (total, room) => total + room.cursorEvidenceCount,
    0,
  );
  const spotlightEventCount = rooms.reduce(
    (total, room) => total + room.spotlightEventCount,
    0,
  );
  const followEventCount = rooms.reduce(
    (total, room) => total + room.followEventCount,
    0,
  );
  const handoffTimerReviewCount = rooms.filter(
    (room) => room.presenterHandoffTimerStatus !== "ready",
  ).length;
  const rows = [
    getPresenceCursorRow({
      cursorEvidenceCount,
      handoffRoomCount: collaborationHandoffOperations.roomCount,
      ingestionPresenceEventCount: collaborationEventIngestion.presenceEventCount,
      rooms,
    }),
    getFollowSpotlightRow({
      followEventCount,
      presenterConflictCount:
        collaborationHandoffOperations.presenterConflictCount,
      presenterOwnedCount: collaborationHandoffOperations.presenterOwnedCount,
      rooms,
      spotlightEventCount,
    }),
    getHandoffTimerRow({
      handoffTimerReviewCount,
      rooms,
    }),
    getStaleRecoveryRow({
      eventDriftCount: realtimeHealth.eventDriftCount,
      offlineReplayQueueCount: realtimeHealth.offlineReplayQueueCount,
      purgeCandidateCount: collaborationEventIngestion.purgeCandidateCount,
      rooms,
      staleRecoveryQueueCount,
      staleRoomCount: realtimeHealth.staleRoomCount,
    }),
    getSaveConflictRow({
      failedSaveTelemetryCount: realtimeHealth.failedSaveTelemetryCount,
      pendingSaveSignalCount: realtimeHealth.pendingSaveSignalCount,
      roomSaveConflictCount,
      rooms,
      saveConflictCount,
    }),
  ].sort(sortRows);
  const readyRoomCount = rooms.filter((room) => room.status === "ready").length;
  const reviewRoomCount = rooms.filter((room) => room.status === "review")
    .length;
  const blockedRoomCount = rooms.filter((room) => room.status === "blocked")
    .length;
  const status = getWorstStatus(rows.map((row) => row.status));
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedRows * 18 - reviewRows * 6),
    roomCount: rooms.length,
    activeRoomCount: collaborationHandoffOperations.activeRoomCount,
    capturedRoomCount: collaborationHandoffOperations.capturedRoomCount,
    readyRoomCount,
    reviewRoomCount,
    blockedRoomCount,
    presenceEventCount: collaborationEventIngestion.presenceEventCount,
    cursorEvidenceCount,
    spotlightEventCount,
    followEventCount,
    presenterConflictCount:
      collaborationHandoffOperations.presenterConflictCount,
    presenterOwnedCount: collaborationHandoffOperations.presenterOwnedCount,
    handoffTimerReviewCount,
    staleRoomCount: realtimeHealth.staleRoomCount,
    staleRecoveryQueueCount,
    offlineReplayQueueCount: realtimeHealth.offlineReplayQueueCount,
    eventDriftCount: realtimeHealth.eventDriftCount,
    reconnectQualityScore: realtimeHealth.reconnectQualityScore,
    saveConflictCount,
    roomSaveConflictCount,
    pendingSaveSignalCount: realtimeHealth.pendingSaveSignalCount,
    failedSaveTelemetryCount: realtimeHealth.failedSaveTelemetryCount,
    durableEventCount: collaborationEventIngestion.durableEventCount,
    purgeCandidateCount: collaborationEventIngestion.purgeCandidateCount,
    rows,
    rooms: rooms.sort(sortRooms),
    commands: getMultiplayerPresenceCommands(),
  };
}

function toMultiplayerPresenceRoom({
  eventCounts,
  generatedAt,
  replayWindow,
  room,
}: {
  eventCounts?: AdminMultiplayerPresenceEventCounts;
  generatedAt: string;
  replayWindow?: AdminMultiplayerPresenceReplayWindowSource;
  room: AdminMultiplayerPresenceRoomSource;
}): AdminMultiplayerPresenceRoom {
  const cursorEvidenceCount = Math.max(
    room.presenceEventCount,
    eventCounts?.cursorEvidenceCount ?? 0,
  );
  const spotlightEventCount = Math.max(
    room.presenter.spotlightEventCount,
    eventCounts?.spotlightEventCount ?? 0,
  );
  const followEventCount = Math.max(
    room.presenter.followEventCount,
    eventCounts?.followEventCount ?? 0,
  );
  const saveConflictCount =
    room.operationConflictCount + room.targetConflictCount;
  const staleRecoveryStatus = getStaleRecoveryStatus({
    eventDriftCount: room.eventDriftCount,
    offlineReplayQueueCount: room.offlineReplayQueueCount,
    replayPurgeCandidate: replayWindow?.purgeCandidate ?? false,
    roomAgeMinutes: room.roomAgeMinutes,
    roomCaptured: room.roomCaptured,
  });
  const presenterHandoffAgeMinutes = getPresenterHandoffAgeMinutes(
    room.presenter.lastHandoffAt,
    generatedAt,
  );
  const presenterHandoffTimerStatus = getPresenterHandoffTimerStatus({
    ageMinutes: presenterHandoffAgeMinutes,
    presenterStatus: room.presenter.status,
  });
  const status = getWorstStatus([
    normalizeStatus(room.status),
    staleRecoveryStatus,
    presenterHandoffTimerStatus,
    room.presenter.status === "conflict" ? "blocked" : "ready",
    saveConflictCount > 0 ? "review" : "ready",
    cursorEvidenceCount === 0 ? "review" : "ready",
  ]);

  return {
    id: room.id,
    status,
    fileId: room.fileId,
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    roomCaptured: room.roomCaptured,
    roomAgeMinutes: room.roomAgeMinutes,
    chatMessageCount: room.chatMessageCount,
    presenceEventCount: room.presenceEventCount,
    cursorEvidenceCount,
    spotlightEventCount,
    followEventCount,
    activePresenterCount: room.presenter.activePresenterCount,
    presenterStatus: room.presenter.status,
    presenterSummary: room.presenter.summary,
    presenterHandoffAgeMinutes,
    presenterHandoffTimerStatus,
    staleRecoveryStatus,
    offlineReplayQueueCount: room.offlineReplayQueueCount,
    eventDriftCount: room.eventDriftCount,
    saveConflictCount,
    replayPurgeCandidate: replayWindow?.purgeCandidate ?? false,
    latestAt: getLatestIso([
      room.latestAt,
      eventCounts?.latestAt ?? null,
      replayWindow?.latestEventAt ?? null,
      room.presenter.lastHandoffAt,
    ]),
    recommendation: getRoomRecommendation({
      cursorEvidenceCount,
      presenterHandoffTimerStatus,
      saveConflictCount,
      staleRecoveryStatus,
      status,
    }),
  };
}

function getHandoffTimerRow({
  handoffTimerReviewCount,
  rooms,
}: {
  handoffTimerReviewCount: number;
  rooms: AdminMultiplayerPresenceRoom[];
}): AdminMultiplayerPresenceRow {
  const blockedRooms = rooms.filter(
    (room) => room.presenterHandoffTimerStatus === "blocked",
  );
  const reviewRooms = rooms.filter(
    (room) => room.presenterHandoffTimerStatus === "review",
  );
  const status: AdminMultiplayerPresenceStatus =
    blockedRooms.length > 0
      ? "blocked"
      : reviewRooms.length > 0
        ? "review"
        : "ready";
  const target = blockedRooms[0] ?? reviewRooms[0] ?? rooms[0] ?? null;

  return {
    id: "multiplayer-handoff-timers",
    category: "handoff-timers",
    status,
    label: "Presenter handoff timers",
    value: `${handoffTimerReviewCount} timer review`,
    detail:
      rooms.length === 0
        ? "No collaboration rooms are available for presenter handoff timer review."
        : `${rooms.length - handoffTimerReviewCount}/${rooms.length} rooms have fresh presenter handoff timers.`,
    recommendation:
      status === "ready"
        ? "Presenter handoff timers are fresh for admin export evidence."
        : "Restart stale presenter walkthroughs and export fresh follow/spotlight evidence.",
    count: handoffTimerReviewCount,
    target: target?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getPresenceCursorRow({
  cursorEvidenceCount,
  handoffRoomCount,
  ingestionPresenceEventCount,
  rooms,
}: {
  cursorEvidenceCount: number;
  handoffRoomCount: number;
  ingestionPresenceEventCount: number;
  rooms: AdminMultiplayerPresenceRoom[];
}): AdminMultiplayerPresenceRow {
  const missingRooms = rooms.filter((room) => room.cursorEvidenceCount === 0);
  const status: AdminMultiplayerPresenceStatus =
    handoffRoomCount === 0 || cursorEvidenceCount === 0
      ? "blocked"
      : missingRooms.length > 0
        ? "review"
        : "ready";

  return {
    id: "multiplayer-presence-cursors",
    category: "presence-cursors",
    status,
    label: "Presence and cursor evidence",
    value: `${cursorEvidenceCount} evidence events`,
    detail:
      handoffRoomCount === 0
        ? "No collaboration rooms are available for multiplayer presence review."
        : `${rooms.length - missingRooms.length}/${rooms.length} rooms have durable presence or cursor evidence, with ${ingestionPresenceEventCount} retained presence ingestion events.`,
    recommendation:
      status === "ready"
        ? "Durable presence evidence is available for active room review."
        : "Open active collaboration rooms and let presence sync before exporting the release handoff.",
    count: cursorEvidenceCount,
    target: missingRooms[0]?.fileName ?? rooms[0]?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getFollowSpotlightRow({
  followEventCount,
  presenterConflictCount,
  presenterOwnedCount,
  rooms,
  spotlightEventCount,
}: {
  followEventCount: number;
  presenterConflictCount: number;
  presenterOwnedCount: number;
  rooms: AdminMultiplayerPresenceRoom[];
  spotlightEventCount: number;
}): AdminMultiplayerPresenceRow {
  const status: AdminMultiplayerPresenceStatus =
    presenterConflictCount > 0
      ? "blocked"
      : rooms.length > 0 && spotlightEventCount + followEventCount === 0
        ? "review"
        : "ready";
  const conflictRoom = rooms.find((room) => room.presenterStatus === "conflict");

  return {
    id: "multiplayer-follow-spotlight",
    category: "follow-spotlight",
    status,
    label: "Follow and spotlight ownership",
    value: `${spotlightEventCount} spotlight / ${followEventCount} follow`,
    detail: `${presenterOwnedCount} rooms have owned presenter state and ${presenterConflictCount} rooms have competing presenter evidence.`,
    recommendation:
      status === "blocked"
        ? "Resolve spotlight ownership before release handoff and attach the presenter evidence."
        : status === "review"
          ? "Run a presenter walkthrough so follow and spotlight replay is visible."
          : "Presenter ownership has durable follow and spotlight evidence.",
    count: spotlightEventCount + followEventCount,
    target: conflictRoom?.fileName ?? rooms[0]?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getStaleRecoveryRow({
  eventDriftCount,
  offlineReplayQueueCount,
  purgeCandidateCount,
  rooms,
  staleRecoveryQueueCount,
  staleRoomCount,
}: {
  eventDriftCount: number;
  offlineReplayQueueCount: number;
  purgeCandidateCount: number;
  rooms: AdminMultiplayerPresenceRoom[];
  staleRecoveryQueueCount: number;
  staleRoomCount: number;
}): AdminMultiplayerPresenceRow {
  const status: AdminMultiplayerPresenceStatus =
    staleRecoveryQueueCount > 0 &&
    (offlineReplayQueueCount > 0 || eventDriftCount > 0)
      ? "blocked"
      : staleRecoveryQueueCount > 0 || purgeCandidateCount > 0
        ? "review"
        : "ready";
  const recoveryRoom = rooms.find(
    (room) => room.staleRecoveryStatus !== "ready",
  );

  return {
    id: "multiplayer-stale-room-recovery",
    category: "stale-room-recovery",
    status,
    label: "Stale room recovery",
    value: `${staleRecoveryQueueCount} recovery rows`,
    detail: `${staleRoomCount} rooms are stale, ${offlineReplayQueueCount} offline replay items remain, ${eventDriftCount} event drift signals are open, and ${purgeCandidateCount} replay windows can be purged after handoff.`,
    recommendation:
      status === "ready"
        ? "Room freshness, offline replay, and drift recovery are clear."
        : "Refresh stale rooms, archive room evidence, and clear replay queues before publication.",
    count: staleRecoveryQueueCount,
    target: recoveryRoom?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getSaveConflictRow({
  failedSaveTelemetryCount,
  pendingSaveSignalCount,
  roomSaveConflictCount,
  rooms,
  saveConflictCount,
}: {
  failedSaveTelemetryCount: number;
  pendingSaveSignalCount: number;
  roomSaveConflictCount: number;
  rooms: AdminMultiplayerPresenceRoom[];
  saveConflictCount: number;
}): AdminMultiplayerPresenceRow {
  const status: AdminMultiplayerPresenceStatus =
    pendingSaveSignalCount > 0 || failedSaveTelemetryCount > 0
      ? "blocked"
      : roomSaveConflictCount > 0
        ? "review"
        : "ready";
  const conflictRoom = rooms.find((room) => room.saveConflictCount > 0);

  return {
    id: "multiplayer-save-conflicts",
    category: "save-conflicts",
    status,
    label: "Save-conflict visibility",
    value: `${saveConflictCount} conflict signals`,
    detail: `${roomSaveConflictCount} room operation conflicts, ${pendingSaveSignalCount} pending save signals, and ${failedSaveTelemetryCount} failed save telemetry rows are visible.`,
    recommendation:
      status === "ready"
        ? "Save-conflict visibility is clear for active multiplayer rooms."
        : "Resolve pending save signals and export conflict evidence before the next release handoff.",
    count: saveConflictCount,
    target: conflictRoom?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getStaleRecoveryStatus({
  eventDriftCount,
  offlineReplayQueueCount,
  replayPurgeCandidate,
  roomAgeMinutes,
  roomCaptured,
}: {
  eventDriftCount: number;
  offlineReplayQueueCount: number;
  replayPurgeCandidate: boolean;
  roomAgeMinutes: number | null;
  roomCaptured: boolean;
}): AdminMultiplayerPresenceStatus {
  if (
    !roomCaptured ||
    roomAgeMinutes === null ||
    roomAgeMinutes > 60 * 72 ||
    offlineReplayQueueCount > 0 ||
    eventDriftCount > 0
  ) {
    return "blocked";
  }

  if (roomAgeMinutes > 60 * 24 || replayPurgeCandidate) {
    return "review";
  }

  return "ready";
}

function getRoomRecommendation({
  cursorEvidenceCount,
  presenterHandoffTimerStatus,
  saveConflictCount,
  staleRecoveryStatus,
  status,
}: {
  cursorEvidenceCount: number;
  presenterHandoffTimerStatus: AdminMultiplayerPresenceStatus;
  saveConflictCount: number;
  staleRecoveryStatus: AdminMultiplayerPresenceStatus;
  status: AdminMultiplayerPresenceStatus;
}) {
  if (status === "blocked") {
    return "Resolve presenter conflicts, stale replay, and save conflicts before publication.";
  }

  if (saveConflictCount > 0) {
    return "Attach save-conflict evidence to the collaboration handoff packet.";
  }

  if (staleRecoveryStatus !== "ready") {
    return "Refresh the room and archive fresh presence replay before release.";
  }

  if (presenterHandoffTimerStatus !== "ready") {
    return "Restart the presenter handoff timer before exporting release evidence.";
  }

  if (cursorEvidenceCount === 0) {
    return "Run a short collaboration session so cursor and presence replay is visible.";
  }

  return "Presence, follow, spotlight, and save-conflict evidence is ready.";
}

function getPresenterHandoffAgeMinutes(
  lastHandoffAt: string | null | undefined,
  generatedAt: string,
) {
  if (!lastHandoffAt) {
    return null;
  }

  const ageMs = Date.parse(generatedAt) - Date.parse(lastHandoffAt);

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return null;
  }

  return Math.round(ageMs / 60_000);
}

function getPresenterHandoffTimerStatus({
  ageMinutes,
  presenterStatus,
}: {
  ageMinutes: number | null;
  presenterStatus: AdminMultiplayerPresenceRoomSource["presenter"]["status"];
}): AdminMultiplayerPresenceStatus {
  if (presenterStatus === "conflict") {
    return "blocked";
  }

  if (ageMinutes === null) {
    return presenterStatus === "owned" ? "review" : "ready";
  }

  if (ageMinutes >= 60) {
    return "blocked";
  }

  if (ageMinutes >= 30) {
    return "review";
  }

  return "ready";
}

function getPresenceEventCountsByFile(
  events: AdminMultiplayerPresenceEventSource[],
) {
  const counts = new Map<string, AdminMultiplayerPresenceEventCounts>();

  for (const event of events) {
    if (event.kind !== "presence") {
      continue;
    }

    const current =
      counts.get(event.fileId) ??
      ({
        cursorEvidenceCount: 0,
        followEventCount: 0,
        latestAt: null,
        presenceEventCount: 0,
        spotlightEventCount: 0,
      } satisfies AdminMultiplayerPresenceEventCounts);
    const normalizedSignal = normalizeSignal(event.signal, event.kind);

    current.presenceEventCount += 1;
    current.cursorEvidenceCount += 1;
    current.followEventCount += normalizedSignal.includes("follow") ? 1 : 0;
    current.spotlightEventCount += normalizedSignal.includes("spotlight")
      ? 1
      : 0;
    current.latestAt = getLatestIso([current.latestAt, event.createdAt]);
    counts.set(event.fileId, current);
  }

  return counts;
}

function normalizeSignal(
  signal: string,
  kind: AdminMultiplayerPresenceEventSource["kind"],
) {
  return `${kind}:${signal}`.toLowerCase();
}

function getMultiplayerPresenceCommands() {
  return [
    "bun run admin:multiplayer-presence-smoke",
    "Export Admin > Multiplayer presence JSON.",
    "Export Admin > Multiplayer presence CSV.",
    "Export Admin > Multiplayer presence Markdown.",
    "Review Governance > Multiplayer presence before release handoff.",
  ];
}

function normalizeStatus(
  status: AdminMultiplayerPresenceRoomSource["status"],
): AdminMultiplayerPresenceStatus {
  return status;
}

function getWorstStatus(statuses: AdminMultiplayerPresenceStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestRoomAt(rooms: AdminMultiplayerPresenceRoom[]): string | null {
  return getLatestIso(rooms.map((room) => room.latestAt));
}

function getLatestIso(values: Array<string | null | undefined>): string | null {
  return values.reduce<string | null>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest) {
      return value;
    }

    return Date.parse(value) > Date.parse(latest) ? value : latest;
  }, null as string | null);
}

function statusWeight(status: AdminMultiplayerPresenceStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminMultiplayerPresenceRow,
  right: AdminMultiplayerPresenceRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortRooms(
  left: AdminMultiplayerPresenceRoom,
  right: AdminMultiplayerPresenceRoom,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    new Date(right.latestAt ?? 0).getTime() -
      new Date(left.latestAt ?? 0).getTime() ||
    left.fileName.localeCompare(right.fileName)
  );
}

export {
  getAdminMultiplayerPresenceCsv,
  getAdminMultiplayerPresenceJson,
  getAdminMultiplayerPresenceMarkdown,
} from "@/features/admin/admin-multiplayer-presence-export";
