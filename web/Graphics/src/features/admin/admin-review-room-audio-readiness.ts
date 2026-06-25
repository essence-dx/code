import type {
  AdminCursorChatRoomMessageRoom,
} from "@/features/admin/admin-cursor-chat-room-messages";
import type {
  AdminLiveReviewActionItem,
  AdminLiveReviewMinuteItem,
  AdminLiveReviewSession,
} from "@/features/admin/admin-live-review-sessions";
import type {
  AdminReviewRoomAudioConsentState,
  AdminReviewRoomAudioEvidence,
  AdminReviewRoomAudioReadinessInput,
  AdminReviewRoomAudioReadinessReport,
  AdminReviewRoomAudioRoom,
  AdminReviewRoomAudioRow,
  AdminReviewRoomAudioStatus,
  AdminReviewRoomFallbackNote,
} from "@/features/admin/admin-review-room-audio-readiness-types";

type AudioRoomParts = {
  actionItems: AdminLiveReviewActionItem[];
  chatRoom?: AdminCursorChatRoomMessageRoom;
  minutes: AdminLiveReviewMinuteItem[];
  session: AdminLiveReviewSession;
};

export function getAdminReviewRoomAudioReadinessReport({
  cursorChatRoomMessages,
  generatedAt = new Date().toISOString(),
  liveReviewSessions,
}: AdminReviewRoomAudioReadinessInput): AdminReviewRoomAudioReadinessReport {
  const chatRoomsByFile = new Map(
    cursorChatRoomMessages.rooms.map((room) => [room.fileId, room]),
  );
  const parts = liveReviewSessions.sessions.map((session) => ({
    actionItems: liveReviewSessions.actionItems.filter(
      (item) => item.sessionId === session.id,
    ),
    chatRoom: chatRoomsByFile.get(session.fileId),
    minutes: liveReviewSessions.minutes.filter(
      (minute) => minute.sessionId === session.id,
    ),
    session,
  }));
  const fallbackNotes = parts.flatMap(getFallbackNotes).sort(sortFallbackNotes);
  const evidence = parts.flatMap((part) =>
    getAdminSafeEvidence({
      fallbackNotes: fallbackNotes.filter(
        (note) => note.roomId === getRoomId(part.session),
      ),
      part,
    }),
  );
  const rooms = parts
    .map((part) =>
      getAudioRoom({
        evidence: evidence.filter((item) => item.roomId === getRoomId(part.session)),
        fallbackNotes: fallbackNotes.filter(
          (note) => note.roomId === getRoomId(part.session),
        ),
        part,
      }),
    )
    .sort(sortRooms);
  const rows = getAudioRows({ evidence, fallbackNotes, rooms });
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;
  const blockedRoomCount = rooms.filter((room) => room.status === "blocked").length;
  const reviewRoomCount = rooms.filter((room) => room.status === "review").length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(
      0,
      100 - blockedRows * 16 - reviewRows * 6 - blockedRoomCount * 4,
    ),
    roomCount: rooms.length,
    readyRoomCount: rooms.filter((room) => room.status === "ready").length,
    reviewRoomCount,
    blockedRoomCount,
    consentCapturedCount: rooms.filter((room) => room.consentState === "captured")
      .length,
    missingConsentCount: rooms.filter((room) => room.consentState === "missing")
      .length,
    partialConsentCount: rooms.filter((room) => room.consentState === "partial")
      .length,
    participantCheckCount: rooms.length,
    failedParticipantCheckCount: rooms.filter(
      (room) => room.participantCheckStatus === "blocked",
    ).length,
    fallbackHandoffNoteCount: fallbackNotes.length,
    adminSafeEvidenceCount: evidence.length,
    exportReadyRoomCount: rooms.filter((room) => room.exportReady).length,
    rows,
    rooms,
    fallbackNotes,
    evidence: evidence.sort(sortEvidence),
    commands: getReviewRoomAudioCommands(),
  };
}

function getAudioRoom({
  evidence,
  fallbackNotes,
  part,
}: {
  evidence: AdminReviewRoomAudioEvidence[];
  fallbackNotes: AdminReviewRoomFallbackNote[];
  part: AudioRoomParts;
}): AdminReviewRoomAudioRoom {
  const participantCount = Math.max(
    part.session.reviewerCount,
    part.chatRoom?.participantCount ?? 0,
  );
  const consentState = getConsentState(part);
  const participantCheckStatus = getParticipantCheckStatus(part);
  const audioRiskCount = getAudioRiskCount({
    consentState,
    fallbackNoteCount: fallbackNotes.length,
    part,
    participantCheckStatus,
  });
  const exportReady =
    consentState === "captured" &&
    participantCheckStatus === "ready" &&
    fallbackNotes.length > 0 &&
    evidence.length > 0 &&
    audioRiskCount === 0;
  const status = exportReady
    ? "ready"
    : audioRiskCount > 0 || part.session.status === "blocked"
      ? "blocked"
      : "review";

  return {
    id: getRoomId(part.session),
    status,
    sessionId: part.session.id,
    fileId: part.session.fileId,
    fileName: part.session.fileName,
    ownerRef: part.session.ownerRef,
    consentState,
    participantCheckStatus,
    participantCount,
    reviewerCount: part.session.reviewerCount,
    externalParticipantCount: part.chatRoom?.externalParticipantCount ?? 0,
    activePresenceCount: part.chatRoom?.presenceEventCount ?? 0,
    expiredMessageCount: part.chatRoom?.expiredMessageCount ?? 0,
    fallbackHandoffNoteCount: fallbackNotes.length,
    adminSafeEvidenceCount: evidence.length,
    audioRiskCount,
    exportReady,
    latestAt: getLatestIso([
      part.session.latestAt,
      part.chatRoom?.latestAt,
      ...part.minutes.map((minute) => minute.createdAt),
    ]),
    recommendation: getRoomRecommendation({
      consentState,
      exportReady,
      fallbackNoteCount: fallbackNotes.length,
      participantCheckStatus,
    }),
  };
}

function getConsentState(part: AudioRoomParts): AdminReviewRoomAudioConsentState {
  const consentMinutes = part.minutes.filter((minute) =>
    includesAny(`${minute.label} ${minute.detail}`, ["consent", "audio"]),
  );
  const consentActions = part.actionItems.filter((item) =>
    includesAny(`${item.label} ${item.detail}`, ["consent", "audio"]),
  );

  if (consentActions.some((item) => item.status === "blocked")) {
    return "missing";
  }

  if (consentMinutes.length > 0 && (part.chatRoom?.externalParticipantCount ?? 0) === 0) {
    return "captured";
  }

  if (consentMinutes.length > 0) {
    return "partial";
  }

  return "missing";
}

function getParticipantCheckStatus(part: AudioRoomParts): AdminReviewRoomAudioStatus {
  const participantCount = Math.max(
    part.session.reviewerCount,
    part.chatRoom?.participantCount ?? 0,
  );

  if (
    participantCount === 0 ||
    (part.chatRoom?.externalParticipantCount ?? 0) > 0 ||
    (part.chatRoom?.expiredMessageCount ?? 0) > 0
  ) {
    return "blocked";
  }

  if (
    (part.chatRoom?.presenceEventCount ?? 0) === 0 ||
    participantCount < part.session.reviewerCount
  ) {
    return "review";
  }

  return "ready";
}

function getFallbackNotes(part: AudioRoomParts): AdminReviewRoomFallbackNote[] {
  const roomId = getRoomId(part.session);
  const minuteNotes = part.minutes
    .filter((minute) =>
      includesAny(`${minute.label} ${minute.detail}`, ["fallback", "handoff"]),
    )
    .map((minute) => ({
      id: `${roomId}-fallback-minute-${minute.id}`,
      roomId,
      fileId: part.session.fileId,
      fileName: part.session.fileName,
      status: minute.status,
      source: "minutes" as const,
      ownerRef: minute.ownerRef,
      note: "Review minutes include an audio fallback handoff note.",
      latestAt: minute.createdAt,
    }));
  const actionNotes = part.actionItems
    .filter((item) =>
      includesAny(`${item.label} ${item.detail}`, ["fallback", "handoff", "audio"]),
    )
    .map((item) => ({
      id: `${roomId}-fallback-action-${item.id}`,
      roomId,
      fileId: part.session.fileId,
      fileName: part.session.fileName,
      status: item.status,
      source: "action-item" as const,
      ownerRef: item.ownerRef,
      note: `Fallback action is ${item.status} and should be resolved before audio handoff.`,
      latestAt: item.dueAt,
    }));
  const cursorNote =
    part.chatRoom && part.chatRoom.status !== "ready"
      ? [
          {
            id: `${roomId}-fallback-cursor-room`,
            roomId,
            fileId: part.session.fileId,
            fileName: part.session.fileName,
            status: part.chatRoom.status,
            source: "cursor-chat" as const,
            ownerRef: part.session.ownerRef,
            note: "Cursor chat handoff should remain available while audio readiness is blocked.",
            latestAt: part.chatRoom.latestAt,
          },
        ]
      : [];

  return [...minuteNotes, ...actionNotes, ...cursorNote];
}

function getAdminSafeEvidence({
  fallbackNotes,
  part,
}: {
  fallbackNotes: AdminReviewRoomFallbackNote[];
  part: AudioRoomParts;
}): AdminReviewRoomAudioEvidence[] {
  const roomId = getRoomId(part.session);
  const consentState = getConsentState(part);
  const participantCheckStatus = getParticipantCheckStatus(part);

  return [
    {
      id: `${roomId}-evidence-consent`,
      roomId,
      fileId: part.session.fileId,
      fileName: part.session.fileName,
      status: consentState === "missing" ? "blocked" : "ready",
      kind: "consent",
      privacy: "redacted",
      detail: `Consent state ${consentState} for ${part.session.reviewerCount} reviewer slots and ${part.chatRoom?.externalParticipantCount ?? 0} external participants.`,
      latestAt: getLatestIso(part.minutes.map((minute) => minute.createdAt)),
    },
    {
      id: `${roomId}-evidence-participants`,
      roomId,
      fileId: part.session.fileId,
      fileName: part.session.fileName,
      status: participantCheckStatus,
      kind: "participant-checks",
      privacy: "redacted",
      detail: `${part.chatRoom?.participantCount ?? part.session.reviewerCount} participants, ${part.chatRoom?.presenceEventCount ?? 0} presence events, and ${part.chatRoom?.expiredMessageCount ?? 0} expired room messages.`,
      latestAt: part.chatRoom?.latestAt ?? part.session.latestAt,
    },
    {
      id: `${roomId}-evidence-fallback`,
      roomId,
      fileId: part.session.fileId,
      fileName: part.session.fileName,
      status: fallbackNotes.length > 0 ? "ready" : "review",
      kind: "fallback-handoff",
      privacy: "redacted",
      detail: `${fallbackNotes.length} fallback handoff notes available for audio failure.`,
      latestAt: getLatestIso(fallbackNotes.map((note) => note.latestAt)),
    },
  ];
}

function getAudioRows({
  evidence,
  fallbackNotes,
  rooms,
}: {
  evidence: AdminReviewRoomAudioEvidence[];
  fallbackNotes: AdminReviewRoomFallbackNote[];
  rooms: AdminReviewRoomAudioRoom[];
}): AdminReviewRoomAudioRow[] {
  const missingConsentRooms = rooms.filter((room) => room.consentState === "missing");
  const failedParticipantRooms = rooms.filter(
    (room) => room.participantCheckStatus === "blocked",
  );
  const roomsWithoutFallback = rooms.filter(
    (room) => room.fallbackHandoffNoteCount === 0,
  );
  const exportReadyRooms = rooms.filter((room) => room.exportReady);
  const rows: AdminReviewRoomAudioRow[] = [
    {
      id: "review-room-audio-consent",
      category: "consent",
      status: missingConsentRooms.length > 0 ? "blocked" : "ready",
      label: "Audio consent state",
      value: `${rooms.length - missingConsentRooms.length}/${rooms.length} captured`,
      detail: `${missingConsentRooms.length} review room${missingConsentRooms.length === 1 ? "" : "s"} still need audio consent before live review.`,
      recommendation:
        missingConsentRooms.length > 0
          ? "Capture explicit participant consent or keep audio disabled for the room."
          : "Audio consent state is captured for the review rooms.",
      count: missingConsentRooms.length,
      target: missingConsentRooms[0]?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
    {
      id: "review-room-audio-participants",
      category: "participant-checks",
      status: failedParticipantRooms.length > 0 ? "blocked" : "ready",
      label: "Participant checks",
      value: `${rooms.length - failedParticipantRooms.length}/${rooms.length} ready`,
      detail: `${failedParticipantRooms.length} room${failedParticipantRooms.length === 1 ? "" : "s"} have external, expired, or missing participant evidence.`,
      recommendation:
        failedParticipantRooms.length > 0
          ? "Resolve external participant consent, stale room evidence, and missing presence before enabling audio."
          : "Participant checks are ready for review-room audio.",
      count: failedParticipantRooms.length,
      target: failedParticipantRooms[0]?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
    {
      id: "review-room-audio-fallback",
      category: "fallback-handoff",
      status: roomsWithoutFallback.length > 0 ? "review" : "ready",
      label: "Fallback handoff",
      value: `${fallbackNotes.length} notes`,
      detail: `${fallbackNotes.length} fallback handoff note${fallbackNotes.length === 1 ? "" : "s"} are available for audio failure or consent fallback.`,
      recommendation:
        roomsWithoutFallback.length > 0
          ? "Write a fallback handoff note before relying on review-room audio."
          : "Fallback handoff notes are attached to the audio review packet.",
      count: roomsWithoutFallback.length,
      target: roomsWithoutFallback[0]?.fileName ?? null,
      latestAt: getLatestIso(fallbackNotes.map((note) => note.latestAt)),
    },
    {
      id: "review-room-audio-evidence",
      category: "evidence-export",
      status: evidence.length >= rooms.length ? "ready" : "review",
      label: "Admin-safe evidence exports",
      value: `${evidence.length} records`,
      detail: `${evidence.length} redacted evidence record${evidence.length === 1 ? "" : "s"} cover consent, participant checks, and fallback handoff notes.`,
      recommendation:
        evidence.length >= rooms.length
          ? "Export audio readiness evidence with the live review packet."
          : "Generate redacted audio readiness evidence for every review room.",
      count: Math.max(0, rooms.length - evidence.length),
      target: rooms.find((room) => room.adminSafeEvidenceCount === 0)?.fileName ?? null,
      latestAt: getLatestIso(evidence.map((item) => item.latestAt)),
    },
    {
      id: "review-room-audio-export-readiness",
      category: "room-readiness",
      status:
        rooms.length > 0 && exportReadyRooms.length === rooms.length
          ? "ready"
          : rooms.some((room) => room.status === "blocked")
            ? "blocked"
            : "review",
      label: "Audio export readiness",
      value: `${exportReadyRooms.length}/${rooms.length} ready`,
      detail: `${exportReadyRooms.length} review room${exportReadyRooms.length === 1 ? "" : "s"} can export audio readiness controls with consent, participants, fallback notes, and redacted evidence.`,
      recommendation:
        exportReadyRooms.length === rooms.length
          ? "Audio readiness evidence is ready for export."
          : "Clear blocked consent and participant checks before exporting audio readiness.",
      count: rooms.length - exportReadyRooms.length,
      target: rooms.find((room) => !room.exportReady)?.fileName ?? null,
      latestAt: getLatestIso(rooms.map((room) => room.latestAt)),
    },
  ];

  return rows.sort(sortRows);
}

function getAudioRiskCount({
  consentState,
  fallbackNoteCount,
  part,
  participantCheckStatus,
}: {
  consentState: AdminReviewRoomAudioConsentState;
  fallbackNoteCount: number;
  part: AudioRoomParts;
  participantCheckStatus: AdminReviewRoomAudioStatus;
}) {
  return [
    consentState === "missing",
    participantCheckStatus === "blocked",
    part.session.status === "blocked",
    (part.chatRoom?.externalParticipantCount ?? 0) > 0,
    (part.chatRoom?.expiredMessageCount ?? 0) > 0,
    fallbackNoteCount === 0,
  ].filter(Boolean).length;
}

function getRoomRecommendation({
  consentState,
  exportReady,
  fallbackNoteCount,
  participantCheckStatus,
}: {
  consentState: AdminReviewRoomAudioConsentState;
  exportReady: boolean;
  fallbackNoteCount: number;
  participantCheckStatus: AdminReviewRoomAudioStatus;
}) {
  if (consentState === "missing") {
    return "Capture participant consent before enabling review-room audio.";
  }

  if (participantCheckStatus === "blocked") {
    return "Resolve participant readiness checks before audio handoff.";
  }

  if (fallbackNoteCount === 0) {
    return "Add fallback handoff notes for audio failure or consent fallback.";
  }

  return exportReady
    ? "Review-room audio readiness evidence is ready for export."
    : "Review audio readiness controls before release handoff.";
}

function getReviewRoomAudioCommands() {
  return [
    "bun run admin:review-room-audio-readiness-smoke",
    "Export Admin > Review-room audio readiness JSON.",
    "Export Admin > Review-room audio readiness CSV.",
    "Export Admin > Review-room audio readiness Markdown.",
    "Attach audio consent, participant checks, fallback notes, and redacted evidence to live review packets.",
  ];
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLowerCase();

  return needles.some((needle) => normalized.includes(needle));
}

function getRoomId(session: AdminLiveReviewSession) {
  return `review-room-audio-${session.fileId}-${session.branchId}`;
}

function getWorstStatus(statuses: AdminReviewRoomAudioStatus[]) {
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

function statusWeight(status: AdminReviewRoomAudioStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(left: AdminReviewRoomAudioRow, right: AdminReviewRoomAudioRow) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortRooms(
  left: AdminReviewRoomAudioRoom,
  right: AdminReviewRoomAudioRoom,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.audioRiskCount - left.audioRiskCount ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortEvidence(
  left: AdminReviewRoomAudioEvidence,
  right: AdminReviewRoomAudioEvidence,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortFallbackNotes(
  left: AdminReviewRoomFallbackNote,
  right: AdminReviewRoomFallbackNote,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

export {
  getAdminReviewRoomAudioReadinessCsv,
  getAdminReviewRoomAudioReadinessJson,
  getAdminReviewRoomAudioReadinessMarkdown,
} from "@/features/admin/admin-review-room-audio-readiness-export";

export type {
  AdminReviewRoomAudioCategory,
  AdminReviewRoomAudioConsentState,
  AdminReviewRoomAudioEvidence,
  AdminReviewRoomAudioReadinessInput,
  AdminReviewRoomAudioReadinessReport,
  AdminReviewRoomAudioRoom,
  AdminReviewRoomAudioRow,
  AdminReviewRoomAudioStatus,
  AdminReviewRoomFallbackNote,
} from "@/features/admin/admin-review-room-audio-readiness-types";
