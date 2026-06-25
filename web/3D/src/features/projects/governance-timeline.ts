export type GovernanceTimelineSource = "audit" | "incident" | "postmortem" | "release-drill" | "resource-guardrail" | "slo";
export type GovernanceTimelineSeverity = "critical" | "healthy" | "info" | "warning";

export interface GovernanceTimelineAuditRowSource {
  actorEmail: string | null;
  actorName: string | null;
  category: string;
  description: string;
  id: string;
  occurredAt: string;
  projectId: string;
  projectName: string;
  status: "danger" | "info" | "success" | "warning";
  title: string;
}

export interface GovernanceTimelineSloSource {
  generatedAt: string;
  rows: {
    detail: string;
    failingCount: number;
    id: string;
    label: string;
    lastObservedAt: string | null;
    nextAction: string;
    pendingCount: number;
    sampleCount: number;
    status: "breach" | "healthy" | "no-data" | "watch";
  }[];
}

export interface GovernanceTimelineIncidentSource {
  generatedAt: string;
  incidents: {
    actionLabel: string;
    id: string;
    kind: string;
    message: string;
    occurredAt: string | null;
    projectId: string;
    projectName: string;
    severity: "critical" | "warning";
    source: string;
    title: string;
  }[];
}

export interface GovernanceTimelinePostmortemSource {
  generatedAt: string;
  templates: {
    followUpActions: string[];
    id: string;
    incident: {
      occurredAt: string | null;
      projectId: string;
      projectName: string;
      title: string;
    };
    ownerHint: string;
    readinessScore: number;
    status: "blocked" | "ready" | "watch";
  }[];
}

export interface GovernanceTimelineReleaseDrillHistorySource {
  records: {
    blockedCount: number;
    contentHash: string;
    createdAt: string;
    id: string;
    missingCount: number;
    readyCount: number;
    score: number;
    totalCount: number;
    watchCount: number;
    workspaceName: string;
  }[];
}

export interface GovernanceTimelineResourceGuardrailSource {
  generatedAt: string;
  rows: {
    evidence: string;
    id: string;
    label: string;
    nextAction: string;
    ownerHint: string;
    status: "blocked" | "ready" | "watch";
    usageLabel: string;
    usagePercent: number;
  }[];
}

export interface GovernanceTimelineEvent {
  actorLabel: string | null;
  correlationCount: number;
  detail: string;
  evidence: string;
  id: string;
  occurredAt: string;
  ownerHint: string;
  projectId: string | null;
  projectName: string | null;
  relatedEventIds: string[];
  relatedSources: GovernanceTimelineSource[];
  severity: GovernanceTimelineSeverity;
  source: GovernanceTimelineSource;
  statusLabel: string;
  title: string;
}

export interface GovernanceTimelineReport {
  events: GovernanceTimelineEvent[];
  generatedAt: string;
  summary: {
    correlatedCount: number;
    criticalCount: number;
    earliestAt: string | null;
    healthyCount: number;
    infoCount: number;
    latestAt: string | null;
    timelineScore: number;
    totalCount: number;
    warningCount: number;
    sourceCounts: Record<GovernanceTimelineSource, number>;
  };
}

export interface CreateGovernanceTimelineReportInput {
  auditRows: GovernanceTimelineAuditRowSource[];
  correlationWindowHours?: number;
  freeTierResourceMonitor: GovernanceTimelineResourceGuardrailSource;
  generatedAt?: string;
  incidentHistory: GovernanceTimelineIncidentSource;
  postmortemReport: GovernanceTimelinePostmortemSource;
  releaseDrillHistory: GovernanceTimelineReleaseDrillHistorySource | null;
  sloDashboard: GovernanceTimelineSloSource;
}

type TimelineEventDraft = Omit<GovernanceTimelineEvent, "correlationCount" | "relatedEventIds" | "relatedSources">;

const defaultCorrelationWindowHours = 48;
const maxTimelineEvents = 60;

const severityRank: Record<GovernanceTimelineSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3,
};

const severityScore: Record<GovernanceTimelineSeverity, number> = {
  critical: 0,
  warning: 65,
  info: 85,
  healthy: 100,
};

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function safeIso(value: string | null | undefined, fallback: string) {
  const time = toTime(value);

  return time > 0 ? new Date(time).toISOString() : fallback;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function sourceCounts() {
  return {
    audit: 0,
    incident: 0,
    postmortem: 0,
    "release-drill": 0,
    "resource-guardrail": 0,
    slo: 0,
  } satisfies Record<GovernanceTimelineSource, number>;
}

function auditSeverity(status: GovernanceTimelineAuditRowSource["status"]): GovernanceTimelineSeverity {
  if (status === "danger") {
    return "critical";
  }

  if (status === "warning") {
    return "warning";
  }

  return status === "success" ? "healthy" : "info";
}

function sloSeverity(status: GovernanceTimelineSloSource["rows"][number]["status"]): GovernanceTimelineSeverity {
  if (status === "breach") {
    return "critical";
  }

  if (status === "watch") {
    return "warning";
  }

  return status === "healthy" ? "healthy" : "info";
}

function postmortemSeverity(status: GovernanceTimelinePostmortemSource["templates"][number]["status"]): GovernanceTimelineSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "healthy";
}

function drillSeverity(record: GovernanceTimelineReleaseDrillHistorySource["records"][number]): GovernanceTimelineSeverity {
  if (record.blockedCount > 0 || record.missingCount > 0) {
    return "critical";
  }

  return record.watchCount > 0 ? "warning" : "healthy";
}

function resourceSeverity(status: GovernanceTimelineResourceGuardrailSource["rows"][number]["status"]): GovernanceTimelineSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "healthy";
}

function auditEvents(rows: GovernanceTimelineAuditRowSource[]): TimelineEventDraft[] {
  return rows.slice(0, 30).map((row) => ({
    actorLabel: row.actorName ?? row.actorEmail,
    detail: row.description,
    evidence: `${row.category} audit event for ${row.projectName}.`,
    id: `audit:${row.id}`,
    occurredAt: row.occurredAt,
    ownerHint: row.actorName ?? row.actorEmail ?? "Audit owner",
    projectId: row.projectId,
    projectName: row.projectName,
    severity: auditSeverity(row.status),
    source: "audit",
    statusLabel: row.status,
    title: row.title,
  }));
}

function sloEvents(report: GovernanceTimelineSloSource): TimelineEventDraft[] {
  return report.rows.map((row) => ({
    actorLabel: null,
    detail: row.detail,
    evidence: `${plural(row.sampleCount, "sample")}, ${plural(row.failingCount, "failure")}, ${plural(row.pendingCount, "pending item")}.`,
    id: `slo:${row.id}`,
    occurredAt: safeIso(row.lastObservedAt, report.generatedAt),
    ownerHint: "Operations owner",
    projectId: null,
    projectName: null,
    severity: sloSeverity(row.status),
    source: "slo",
    statusLabel: row.status,
    title: `SLO: ${row.label}`,
  }));
}

function incidentEvents(report: GovernanceTimelineIncidentSource): TimelineEventDraft[] {
  return report.incidents.map((incident) => ({
    actorLabel: null,
    detail: incident.message,
    evidence: `${incident.kind} from ${incident.source}.`,
    id: `incident:${incident.id}`,
    occurredAt: safeIso(incident.occurredAt, report.generatedAt),
    ownerHint: incident.actionLabel,
    projectId: incident.projectId,
    projectName: incident.projectName,
    severity: incident.severity,
    source: "incident",
    statusLabel: incident.severity,
    title: incident.title,
  }));
}

function postmortemEvents(report: GovernanceTimelinePostmortemSource): TimelineEventDraft[] {
  return report.templates.map((template) => ({
    actorLabel: null,
    detail: `${template.followUpActions.slice(0, 2).join(" ")}${template.followUpActions.length > 2 ? " ..." : ""}`,
    evidence: `Readiness score ${template.readinessScore}/100 for ${template.incident.title}.`,
    id: `postmortem:${template.id}`,
    occurredAt: safeIso(template.incident.occurredAt, report.generatedAt),
    ownerHint: template.ownerHint,
    projectId: template.incident.projectId,
    projectName: template.incident.projectName,
    severity: postmortemSeverity(template.status),
    source: "postmortem",
    statusLabel: template.status,
    title: `Postmortem: ${template.incident.title}`,
  }));
}

function releaseDrillEvents(history: GovernanceTimelineReleaseDrillHistorySource | null): TimelineEventDraft[] {
  return (history?.records ?? []).slice(0, 8).map((record) => ({
    actorLabel: null,
    detail: `${record.workspaceName} drill scored ${record.score}/100 with latest hash ${record.contentHash}.`,
    evidence: `${record.readyCount}/${record.totalCount} scenarios ready, ${record.blockedCount} blocked, ${record.watchCount} watch, ${record.missingCount} missing.`,
    id: `release-drill:${record.id}`,
    occurredAt: record.createdAt,
    ownerHint: "Release owner",
    projectId: null,
    projectName: null,
    severity: drillSeverity(record),
    source: "release-drill",
    statusLabel: record.blockedCount > 0 ? "blocked" : record.watchCount > 0 ? "watch" : "ready",
    title: "Saved release drill",
  }));
}

function resourceGuardrailEvents(report: GovernanceTimelineResourceGuardrailSource): TimelineEventDraft[] {
  return report.rows.map((row) => ({
    actorLabel: null,
    detail: row.evidence,
    evidence: `${row.usageLabel}, ${row.usagePercent}% usage.`,
    id: `resource:${row.id}`,
    occurredAt: report.generatedAt,
    ownerHint: row.ownerHint,
    projectId: null,
    projectName: null,
    severity: resourceSeverity(row.status),
    source: "resource-guardrail",
    statusLabel: row.status,
    title: `Resource guardrail: ${row.label}`,
  }));
}

function canCorrelate(first: TimelineEventDraft, second: TimelineEventDraft, windowMs: number) {
  if (first.id === second.id || first.source === second.source) {
    return false;
  }

  const firstTime = toTime(first.occurredAt);
  const secondTime = toTime(second.occurredAt);

  if (!firstTime || !secondTime || Math.abs(firstTime - secondTime) > windowMs) {
    return false;
  }

  const sameProject = Boolean(first.projectId && second.projectId && first.projectId === second.projectId);
  const hasGlobalSignal = !first.projectId || !second.projectId;

  return sameProject || hasGlobalSignal;
}

function correlateEvents(events: TimelineEventDraft[], windowHours: number): GovernanceTimelineEvent[] {
  const windowMs = windowHours * 60 * 60 * 1000;

  return events.map((event) => {
    const related = events
      .filter((candidate) => canCorrelate(event, candidate, windowMs))
      .sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || Math.abs(toTime(event.occurredAt) - toTime(first.occurredAt)) - Math.abs(toTime(event.occurredAt) - toTime(second.occurredAt)))
      .slice(0, 8);

    return {
      ...event,
      correlationCount: related.length,
      relatedEventIds: related.map((entry) => entry.id),
      relatedSources: Array.from(new Set(related.map((entry) => entry.source))).sort(),
    };
  });
}

function summarizeEvents(events: GovernanceTimelineEvent[]): GovernanceTimelineReport["summary"] {
  const counts = sourceCounts();

  for (const event of events) {
    counts[event.source] += 1;
  }

  const sortedTimes = events.map((event) => event.occurredAt).filter(Boolean).sort((first, second) => toTime(second) - toTime(first));

  return {
    correlatedCount: events.filter((event) => event.correlationCount > 0).length,
    criticalCount: events.filter((event) => event.severity === "critical").length,
    earliestAt: sortedTimes.at(-1) ?? null,
    healthyCount: events.filter((event) => event.severity === "healthy").length,
    infoCount: events.filter((event) => event.severity === "info").length,
    latestAt: sortedTimes[0] ?? null,
    sourceCounts: counts,
    timelineScore: Math.round(events.reduce((sum, event) => sum + severityScore[event.severity], 0) / Math.max(events.length, 1)),
    totalCount: events.length,
    warningCount: events.filter((event) => event.severity === "warning").length,
  };
}

export function createGovernanceTimelineReport(input: CreateGovernanceTimelineReportInput): GovernanceTimelineReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const drafts = [
    ...auditEvents(input.auditRows),
    ...sloEvents(input.sloDashboard),
    ...incidentEvents(input.incidentHistory),
    ...postmortemEvents(input.postmortemReport),
    ...releaseDrillEvents(input.releaseDrillHistory),
    ...resourceGuardrailEvents(input.freeTierResourceMonitor),
  ].sort((first, second) => toTime(second.occurredAt) - toTime(first.occurredAt) || severityRank[first.severity] - severityRank[second.severity] || first.title.localeCompare(second.title));
  const events = correlateEvents(drafts.slice(0, maxTimelineEvents), input.correlationWindowHours ?? defaultCorrelationWindowHours);

  return {
    events,
    generatedAt,
    summary: summarizeEvents(events),
  };
}
