import type { AdminCollaborationEventIngestionReport } from "@/features/admin/admin-collaboration-event-ingestion";
import type { AdminDataLossPreventionReport } from "@/features/admin/admin-data-loss-prevention";
import type { AdminRealtimeHealthReport } from "@/features/admin/admin-realtime-health-monitor";
import type { ScopedPublicationApprovalReport } from "@/features/admin/admin-scoped-publication-approvals";
import type { SelfHostedSyncDiagnosticReport } from "@/features/admin/admin-self-hosted-sync-diagnostics";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type AdminReleaseRiskTimelineStatus = "ready" | "review" | "blocked";

export type AdminReleaseRiskTimelineSeverity = "high" | "low" | "medium";

export type AdminReleaseRiskTimelineDimension =
  | "collaboration-incident"
  | "data-loss"
  | "deployment-smoke"
  | "publication-approval"
  | "realtime-health"
  | "self-hosted-sync";

export type AdminReleaseRiskTimelineEvent = {
  id: string;
  dimension: AdminReleaseRiskTimelineDimension;
  status: AdminReleaseRiskTimelineStatus;
  severity: AdminReleaseRiskTimelineSeverity;
  occurredAt: string;
  label: string;
  summary: string;
  evidence: string;
  recommendation: string;
  owner: string;
  score: number | null;
  command: string | null;
  tokens: string[];
};

export type AdminReleaseRiskCorrelation = {
  id: string;
  status: AdminReleaseRiskTimelineStatus;
  severity: AdminReleaseRiskTimelineSeverity;
  title: string;
  detail: string;
  eventIds: string[];
  recommendation: string;
};

export type AdminReleaseRiskDimensionSummary = {
  dimension: AdminReleaseRiskTimelineDimension;
  count: number;
  blockedCount: number;
  reviewCount: number;
  latestAt: string | null;
};

export type AdminReleaseRiskTimelineReport = {
  generatedAt: string;
  status: AdminReleaseRiskTimelineStatus;
  score: number;
  eventCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  correlationCount: number;
  commandCount: number;
  dimensionSummaries: AdminReleaseRiskDimensionSummary[];
  events: AdminReleaseRiskTimelineEvent[];
  correlations: AdminReleaseRiskCorrelation[];
  commands: string[];
};

export type AdminReleaseRiskTimelineInput = {
  generatedAt?: string;
  dataLossPrevention: Pick<
    AdminDataLossPreventionReport,
    | "blockedCount"
    | "commands"
    | "downloadExposureCount"
    | "generatedAt"
    | "publicRouteRiskCount"
    | "reviewCount"
    | "score"
    | "sensitiveFindingCount"
    | "status"
  >;
  selfHostedSyncDiagnostics: Pick<
    SelfHostedSyncDiagnosticReport,
    | "blockedCount"
    | "generatedAt"
    | "realtimeScore"
    | "repairCommandCount"
    | "repairCommands"
    | "reviewCount"
    | "routeSmokeScore"
    | "score"
    | "status"
  >;
  scopedPublicationApprovals: Pick<
    ScopedPublicationApprovalReport,
    | "commands"
    | "generatedAt"
    | "missingApprovalCount"
    | "overdueScopeCount"
    | "releaseEvidenceDiffCount"
    | "scopeCount"
    | "score"
    | "staleApprovalCount"
    | "status"
  >;
  realtimeHealth: Pick<
    AdminRealtimeHealthReport,
    | "commands"
    | "eventDriftCount"
    | "failedNotificationDeliveryCount"
    | "generatedAt"
    | "monitoredRoomCount"
    | "offlineReplayQueueCount"
    | "pendingSaveSignalCount"
    | "score"
    | "status"
  >;
  productionDeploySmoke: Pick<
    ProductionDeploySmokeReport,
    | "baseUrl"
    | "blockedCount"
    | "commands"
    | "generatedAt"
    | "readyCount"
    | "requiredRouteCount"
    | "reviewCount"
    | "routeCount"
    | "score"
    | "status"
  >;
  collaborationEventIngestion: Pick<
    AdminCollaborationEventIngestionReport,
    | "commands"
    | "durableEventCount"
    | "generatedAt"
    | "incidentCount"
    | "incidents"
    | "latestPurgeAt"
    | "purgeCandidateCount"
    | "redactedEventCount"
    | "score"
    | "status"
  >;
};

export function getAdminReleaseRiskTimelineReport({
  collaborationEventIngestion,
  dataLossPrevention,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  realtimeHealth,
  scopedPublicationApprovals,
  selfHostedSyncDiagnostics,
}: AdminReleaseRiskTimelineInput): AdminReleaseRiskTimelineReport {
  const events = [
    createDataLossEvent(dataLossPrevention),
    createSelfHostedSyncEvent(selfHostedSyncDiagnostics),
    createPublicationApprovalEvent(scopedPublicationApprovals),
    createRealtimeHealthEvent(realtimeHealth),
    createDeploymentSmokeEvent(productionDeploySmoke),
    createCollaborationIngestionEvent(collaborationEventIngestion),
    ...collaborationEventIngestion.incidents.map(createCollaborationIncidentEvent),
  ].sort(sortEvents);
  const correlations = createCorrelations(events);
  const readyCount = events.filter((event) => event.status === "ready").length;
  const reviewCount = events.filter((event) => event.status === "review").length;
  const blockedCount = events.filter((event) => event.status === "blocked").length;
  const highRiskCount = events.filter((event) => event.severity === "high").length;
  const mediumRiskCount = events.filter(
    (event) => event.severity === "medium",
  ).length;
  const commands = uniqueStrings(
    events.flatMap((event) => (event.command ? [event.command] : [])),
  );

  return {
    generatedAt,
    status: getWorstStatus(events.map((event) => event.status)),
    score: Math.max(
      0,
      100 -
        highRiskCount * 12 -
        mediumRiskCount * 5 -
        correlations.filter((correlation) => correlation.severity === "high")
          .length *
          6,
    ),
    eventCount: events.length,
    readyCount,
    reviewCount,
    blockedCount,
    highRiskCount,
    mediumRiskCount,
    correlationCount: correlations.length,
    commandCount: commands.length,
    dimensionSummaries: getDimensionSummaries(events),
    events,
    correlations,
    commands,
  };
}

export function filterAdminReleaseRiskTimelineEvents(
  events: AdminReleaseRiskTimelineEvent[],
  query: string,
) {
  const terms = normalizeTerms(query);

  if (terms.length === 0) {
    return events;
  }

  return events.filter((event) => {
    const haystack = event.tokens.join(" ");

    return terms.every((term) => haystack.includes(term));
  });
}

export function getAdminReleaseRiskTimelineJson(
  report: AdminReleaseRiskTimelineReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleaseRiskTimelineCsv(
  report: AdminReleaseRiskTimelineReport,
) {
  return [
    [
      "id",
      "dimension",
      "status",
      "severity",
      "occurred_at",
      "label",
      "summary",
      "evidence",
      "recommendation",
      "owner",
      "score",
      "command",
    ].join(","),
    ...report.events.map((event) =>
      [
        event.id,
        event.dimension,
        event.status,
        event.severity,
        event.occurredAt,
        event.label,
        event.summary,
        event.evidence,
        event.recommendation,
        event.owner,
        event.score ?? "",
        event.command ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReleaseRiskTimelineMarkdown(
  report: AdminReleaseRiskTimelineReport,
) {
  return [
    "# Release Risk Timeline",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Events: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    `Risk: ${report.highRiskCount} high, ${report.mediumRiskCount} medium`,
    "",
    "## Dimensions",
    "",
    ...report.dimensionSummaries.map(
      (summary) =>
        `- ${summary.dimension}: ${summary.count} events (${summary.blockedCount} blocked, ${summary.reviewCount} review)`,
    ),
    "",
    "## Correlations",
    "",
    ...report.correlations.map((correlation) =>
      [
        `- [${correlation.status}/${correlation.severity}] ${correlation.id}`,
        `  - ${correlation.title}`,
        `  - Detail: ${correlation.detail}`,
        `  - Events: ${correlation.eventIds.join(", ")}`,
        `  - Recommendation: ${correlation.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Timeline",
    "",
    ...report.events.map((event) =>
      [
        `- [${event.status}/${event.severity}] ${event.label}`,
        `  - Dimension: ${event.dimension}`,
        `  - Time: ${event.occurredAt}`,
        `  - Summary: ${event.summary}`,
        `  - Evidence: ${event.evidence}`,
        `  - Recommendation: ${event.recommendation}`,
        event.command ? `  - Command: \`${event.command}\`` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ].join("\n");
}

function createDataLossEvent(
  report: AdminReleaseRiskTimelineInput["dataLossPrevention"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:data-loss-prevention",
    dimension: "data-loss",
    status: report.status,
    occurredAt: report.generatedAt,
    label: "Data-loss prevention",
    summary: `${report.sensitiveFindingCount} sensitive findings, ${report.downloadExposureCount} download exposure rows, and ${report.publicRouteRiskCount} public route risks.`,
    evidence: `${report.blockedCount} blocked and ${report.reviewCount} review DLP rows with score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Keep DLP evidence attached to release approvals."
        : "Resolve blocked export/download/public-route risks before external publication.",
    owner: "Security reviewer",
    score: report.score,
    command: report.commands[0] ?? null,
  });
}

function createSelfHostedSyncEvent(
  report: AdminReleaseRiskTimelineInput["selfHostedSyncDiagnostics"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:self-hosted-sync",
    dimension: "self-hosted-sync",
    status: report.status,
    occurredAt: report.generatedAt,
    label: "Self-hosted sync diagnostics",
    summary: `${report.repairCommandCount} repair commands, route smoke score ${report.routeSmokeScore}, and realtime score ${report.realtimeScore}.`,
    evidence: `${report.blockedCount} blocked and ${report.reviewCount} review sync diagnostics with score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Keep sync parity evidence in the release bundle."
        : "Run repair commands before self-hosted or desktop cutover.",
    owner: "Self-hosted operator",
    score: report.score,
    command: report.repairCommands[0]?.command ?? null,
  });
}

function createPublicationApprovalEvent(
  report: AdminReleaseRiskTimelineInput["scopedPublicationApprovals"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:publication-approvals",
    dimension: "publication-approval",
    status: report.status,
    occurredAt: report.generatedAt,
    label: "Scoped publication approvals",
    summary: `${report.scopeCount} scopes, ${report.missingApprovalCount} missing approvals, ${report.staleApprovalCount} stale approvals, and ${report.overdueScopeCount} overdue scopes.`,
    evidence: `${report.releaseEvidenceDiffCount} release evidence diffs with approval score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Attach approval snapshots to the release evidence package."
        : "Close missing, stale, and overdue scoped publication approvals.",
    owner: "Publication reviewer",
    score: report.score,
    command: report.commands[0] ?? null,
  });
}

function createRealtimeHealthEvent(
  report: AdminReleaseRiskTimelineInput["realtimeHealth"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:realtime-health",
    dimension: "realtime-health",
    status: report.status,
    occurredAt: report.generatedAt,
    label: "Realtime health",
    summary: `${report.monitoredRoomCount} monitored rooms, ${report.offlineReplayQueueCount} offline replay items, ${report.eventDriftCount} drift events, and ${report.pendingSaveSignalCount} pending save signals.`,
    evidence: `${report.failedNotificationDeliveryCount} failed notification deliveries with realtime score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Keep realtime health report in the operator handoff."
        : "Stabilize replay, drift, save, and notification signals before release.",
    owner: "Collaboration operator",
    score: report.score,
    command: report.commands[0] ?? null,
  });
}

function createDeploymentSmokeEvent(
  report: AdminReleaseRiskTimelineInput["productionDeploySmoke"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:deployment-smoke",
    dimension: "deployment-smoke",
    status: report.status,
    occurredAt: report.generatedAt,
    label: "Deployment smoke",
    summary: `${report.readyCount}/${report.routeCount} routes ready across ${report.requiredRouteCount} required routes on ${report.baseUrl}.`,
    evidence: `${report.blockedCount} blocked and ${report.reviewCount} review route checks with deploy smoke score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Keep route smoke artifacts attached to release evidence."
        : "Re-run post-deploy smoke and resolve review routes before approval.",
    owner: "Release operator",
    score: report.score,
    command: report.commands[0] ?? null,
  });
}

function createCollaborationIngestionEvent(
  report: AdminReleaseRiskTimelineInput["collaborationEventIngestion"],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: "risk:collaboration-ingestion",
    dimension: "collaboration-incident",
    status: report.status,
    occurredAt: report.latestPurgeAt ?? report.generatedAt,
    label: "Collaboration event ingestion",
    summary: `${report.incidentCount} incidents, ${report.purgeCandidateCount} purge candidates, and ${report.durableEventCount} durable events.`,
    evidence: `${report.redactedEventCount}/${report.durableEventCount} events are redacted with ingestion score ${report.score}.`,
    recommendation:
      report.status === "ready"
        ? "Keep collaboration ingestion evidence in the release bundle."
        : "Review collaboration incidents and purge candidates before release signoff.",
    owner: "Collaboration operator",
    score: report.score,
    command: report.commands[0] ?? null,
  });
}

function createCollaborationIncidentEvent(
  incident: AdminReleaseRiskTimelineInput["collaborationEventIngestion"]["incidents"][number],
): AdminReleaseRiskTimelineEvent {
  return createEvent({
    id: `risk:collaboration-incident:${incident.id}`,
    dimension: "collaboration-incident",
    status: incident.status,
    occurredAt: incident.latestAt ?? new Date(0).toISOString(),
    label: incident.label,
    summary: `${incident.fileName}: ${incident.value}`,
    evidence: incident.detail,
    recommendation: incident.recommendation,
    owner: "Collaboration operator",
    score: null,
    command: null,
  });
}

function createEvent({
  command,
  dimension,
  evidence,
  id,
  label,
  occurredAt,
  owner,
  recommendation,
  score,
  status,
  summary,
}: Omit<AdminReleaseRiskTimelineEvent, "severity" | "tokens">) {
  const event = {
    command,
    dimension,
    evidence,
    id,
    label,
    occurredAt,
    owner,
    recommendation,
    score,
    status,
    summary,
    severity: getSeverity(status, score),
  };

  return {
    ...event,
    tokens: normalizeTerms([
      event.id,
      event.dimension,
      event.status,
      event.severity,
      event.label,
      event.summary,
      event.evidence,
      event.recommendation,
      event.owner,
      event.score,
      event.command,
    ]),
  };
}

function createCorrelations(
  events: AdminReleaseRiskTimelineEvent[],
): AdminReleaseRiskCorrelation[] {
  return [
    createCorrelation({
      id: "publication-safety",
      title: "Publication safety",
      dimensions: ["data-loss", "publication-approval"],
      events,
      recommendation:
        "Clear DLP blockers and publication approval gaps together before exposing external links.",
    }),
    createCorrelation({
      id: "runtime-cutover",
      title: "Runtime cutover",
      dimensions: ["deployment-smoke", "self-hosted-sync"],
      events,
      recommendation:
        "Keep route smoke and self-hosted sync repair evidence in the same release package.",
    }),
    createCorrelation({
      id: "collaboration-reliability",
      title: "Collaboration reliability",
      dimensions: ["collaboration-incident", "realtime-health"],
      events,
      recommendation:
        "Stabilize realtime health and collaboration incident queues before release handoff.",
    }),
  ].filter((correlation) => correlation.eventIds.length > 1);
}

function createCorrelation({
  dimensions,
  events,
  id,
  recommendation,
  title,
}: {
  dimensions: AdminReleaseRiskTimelineDimension[];
  events: AdminReleaseRiskTimelineEvent[];
  id: string;
  recommendation: string;
  title: string;
}): AdminReleaseRiskCorrelation {
  const matchedEvents = events.filter((event) =>
    dimensions.includes(event.dimension),
  );
  const status = getWorstStatus(matchedEvents.map((event) => event.status));
  const severity = getWorstSeverity(
    matchedEvents.map((event) => event.severity),
  );

  return {
    id,
    status,
    severity,
    title,
    detail: matchedEvents
      .map((event) => `${event.label}: ${event.status}/${event.severity}`)
      .join("; "),
    eventIds: matchedEvents.map((event) => event.id),
    recommendation,
  };
}

function getDimensionSummaries(events: AdminReleaseRiskTimelineEvent[]) {
  const dimensions: AdminReleaseRiskTimelineDimension[] = [
    "data-loss",
    "self-hosted-sync",
    "publication-approval",
    "realtime-health",
    "deployment-smoke",
    "collaboration-incident",
  ];

  return dimensions
    .map((dimension) => {
      const rows = events.filter((event) => event.dimension === dimension);

      return {
        dimension,
        count: rows.length,
        blockedCount: rows.filter((row) => row.status === "blocked").length,
        reviewCount: rows.filter((row) => row.status === "review").length,
        latestAt: getLatestAt(rows.map((row) => row.occurredAt)),
      };
    })
    .filter((summary) => summary.count > 0);
}

function getSeverity(
  status: AdminReleaseRiskTimelineStatus,
  score: number | null,
): AdminReleaseRiskTimelineSeverity {
  if (status === "blocked" || (score !== null && score < 60)) {
    return "high";
  }

  if (status === "review" || (score !== null && score < 85)) {
    return "medium";
  }

  return "low";
}

function getWorstStatus(statuses: AdminReleaseRiskTimelineStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getWorstSeverity(
  severities: AdminReleaseRiskTimelineSeverity[],
): AdminReleaseRiskTimelineSeverity {
  if (severities.includes("high")) {
    return "high";
  }

  if (severities.includes("medium")) {
    return "medium";
  }

  return "low";
}

function sortEvents(
  left: AdminReleaseRiskTimelineEvent,
  right: AdminReleaseRiskTimelineEvent,
) {
  const severityDelta =
    getSeverityWeight(right.severity) - getSeverityWeight(left.severity);

  if (severityDelta !== 0) {
    return severityDelta;
  }

  const timeDelta = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

  if (Number.isFinite(timeDelta) && timeDelta !== 0) {
    return timeDelta;
  }

  return left.label.localeCompare(right.label);
}

function getSeverityWeight(severity: AdminReleaseRiskTimelineSeverity) {
  if (severity === "high") {
    return 3;
  }

  return severity === "medium" ? 2 : 1;
}

function getLatestAt(values: string[]) {
  const sorted = values
    .map((value) => Date.parse(value))
    .filter(Number.isFinite)
    .sort((left, right) => right - left);

  return sorted[0] ? new Date(sorted[0]).toISOString() : null;
}

function normalizeTerms(value: unknown): string[] {
  const text = Array.isArray(value)
    ? value.map((item) => String(item ?? "")).join(" ")
    : String(value ?? "");

  return uniqueStrings(
    text
      .toLowerCase()
      .split(/[^a-z0-9@._/-]+/)
      .map((term) => term.trim())
      .filter(Boolean),
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
