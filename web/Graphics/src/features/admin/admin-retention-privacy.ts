import type { AdminAuditMetadata } from "@/db/schema";
import type {
  AdminAuditRow,
  AdminNotificationDeliveryRow,
  AdminSessionRiskRow,
} from "@/features/admin/admin-data";
import type { DesignDocument } from "@/features/editor/types";

export const RETENTION_PRIVACY_ACTION = "admin.retention.privacy.update";

export const retentionPrivacyModes = [
  "diagnostic",
  "redacted",
  "minimal",
] as const;

export type RetentionPrivacyMode = (typeof retentionPrivacyModes)[number];

export type RetentionPrivacyStatus = "ready" | "review" | "blocked";

export type RetentionPrivacySettings = {
  auditLogRetentionDays: number;
  collaborationPresenceRetentionDays: number;
  notificationDeliveryRetentionDays: number;
  supportBundleRetentionDays: number;
  supportBundlePrivacyMode: RetentionPrivacyMode;
  includeSupportBundleNetworkDetails: boolean;
  includeSupportBundleNotificationReasons: boolean;
  includeSupportBundleAuditMetadata: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type RetentionPrivacyRow = {
  id: string;
  status: RetentionPrivacyStatus;
  kind: "audit" | "collaboration" | "notifications" | "support-bundles";
  label: string;
  value: string;
  retainedCount: number;
  eligibleForCleanupCount: number;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type RetentionPrivacyReport = {
  generatedAt: string;
  status: RetentionPrivacyStatus;
  score: number;
  settings: RetentionPrivacySettings;
  retainedAuditEventCount: number;
  auditEventsEligibleForCleanup: number;
  retainedCollaborationPresenceEventCount: number;
  retainedCollaborationChatMessageCount: number;
  collaborationRecordsEligibleForCleanup: number;
  retainedNotificationDeliveryCount: number;
  notificationDeliveriesEligibleForCleanup: number;
  supportBundleSensitiveSessionCount: number;
  supportBundleSensitiveAuditMetadataCount: number;
  supportBundleRedactionEnabled: boolean;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: RetentionPrivacyRow[];
};

type RetentionPrivacyEvent = {
  action: string;
  actorEmail: string;
  createdAt: Date | string;
  metadata: AdminAuditMetadata;
};

type RetentionPrivacyDocumentInput = {
  document: DesignDocument;
};

export const defaultRetentionPrivacySettings: RetentionPrivacySettings = {
  auditLogRetentionDays: 180,
  collaborationPresenceRetentionDays: 30,
  notificationDeliveryRetentionDays: 90,
  supportBundleRetentionDays: 14,
  supportBundlePrivacyMode: "redacted",
  includeSupportBundleNetworkDetails: false,
  includeSupportBundleNotificationReasons: false,
  includeSupportBundleAuditMetadata: false,
  updatedAt: null,
  updatedBy: null,
};

export function getDefaultRetentionPrivacySettings(): RetentionPrivacySettings {
  return { ...defaultRetentionPrivacySettings };
}

export function createRetentionPrivacyMetadata(
  settings: RetentionPrivacySettings,
): AdminAuditMetadata {
  return {
    auditLogRetentionDays: settings.auditLogRetentionDays,
    collaborationPresenceRetentionDays:
      settings.collaborationPresenceRetentionDays,
    notificationDeliveryRetentionDays:
      settings.notificationDeliveryRetentionDays,
    supportBundleRetentionDays: settings.supportBundleRetentionDays,
    supportBundlePrivacyMode: settings.supportBundlePrivacyMode,
    includeSupportBundleNetworkDetails:
      settings.includeSupportBundleNetworkDetails,
    includeSupportBundleNotificationReasons:
      settings.includeSupportBundleNotificationReasons,
    includeSupportBundleAuditMetadata:
      settings.includeSupportBundleAuditMetadata,
    updatedBy: settings.updatedBy,
  };
}

export function getRetentionPrivacySettingsFromEvents(
  events: RetentionPrivacyEvent[],
): RetentionPrivacySettings {
  const event = events.find((row) => row.action === RETENTION_PRIVACY_ACTION);

  if (!event) {
    return getDefaultRetentionPrivacySettings();
  }

  return normalizeRetentionPrivacySettings({
    ...event.metadata,
    updatedAt: toIsoString(event.createdAt),
    updatedBy: readString(event.metadata.updatedBy, event.actorEmail),
  });
}

export function normalizeRetentionPrivacySettings(
  input: Partial<Record<keyof RetentionPrivacySettings, unknown>>,
): RetentionPrivacySettings {
  const defaults = getDefaultRetentionPrivacySettings();

  return {
    auditLogRetentionDays: readNumber(
      input.auditLogRetentionDays,
      defaults.auditLogRetentionDays,
      7,
      730,
    ),
    collaborationPresenceRetentionDays: readNumber(
      input.collaborationPresenceRetentionDays,
      defaults.collaborationPresenceRetentionDays,
      1,
      365,
    ),
    notificationDeliveryRetentionDays: readNumber(
      input.notificationDeliveryRetentionDays,
      defaults.notificationDeliveryRetentionDays,
      7,
      365,
    ),
    supportBundleRetentionDays: readNumber(
      input.supportBundleRetentionDays,
      defaults.supportBundleRetentionDays,
      1,
      90,
    ),
    supportBundlePrivacyMode: readEnum(
      input.supportBundlePrivacyMode,
      retentionPrivacyModes,
      defaults.supportBundlePrivacyMode,
    ),
    includeSupportBundleNetworkDetails: readBoolean(
      input.includeSupportBundleNetworkDetails,
      defaults.includeSupportBundleNetworkDetails,
    ),
    includeSupportBundleNotificationReasons: readBoolean(
      input.includeSupportBundleNotificationReasons,
      defaults.includeSupportBundleNotificationReasons,
    ),
    includeSupportBundleAuditMetadata: readBoolean(
      input.includeSupportBundleAuditMetadata,
      defaults.includeSupportBundleAuditMetadata,
    ),
    updatedAt: readNullableString(input.updatedAt, defaults.updatedAt),
    updatedBy: readNullableString(input.updatedBy, defaults.updatedBy),
  };
}

export function getRetentionPrivacyReport({
  auditEvents,
  documents,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  sessions,
  settings,
}: {
  auditEvents: AdminAuditRow[];
  documents: RetentionPrivacyDocumentInput[];
  generatedAt?: string;
  notificationDeliveries: AdminNotificationDeliveryRow[];
  sessions: AdminSessionRiskRow[];
  settings: RetentionPrivacySettings;
}): RetentionPrivacyReport {
  const now = Date.now();
  const auditRetentionCutoff = daysAgo(now, settings.auditLogRetentionDays);
  const collaborationCutoff = daysAgo(
    now,
    settings.collaborationPresenceRetentionDays,
  );
  const notificationCutoff = daysAgo(
    now,
    settings.notificationDeliveryRetentionDays,
  );
  const collaborationStats = getCollaborationStats(documents, collaborationCutoff);
  const auditEventsEligibleForCleanup = auditEvents.filter(
    (event) => toTime(event.createdAt) < auditRetentionCutoff,
  ).length;
  const notificationDeliveriesEligibleForCleanup =
    notificationDeliveries.filter(
      (delivery) => toTime(delivery.createdAt) < notificationCutoff,
    ).length;
  const sensitiveAuditMetadataCount = auditEvents.filter((event) =>
    metadataHasSensitiveValue(event.metadata),
  ).length;
  const sensitiveSessionCount = sessions.filter(
    (session) => session.ipAddress || session.userAgent,
  ).length;
  const rows = [
    getAuditRow({
      auditEvents,
      eligibleForCleanupCount: auditEventsEligibleForCleanup,
      retentionDays: settings.auditLogRetentionDays,
    }),
    getCollaborationRow({
      stats: collaborationStats,
      retentionDays: settings.collaborationPresenceRetentionDays,
    }),
    getNotificationRow({
      eligibleForCleanupCount: notificationDeliveriesEligibleForCleanup,
      notificationDeliveries,
      retentionDays: settings.notificationDeliveryRetentionDays,
    }),
    getSupportBundleRow({
      sensitiveAuditMetadataCount,
      sensitiveSessionCount,
      settings,
    }),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: RetentionPrivacyStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    settings,
    retainedAuditEventCount: auditEvents.length,
    auditEventsEligibleForCleanup,
    retainedCollaborationPresenceEventCount: collaborationStats.presenceCount,
    retainedCollaborationChatMessageCount: collaborationStats.chatCount,
    collaborationRecordsEligibleForCleanup:
      collaborationStats.recordsEligibleForCleanup,
    retainedNotificationDeliveryCount: notificationDeliveries.length,
    notificationDeliveriesEligibleForCleanup,
    supportBundleSensitiveSessionCount: sensitiveSessionCount,
    supportBundleSensitiveAuditMetadataCount: sensitiveAuditMetadataCount,
    supportBundleRedactionEnabled:
      settings.supportBundlePrivacyMode !== "diagnostic" ||
      !settings.includeSupportBundleNetworkDetails ||
      !settings.includeSupportBundleAuditMetadata,
    readyCount,
    reviewCount,
    blockedCount,
    rows,
  };
}

export function maskEmail(value: string) {
  const [name, domain] = value.split("@");

  if (!name || !domain) {
    return value;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

export function redactMetadata(
  metadata: AdminAuditMetadata,
): AdminAuditMetadata {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      typeof value === "string" ? redactSensitiveString(value) : value,
    ]),
  );
}

function getAuditRow({
  auditEvents,
  eligibleForCleanupCount,
  retentionDays,
}: {
  auditEvents: AdminAuditRow[];
  eligibleForCleanupCount: number;
  retentionDays: number;
}): RetentionPrivacyRow {
  const status =
    retentionDays > 365
      ? "review"
      : eligibleForCleanupCount > 0
        ? "review"
        : "ready";

  return {
    id: "audit-log-retention",
    status,
    kind: "audit",
    label: "Audit log retention",
    value: `${retentionDays} days`,
    retainedCount: auditEvents.length,
    eligibleForCleanupCount,
    detail:
      eligibleForCleanupCount > 0
        ? `${eligibleForCleanupCount} loaded audit events are older than the saved retention window.`
        : `${auditEvents.length} loaded audit events are inside the saved retention window.`,
    recommendation:
      status === "ready"
        ? "Keep audit export reviews aligned with the saved retention window."
        : "Schedule audit cleanup or shorten loaded support windows before sharing broad bundles.",
    latestAt: latestStringDate(auditEvents.map((event) => event.createdAt)),
  };
}

function getCollaborationRow({
  stats,
  retentionDays,
}: {
  stats: ReturnType<typeof getCollaborationStats>;
  retentionDays: number;
}): RetentionPrivacyRow {
  const status =
    stats.recordsEligibleForCleanup > 0 || stats.unboundedRoomCount > 0
      ? "review"
      : "ready";

  return {
    id: "collaboration-presence-retention",
    status,
    kind: "collaboration",
    label: "Collaboration presence retention",
    value: `${retentionDays} days`,
    retainedCount: stats.presenceCount + stats.chatCount,
    eligibleForCleanupCount: stats.recordsEligibleForCleanup,
    detail: `${stats.presenceCount} presence events and ${stats.chatCount} chat messages are retained across ${stats.roomCount} collaboration rooms.`,
    recommendation:
      status === "ready"
        ? "Keep durable collaboration rooms capped and summarize long sessions before handoff."
        : "Clear or compact old collaboration room snapshots before exporting release or support evidence.",
    latestAt: latestStringDate(stats.timestamps),
  };
}

function getNotificationRow({
  eligibleForCleanupCount,
  notificationDeliveries,
  retentionDays,
}: {
  eligibleForCleanupCount: number;
  notificationDeliveries: AdminNotificationDeliveryRow[];
  retentionDays: number;
}): RetentionPrivacyRow {
  return {
    id: "notification-delivery-retention",
    status: eligibleForCleanupCount > 0 ? "review" : "ready",
    kind: "notifications",
    label: "Notification delivery retention",
    value: `${retentionDays} days`,
    retainedCount: notificationDeliveries.length,
    eligibleForCleanupCount,
    detail:
      eligibleForCleanupCount > 0
        ? `${eligibleForCleanupCount} notification delivery records are older than the saved retention window.`
        : `${notificationDeliveries.length} loaded notification records are inside the saved retention window.`,
    recommendation:
      "Keep delivery evidence long enough for incident review, then remove stale recipient/reason records.",
    latestAt: latestStringDate(
      notificationDeliveries.map((delivery) => delivery.createdAt),
    ),
  };
}

function getSupportBundleRow({
  sensitiveAuditMetadataCount,
  sensitiveSessionCount,
  settings,
}: {
  sensitiveAuditMetadataCount: number;
  sensitiveSessionCount: number;
  settings: RetentionPrivacySettings;
}): RetentionPrivacyRow {
  const diagnosticExposure =
    settings.supportBundlePrivacyMode === "diagnostic" ||
    settings.includeSupportBundleNetworkDetails ||
    settings.includeSupportBundleAuditMetadata;
  const status =
    diagnosticExposure && (sensitiveSessionCount > 0 || sensitiveAuditMetadataCount > 0)
      ? "blocked"
      : settings.supportBundlePrivacyMode === "minimal"
        ? "ready"
        : "review";

  return {
    id: "support-bundle-privacy",
    status,
    kind: "support-bundles",
    label: "Support bundle privacy",
    value: settings.supportBundlePrivacyMode,
    retainedCount: sensitiveSessionCount + sensitiveAuditMetadataCount,
    eligibleForCleanupCount: 0,
    detail: `${sensitiveSessionCount} loaded sessions have network/user-agent fields and ${sensitiveAuditMetadataCount} audit events have sensitive-looking metadata.`,
    recommendation:
      status === "blocked"
        ? "Use redacted or minimal support bundles unless diagnostic exports are explicitly required."
        : "Keep generated support bundles short-lived and share the redacted form by default.",
    latestAt: settings.updatedAt,
  };
}

function getCollaborationStats(
  documents: RetentionPrivacyDocumentInput[],
  cutoff: number,
) {
  const timestamps: string[] = [];
  let chatCount = 0;
  let presenceCount = 0;
  let roomCount = 0;
  let recordsEligibleForCleanup = 0;
  let unboundedRoomCount = 0;

  for (const { document } of documents) {
    const room = document.collaborationRoom;

    if (!room) {
      continue;
    }

    roomCount += 1;
    if (!room.updatedAt) {
      unboundedRoomCount += 1;
    } else {
      timestamps.push(room.updatedAt);
    }

    chatCount += room.chatMessages.length;
    presenceCount += room.presenceEvents.length;

    for (const item of [...room.chatMessages, ...room.presenceEvents]) {
      const itemTime = item.createdAt;
      timestamps.push(new Date(itemTime).toISOString());

      if (itemTime < cutoff) {
        recordsEligibleForCleanup += 1;
      }
    }
  }

  return {
    chatCount,
    presenceCount,
    recordsEligibleForCleanup,
    roomCount,
    timestamps,
    unboundedRoomCount,
  };
}

function metadataHasSensitiveValue(metadata: AdminAuditMetadata) {
  return Object.entries(metadata).some(([key, value]) => {
    if (typeof value !== "string") {
      return false;
    }

    return /email|token|url|ip|agent|recipient|sender/i.test(key) ||
      /[^\s@]+@[^\s@]+\.[^\s@]+|token|secret|key/i.test(value);
  });
}

function redactSensitiveString(value: string) {
  return value
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, (email) => maskEmail(email))
    .replace(/\b[a-f0-9]{24,}\b/gi, "[redacted-id]")
    .replace(/\b(token|secret|key)=([^\s&]+)/gi, "$1=[redacted]");
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function readEnum<const Value extends string>(
  value: unknown,
  options: readonly Value[],
  fallback: Value,
): Value {
  return options.includes(value as Value) ? (value as Value) : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNullableString(value: unknown, fallback: string | null) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function daysAgo(now: number, days: number) {
  return now - days * 24 * 60 * 60 * 1000;
}

function latestStringDate(values: Array<string | Date | null | undefined>) {
  return (
    values
      .filter((value): value is string | Date => Boolean(value))
      .map((value) => toIsoString(value))
      .sort((left, right) => toTime(right) - toTime(left))[0] ?? null
  );
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
