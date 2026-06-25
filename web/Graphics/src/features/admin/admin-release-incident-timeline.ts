import type {
  AdminAuditRow,
  AdminNotificationDeliveryRow,
} from "@/features/admin/admin-data";
import type { AdminOperationalIncidentReport } from "@/features/admin/admin-operational-incidents";
import type {
  AdminProductionMonitoringDigest,
  AdminProductionMonitoringStatus,
} from "@/features/admin/admin-production-monitoring-digest";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type {
  RuntimeIssueSeverity,
  RuntimeObservabilityReport,
} from "@/features/editor/runtime-observability";

export type AdminReleaseIncidentTimelineStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminReleaseIncidentTimelineSeverity =
  | "error"
  | "info"
  | "warning";

export type AdminReleaseIncidentTimelineSource =
  | "audit"
  | "deploy-check"
  | "manifest"
  | "notification"
  | "rollback"
  | "runtime";

export type AdminReleaseIncidentTimelineEvent = {
  id: string;
  source: AdminReleaseIncidentTimelineSource;
  status: AdminReleaseIncidentTimelineStatus;
  severity: AdminReleaseIncidentTimelineSeverity;
  occurredAt: string;
  title: string;
  summary: string;
  actor: string | null;
  target: string | null;
  recommendation: string;
  relatedIds: string[];
};

export type AdminReleaseIncidentCorrelation = {
  id: string;
  status: AdminReleaseIncidentTimelineStatus;
  label: string;
  value: string;
  eventCount: number;
  sources: AdminReleaseIncidentTimelineSource[];
  latestAt: string | null;
  detail: string;
  recommendation: string;
};

export type AdminReleaseIncidentTimelineReport = {
  generatedAt: string;
  status: AdminReleaseIncidentTimelineStatus;
  score: number;
  eventCount: number;
  readyEventCount: number;
  reviewEventCount: number;
  blockedEventCount: number;
  deployEventCount: number;
  auditEventCount: number;
  notificationEventCount: number;
  runtimeEventCount: number;
  rollbackEventCount: number;
  manifestEventCount: number;
  correlationCount: number;
  timeline: AdminReleaseIncidentTimelineEvent[];
  correlations: AdminReleaseIncidentCorrelation[];
};

export type AdminReleaseIncidentTimelineInput = {
  auditEvents: AdminAuditRow[];
  generatedAt?: string;
  notificationDeliveries: AdminNotificationDeliveryRow[];
  operationalIncidents: AdminOperationalIncidentReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  productionMonitoringDigest: AdminProductionMonitoringDigest;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  runtimeObservability: RuntimeObservabilityReport;
};

const MAX_TIMELINE_EVENTS = 36;
const MAX_AUDIT_EVENTS = 12;
const MAX_NOTIFICATION_EVENTS = 12;

export function getAdminReleaseIncidentTimeline({
  auditEvents,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  operationalIncidents,
  productionDeploySmoke,
  productionMonitoringDigest,
  releaseArtifactManifest,
  rollbackReadiness,
  runtimeObservability,
}: AdminReleaseIncidentTimelineInput): AdminReleaseIncidentTimelineReport {
  const timeline = [
    ...getDeployEvents(productionDeploySmoke),
    ...getRuntimeEvents(runtimeObservability, generatedAt),
    ...getRollbackEvents(rollbackReadiness),
    ...getNotificationEvents(notificationDeliveries),
    ...getAuditEvents(auditEvents),
    ...getManifestEvents(releaseArtifactManifest),
  ]
    .sort(sortEvents)
    .slice(0, MAX_TIMELINE_EVENTS);
  const correlations = getCorrelations({
    operationalIncidents,
    productionMonitoringDigest,
    releaseArtifactManifest,
    timeline,
  });
  const readyEventCount = timeline.filter((event) => event.status === "ready")
    .length;
  const reviewEventCount = timeline.filter((event) => event.status === "review")
    .length;
  const blockedEventCount = timeline.filter(
    (event) => event.status === "blocked",
  ).length;
  const blockedCorrelationCount = correlations.filter(
    (correlation) => correlation.status === "blocked",
  ).length;
  const reviewCorrelationCount = correlations.filter(
    (correlation) => correlation.status === "review",
  ).length;

  return {
    generatedAt,
    status:
      blockedEventCount + blockedCorrelationCount > 0
        ? "blocked"
        : reviewEventCount + reviewCorrelationCount > 0
          ? "review"
          : "ready",
    score: Math.max(
      0,
      100 -
        (blockedEventCount + blockedCorrelationCount) * 16 -
        (reviewEventCount + reviewCorrelationCount) * 5,
    ),
    eventCount: timeline.length,
    readyEventCount,
    reviewEventCount,
    blockedEventCount,
    deployEventCount: getSourceCount(timeline, "deploy-check"),
    auditEventCount: getSourceCount(timeline, "audit"),
    notificationEventCount: getSourceCount(timeline, "notification"),
    runtimeEventCount: getSourceCount(timeline, "runtime"),
    rollbackEventCount: getSourceCount(timeline, "rollback"),
    manifestEventCount: getSourceCount(timeline, "manifest"),
    correlationCount: correlations.length,
    timeline,
    correlations,
  };
}

function getDeployEvents(
  report: ProductionDeploySmokeReport,
): AdminReleaseIncidentTimelineEvent[] {
  return report.rows.map((row) => ({
    id: `deploy-${row.id}`,
    source: "deploy-check",
    status: row.status,
    severity: statusToSeverity(row.status),
    occurredAt: report.generatedAt,
    title: row.label,
    summary: `${row.method} ${row.route}: ${row.detail}`,
    actor: null,
    target: row.route,
    recommendation: row.recommendation,
    relatedIds: [row.id],
  }));
}

function getRuntimeEvents(
  report: RuntimeObservabilityReport,
  generatedAt: string,
): AdminReleaseIncidentTimelineEvent[] {
  if (report.issues.length > 0) {
    return report.issues.map((issue) => ({
      id: `runtime-${issue.id}`,
      source: "runtime",
      status: runtimeSeverityToStatus(issue.severity),
      severity: runtimeSeverityToTimelineSeverity(issue.severity),
      occurredAt: issue.capturedAt,
      title: `${issue.surfaceLabel} ${issue.kind}`,
      summary: issue.message,
      actor: null,
      target: issue.url,
      recommendation:
        issue.severity === "error"
          ? "Fix this runtime error before release approval."
          : "Review this runtime signal before closing the release timeline.",
      relatedIds: [issue.id],
    }));
  }

  return report.rows.map((row) => ({
    id: `runtime-${row.id}`,
    source: "runtime",
    status: row.status,
    severity: statusToSeverity(row.status),
    occurredAt: generatedAt,
    title: row.label,
    summary: row.detail,
    actor: null,
    target: null,
    recommendation: row.recommendation,
    relatedIds: row.issueIds,
  }));
}

function getRollbackEvents(
  report: AdminRollbackReadinessReport,
): AdminReleaseIncidentTimelineEvent[] {
  return report.rows.map((row) => ({
    id: `rollback-${row.id}`,
    source: "rollback",
    status: row.status,
    severity: statusToSeverity(row.status),
    occurredAt: report.generatedAt,
    title: row.label,
    summary: row.detail,
    actor: null,
    target: row.target,
    recommendation: row.recommendation,
    relatedIds: [row.id],
  }));
}

function getNotificationEvents(
  deliveries: AdminNotificationDeliveryRow[],
): AdminReleaseIncidentTimelineEvent[] {
  return deliveries.slice(0, MAX_NOTIFICATION_EVENTS).map((delivery) => ({
    id: `notification-${delivery.id}`,
    source: "notification",
    status: notificationStatusToTimelineStatus(delivery.status),
    severity: delivery.status === "failed" ? "error" : "info",
    occurredAt: delivery.createdAt,
    title: `${delivery.kind} notification ${delivery.status}`,
    summary: `${delivery.fileName} notification to ${delivery.recipientEmail}${delivery.reason ? ` for ${delivery.reason}` : ""}.`,
    actor: delivery.actorName,
    target: delivery.recipientEmail,
    recommendation:
      delivery.status === "failed"
        ? "Retry delivery after sender, domain, and recipient readiness are confirmed."
        : "Keep notification delivery evidence with release incident review.",
    relatedIds: [delivery.id, delivery.fileId],
  }));
}

function getAuditEvents(
  auditEvents: AdminAuditRow[],
): AdminReleaseIncidentTimelineEvent[] {
  return auditEvents.slice(0, MAX_AUDIT_EVENTS).map((event) => ({
    id: `audit-${event.id}`,
    source: "audit",
    status: isHighImpactAuditAction(event.action) ? "review" : "ready",
    severity: isHighImpactAuditAction(event.action) ? "warning" : "info",
    occurredAt: event.createdAt,
    title: formatAuditAction(event.action),
    summary: `${event.actorEmail} changed ${event.targetLabel}.`,
    actor: event.actorEmail,
    target: event.targetLabel,
    recommendation: isHighImpactAuditAction(event.action)
      ? "Confirm this high-impact admin change is intentional for the release window."
      : "Keep this audit event as timeline evidence.",
    relatedIds: [event.id, event.targetId],
  }));
}

function getManifestEvents(
  report: AdminReleaseArtifactManifestReport,
): AdminReleaseIncidentTimelineEvent[] {
  return [
    {
      id: `manifest-${report.manifestId}`,
      source: "manifest",
      status: report.status,
      severity: statusToSeverity(report.status),
      occurredAt: report.generatedAt,
      title: "Signed release artifact manifest",
      summary: `${report.artifactCount} artifacts, ${report.signedArtifactCount} signed, ${report.blockedArtifactCount} blocked. Manifest checksum ${report.checksum}.`,
      actor: null,
      target: report.manifestId,
      recommendation: report.signing.configured
        ? "Archive this manifest with release approvals and exported artifacts."
        : "Configure ESSENCE_RELEASE_SIGNING_KEY before treating artifacts as signed.",
      relatedIds: report.artifacts.map((artifact) => artifact.id),
    },
  ];
}

function getCorrelations({
  operationalIncidents,
  productionMonitoringDigest,
  releaseArtifactManifest,
  timeline,
}: {
  operationalIncidents: AdminOperationalIncidentReport;
  productionMonitoringDigest: AdminProductionMonitoringDigest;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  timeline: AdminReleaseIncidentTimelineEvent[];
}): AdminReleaseIncidentCorrelation[] {
  const deployAndRuntime = timeline.filter(
    (event) =>
      (event.source === "deploy-check" || event.source === "runtime") &&
      event.status !== "ready",
  );
  const authEmailNotifications = timeline.filter(
    (event) =>
      (event.source === "notification" ||
        event.summary.toLowerCase().includes("auth") ||
        event.summary.toLowerCase().includes("email")) &&
      event.status !== "ready",
  );
  const rollbackAndShare = timeline.filter(
    (event) =>
      (event.source === "rollback" ||
        event.summary.toLowerCase().includes("share")) &&
      event.status !== "ready",
  );
  const releaseGovernance = timeline.filter(
    (event) =>
      event.source === "manifest" ||
      event.title.toLowerCase().includes("release") ||
      event.title.toLowerCase().includes("approval"),
  );

  return [
    createCorrelation({
      id: "deploy-runtime-correlation",
      label: "Deploy and runtime evidence",
      value: `${productionMonitoringDigest.deploySmokeScore}/${productionMonitoringDigest.runtimeScore}`,
      events: deployAndRuntime,
      readyDetail:
        "Deploy checks and runtime observations have no active release timeline blockers.",
      detail: `${deployAndRuntime.length} deploy or runtime events need review before release approval.`,
      recommendation:
        "Resolve failed route checks and runtime capture gaps before publishing release artifacts.",
    }),
    createCorrelation({
      id: "auth-email-notification-correlation",
      label: "Auth and notification incidents",
      value: `${operationalIncidents.failedAuthAttemptCount}/${operationalIncidents.failedEmailDeliveryCount}`,
      events: authEmailNotifications,
      readyDetail:
        "Auth, email, and notification evidence has no active blockers in the loaded timeline.",
      detail: `${operationalIncidents.failedAuthAttemptCount} failed auth attempts, ${operationalIncidents.failedEmailDeliveryCount} failed email deliveries, and ${authEmailNotifications.length} notification-related timeline events need review.`,
      recommendation:
        "Review OTP, Brevo, recipient, and auth audit evidence before release handoff.",
    }),
    createCorrelation({
      id: "rollback-share-correlation",
      label: "Rollback and share exposure",
      value: `${productionMonitoringDigest.rollbackScore}`,
      events: rollbackAndShare,
      readyDetail:
        "Rollback and share exposure evidence is clear in the current timeline.",
      detail: `${rollbackAndShare.length} rollback or share events need review.`,
      recommendation:
        "Resolve stale shares, elevated public links, and rollback gaps before release.",
    }),
    createCorrelation({
      id: "release-governance-correlation",
      label: "Release governance chain",
      value: `${releaseArtifactManifest.score}`,
      events: releaseGovernance.filter((event) => event.status !== "ready"),
      readyDetail:
        "Release approval and signed artifact evidence are connected in the timeline.",
      detail: `${releaseGovernance.length} release governance events are linked; ${releaseArtifactManifest.unsignedArtifactCount} artifacts are unsigned.`,
      recommendation:
        "Archive release approvals, manifest signatures, and deploy evidence together.",
    }),
  ];
}

function createCorrelation({
  detail,
  events,
  id,
  label,
  readyDetail,
  recommendation,
  value,
}: {
  detail: string;
  events: AdminReleaseIncidentTimelineEvent[];
  id: string;
  label: string;
  readyDetail: string;
  recommendation: string;
  value: string;
}): AdminReleaseIncidentCorrelation {
  const status = getWorstStatus(events.map((event) => event.status));

  return {
    id,
    status,
    label,
    value,
    eventCount: events.length,
    sources: Array.from(new Set(events.map((event) => event.source))),
    latestAt: events
      .map((event) => event.occurredAt)
      .sort((left, right) => toTime(right) - toTime(left))[0] ?? null,
    detail: events.length > 0 ? detail : readyDetail,
    recommendation,
  };
}

function notificationStatusToTimelineStatus(
  status: string,
): AdminReleaseIncidentTimelineStatus {
  if (status === "failed") {
    return "blocked";
  }

  return status === "sent" || status === "delivered" ? "ready" : "review";
}

function runtimeSeverityToStatus(
  severity: RuntimeIssueSeverity,
): AdminReleaseIncidentTimelineStatus {
  if (severity === "error") {
    return "blocked";
  }

  return severity === "warning" ? "review" : "ready";
}

function runtimeSeverityToTimelineSeverity(
  severity: RuntimeIssueSeverity,
): AdminReleaseIncidentTimelineSeverity {
  if (severity === "error") {
    return "error";
  }

  return severity === "warning" ? "warning" : "info";
}

function statusToSeverity(
  status: AdminReleaseIncidentTimelineStatus,
): AdminReleaseIncidentTimelineSeverity {
  if (status === "blocked") {
    return "error";
  }

  return status === "review" ? "warning" : "info";
}

function getWorstStatus(
  statuses: AdminReleaseIncidentTimelineStatus[],
): AdminReleaseIncidentTimelineStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function getSourceCount(
  events: AdminReleaseIncidentTimelineEvent[],
  source: AdminReleaseIncidentTimelineSource,
) {
  return events.filter((event) => event.source === source).length;
}

function sortEvents(
  first: AdminReleaseIncidentTimelineEvent,
  second: AdminReleaseIncidentTimelineEvent,
) {
  const timeDelta = toTime(second.occurredAt) - toTime(first.occurredAt);

  if (timeDelta !== 0) {
    return timeDelta;
  }

  return getSeverityRank(first.severity) - getSeverityRank(second.severity);
}

function getSeverityRank(severity: AdminReleaseIncidentTimelineSeverity) {
  if (severity === "error") {
    return 0;
  }

  return severity === "warning" ? 1 : 2;
}

function isHighImpactAuditAction(action: string) {
  return (
    action.startsWith("release.") ||
    action.startsWith("share.") ||
    action.startsWith("session.") ||
    action.startsWith("user.") ||
    action.includes("approval") ||
    action.includes("policy")
  );
}

function formatAuditAction(action: string) {
  return action
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}
