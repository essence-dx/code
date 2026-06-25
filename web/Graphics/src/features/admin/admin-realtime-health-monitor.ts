import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRoom,
} from "@/features/admin/admin-collaboration-handoff-operations";
import type {
  AdminPublicRouteAnalyticsReport,
} from "@/features/admin/admin-public-route-analytics";
import type {
  DesignActivityEvent,
  DesignCommentNotificationDelivery,
  DesignDocument,
} from "@/features/editor/types";

export type AdminRealtimeHealthStatus = "ready" | "review" | "blocked";

export type AdminRealtimeHealthCategory =
  | "notifications"
  | "reconnect"
  | "route-analytics"
  | "room-latency"
  | "save-queue";

export type AdminRealtimeHealthFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminRealtimeHealthNotificationDelivery = {
  fileId: string;
  fileName: string;
  kind: DesignCommentNotificationDelivery["kind"];
  recipientEmail: string;
  status: DesignCommentNotificationDelivery["status"];
  reason: string | null;
  createdAt: string;
};

export type AdminRealtimeHealthRow = {
  id: string;
  category: AdminRealtimeHealthCategory;
  status: AdminRealtimeHealthStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminRealtimeHealthReport = {
  generatedAt: string;
  status: AdminRealtimeHealthStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  activeFileCount: number;
  monitoredRoomCount: number;
  staleRoomCount: number;
  averageRoomAgeMinutes: number | null;
  maxRoomAgeMinutes: number | null;
  reconnectQualityScore: number;
  reconnectReviewCount: number;
  offlineReplayQueueCount: number;
  eventDriftCount: number;
  saveTelemetryCount: number;
  pendingSaveSignalCount: number;
  failedSaveTelemetryCount: number;
  failedNotificationDeliveryCount: number;
  routeAnalyticsAnomalyCount: number;
  routeAnalyticsStorageAvailable: boolean;
  rows: AdminRealtimeHealthRow[];
  commands: string[];
};

export type AdminRealtimeHealthInput = {
  collaborationHandoffOperations: AdminCollaborationHandoffOperationsReport;
  files: AdminRealtimeHealthFile[];
  generatedAt?: string;
  notificationDeliveries: AdminRealtimeHealthNotificationDelivery[];
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
};

export function getAdminRealtimeHealthReport({
  collaborationHandoffOperations,
  files,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  publicRouteAnalytics,
}: AdminRealtimeHealthInput): AdminRealtimeHealthReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const activeRooms = collaborationHandoffOperations.rooms.filter(
    (room) => room.roomCaptured,
  );
  const saveSignals = getSaveSignals(activeFiles);
  const routeAnalyticsAnomalyCount = getRouteAnalyticsAnomalyCount(
    publicRouteAnalytics,
  );
  const rows = [
    getRoomLatencyRow(collaborationHandoffOperations.rooms),
    getReconnectRow(activeRooms),
    getSaveQueueRow(saveSignals, activeFiles),
    getNotificationRow(notificationDeliveries),
    getRouteAnalyticsRow(publicRouteAnalytics, routeAnalyticsAnomalyCount),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminRealtimeHealthStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const averageRoomAgeMinutes = getAverageRoomAgeMinutes(activeRooms);
  const maxRoomAgeMinutes = getMaxRoomAgeMinutes(activeRooms);

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    activeFileCount: activeFiles.length,
    monitoredRoomCount: activeRooms.length,
    staleRoomCount: collaborationHandoffOperations.staleRoomCount,
    averageRoomAgeMinutes,
    maxRoomAgeMinutes,
    reconnectQualityScore: getAverageReconnectQualityScore(activeRooms),
    reconnectReviewCount: activeRooms.filter(
      (room) => room.syncReplay.reconnectQualityScore < 80,
    ).length,
    offlineReplayQueueCount: activeRooms.reduce(
      (total, room) => total + room.offlineReplayQueueCount,
      0,
    ),
    eventDriftCount: activeRooms.reduce(
      (total, room) => total + room.eventDriftCount,
      0,
    ),
    saveTelemetryCount: saveSignals.saveTelemetryCount,
    pendingSaveSignalCount: saveSignals.pendingSaveSignalCount,
    failedSaveTelemetryCount: saveSignals.failedSaveTelemetryCount,
    failedNotificationDeliveryCount: notificationDeliveries.filter(
      (delivery) => delivery.status === "failed",
    ).length,
    routeAnalyticsAnomalyCount,
    routeAnalyticsStorageAvailable: publicRouteAnalytics.storageAvailable,
    rows: rows.sort(sortRealtimeHealthRows),
    commands: getRealtimeHealthCommands(),
  };
}

function getRoomLatencyRow(
  rooms: AdminCollaborationHandoffRoom[],
): AdminRealtimeHealthRow {
  const capturedRooms = rooms.filter((room) => room.roomCaptured);
  const staleRooms = rooms.filter(
    (room) =>
      room.roomAgeMinutes === null ||
      room.roomAgeMinutes > 60 * 24,
  );
  const status: AdminRealtimeHealthStatus =
    staleRooms.some(
      (room) => room.roomAgeMinutes === null || room.roomAgeMinutes > 60 * 72,
    )
      ? "blocked"
      : staleRooms.length > 0 || capturedRooms.length === 0
        ? "review"
        : "ready";

  return {
    id: "realtime-room-latency",
    category: "room-latency",
    status,
    label: "Room sync latency",
    value: `${capturedRooms.length}/${rooms.length} captured`,
    detail:
      capturedRooms.length === 0
        ? "No collaboration room snapshots are available for workspace realtime monitoring."
        : `${staleRooms.length} room${staleRooms.length === 1 ? "" : "s"} need refresh. Average room age is ${formatMinutes(getAverageRoomAgeMinutes(capturedRooms))}; max age is ${formatMinutes(getMaxRoomAgeMinutes(capturedRooms))}.`,
    recommendation:
      status === "ready"
        ? "Room snapshots are fresh enough for workspace realtime monitoring."
        : "Open active rooms, let collaboration sync, then archive handoff evidence before release.",
    target: staleRooms[0]?.fileName ?? capturedRooms[0]?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getReconnectRow(
  rooms: AdminCollaborationHandoffRoom[],
): AdminRealtimeHealthRow {
  const offlineReplayQueueCount = rooms.reduce(
    (total, room) => total + room.offlineReplayQueueCount,
    0,
  );
  const eventDriftCount = rooms.reduce(
    (total, room) => total + room.eventDriftCount,
    0,
  );
  const reviewRooms = rooms.filter(
    (room) =>
      room.syncReplay.reconnectQualityScore < 80 ||
      room.offlineReplayQueueCount > 0 ||
      room.eventDriftCount > 0,
  );
  const score = getAverageReconnectQualityScore(rooms);
  const status: AdminRealtimeHealthStatus =
    score < 60 || offlineReplayQueueCount > 4 || eventDriftCount > 8
      ? "blocked"
      : reviewRooms.length > 0
        ? "review"
        : "ready";

  return {
    id: "realtime-reconnect-quality",
    category: "reconnect",
    status,
    label: "Reconnect quality",
    value: `${score}/100`,
    detail: `${reviewRooms.length} room${reviewRooms.length === 1 ? "" : "s"} need reconnect review, with ${offlineReplayQueueCount} offline replay item${offlineReplayQueueCount === 1 ? "" : "s"} and ${eventDriftCount} drift event${eventDriftCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Reconnect and replay evidence is healthy."
        : "Review offline replay queues and event drift before trusting realtime state.",
    target: reviewRooms[0]?.fileName ?? null,
    latestAt: getLatestRoomAt(rooms),
  };
}

function getSaveQueueRow(
  saveSignals: SaveSignals,
  files: AdminRealtimeHealthFile[],
): AdminRealtimeHealthRow {
  const status: AdminRealtimeHealthStatus =
    saveSignals.pendingSaveSignalCount > 0 || saveSignals.failedSaveTelemetryCount > 0
      ? "blocked"
      : saveSignals.saveTelemetryCount === 0
        ? "review"
        : "ready";

  return {
    id: "realtime-pending-save-signals",
    category: "save-queue",
    status,
    label: "Pending save signals",
    value: `${saveSignals.pendingSaveSignalCount}`,
    detail:
      saveSignals.saveTelemetryCount === 0
        ? "No persisted save telemetry was found in the loaded file window, so admin monitoring cannot yet prove save-queue health."
        : `${saveSignals.saveTelemetryCount} save telemetry event${saveSignals.saveTelemetryCount === 1 ? "" : "s"} found, with ${saveSignals.failedSaveTelemetryCount} failed and ${saveSignals.documentDriftCount} document timestamp drift signal${saveSignals.documentDriftCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Persisted save telemetry has no pending or failed signals."
        : "Review offline save queues in active editor sessions and preserve save telemetry in release evidence.",
    target: saveSignals.latestFailedSaveTarget ?? files[0]?.fileName ?? null,
    latestAt: saveSignals.latestSaveTelemetryAt,
  };
}

function getNotificationRow(
  deliveries: AdminRealtimeHealthNotificationDelivery[],
): AdminRealtimeHealthRow {
  const failedDeliveries = deliveries.filter(
    (delivery) => delivery.status === "failed",
  );
  const status: AdminRealtimeHealthStatus =
    failedDeliveries.length > 3
      ? "blocked"
      : failedDeliveries.length > 0
        ? "review"
        : "ready";

  return {
    id: "realtime-notification-delivery",
    category: "notifications",
    status,
    label: "Notification delivery",
    value: `${failedDeliveries.length}/${deliveries.length} failed`,
    detail:
      deliveries.length === 0
        ? "No comment notification delivery records are available in the loaded workspace window."
        : `${failedDeliveries.length} failed delivery attempt${failedDeliveries.length === 1 ? "" : "s"} across ${deliveries.length} notification record${deliveries.length === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Notification delivery has no failed records in the loaded window."
        : "Review Brevo/API configuration and retry failed mention or assignment notifications.",
    target: failedDeliveries[0]?.recipientEmail ?? null,
    latestAt: getLatestIso(deliveries.map((delivery) => delivery.createdAt)),
  };
}

function getRouteAnalyticsRow(
  report: AdminPublicRouteAnalyticsReport,
  anomalyCount: number,
): AdminRealtimeHealthRow {
  const status: AdminRealtimeHealthStatus =
    !report.storageAvailable || report.blockedCount > 0
      ? "blocked"
      : anomalyCount > 0 || report.reviewCount > 0
        ? "review"
        : "ready";

  return {
    id: "realtime-route-analytics-anomalies",
    category: "route-analytics",
    status,
    label: "Route analytics anomalies",
    value: `${anomalyCount}`,
    detail: `${report.missingCoverageCount} missing coverage, ${report.externalReferrerCount} external referrer, ${report.botEventCount} bot, ${report.unknownReferrerCount} unknown-referrer, and ${report.retentionExpiredCount} retention-expired event signal${anomalyCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Public route analytics are healthy enough for realtime monitoring."
        : "Refresh route coverage, review external/bot traffic, and clear expired analytics rows.",
    target: report.rows.find((row) => row.status !== "ready")?.label ?? null,
    latestAt: report.generatedAt,
  };
}

type SaveSignals = {
  documentDriftCount: number;
  failedSaveTelemetryCount: number;
  latestFailedSaveTarget: string | null;
  latestSaveTelemetryAt: string | null;
  pendingSaveSignalCount: number;
  saveTelemetryCount: number;
};

function getSaveSignals(files: AdminRealtimeHealthFile[]): SaveSignals {
  const saveEvents = files.flatMap((file) =>
    (file.document.activityEvents ?? [])
      .filter(isSaveTelemetryEvent)
      .map((event) => ({ event, file })),
  );
  const failedSaveEvents = saveEvents.filter(
    ({ event }) => event.telemetry?.status === "failed",
  );
  const documentDriftCount = files.filter(
    (file) => Date.parse(file.document.updatedAt) > Date.parse(file.updatedAt) + 5000,
  ).length;

  return {
    documentDriftCount,
    failedSaveTelemetryCount: failedSaveEvents.length,
    latestFailedSaveTarget: failedSaveEvents[0]?.file.fileName ?? null,
    latestSaveTelemetryAt: getLatestIso(
      saveEvents.map(({ event }) => event.telemetry?.capturedAt ?? event.createdAt),
    ),
    pendingSaveSignalCount: failedSaveEvents.length + documentDriftCount,
    saveTelemetryCount: saveEvents.length,
  };
}

function isSaveTelemetryEvent(event: DesignActivityEvent) {
  const command = event.telemetry?.command.toLowerCase() ?? "";
  const label = event.label.toLowerCase();

  return command.includes("save") || label.includes("save");
}

function getRouteAnalyticsAnomalyCount(report: AdminPublicRouteAnalyticsReport) {
  return (
    (report.storageAvailable ? 0 : 1) +
    report.missingCoverageCount +
    report.externalReferrerCount +
    report.botEventCount +
    report.unknownReferrerCount +
    report.retentionExpiredCount
  );
}

function getAverageRoomAgeMinutes(rooms: AdminCollaborationHandoffRoom[]) {
  const ages = rooms
    .map((room) => room.roomAgeMinutes)
    .filter((age): age is number => typeof age === "number");

  if (ages.length === 0) {
    return null;
  }

  return Math.round(ages.reduce((total, age) => total + age, 0) / ages.length);
}

function getMaxRoomAgeMinutes(rooms: AdminCollaborationHandoffRoom[]) {
  const ages = rooms
    .map((room) => room.roomAgeMinutes)
    .filter((age): age is number => typeof age === "number");

  return ages.length > 0 ? Math.max(...ages) : null;
}

function getAverageReconnectQualityScore(
  rooms: AdminCollaborationHandoffRoom[],
) {
  if (rooms.length === 0) {
    return 100;
  }

  return Math.round(
    rooms.reduce(
      (total, room) => total + room.syncReplay.reconnectQualityScore,
      0,
    ) / rooms.length,
  );
}

function getLatestRoomAt(rooms: AdminCollaborationHandoffRoom[]) {
  return getLatestIso(rooms.map((room) => room.latestAt).filter(Boolean));
}

function getLatestIso(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function formatMinutes(value: number | null) {
  return value === null ? "none" : `${value}m`;
}

function sortRealtimeHealthRows(
  first: AdminRealtimeHealthRow,
  second: AdminRealtimeHealthRow,
) {
  return (
    getStatusWeight(first.status) - getStatusWeight(second.status) ||
    first.category.localeCompare(second.category)
  );
}

function getStatusWeight(status: AdminRealtimeHealthStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getRealtimeHealthCommands() {
  return [
    "Refresh active collaboration rooms before release and confirm room latency stays under 24 hours.",
    "Review reconnect quality, offline replay queues, and event drift before trusting multiplayer state.",
    "Export offline save queue evidence from active editor sessions when pending save signals appear.",
    "Retry failed comment notifications and verify Brevo delivery before handoff.",
    "Open public share, prototype, and embed routes after deploy to refresh route analytics coverage.",
  ];
}
