import type { AdminAuditMetadata } from "@/db/schema";
import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRoom,
} from "@/features/admin/admin-collaboration-handoff-operations";
import type {
  DesignActivityEvent,
  DesignCollaborationChatMessage,
  DesignCollaborationPresenceEvent,
  DesignDocument,
} from "@/features/editor/types";

export const COLLABORATION_EVENT_PURGE_ACTION =
  "collaboration_event_ingestion.purge_replay";

export type AdminCollaborationEventStatus = "ready" | "review" | "blocked";

export type AdminCollaborationEventKind =
  | "activity"
  | "chat"
  | "presence"
  | "room-action";

export type AdminCollaborationEventFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminCollaborationEventAudit = {
  action: string;
  actorEmail: string;
  targetId: string;
  targetLabel: string;
  metadata: AdminAuditMetadata;
  createdAt: string;
};

export type AdminCollaborationEventRecord = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  kind: AdminCollaborationEventKind;
  signal: string;
  actorRef: string;
  privacy: "redacted";
  detail: string;
  createdAt: string;
  retentionExpiresAt: string;
};

export type AdminCollaborationReplayWindow = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  status: AdminCollaborationEventStatus;
  firstEventAt: string | null;
  latestEventAt: string | null;
  retentionExpiresAt: string | null;
  eventCount: number;
  chatCount: number;
  presenceCount: number;
  activityCount: number;
  roomActionCount: number;
  purgeCandidate: boolean;
  recommendation: string;
};

export type AdminCollaborationIncidentRow = {
  id: string;
  fileId: string | null;
  fileName: string;
  status: AdminCollaborationEventStatus;
  category: "ingestion" | "privacy" | "purge" | "replay-window";
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminCollaborationEventIngestionReport = {
  generatedAt: string;
  status: AdminCollaborationEventStatus;
  score: number;
  retentionDays: number;
  replayWindowDays: number;
  durableEventCount: number;
  redactedEventCount: number;
  chatEventCount: number;
  presenceEventCount: number;
  activityEventCount: number;
  roomActionEventCount: number;
  incidentCount: number;
  purgeCandidateCount: number;
  purgedReplayCount: number;
  latestPurgeAt: string | null;
  replayWindows: AdminCollaborationReplayWindow[];
  incidents: AdminCollaborationIncidentRow[];
  recentEvents: AdminCollaborationEventRecord[];
  commands: string[];
};

export type AdminCollaborationEventIngestionInput = {
  auditEvents: AdminCollaborationEventAudit[];
  collaborationHandoffOperations: AdminCollaborationHandoffOperationsReport;
  files: AdminCollaborationEventFile[];
  generatedAt?: string;
  now?: number;
  retentionDays?: number;
  replayWindowDays?: number;
};

export type CollaborationEventPurgeMetadata = {
  actionKind: typeof COLLABORATION_EVENT_PURGE_ACTION;
  actorEmail: string;
  createdAt: string;
  cutoffAt: string;
  retentionDays: number;
  scannedFileCount: number;
  purgedFileCount: number;
  purgedChatMessageCount: number;
  purgedPresenceEventCount: number;
  note: string;
};

export function getAdminCollaborationEventIngestionReport({
  auditEvents,
  collaborationHandoffOperations,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  retentionDays = 7,
  replayWindowDays = 3,
}: AdminCollaborationEventIngestionInput): AdminCollaborationEventIngestionReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const events = activeFiles
    .flatMap((file) => getFileEvents(file, auditEvents, retentionDays))
    .sort(sortEventsByCreatedAtDesc);
  const replayWindows = activeFiles
    .map((file) =>
      getReplayWindow({
        events: events.filter((event) => event.fileId === file.fileId),
        file,
        now,
        retentionDays,
        replayWindowDays,
      }),
    )
    .sort(sortReplayWindows);
  const incidents = [
    getIngestionCoverageIncident(events, activeFiles),
    getPrivacyIncident(events),
    getPurgeIncident(replayWindows),
    ...getRoomReplayIncidents(collaborationHandoffOperations.rooms, now),
  ].sort(sortIncidents);
  const reviewCount = incidents.filter((row) => row.status === "review").length;
  const blockedCount = incidents.filter((row) => row.status === "blocked").length;
  const status: AdminCollaborationEventStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const purgeEvents = auditEvents.filter(
    (event) => event.action === COLLABORATION_EVENT_PURGE_ACTION,
  );
  const latestPurge = purgeEvents.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    retentionDays,
    replayWindowDays,
    durableEventCount: events.length,
    redactedEventCount: events.filter((event) => event.privacy === "redacted")
      .length,
    chatEventCount: events.filter((event) => event.kind === "chat").length,
    presenceEventCount: events.filter((event) => event.kind === "presence")
      .length,
    activityEventCount: events.filter((event) => event.kind === "activity")
      .length,
    roomActionEventCount: events.filter((event) => event.kind === "room-action")
      .length,
    incidentCount: incidents.filter((incident) => incident.status !== "ready")
      .length,
    purgeCandidateCount: replayWindows.filter((window) => window.purgeCandidate)
      .length,
    purgedReplayCount: purgeEvents.reduce(
      (total, event) => total + Number(event.metadata.purgedFileCount ?? 0),
      0,
    ),
    latestPurgeAt: latestPurge?.createdAt ?? null,
    replayWindows,
    incidents,
    recentEvents: events.slice(0, 80),
    commands: getCollaborationEventIngestionCommands({
      purgeCandidateCount: replayWindows.filter((window) => window.purgeCandidate)
        .length,
      retentionDays,
    }),
  };
}

export function createCollaborationEventPurgeMetadata(
  metadata: CollaborationEventPurgeMetadata,
): AdminAuditMetadata {
  return {
    actionKind: metadata.actionKind,
    actorEmail: metadata.actorEmail,
    createdAt: metadata.createdAt,
    cutoffAt: metadata.cutoffAt,
    retentionDays: metadata.retentionDays,
    scannedFileCount: metadata.scannedFileCount,
    purgedFileCount: metadata.purgedFileCount,
    purgedChatMessageCount: metadata.purgedChatMessageCount,
    purgedPresenceEventCount: metadata.purgedPresenceEventCount,
    note: metadata.note,
  };
}

export function getCollaborationRoomReplayEventCount(document: DesignDocument) {
  const room = document.collaborationRoom;

  return {
    chatMessageCount: room?.chatMessages.length ?? 0,
    presenceEventCount: room?.presenceEvents.length ?? 0,
  };
}

export function shouldPurgeCollaborationRoomReplay({
  document,
  now = Date.now(),
  retentionDays,
}: {
  document: DesignDocument;
  now?: number;
  retentionDays: number;
}) {
  const room = document.collaborationRoom;

  if (!room || (room.chatMessages.length === 0 && room.presenceEvents.length === 0)) {
    return false;
  }

  const latestRoomAt = getLatestRoomEventMs(room.chatMessages, room.presenceEvents);
  const updatedAt = Date.parse(room.updatedAt);
  const latestAt = Number.isFinite(updatedAt) ? updatedAt : latestRoomAt;

  return latestAt > 0 && latestAt < getCutoffMs(now, retentionDays);
}

function getFileEvents(
  file: AdminCollaborationEventFile,
  auditEvents: AdminCollaborationEventAudit[],
  retentionDays: number,
): AdminCollaborationEventRecord[] {
  const room = file.document.collaborationRoom;
  const roomEvents = [
    ...(room?.presenceEvents ?? []).map((event) =>
      fromPresenceEvent(file, event, retentionDays),
    ),
    ...(room?.chatMessages ?? []).map((message) =>
      fromChatMessage(file, message, retentionDays),
    ),
  ];
  const activityEvents = (file.document.activityEvents ?? []).map((event) =>
    fromActivityEvent(file, event, retentionDays),
  );
  const auditRoomEvents = auditEvents
    .filter((event) => isRoomAuditEventForFile(event, file.fileId))
    .map((event) => fromAuditEvent(file, event, retentionDays));

  return [...roomEvents, ...activityEvents, ...auditRoomEvents];
}

function fromPresenceEvent(
  file: AdminCollaborationEventFile,
  event: DesignCollaborationPresenceEvent,
  retentionDays: number,
): AdminCollaborationEventRecord {
  const createdAt = toIsoFromEventMs(event.createdAt);

  return {
    id: event.id,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    kind: "presence",
    signal: event.kind,
    actorRef: getActorRef(event.peerEmail ?? event.peerId ?? event.peerName),
    privacy: "redacted",
    detail: sanitizeDetail(event.detail ?? event.kind),
    createdAt,
    retentionExpiresAt: getRetentionExpiresAt(createdAt, retentionDays),
  };
}

function fromChatMessage(
  file: AdminCollaborationEventFile,
  message: DesignCollaborationChatMessage,
  retentionDays: number,
): AdminCollaborationEventRecord {
  const createdAt = toIsoFromEventMs(message.createdAt);

  return {
    id: message.id,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    kind: "chat",
    signal: "chat-message",
    actorRef: getActorRef(message.email ?? message.peerId ?? message.name),
    privacy: "redacted",
    detail: `Chat payload retained only as redacted length ${message.text.length}.`,
    createdAt,
    retentionExpiresAt: getRetentionExpiresAt(createdAt, retentionDays),
  };
}

function fromActivityEvent(
  file: AdminCollaborationEventFile,
  event: DesignActivityEvent,
  retentionDays: number,
): AdminCollaborationEventRecord {
  return {
    id: event.id,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    kind: "activity",
    signal: event.kind,
    actorRef: getActorRef(event.actorEmail ?? event.actorName),
    privacy: "redacted",
    detail: sanitizeDetail(event.detail ?? event.label),
    createdAt: event.createdAt,
    retentionExpiresAt: getRetentionExpiresAt(event.createdAt, retentionDays),
  };
}

function fromAuditEvent(
  file: AdminCollaborationEventFile,
  event: AdminCollaborationEventAudit,
  retentionDays: number,
): AdminCollaborationEventRecord {
  return {
    id: `${event.action}-${event.createdAt}-${event.targetId}`,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    kind: "room-action",
    signal: event.action,
    actorRef: getActorRef(event.actorEmail),
    privacy: "redacted",
    detail: sanitizeDetail(String(event.metadata.note ?? event.targetLabel)),
    createdAt: event.createdAt,
    retentionExpiresAt: getRetentionExpiresAt(event.createdAt, retentionDays),
  };
}

function getReplayWindow({
  events,
  file,
  now,
  retentionDays,
  replayWindowDays,
}: {
  events: AdminCollaborationEventRecord[];
  file: AdminCollaborationEventFile;
  now: number;
  retentionDays: number;
  replayWindowDays: number;
}): AdminCollaborationReplayWindow {
  const sorted = [...events].sort(sortEventsByCreatedAtAsc);
  const firstEventAt = sorted[0]?.createdAt ?? null;
  const latestEventAt = sorted.at(-1)?.createdAt ?? null;
  const retentionExpiresAt = latestEventAt
    ? getRetentionExpiresAt(latestEventAt, retentionDays)
    : null;
  const latestEventMs = latestEventAt ? Date.parse(latestEventAt) : 0;
  const windowAgeDays =
    latestEventMs > 0 ? (now - latestEventMs) / (24 * 60 * 60 * 1000) : null;
  const purgeCandidate = shouldPurgeCollaborationRoomReplay({
    document: file.document,
    now,
    retentionDays,
  });
  const status: AdminCollaborationEventStatus =
    purgeCandidate || windowAgeDays === null
      ? "review"
      : windowAgeDays > replayWindowDays
        ? "review"
        : "ready";

  return {
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    status,
    firstEventAt,
    latestEventAt,
    retentionExpiresAt,
    eventCount: events.length,
    chatCount: events.filter((event) => event.kind === "chat").length,
    presenceCount: events.filter((event) => event.kind === "presence").length,
    activityCount: events.filter((event) => event.kind === "activity").length,
    roomActionCount: events.filter((event) => event.kind === "room-action")
      .length,
    purgeCandidate,
    recommendation: getReplayWindowRecommendation(status, purgeCandidate),
  };
}

function getIngestionCoverageIncident(
  events: AdminCollaborationEventRecord[],
  files: AdminCollaborationEventFile[],
): AdminCollaborationIncidentRow {
  const status: AdminCollaborationEventStatus =
    files.length > 0 && events.length === 0 ? "review" : "ready";

  return {
    id: "collaboration-event-ingestion-coverage",
    fileId: null,
    fileName: "Workspace",
    status,
    category: "ingestion",
    label: "Durable event ingestion",
    value: `${events.length} events`,
    detail:
      events.length > 0
        ? `${events.length} collaboration, activity, and room action events are available for durable replay review.`
        : "No collaboration events are available in the current active file window.",
    recommendation:
      status === "ready"
        ? "Keep exporting the event ledger with release and incident evidence."
        : "Open collaborative files and sync room snapshots before relying on realtime incident replay.",
    latestAt: events[0]?.createdAt ?? null,
  };
}

function getPrivacyIncident(
  events: AdminCollaborationEventRecord[],
): AdminCollaborationIncidentRow {
  const redactedCount = events.filter((event) => event.privacy === "redacted")
    .length;
  const status: AdminCollaborationEventStatus =
    events.length === redactedCount ? "ready" : "blocked";

  return {
    id: "collaboration-event-privacy",
    fileId: null,
    fileName: "Workspace",
    status,
    category: "privacy",
    label: "Participant privacy",
    value: `${redactedCount}/${events.length} redacted`,
    detail:
      "Participant emails, chat body text, and raw peer identifiers are excluded from the admin event ledger.",
    recommendation:
      status === "ready"
        ? "Privacy-safe event references are ready for incident handoff."
        : "Block release until every event record is redacted.",
    latestAt: events[0]?.createdAt ?? null,
  };
}

function getPurgeIncident(
  replayWindows: AdminCollaborationReplayWindow[],
): AdminCollaborationIncidentRow {
  const purgeCandidates = replayWindows.filter((window) => window.purgeCandidate);
  const status: AdminCollaborationEventStatus =
    purgeCandidates.length > 0 ? "review" : "ready";

  return {
    id: "collaboration-event-retention-purge",
    fileId: purgeCandidates[0]?.fileId ?? null,
    fileName: purgeCandidates[0]?.fileName ?? "Workspace",
    status,
    category: "purge",
    label: "Realtime replay retention",
    value: `${purgeCandidates.length} candidates`,
    detail:
      purgeCandidates.length > 0
        ? `${purgeCandidates.length} room replay snapshot${purgeCandidates.length === 1 ? "" : "s"} are older than the active retention window.`
        : "No room replay snapshots exceed the active retention window.",
    recommendation:
      status === "ready"
        ? "Workspace replay payload retention is within policy."
        : "Export incident evidence, then purge stale replay payloads from workspace controls.",
    latestAt: purgeCandidates[0]?.latestEventAt ?? null,
  };
}

function getRoomReplayIncidents(
  rooms: AdminCollaborationHandoffRoom[],
  now: number,
): AdminCollaborationIncidentRow[] {
  return rooms
    .filter(
      (room) =>
        room.roomCaptured &&
        (room.eventDriftCount > 0 ||
          room.offlineReplayQueueCount > 0 ||
          (room.roomAgeMinutes !== null && room.roomAgeMinutes > 60 * 24 * 3)),
    )
    .map((room) => {
      const blocked =
        room.eventDriftCount > 8 ||
        room.offlineReplayQueueCount > 4 ||
        (room.roomAgeMinutes !== null && room.roomAgeMinutes > 60 * 24 * 7);

      return {
        id: `collaboration-replay-window-${room.fileId}`,
        fileId: room.fileId,
        fileName: room.fileName,
        status: blocked ? "blocked" : "review",
        category: "replay-window",
        label: "Replay window health",
        value: `${room.syncReplay.score}/100`,
        detail: `${room.offlineReplayQueueCount} offline replay item${room.offlineReplayQueueCount === 1 ? "" : "s"}, ${room.eventDriftCount} drift event${room.eventDriftCount === 1 ? "" : "s"}, room age ${formatRoomAge(room.roomAgeMinutes)}.`,
        recommendation:
          "Refresh the room, export replay evidence, and verify final state before live collaboration handoff.",
        latestAt: room.latestAt,
      } satisfies AdminCollaborationIncidentRow;
    });
}

function getCollaborationEventIngestionCommands({
  purgeCandidateCount,
  retentionDays,
}: {
  purgeCandidateCount: number;
  retentionDays: number;
}) {
  return [
    `Review ${purgeCandidateCount} stale replay purge candidate${purgeCandidateCount === 1 ? "" : "s"}.`,
    `Keep collaboration replay windows under ${retentionDays} day${retentionDays === 1 ? "" : "s"} unless a release incident needs preserved evidence.`,
    "Export JSON/CSV/Markdown before purging stale room payloads.",
    "Use activity and audit events for incident context; do not expose raw chat bodies in handoff bundles.",
  ];
}

function isRoomAuditEventForFile(
  event: AdminCollaborationEventAudit,
  fileId: string,
) {
  return (
    event.targetId === fileId &&
    (event.action.startsWith("collaboration_handoff.") ||
      event.action === COLLABORATION_EVENT_PURGE_ACTION)
  );
}

function getReplayWindowRecommendation(
  status: AdminCollaborationEventStatus,
  purgeCandidate: boolean,
) {
  if (purgeCandidate) {
    return "Export replay evidence, then purge stale room payloads to stay inside retention policy.";
  }

  if (status === "ready") {
    return "Replay window is fresh enough for incident review.";
  }

  return "Refresh the collaboration room before relying on this replay window.";
}

function getActorRef(value: string | null | undefined) {
  if (!value) {
    return "participant:unknown";
  }

  let hash = 0;

  for (const char of value.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return `participant:${Math.abs(hash).toString(36).padStart(6, "0").slice(0, 6)}`;
}

function sanitizeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function getRetentionExpiresAt(createdAt: string, retentionDays: number) {
  const createdAtMs = Date.parse(createdAt);

  if (!Number.isFinite(createdAtMs)) {
    return new Date().toISOString();
  }

  return new Date(
    createdAtMs + retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function getLatestRoomEventMs(
  chatMessages: DesignCollaborationChatMessage[],
  presenceEvents: DesignCollaborationPresenceEvent[],
) {
  return Math.max(
    0,
    ...chatMessages.map((message) => normalizeEventMs(message.createdAt)),
    ...presenceEvents.map((event) => normalizeEventMs(event.createdAt)),
  );
}

function getCutoffMs(now: number, retentionDays: number) {
  return now - retentionDays * 24 * 60 * 60 * 1000;
}

function toIsoFromEventMs(value: number) {
  return new Date(normalizeEventMs(value)).toISOString();
}

function normalizeEventMs(value: number) {
  return value < 10_000_000_000 ? value * 1000 : value;
}

function formatRoomAge(roomAgeMinutes: number | null) {
  if (roomAgeMinutes === null) {
    return "unknown";
  }

  if (roomAgeMinutes < 60) {
    return `${Math.round(roomAgeMinutes)}m`;
  }

  return `${Math.round(roomAgeMinutes / 60)}h`;
}

function sortEventsByCreatedAtDesc(
  left: AdminCollaborationEventRecord,
  right: AdminCollaborationEventRecord,
) {
  return right.createdAt.localeCompare(left.createdAt);
}

function sortEventsByCreatedAtAsc(
  left: AdminCollaborationEventRecord,
  right: AdminCollaborationEventRecord,
) {
  return left.createdAt.localeCompare(right.createdAt);
}

function sortReplayWindows(
  left: AdminCollaborationReplayWindow,
  right: AdminCollaborationReplayWindow,
) {
  const statusWeight: Record<AdminCollaborationEventStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusWeight[left.status] - statusWeight[right.status] ||
    Number(right.purgeCandidate) - Number(left.purgeCandidate) ||
    right.eventCount - left.eventCount ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortIncidents(
  left: AdminCollaborationIncidentRow,
  right: AdminCollaborationIncidentRow,
) {
  const statusWeight: Record<AdminCollaborationEventStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusWeight[left.status] - statusWeight[right.status] ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.label.localeCompare(right.label)
  );
}
