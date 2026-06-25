import type { AdminAuditMetadata } from "@/db/schema";
import type {
  AdminOperationalIncidentReport,
  AdminOperationalIncidentStatus,
} from "@/features/admin/admin-operational-incidents";
import type {
  AdminProductionMonitoringDigest,
  AdminProductionMonitoringStatus,
} from "@/features/admin/admin-production-monitoring-digest";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export const ADMIN_NOTIFICATION_DIGEST_SUBSCRIPTIONS_ACTION =
  "admin.notification.digest.subscriptions.update";

export const adminNotificationDigestTopics = [
  "failed-auth",
  "email-delivery",
  "deploy-smoke",
  "rollback",
  "risky-shares",
] as const;

export const adminNotificationDigestFrequencies = [
  "daily",
  "weekly",
  "release",
] as const;

export const adminNotificationDigestChannels = [
  "email",
  "admin-dashboard",
] as const;

export const adminNotificationDigestSeverities = [
  "review",
  "blocked",
] as const;

export type AdminNotificationDigestTopic =
  (typeof adminNotificationDigestTopics)[number];

export type AdminNotificationDigestFrequency =
  (typeof adminNotificationDigestFrequencies)[number];

export type AdminNotificationDigestChannel =
  (typeof adminNotificationDigestChannels)[number];

export type AdminNotificationDigestSeverity =
  (typeof adminNotificationDigestSeverities)[number];

export type AdminNotificationDigestStatus = "ready" | "review" | "blocked";

export type AdminNotificationDigestSubscriptionSettings = {
  recipients: string[];
  frequency: AdminNotificationDigestFrequency;
  channel: AdminNotificationDigestChannel;
  minimumSeverity: AdminNotificationDigestSeverity;
  includeResolved: boolean;
  topics: Record<AdminNotificationDigestTopic, boolean>;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AdminNotificationDigestSubscriptionRow = {
  id: string;
  status: AdminNotificationDigestStatus;
  kind: AdminNotificationDigestTopic | "delivery";
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  subscribed: boolean;
  routed: boolean;
  activeSignal: boolean;
  latestAt: string | null;
  target: string | null;
};

export type AdminNotificationDigestSubscriptionsReport = {
  generatedAt: string;
  status: AdminNotificationDigestStatus;
  score: number;
  settings: AdminNotificationDigestSubscriptionSettings;
  subscribedTopicCount: number;
  recipientCount: number;
  activeSignalCount: number;
  blockedSignalCount: number;
  unroutedActiveSignalCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: AdminNotificationDigestSubscriptionRow[];
};

type AdminNotificationDigestEvent = {
  action: string;
  actorEmail: string;
  createdAt: Date | string;
  metadata: AdminAuditMetadata;
};

type AdminNotificationDigestSubscriptionsInput = {
  settings: AdminNotificationDigestSubscriptionSettings;
  operationalIncidents: AdminOperationalIncidentReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  productionMonitoringDigest: AdminProductionMonitoringDigest;
  rollbackReadiness: AdminRollbackReadinessReport;
  generatedAt?: string;
};

type TopicSignal = {
  topic: AdminNotificationDigestTopic;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  active: boolean;
  status: AdminNotificationDigestStatus;
  latestAt: string | null;
  target: string | null;
};

const defaultTopicSettings: Record<AdminNotificationDigestTopic, boolean> = {
  "failed-auth": true,
  "email-delivery": true,
  "deploy-smoke": true,
  rollback: true,
  "risky-shares": true,
};

const topicMetadataKeys: Record<AdminNotificationDigestTopic, string> = {
  "failed-auth": "topicFailedAuth",
  "email-delivery": "topicEmailDelivery",
  "deploy-smoke": "topicDeploySmoke",
  rollback: "topicRollback",
  "risky-shares": "topicRiskyShares",
};

export function getDefaultAdminNotificationDigestSubscriptionSettings(
  defaultRecipients: string[] = [],
): AdminNotificationDigestSubscriptionSettings {
  return {
    recipients: normalizeRecipients(defaultRecipients),
    frequency: "daily",
    channel: "email",
    minimumSeverity: "review",
    includeResolved: false,
    topics: { ...defaultTopicSettings },
    updatedAt: null,
    updatedBy: null,
  };
}

export function parseAdminNotificationDigestRecipients(value: string) {
  return normalizeRecipients(
    value
      .split(/[\s,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function createAdminNotificationDigestSubscriptionMetadata(
  settings: AdminNotificationDigestSubscriptionSettings,
): AdminAuditMetadata {
  return {
    recipientsText: settings.recipients.join(", "),
    frequency: settings.frequency,
    channel: settings.channel,
    minimumSeverity: settings.minimumSeverity,
    includeResolved: settings.includeResolved,
    topicFailedAuth: settings.topics["failed-auth"],
    topicEmailDelivery: settings.topics["email-delivery"],
    topicDeploySmoke: settings.topics["deploy-smoke"],
    topicRollback: settings.topics.rollback,
    topicRiskyShares: settings.topics["risky-shares"],
    updatedBy: settings.updatedBy,
  };
}

export function getAdminNotificationDigestSubscriptionSettingsFromEvents(
  events: AdminNotificationDigestEvent[],
  defaultRecipients: string[] = [],
): AdminNotificationDigestSubscriptionSettings {
  const event = events.find(
    (row) => row.action === ADMIN_NOTIFICATION_DIGEST_SUBSCRIPTIONS_ACTION,
  );

  if (!event) {
    return getDefaultAdminNotificationDigestSubscriptionSettings(
      defaultRecipients,
    );
  }

  return normalizeAdminNotificationDigestSubscriptionSettings({
    recipientsText: readString(event.metadata.recipientsText, ""),
    frequency: event.metadata.frequency,
    channel: event.metadata.channel,
    minimumSeverity: event.metadata.minimumSeverity,
    includeResolved: event.metadata.includeResolved,
    topicFailedAuth: event.metadata.topicFailedAuth,
    topicEmailDelivery: event.metadata.topicEmailDelivery,
    topicDeploySmoke: event.metadata.topicDeploySmoke,
    topicRollback: event.metadata.topicRollback,
    topicRiskyShares: event.metadata.topicRiskyShares,
    updatedAt: toIsoString(event.createdAt),
    updatedBy: readString(event.metadata.updatedBy, event.actorEmail),
  }, defaultRecipients);
}

export function normalizeAdminNotificationDigestSubscriptionSettings(
  input: Partial<{
    recipients: string[];
    recipientsText: string;
    frequency: unknown;
    channel: unknown;
    minimumSeverity: unknown;
    includeResolved: unknown;
    topicFailedAuth: unknown;
    topicEmailDelivery: unknown;
    topicDeploySmoke: unknown;
    topicRollback: unknown;
    topicRiskyShares: unknown;
    updatedAt: unknown;
    updatedBy: unknown;
  }>,
  defaultRecipients: string[] = [],
): AdminNotificationDigestSubscriptionSettings {
  const defaults = getDefaultAdminNotificationDigestSubscriptionSettings(
    defaultRecipients,
  );
  const recipients =
    input.recipients ??
    (typeof input.recipientsText === "string"
      ? parseAdminNotificationDigestRecipients(input.recipientsText)
      : defaults.recipients);

  return {
    recipients: normalizeRecipients(recipients),
    frequency: readEnum(
      input.frequency,
      adminNotificationDigestFrequencies,
      defaults.frequency,
    ),
    channel: readEnum(
      input.channel,
      adminNotificationDigestChannels,
      defaults.channel,
    ),
    minimumSeverity: readEnum(
      input.minimumSeverity,
      adminNotificationDigestSeverities,
      defaults.minimumSeverity,
    ),
    includeResolved: readBoolean(input.includeResolved, defaults.includeResolved),
    topics: {
      "failed-auth": readBoolean(
        input.topicFailedAuth,
        defaults.topics["failed-auth"],
      ),
      "email-delivery": readBoolean(
        input.topicEmailDelivery,
        defaults.topics["email-delivery"],
      ),
      "deploy-smoke": readBoolean(
        input.topicDeploySmoke,
        defaults.topics["deploy-smoke"],
      ),
      rollback: readBoolean(input.topicRollback, defaults.topics.rollback),
      "risky-shares": readBoolean(
        input.topicRiskyShares,
        defaults.topics["risky-shares"],
      ),
    },
    updatedAt: readNullableString(input.updatedAt, defaults.updatedAt),
    updatedBy: readNullableString(input.updatedBy, defaults.updatedBy),
  };
}

export function getAdminNotificationDigestSubscriptionsReport({
  settings,
  operationalIncidents,
  productionDeploySmoke,
  productionMonitoringDigest,
  rollbackReadiness,
  generatedAt = new Date().toISOString(),
}: AdminNotificationDigestSubscriptionsInput): AdminNotificationDigestSubscriptionsReport {
  const recipientCount = settings.recipients.length;
  const subscribedTopicCount = adminNotificationDigestTopics.filter(
    (topic) => settings.topics[topic],
  ).length;
  const topicRows = getTopicSignals({
    operationalIncidents,
    productionDeploySmoke,
    productionMonitoringDigest,
    rollbackReadiness,
  }).map((signal) =>
    createTopicRow({
      signal,
      settings,
      recipientCount,
    }),
  );
  const rows = [
    getDeliveryRow(settings, recipientCount, subscribedTopicCount),
    ...topicRows,
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminNotificationDigestStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const activeSignalRows = topicRows.filter((row) => row.activeSignal);
  const blockedSignalRows = activeSignalRows.filter(
    (row) => row.status === "blocked",
  );
  const unroutedActiveSignalCount = activeSignalRows.filter(
    (row) => !row.routed,
  ).length;

  return {
    generatedAt,
    status,
    score: Math.max(
      0,
      100 -
        blockedCount * 20 -
        reviewCount * 8 -
        unroutedActiveSignalCount * 8,
    ),
    settings,
    subscribedTopicCount,
    recipientCount,
    activeSignalCount: activeSignalRows.length,
    blockedSignalCount: blockedSignalRows.length,
    unroutedActiveSignalCount,
    readyCount,
    reviewCount,
    blockedCount,
    rows,
  };
}

function getDeliveryRow(
  settings: AdminNotificationDigestSubscriptionSettings,
  recipientCount: number,
  subscribedTopicCount: number,
): AdminNotificationDigestSubscriptionRow {
  if (recipientCount === 0) {
    return {
      id: "digest-recipients-missing",
      status: "blocked",
      kind: "delivery",
      label: "Digest recipients",
      value: "0 recipients",
      detail:
        "No administrator email recipients are configured for operational digest delivery.",
      recommendation:
        "Add at least one admin recipient before relying on digest subscriptions for production operations.",
      subscribed: false,
      routed: false,
      activeSignal: true,
      latestAt: settings.updatedAt,
      target: null,
    };
  }

  if (subscribedTopicCount === 0) {
    return {
      id: "digest-topics-missing",
      status: "blocked",
      kind: "delivery",
      label: "Subscribed topics",
      value: "0 topics",
      detail: "Digest delivery is configured, but every topic is disabled.",
      recommendation:
        "Enable the operational topics that should reach administrators after production incidents.",
      subscribed: false,
      routed: false,
      activeSignal: true,
      latestAt: settings.updatedAt,
      target: settings.recipients[0] ?? null,
    };
  }

  return {
    id: "digest-delivery-ready",
    status: "ready",
    kind: "delivery",
    label: "Digest delivery",
    value: `${recipientCount} recipients`,
    detail: `${subscribedTopicCount} topics route to ${settings.channel} on a ${settings.frequency} cadence.`,
    recommendation:
      "Keep digest recipients aligned with the current release and operations owners.",
    subscribed: true,
    routed: true,
    activeSignal: false,
    latestAt: settings.updatedAt,
    target: settings.recipients[0] ?? null,
  };
}

function createTopicRow({
  signal,
  settings,
  recipientCount,
}: {
  signal: TopicSignal;
  settings: AdminNotificationDigestSubscriptionSettings;
  recipientCount: number;
}): AdminNotificationDigestSubscriptionRow {
  const subscribed = settings.topics[signal.topic];
  const meetsSeverity =
    settings.minimumSeverity === "review" || signal.status === "blocked";
  const routed = Boolean(
    subscribed &&
      recipientCount > 0 &&
      (signal.active ? meetsSeverity : settings.includeResolved),
  );
  const status = getTopicStatus({
    active: signal.active,
    routed,
    severity: signal.status,
  });

  return {
    id: `digest-${signal.topic}`,
    status,
    kind: signal.topic,
    label: signal.label,
    value: signal.value,
    detail: subscribed
      ? signal.detail
      : `${signal.detail} This topic is currently disabled in digest delivery.`,
    recommendation: routed
      ? signal.recommendation
      : getRoutingRecommendation(signal, settings.minimumSeverity),
    subscribed,
    routed,
    activeSignal: signal.active,
    latestAt: signal.latestAt,
    target: signal.target,
  };
}

function getTopicSignals({
  operationalIncidents,
  productionDeploySmoke,
  productionMonitoringDigest,
  rollbackReadiness,
}: Omit<
  AdminNotificationDigestSubscriptionsInput,
  "settings" | "generatedAt"
>): TopicSignal[] {
  const authRows = operationalIncidents.rows.filter(
    (row) => row.kind === "auth",
  );
  const emailRows = operationalIncidents.rows.filter(
    (row) => row.kind === "email",
  );
  const shareRows = operationalIncidents.rows.filter(
    (row) => row.kind === "share",
  );

  const signals: TopicSignal[] = [
    {
      topic: "failed-auth",
      label: "Failed auth",
      value: `${operationalIncidents.failedAuthAttemptCount}`,
      detail:
        operationalIncidents.failedAuthAttemptCount > 0
          ? `${operationalIncidents.failedAuthAttemptCount} failed authentication attempts are present in the admin audit window.`
          : "Failed-auth telemetry is present as a monitored release signal.",
      recommendation:
        "Route failed authentication signals to the admins who own account security and OTP delivery.",
      active:
        operationalIncidents.failedAuthAttemptCount > 0 ||
        hasNonReadyStatus(authRows),
      status: getWorstStatus(authRows, "review"),
      latestAt: latestRowAt(authRows),
      target: authRows.find((row) => row.status !== "ready")?.target ?? null,
    },
    {
      topic: "email-delivery",
      label: "Email delivery",
      value: `${operationalIncidents.failedEmailDeliveryCount}`,
      detail:
        operationalIncidents.failedEmailDeliveryCount > 0
          ? `${operationalIncidents.failedEmailDeliveryCount} failed email delivery attempts are loaded.`
          : "No failed comment-email delivery attempts are currently loaded.",
      recommendation:
        "Route failed email delivery to administrators who can fix sender, domain, and retry posture.",
      active:
        operationalIncidents.failedEmailDeliveryCount > 0 ||
        hasNonReadyStatus(emailRows),
      status: getWorstStatus(emailRows, "ready"),
      latestAt: latestRowAt(emailRows),
      target: emailRows.find((row) => row.status !== "ready")?.target ?? null,
    },
    {
      topic: "deploy-smoke",
      label: "Deploy smoke",
      value: `${productionDeploySmoke.score}`,
      detail: `${productionDeploySmoke.readyCount} ready, ${productionDeploySmoke.reviewCount} review, and ${productionDeploySmoke.blockedCount} blocked route checks are in the production smoke report. Monitoring digest score: ${productionMonitoringDigest.deploySmokeScore}.`,
      recommendation:
        "Route failed or stale deploy smoke checks to the release owner before promotion.",
      active: productionDeploySmoke.status !== "ready",
      status: productionDeploySmoke.status,
      latestAt: productionDeploySmoke.generatedAt,
      target: productionDeploySmoke.baseUrl,
    },
    {
      topic: "rollback",
      label: "Rollback readiness",
      value: `${rollbackReadiness.score}`,
      detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.staleShareCount} stale shares, and ${rollbackReadiness.deploymentLinkCount} deployment links are in rollback readiness. Monitoring digest rollback score: ${productionMonitoringDigest.rollbackScore}.`,
      recommendation:
        "Route rollback readiness gaps to the release owner before approving production changes.",
      active: rollbackReadiness.status !== "ready",
      status: rollbackReadiness.status,
      latestAt: rollbackReadiness.generatedAt,
      target:
        rollbackReadiness.rows.find((row) => row.status !== "ready")?.target ??
        rollbackReadiness.deploymentUrls[0] ??
        null,
    },
    {
      topic: "risky-shares",
      label: "Risky shares",
      value: `${operationalIncidents.riskyShareCount}`,
      detail: `${operationalIncidents.riskyShareCount} risky public shares and ${operationalIncidents.recentShareChangeCount} recent risky share changes are loaded.`,
      recommendation:
        "Route public-share exposure changes to admins who can disable stale or elevated links.",
      active:
        operationalIncidents.riskyShareCount > 0 ||
        operationalIncidents.recentShareChangeCount > 0 ||
        hasNonReadyStatus(shareRows),
      status: getWorstStatus(shareRows, "ready"),
      latestAt: latestRowAt(shareRows),
      target: shareRows.find((row) => row.status !== "ready")?.target ?? null,
    },
  ];

  return signals.map((signal) => ({
    ...signal,
    status: normalizeStatus(signal.status),
  }));
}

function getTopicStatus({
  active,
  routed,
  severity,
}: {
  active: boolean;
  routed: boolean;
  severity: AdminNotificationDigestStatus;
}): AdminNotificationDigestStatus {
  if (!active) {
    return "ready";
  }

  if (routed) {
    return "ready";
  }

  return severity === "blocked" ? "blocked" : "review";
}

function getRoutingRecommendation(
  signal: TopicSignal,
  minimumSeverity: AdminNotificationDigestSeverity,
) {
  if (minimumSeverity === "blocked" && signal.status === "review") {
    return `Lower the minimum severity to review if ${signal.label.toLowerCase()} review signals should be delivered.`;
  }

  return `Enable ${signal.label.toLowerCase()} digest delivery and confirm recipients before relying on this operational signal.`;
}

function hasNonReadyStatus(
  rows: Array<{ status: AdminOperationalIncidentStatus }>,
) {
  return rows.some((row) => row.status !== "ready");
}

function getWorstStatus(
  rows: Array<{ status: AdminOperationalIncidentStatus }>,
  fallback: AdminNotificationDigestStatus,
): AdminNotificationDigestStatus {
  if (rows.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (rows.some((row) => row.status === "review")) {
    return "review";
  }

  return fallback;
}

function normalizeStatus(
  value: AdminNotificationDigestStatus | AdminProductionMonitoringStatus,
): AdminNotificationDigestStatus {
  if (value === "blocked" || value === "review") {
    return value;
  }

  return "ready";
}

function latestRowAt(rows: Array<{ latestAt: string | null }>) {
  return (
    rows
      .map((row) => row.latestAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => toTime(right) - toTime(left))[0] ?? null
  );
}

function normalizeRecipients(recipients: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const recipient of recipients) {
    const email = recipient.trim().toLowerCase();

    if (!email || seen.has(email) || !isEmail(email)) {
      continue;
    }

    seen.add(email);
    normalized.push(email);
  }

  return normalized.slice(0, 20);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toTime(value: string) {
  return new Date(value).getTime();
}
