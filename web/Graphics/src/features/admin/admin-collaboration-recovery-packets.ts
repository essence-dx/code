import type {
  AdminCollaborationRecoveryInput,
  AdminCollaborationRecoveryOwnerHandoffStatus,
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketsReport,
  AdminCollaborationRecoveryPacketStatus,
  AdminCollaborationRecoveryRoomSource,
  AdminCollaborationRecoveryRow,
} from "@/features/admin/admin-collaboration-recovery-packets-types";

export function getAdminCollaborationRecoveryPacketsReport({
  collaborationEventIngestion,
  collaborationHandoffOperations,
  generatedAt = new Date().toISOString(),
  multiplayerPresence,
}: AdminCollaborationRecoveryInput): AdminCollaborationRecoveryPacketsReport {
  const replayWindowsByFile = new Map(
    collaborationEventIngestion.replayWindows.map((window) => [
      window.fileId,
      window,
    ]),
  );
  const recentEventsByFile = groupBy(
    collaborationEventIngestion.recentEvents,
    (event) => event.fileId,
  );
  const presenceRoomsByFile = new Map(
    multiplayerPresence.rooms.map((room) => [room.fileId, room]),
  );
  const packets = collaborationHandoffOperations.rooms
    .map((room) =>
      toRecoveryPacket({
        events: recentEventsByFile.get(room.fileId) ?? [],
        multiplayerRoom: presenceRoomsByFile.get(room.fileId),
        replayWindow: replayWindowsByFile.get(room.fileId),
        room,
      }),
    )
    .sort(sortPackets);
  const rows = getRecoveryRows(packets);
  const blockedPacketCount = packets.filter((packet) => packet.status === "blocked")
    .length;
  const reviewPacketCount = packets.filter((packet) => packet.status === "review")
    .length;
  const readyPacketCount = packets.filter((packet) => packet.status === "ready")
    .length;

  return {
    generatedAt,
    status: getWorstStatus(packets.map((packet) => packet.status)),
    score: Math.max(0, 100 - blockedPacketCount * 18 - reviewPacketCount * 6),
    packetCount: packets.length,
    readyPacketCount,
    reviewPacketCount,
    blockedPacketCount,
    exportReadyPacketCount: packets.filter((packet) => packet.exportReady).length,
    replayEvidenceCount: packets.reduce(
      (total, packet) => total + packet.activityReplayEvidenceCount,
      0,
    ),
    ownershipHandoffCount: packets.filter(
      (packet) => packet.ownerHandoffStatus === "assigned",
    ).length,
    missingOwnershipCount: packets.filter(
      (packet) => packet.ownerHandoffStatus === "missing",
    ).length,
    conflictSummaryCount: packets.reduce(
      (total, packet) => total + packet.conflictSummaryCount,
      0,
    ),
    staleRecoveryCount: packets.filter(
      (packet) =>
        packet.replayWindowStatus !== "ready" ||
        packet.offlineReplayQueueCount > 0 ||
        packet.eventDriftCount > 0,
    ).length,
    saveConflictCount: packets.reduce(
      (total, packet) => total + packet.saveConflictCount,
      0,
    ),
    commands: getCollaborationRecoveryPacketCommands(),
    rows,
    packets,
  };
}

function toRecoveryPacket({
  events,
  multiplayerRoom,
  replayWindow,
  room,
}: {
  events: AdminCollaborationRecoveryInput["collaborationEventIngestion"]["recentEvents"];
  multiplayerRoom?: AdminCollaborationRecoveryInput["multiplayerPresence"]["rooms"][number];
  replayWindow?: AdminCollaborationRecoveryInput["collaborationEventIngestion"]["replayWindows"][number];
  room: AdminCollaborationRecoveryRoomSource;
}): AdminCollaborationRecoveryPacket {
  const ownerHandoffStatus = getOwnerHandoffStatus(room);
  const activityReplayEvidenceCount = (replayWindow?.eventCount ?? 0) + events.length;
  const replayWindowStatus = normalizeStatus(replayWindow?.status ?? "review");
  const saveConflictCount = multiplayerRoom?.saveConflictCount ?? 0;
  const conflictSummaryCount =
    room.operationConflictCount +
    room.targetConflictCount +
    room.eventDriftCount +
    room.offlineReplayQueueCount +
    saveConflictCount +
    room.unresolvedMentionCount +
    room.escalationCount;
  const evidenceArchived = Boolean(room.evidenceArchivedAt);
  const exportReady =
    room.status === "ready" &&
    ownerHandoffStatus === "assigned" &&
    evidenceArchived &&
    activityReplayEvidenceCount > 0 &&
    conflictSummaryCount === 0 &&
    replayWindowStatus === "ready";
  const status = getPacketStatus({
    activityReplayEvidenceCount,
    conflictSummaryCount,
    evidenceArchived,
    exportReady,
    ownerHandoffStatus,
    replayWindowStatus,
    roomStatus: normalizeStatus(room.status),
  });
  const latestAt = getLatestIso([
    room.latestAt,
    room.latestSignalAt,
    room.evidenceArchivedAt,
    replayWindow?.latestEventAt ?? null,
    ...events.map((event) => event.createdAt),
    multiplayerRoom?.latestAt ?? null,
  ]);

  return {
    id: `collaboration-recovery-packet-${room.fileId}`,
    status,
    fileId: room.fileId,
    fileName: room.fileName,
    ownerEmail: room.ownerEmail,
    ownerHandoffStatus,
    ownerHandoffLabel: getOwnerHandoffLabel(room, ownerHandoffStatus),
    activityReplayEvidenceCount,
    replayWindowStatus,
    replayWindowLatestAt: replayWindow?.latestEventAt ?? null,
    roomCaptured: room.roomCaptured,
    evidenceArchived,
    exportReady,
    conflictSummaryCount,
    operationConflictCount: room.operationConflictCount,
    targetConflictCount: room.targetConflictCount,
    eventDriftCount: room.eventDriftCount,
    offlineReplayQueueCount: room.offlineReplayQueueCount,
    saveConflictCount,
    unresolvedMentionCount: room.unresolvedMentionCount,
    escalationCount: room.escalationCount,
    recoverySteps: getRecoverySteps({
      activityReplayEvidenceCount,
      conflictSummaryCount,
      evidenceArchived,
      ownerHandoffStatus,
      replayWindowStatus,
      room,
    }),
    latestAt,
    recommendation: getPacketRecommendation(status, exportReady),
  };
}

function getRecoveryRows(
  packets: AdminCollaborationRecoveryPacket[],
): AdminCollaborationRecoveryRow[] {
  const activityEvidenceCount = packets.reduce(
    (total, packet) => total + packet.activityReplayEvidenceCount,
    0,
  );
  const missingOwnerPackets = packets.filter(
    (packet) => packet.ownerHandoffStatus === "missing",
  );
  const conflictPackets = packets.filter(
    (packet) => packet.conflictSummaryCount > 0,
  );
  const exportReadyPackets = packets.filter((packet) => packet.exportReady);

  const rows: AdminCollaborationRecoveryRow[] = [
    {
      id: "collaboration-recovery-activity-replay",
      category: "activity-replay",
      status:
        activityEvidenceCount === 0
          ? "blocked"
          : packets.some((packet) => packet.replayWindowStatus !== "ready")
            ? "review"
            : "ready",
      label: "Activity replay evidence",
      value: `${activityEvidenceCount} evidence items`,
      detail: `${packets.length} room packet${packets.length === 1 ? "" : "s"} include replay windows, redacted events, and room activity evidence.`,
      recommendation:
        activityEvidenceCount > 0
          ? "Attach activity replay evidence to every recovery packet before purge or release handoff."
          : "Refresh collaboration rooms so recovery packets have replay evidence.",
      count: activityEvidenceCount,
      target: packets.find((packet) => packet.activityReplayEvidenceCount === 0)
        ?.fileName ?? packets[0]?.fileName ?? null,
      latestAt: getLatestIso(packets.map((packet) => packet.replayWindowLatestAt)),
    },
    {
      id: "collaboration-recovery-ownership-handoff",
      category: "ownership-handoff",
      status: missingOwnerPackets.length > 0 ? "blocked" : "ready",
      label: "Ownership handoff",
      value: `${packets.length - missingOwnerPackets.length}/${packets.length} assigned`,
      detail:
        missingOwnerPackets.length > 0
          ? `${missingOwnerPackets.length} packet${missingOwnerPackets.length === 1 ? "" : "s"} need a recovery owner before export.`
          : "Every recovery packet has an assigned presenter or handoff owner.",
      recommendation:
        missingOwnerPackets.length > 0
          ? "Assign a named recovery owner before exporting the packet."
          : "Ownership handoff is ready for packet export.",
      count: missingOwnerPackets.length,
      target: missingOwnerPackets[0]?.fileName ?? null,
      latestAt: getLatestIso(packets.map((packet) => packet.latestAt)),
    },
    {
      id: "collaboration-recovery-conflict-summary",
      category: "conflict-summary",
      status: conflictPackets.some((packet) => packet.status === "blocked")
        ? "blocked"
        : conflictPackets.length > 0
          ? "review"
          : "ready",
      label: "Conflict summary",
      value: `${conflictPackets.reduce((total, packet) => total + packet.conflictSummaryCount, 0)} signals`,
      detail:
        conflictPackets.length > 0
          ? `${conflictPackets.length} packet${conflictPackets.length === 1 ? "" : "s"} carry operation, target, replay, mention, or save-conflict evidence.`
          : "No recovery packets carry open conflict evidence.",
      recommendation:
        conflictPackets.length > 0
          ? "Resolve or explicitly attach every conflict summary before production handoff."
          : "Conflict summary is clear for the current packets.",
      count: conflictPackets.reduce(
        (total, packet) => total + packet.conflictSummaryCount,
        0,
      ),
      target: conflictPackets[0]?.fileName ?? null,
      latestAt: getLatestIso(conflictPackets.map((packet) => packet.latestAt)),
    },
    {
      id: "collaboration-recovery-export-readiness",
      category: "export-readiness",
      status:
        exportReadyPackets.length === packets.length && packets.length > 0
          ? "ready"
          : packets.some((packet) => packet.status === "blocked")
            ? "blocked"
            : "review",
      label: "Recovery export readiness",
      value: `${exportReadyPackets.length}/${packets.length} ready`,
      detail: `${exportReadyPackets.length} recovery packet${exportReadyPackets.length === 1 ? "" : "s"} can be exported with activity replay, ownership handoff, and conflict summary evidence.`,
      recommendation:
        exportReadyPackets.length === packets.length && packets.length > 0
          ? "Export recovery packets with release evidence."
          : "Archive evidence, assign owners, and resolve conflicts before packet export.",
      count: packets.length - exportReadyPackets.length,
      target: packets.find((packet) => !packet.exportReady)?.fileName ?? null,
      latestAt: getLatestIso(packets.map((packet) => packet.latestAt)),
    },
  ];

  return rows.sort(sortRows);
}

function getOwnerHandoffStatus(
  room: AdminCollaborationRecoveryRoomSource,
): AdminCollaborationRecoveryOwnerHandoffStatus {
  if (room.handoffAssignedAt || room.handoffOwnerEmail || room.presenter.ownerEmail) {
    if (
      room.latestSignalAt &&
      room.handoffAssignedAt &&
      Date.parse(room.latestSignalAt) > Date.parse(room.handoffAssignedAt) &&
      !room.evidenceArchivedAt
    ) {
      return "stale";
    }

    return "assigned";
  }

  return "missing";
}

function getOwnerHandoffLabel(
  room: AdminCollaborationRecoveryRoomSource,
  status: AdminCollaborationRecoveryOwnerHandoffStatus,
) {
  if (status === "missing") {
    return "No recovery owner assigned.";
  }

  if (status === "stale") {
    return "Assigned owner needs a fresh evidence archive.";
  }

  return `${room.handoffOwnerName ?? room.presenter.ownerName ?? "Assigned owner"} owns recovery.`;
}

function getPacketStatus({
  activityReplayEvidenceCount,
  conflictSummaryCount,
  evidenceArchived,
  exportReady,
  ownerHandoffStatus,
  replayWindowStatus,
  roomStatus,
}: {
  activityReplayEvidenceCount: number;
  conflictSummaryCount: number;
  evidenceArchived: boolean;
  exportReady: boolean;
  ownerHandoffStatus: AdminCollaborationRecoveryOwnerHandoffStatus;
  replayWindowStatus: AdminCollaborationRecoveryPacketStatus;
  roomStatus: AdminCollaborationRecoveryPacketStatus;
}) {
  if (exportReady) {
    return "ready";
  }

  if (
    roomStatus === "blocked" ||
    ownerHandoffStatus === "missing" ||
    activityReplayEvidenceCount === 0 ||
    conflictSummaryCount > 4
  ) {
    return "blocked";
  }

  if (
    ownerHandoffStatus === "stale" ||
    !evidenceArchived ||
    replayWindowStatus !== "ready" ||
    conflictSummaryCount > 0
  ) {
    return "review";
  }

  return "ready";
}

function getRecoverySteps({
  activityReplayEvidenceCount,
  conflictSummaryCount,
  evidenceArchived,
  ownerHandoffStatus,
  replayWindowStatus,
  room,
}: {
  activityReplayEvidenceCount: number;
  conflictSummaryCount: number;
  evidenceArchived: boolean;
  ownerHandoffStatus: AdminCollaborationRecoveryOwnerHandoffStatus;
  replayWindowStatus: AdminCollaborationRecoveryPacketStatus;
  room: AdminCollaborationRecoveryRoomSource;
}) {
  const steps: string[] = [];

  if (activityReplayEvidenceCount === 0) {
    steps.push("Capture activity replay evidence.");
  }

  if (ownerHandoffStatus !== "assigned") {
    steps.push("Assign ownership handoff.");
  }

  if (conflictSummaryCount > 0) {
    steps.push("Attach and resolve conflict summary.");
  }

  if (!evidenceArchived) {
    steps.push("Archive packet evidence.");
  }

  if (replayWindowStatus !== "ready" || room.offlineReplayQueueCount > 0) {
    steps.push("Refresh stale replay and clear offline queues.");
  }

  if (room.unresolvedMentionCount > 0) {
    steps.push("Resolve mention queues.");
  }

  return steps;
}

function getPacketRecommendation(
  status: AdminCollaborationRecoveryPacketStatus,
  exportReady: boolean,
) {
  if (exportReady) {
    return "Recovery packet is ready for JSON, CSV, and Markdown export.";
  }

  if (status === "blocked") {
    return "Block release handoff until ownership, replay, and conflict evidence are recovered.";
  }

  return "Review packet evidence, archive the handoff, and export after remaining recovery steps are clear.";
}

function getCollaborationRecoveryPacketCommands() {
  return [
    "bun run admin:collaboration-recovery-packets-smoke",
    "Export Admin > Collaboration recovery packets JSON.",
    "Export Admin > Collaboration recovery packets CSV.",
    "Export Admin > Collaboration recovery packets Markdown.",
    "Review Governance > Collaboration recovery packets before release handoff or replay purge.",
  ];
}

function groupBy<Value>(
  values: Value[],
  getKey: (value: Value) => string,
) {
  const groups = new Map<string, Value[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function normalizeStatus(
  status: "ready" | "review" | "blocked",
): AdminCollaborationRecoveryPacketStatus {
  return status;
}

function getWorstStatus(statuses: AdminCollaborationRecoveryPacketStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
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

function statusWeight(status: AdminCollaborationRecoveryPacketStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminCollaborationRecoveryRow,
  right: AdminCollaborationRecoveryRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortPackets(
  left: AdminCollaborationRecoveryPacket,
  right: AdminCollaborationRecoveryPacket,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.conflictSummaryCount - left.conflictSummaryCount ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

export {
  getAdminCollaborationRecoveryPacketsCsv,
  getAdminCollaborationRecoveryPacketsJson,
  getAdminCollaborationRecoveryPacketsMarkdown,
} from "@/features/admin/admin-collaboration-recovery-packets-export";

export type {
  AdminCollaborationRecoveryInput,
  AdminCollaborationRecoveryOwnerHandoffStatus,
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketCategory,
  AdminCollaborationRecoveryPacketsReport,
  AdminCollaborationRecoveryPacketStatus,
  AdminCollaborationRecoveryRoomSource,
  AdminCollaborationRecoveryRow,
} from "@/features/admin/admin-collaboration-recovery-packets-types";
