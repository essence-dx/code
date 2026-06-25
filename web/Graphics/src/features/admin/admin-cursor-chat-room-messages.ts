import type {
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketStatus,
} from "@/features/admin/admin-collaboration-recovery-packets";
import type { AdminCollaborationReplayWindow } from "@/features/admin/admin-collaboration-event-ingestion";
import type {
  AdminCursorChatRoomMessageFile,
  AdminCursorChatRoomMessageRoom,
  AdminCursorChatRoomMessageRow,
  AdminCursorChatRoomMessagesInput,
  AdminCursorChatRoomMessageStatus,
  AdminCursorChatRoomMessagesReport,
  AdminCursorChatRoomReplayEvidence,
} from "@/features/admin/admin-cursor-chat-room-messages-types";
import type {
  DesignCollaborationChatMessage,
  DesignCollaborationPresenceEvent,
} from "@/features/editor/types";
import { toCollaborationRoomSnapshot } from "@/features/editor/collaboration-room-state";

const dayMs = 24 * 60 * 60 * 1000;

export function getAdminCursorChatRoomMessagesReport({
  collaborationEventIngestion,
  collaborationRecoveryPackets,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  replayWindowDays = collaborationEventIngestion.replayWindowDays,
  retentionDays = collaborationEventIngestion.retentionDays,
}: AdminCursorChatRoomMessagesInput): AdminCursorChatRoomMessagesReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const replayWindowByFile = new Map(
    collaborationEventIngestion.replayWindows.map((window) => [
      window.fileId,
      window,
    ]),
  );
  const recoveryPacketByFile = new Map(
    collaborationRecoveryPackets.packets.map((packet) => [
      packet.fileId,
      packet,
    ]),
  );
  const rooms = activeFiles
    .map((file) =>
      getRoomSummary({
        file,
        now,
        recoveryPacket: recoveryPacketByFile.get(file.fileId),
        replayWindow: replayWindowByFile.get(file.fileId),
        replayWindowDays,
        retentionDays,
      }),
    )
    .sort(sortRooms);
  const replayEvidence = rooms
    .flatMap((room) =>
      getReplayEvidence({
        file: activeFiles.find((file) => file.fileId === room.fileId),
        recoveryPacketStatus: room.recoveryPacketStatus,
        retentionDays,
        now,
      }),
    )
    .sort(sortReplayEvidence);
  const activeRooms = rooms.filter(
    (room) => room.messageCount > 0 || room.presenceEventCount > 0,
  );
  const messageCount = rooms.reduce((total, room) => total + room.messageCount, 0);
  const retainedMessageCount = rooms.reduce(
    (total, room) => total + room.retainedMessageCount,
    0,
  );
  const expiredMessageCount = rooms.reduce(
    (total, room) => total + room.expiredMessageCount,
    0,
  );
  const mentionCount = rooms.reduce((total, room) => total + room.mentionCount, 0);
  const participantCount = rooms.reduce(
    (total, room) => total + room.participantCount,
    0,
  );
  const externalParticipantCount = rooms.reduce(
    (total, room) => total + room.externalParticipantCount,
    0,
  );
  const privacyReplayEvidenceCount = replayEvidence.length;
  const rows = getCursorChatRows({
    activeRooms,
    expiredMessageCount,
    mentionCount,
    messageCount,
    privacyReplayEvidenceCount,
    replayWindowLinkedCount: rooms.filter(
      (room) => room.replayWindowEventCount > 0,
    ).length,
    rooms,
  });
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(0, 100 - blockedRows * 18 - reviewRows * 6),
    fileCount: activeFiles.length,
    roomCount: rooms.length,
    activeRoomCount: activeRooms.length,
    messageCount,
    retainedMessageCount,
    expiredMessageCount,
    mentionCount,
    participantCount,
    externalParticipantCount,
    presenceEventCount: rooms.reduce(
      (total, room) => total + room.presenceEventCount,
      0,
    ),
    privacyReplayEvidenceCount,
    replayWindowLinkedCount: rooms.filter(
      (room) => room.replayWindowEventCount > 0,
    ).length,
    recoveryPacketLinkedCount: activeRooms.filter(
      (room) => room.recoveryPacketStatus !== "missing",
    ).length,
    missingRecoveryPacketCount: activeRooms.filter(
      (room) => room.recoveryPacketStatus === "missing",
    ).length,
    exportReadyRoomCount: rooms.filter((room) => room.exportReady).length,
    rows,
    rooms,
    replayEvidence,
    commands: getCursorChatRoomMessageCommands(),
  };
}

function getRoomSummary({
  file,
  now,
  recoveryPacket,
  replayWindow,
  replayWindowDays,
  retentionDays,
}: {
  file: AdminCursorChatRoomMessageFile;
  now: number;
  recoveryPacket?: AdminCollaborationRecoveryPacket;
  replayWindow?: AdminCollaborationReplayWindow;
  replayWindowDays: number;
  retentionDays: number;
}): AdminCursorChatRoomMessageRoom {
  const snapshot = toCollaborationRoomSnapshot(file.document.collaborationRoom);
  const messages = snapshot.chatMessages;
  const presenceEvents = snapshot.presenceEvents;
  const retainedMessages = messages.filter(
    (message) => !isExpiredMessage(message, now, retentionDays),
  );
  const expiredMessageCount = messages.length - retainedMessages.length;
  const participantRefs = getParticipantRefs(
    messages,
    presenceEvents,
    file.ownerEmail,
  );
  const recoveryPacketStatus = recoveryPacket
    ? normalizePacketStatus(recoveryPacket.status)
    : "missing";
  const replayWindowStatus = normalizePacketStatus(replayWindow?.status);
  const privacyReplayEvidenceCount = messages.length;
  const exportReady = Boolean(
    messages.length > 0 &&
      expiredMessageCount === 0 &&
      privacyReplayEvidenceCount === messages.length &&
      recoveryPacket?.exportReady &&
      replayWindowStatus === "ready",
  );
  const status = getRoomStatus({
    expiredMessageCount,
    exportReady,
    messageCount: messages.length,
    recoveryPacketStatus,
    replayWindowPurgeCandidate: Boolean(replayWindow?.purgeCandidate),
    replayWindowStatus,
  });
  const latestAt = getLatestIso([
    snapshot.updatedAt,
    replayWindow?.latestEventAt,
    recoveryPacket?.latestAt,
    ...messages.map((message) => toIsoFromMs(message.createdAt)),
    ...presenceEvents.map((event) => toIsoFromMs(event.createdAt)),
    file.updatedAt,
  ]);

  return {
    id: `cursor-chat-room-${file.fileId}`,
    status,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerRef: getActorRef(file.ownerEmail),
    roomCaptured: Boolean(file.document.collaborationRoom),
    roomUpdatedAt: snapshot.updatedAt,
    roomAgeMinutes: snapshot.updatedAt
      ? Math.max(0, Math.round((now - Date.parse(snapshot.updatedAt)) / 60_000))
      : null,
    messageCount: messages.length,
    retainedMessageCount: retainedMessages.length,
    expiredMessageCount,
    mentionCount: messages.filter((message) => hasMention(message.text)).length,
    participantCount: participantRefs.size,
    externalParticipantCount: Array.from(participantRefs.values()).filter(
      (participant) => participant.external,
    ).length,
    presenceEventCount: presenceEvents.length,
    privacyReplayEvidenceCount,
    replayWindowStatus,
    replayWindowEventCount: replayWindow?.eventCount ?? 0,
    replayWindowPurgeCandidate: Boolean(replayWindow?.purgeCandidate),
    recoveryPacketStatus,
    recoveryPacketExportReady: Boolean(recoveryPacket?.exportReady),
    recoveryPacketEvidenceCount: recoveryPacket?.activityReplayEvidenceCount ?? 0,
    exportReady,
    latestAt,
    recommendation: getRoomRecommendation({
      expiredMessageCount,
      exportReady,
      messageCount: messages.length,
      recoveryPacketStatus,
      replayWindowPurgeCandidate: Boolean(replayWindow?.purgeCandidate),
      replayWindowStatus,
      replayWindowDays,
    }),
  };
}

function getReplayEvidence({
  file,
  now,
  recoveryPacketStatus,
  retentionDays,
}: {
  file?: AdminCursorChatRoomMessageFile;
  now: number;
  recoveryPacketStatus: AdminCursorChatRoomMessageStatus | "missing";
  retentionDays: number;
}): AdminCursorChatRoomReplayEvidence[] {
  if (!file?.document.collaborationRoom) {
    return [];
  }

  return file.document.collaborationRoom.chatMessages.map((message) => {
    const createdAt = toRequiredIsoFromMs(message.createdAt);
    const expired = isExpiredMessage(message, now, retentionDays);

    return {
      id: `cursor-chat-replay-${file.fileId}-${message.id}`,
      status:
        recoveryPacketStatus === "blocked" || expired ? "blocked" : "ready",
      fileId: file.fileId,
      fileName: file.fileName,
      messageId: message.id,
      actorRef: getActorRef(message.email ?? message.peerId ?? message.name),
      privacy: "redacted",
      detail: `Chat payload retained as redacted length ${message.text.length} with ${hasMention(message.text) ? 1 : 0} mention signal.`,
      createdAt,
      retentionExpiresAt: getRetentionExpiresAt(createdAt, retentionDays),
      expired,
      recoveryPacketStatus,
    } satisfies AdminCursorChatRoomReplayEvidence;
  });
}

function getCursorChatRows({
  activeRooms,
  expiredMessageCount,
  mentionCount,
  messageCount,
  privacyReplayEvidenceCount,
  replayWindowLinkedCount,
  rooms,
}: {
  activeRooms: AdminCursorChatRoomMessageRoom[];
  expiredMessageCount: number;
  mentionCount: number;
  messageCount: number;
  privacyReplayEvidenceCount: number;
  replayWindowLinkedCount: number;
  rooms: AdminCursorChatRoomMessageRoom[];
}): AdminCursorChatRoomMessageRow[] {
  const missingPacketRooms = activeRooms.filter(
    (room) => room.recoveryPacketStatus === "missing",
  );
  const blockedPacketRooms = activeRooms.filter(
    (room) => room.recoveryPacketStatus === "blocked",
  );
  const exportReadyRooms = rooms.filter((room) => room.exportReady);

  const rows: AdminCursorChatRoomMessageRow[] = [
    {
      id: "cursor-chat-room-messages",
      category: "room-messages",
      status: messageCount > 0 ? "ready" : "review",
      label: "Cursor chat room messages",
      value: `${messageCount} messages`,
      detail: `${activeRooms.length} active room${activeRooms.length === 1 ? "" : "s"} retain lightweight cursor chat messages and presence context.`,
      recommendation:
        messageCount > 0
          ? "Cursor chat message state is available for review handoff."
          : "Capture room messages before relying on cursor chat handoff evidence.",
      count: messageCount,
      target: rooms.find((room) => room.messageCount === 0)?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
    {
      id: "cursor-chat-retention-control",
      category: "retention-control",
      status: expiredMessageCount > 0 ? "blocked" : "ready",
      label: "Retention controls",
      value: `${expiredMessageCount} expired`,
      detail: `${expiredMessageCount} cursor chat message${expiredMessageCount === 1 ? "" : "s"} exceed the configured retention window.`,
      recommendation:
        expiredMessageCount > 0
          ? "Archive privacy-safe evidence, then purge expired room messages before release handoff."
          : "Cursor chat retention windows are clean for the inspected rooms.",
      count: expiredMessageCount,
      target:
        rooms.find((room) => room.expiredMessageCount > 0)?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
    {
      id: "cursor-chat-privacy-replay",
      category: "privacy-replay",
      status:
        privacyReplayEvidenceCount >= messageCount && messageCount > 0
          ? "ready"
          : "review",
      label: "Privacy-safe replay evidence",
      value: `${privacyReplayEvidenceCount} records`,
      detail: `${privacyReplayEvidenceCount} replay evidence record${privacyReplayEvidenceCount === 1 ? "" : "s"} expose actor references, message length, mention signals, and retention dates without raw chat text.`,
      recommendation:
        privacyReplayEvidenceCount >= messageCount && messageCount > 0
          ? "Privacy-safe replay evidence is ready for export."
          : "Generate redacted replay evidence for every retained room message.",
      count: Math.max(0, messageCount - privacyReplayEvidenceCount),
      target:
        rooms.find(
          (room) => room.privacyReplayEvidenceCount < room.messageCount,
        )?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
    {
      id: "cursor-chat-recovery-packet",
      category: "recovery-packet",
      status:
        missingPacketRooms.length > 0 || blockedPacketRooms.length > 0
          ? "blocked"
          : activeRooms.some((room) => room.recoveryPacketStatus === "review")
            ? "review"
            : "ready",
      label: "Recovery packet integration",
      value: `${activeRooms.length - missingPacketRooms.length}/${activeRooms.length} linked`,
      detail: `${replayWindowLinkedCount} room${replayWindowLinkedCount === 1 ? "" : "s"} also have collaboration replay windows; ${mentionCount} cursor chat mention signal${mentionCount === 1 ? "" : "s"} can travel with recovery packets.`,
      recommendation:
        missingPacketRooms.length > 0
          ? "Create recovery packets for active cursor chat rooms before export."
          : blockedPacketRooms.length > 0
            ? "Resolve blocked recovery packets before trusting cursor chat handoff evidence."
            : "Cursor chat rooms are linked to recovery packet evidence.",
      count: missingPacketRooms.length + blockedPacketRooms.length,
      target:
        missingPacketRooms[0]?.fileName ?? blockedPacketRooms[0]?.fileName ?? null,
      latestAt: getLatestIso(activeRooms.map((room) => room.latestAt)),
    },
    {
      id: "cursor-chat-export-readiness",
      category: "export-readiness",
      status:
        activeRooms.length > 0 && exportReadyRooms.length === activeRooms.length
          ? "ready"
          : activeRooms.some((room) => room.status === "blocked")
            ? "blocked"
            : "review",
      label: "Export readiness",
      value: `${exportReadyRooms.length}/${activeRooms.length} ready`,
      detail: `${exportReadyRooms.length} room${exportReadyRooms.length === 1 ? "" : "s"} can export cursor chat evidence with retention, privacy replay, and recovery packet coverage.`,
      recommendation:
        activeRooms.length > 0 && exportReadyRooms.length === activeRooms.length
          ? "Export cursor chat room evidence with the recovery packet bundle."
          : "Clear retention and recovery packet blockers before exporting cursor chat evidence.",
      count: activeRooms.length - exportReadyRooms.length,
      target: activeRooms.find((room) => !room.exportReady)?.fileName ?? null,
      latestAt: getLatestIso(activeRooms.map((room) => room.latestAt)),
    },
  ];

  return rows.sort(sortRows);
}

function getRoomStatus({
  expiredMessageCount,
  exportReady,
  messageCount,
  recoveryPacketStatus,
  replayWindowPurgeCandidate,
  replayWindowStatus,
}: {
  expiredMessageCount: number;
  exportReady: boolean;
  messageCount: number;
  recoveryPacketStatus: AdminCursorChatRoomMessageStatus | "missing";
  replayWindowPurgeCandidate: boolean;
  replayWindowStatus: AdminCursorChatRoomMessageStatus;
}) {
  if (
    expiredMessageCount > 0 ||
    recoveryPacketStatus === "blocked" ||
    recoveryPacketStatus === "missing"
  ) {
    return "blocked";
  }

  if (
    !exportReady ||
    messageCount === 0 ||
    replayWindowPurgeCandidate ||
    replayWindowStatus === "review"
  ) {
    return "review";
  }

  return "ready";
}

function getRoomRecommendation({
  expiredMessageCount,
  exportReady,
  messageCount,
  recoveryPacketStatus,
  replayWindowPurgeCandidate,
  replayWindowStatus,
  replayWindowDays,
}: {
  expiredMessageCount: number;
  exportReady: boolean;
  messageCount: number;
  recoveryPacketStatus: AdminCursorChatRoomMessageStatus | "missing";
  replayWindowPurgeCandidate: boolean;
  replayWindowStatus: AdminCursorChatRoomMessageStatus;
  replayWindowDays: number;
}) {
  if (expiredMessageCount > 0) {
    return "Archive redacted cursor chat replay evidence, then purge expired room messages.";
  }

  if (recoveryPacketStatus === "missing") {
    return "Create a collaboration recovery packet before exporting cursor chat handoff evidence.";
  }

  if (recoveryPacketStatus === "blocked") {
    return "Resolve the linked recovery packet before release handoff.";
  }

  if (replayWindowPurgeCandidate) {
    return "Archive the replay window before the cursor chat room is purged.";
  }

  if (replayWindowStatus === "review") {
    return `Refresh replay evidence so the cursor chat window is inside ${replayWindowDays} days.`;
  }

  if (messageCount === 0) {
    return "Capture lightweight room messages before relying on cursor chat handoff.";
  }

  return exportReady
    ? "Cursor chat room evidence is ready for recovery packet export."
    : "Complete retention, privacy replay, and recovery packet checks before export.";
}

function getParticipantRefs(
  messages: DesignCollaborationChatMessage[],
  presenceEvents: DesignCollaborationPresenceEvent[],
  ownerEmail: string,
) {
  const ownerDomain = getDomain(ownerEmail);
  const participants = new Map<string, { external: boolean }>();

  for (const message of messages) {
    const key = message.email ?? message.peerId ?? message.name;
    participants.set(key, {
      external: Boolean(message.email && getDomain(message.email) !== ownerDomain),
    });
  }

  for (const event of presenceEvents) {
    const key = event.peerEmail ?? event.peerId ?? event.peerName;
    participants.set(key, {
      external: Boolean(event.peerEmail && getDomain(event.peerEmail) !== ownerDomain),
    });
  }

  return participants;
}

function getCursorChatRoomMessageCommands() {
  return [
    "bun run admin:cursor-chat-room-messages-smoke",
    "Export Admin > Cursor chat room messages JSON.",
    "Export Admin > Cursor chat room messages CSV.",
    "Export Admin > Cursor chat room messages Markdown.",
    "Review Governance > Cursor chat room messages before collaboration recovery packet export.",
  ];
}

function isExpiredMessage(
  message: DesignCollaborationChatMessage,
  now: number,
  retentionDays: number,
) {
  return message.createdAt + retentionDays * dayMs < now;
}

function getRetentionExpiresAt(createdAt: string, retentionDays: number) {
  return new Date(Date.parse(createdAt) + retentionDays * dayMs).toISOString();
}

function hasMention(text: string) {
  return /(^|\s)@[A-Za-z0-9._-]+/.test(text);
}

function normalizePacketStatus(
  status?: AdminCollaborationRecoveryPacketStatus,
): AdminCursorChatRoomMessageStatus {
  return status === "blocked" ? "blocked" : status === "review" ? "review" : "ready";
}

function getWorstStatus(statuses: AdminCursorChatRoomMessageStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestIso(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function toIsoFromMs(value: number) {
  return Number.isFinite(value) && value > 0
    ? new Date(value).toISOString()
    : null;
}

function toRequiredIsoFromMs(value: number) {
  return toIsoFromMs(value) ?? new Date(0).toISOString();
}

function getActorRef(value: string) {
  return `participant:${hashString(value.toLowerCase()).slice(0, 10)}`;
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function statusWeight(status: AdminCursorChatRoomMessageStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminCursorChatRoomMessageRow,
  right: AdminCursorChatRoomMessageRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortRooms(
  left: AdminCursorChatRoomMessageRoom,
  right: AdminCursorChatRoomMessageRoom,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.expiredMessageCount - left.expiredMessageCount ||
    right.messageCount - left.messageCount ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortReplayEvidence(
  left: AdminCursorChatRoomReplayEvidence,
  right: AdminCursorChatRoomReplayEvidence,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Number(right.expired) - Number(left.expired) ||
    right.createdAt.localeCompare(left.createdAt)
  );
}

export {
  getAdminCursorChatRoomMessagesCsv,
  getAdminCursorChatRoomMessagesJson,
  getAdminCursorChatRoomMessagesMarkdown,
} from "@/features/admin/admin-cursor-chat-room-messages-export";

export type {
  AdminCursorChatRoomMessageCategory,
  AdminCursorChatRoomMessageFile,
  AdminCursorChatRoomMessageRoom,
  AdminCursorChatRoomMessageRow,
  AdminCursorChatRoomMessagesInput,
  AdminCursorChatRoomMessagesReport,
  AdminCursorChatRoomMessageStatus,
  AdminCursorChatRoomReplayEvidence,
} from "@/features/admin/admin-cursor-chat-room-messages-types";
