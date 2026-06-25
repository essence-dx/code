import type { PostDeploySyntheticDashboardSummary, PostDeploySyntheticDashboardStatus } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow, ExecutiveActionOwnershipStatus } from "@/features/projects/executive-action-ownership";
import type { ProjectIncident, ProjectIncidentHistory, ProjectIncidentSeverity } from "@/features/projects/project-incident-history";
import type { ReleaseReadinessWebhookHistoryEntry, ReleaseReadinessWebhookHistoryReport } from "@/features/projects/release-readiness-webhook-history";
import type { ReleaseReadinessWebhookReport, ReleaseReadinessWebhookRow, ReleaseReadinessWebhookStatus } from "@/features/projects/release-readiness-webhooks";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookRecordStatus, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type ReleaseControlRoomTimelineKind = "deploy" | "incident" | "owner-action" | "runbook" | "webhook";
export type ReleaseControlRoomTimelineStatus = "blocked" | "ready" | "watch";
export type ReleaseControlRoomTimelineSeverity = "critical" | "info" | "warning";

export interface ReleaseControlRoomTimelineRow {
  detail: string;
  evidence: string;
  href: string | null;
  id: string;
  kind: ReleaseControlRoomTimelineKind;
  nextAction: string;
  occurredAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  projectName: string | null;
  severity: ReleaseControlRoomTimelineSeverity;
  sourceLabel: string;
  status: ReleaseControlRoomTimelineStatus;
  title: string;
}

export interface ReleaseControlRoomTimelineReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: ReleaseControlRoomTimelineRow[];
  summary: {
    blockedCount: number;
    latestAt: string | null;
    nextAction: string;
    ownerCount: number;
    readyCount: number;
    sourceCount: number;
    status: ReleaseControlRoomTimelineStatus;
    totalCount: number;
    watchCount: number;
  };
}

export interface CreateReleaseControlRoomTimelineInput {
  executiveActionOwnership: ExecutiveActionOwnershipMatrix | null;
  generatedAt?: string;
  incidentHistory: ProjectIncidentHistory;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseReadinessWebhookHistory: ReleaseReadinessWebhookHistoryReport | null;
  releaseReadinessWebhooks: ReleaseReadinessWebhookReport | null;
  releaseRunbook: WorkspaceReleaseRunbookReport;
  workspaceId?: string;
}

const statusRank: Record<ReleaseControlRoomTimelineStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<ReleaseControlRoomTimelineKind, number> = {
  deploy: 0,
  webhook: 1,
  incident: 2,
  runbook: 3,
  "owner-action": 4,
};

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "workspace"
  );
}

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function latestIso(values: string[]) {
  const latest = values.map(toTime).filter((time) => time > 0).sort((first, second) => second - first)[0];

  return latest ? new Date(latest).toISOString() : null;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function postDeployStatus(status: PostDeploySyntheticDashboardStatus): ReleaseControlRoomTimelineStatus {
  if (status === "fail") {
    return "blocked";
  }

  return status === "pass" ? "ready" : "watch";
}

function webhookStatus(status: ReleaseReadinessWebhookStatus): ReleaseControlRoomTimelineStatus {
  return status;
}

function incidentStatus(severity: ProjectIncidentSeverity): ReleaseControlRoomTimelineStatus {
  return severity === "critical" ? "blocked" : "watch";
}

function runbookStatus(status: WorkspaceReleaseRunbookRecordStatus): ReleaseControlRoomTimelineStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "complete" ? "ready" : "watch";
}

function ownerStatus(status: ExecutiveActionOwnershipStatus): ReleaseControlRoomTimelineStatus {
  if (status === "blocked" || status === "overdue") {
    return "blocked";
  }

  return status;
}

function severityForStatus(status: ReleaseControlRoomTimelineStatus): ReleaseControlRoomTimelineSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "info";
}

function providerLabel(provider: ReleaseReadinessWebhookRow["provider"]) {
  if (provider === "desktop-updater") {
    return "Desktop updater";
  }

  return provider[0].toUpperCase() + provider.slice(1);
}

function createDeployRows(summary: PostDeploySyntheticDashboardSummary | null, generatedAt: string): ReleaseControlRoomTimelineRow[] {
  if (!summary) {
    return [
      {
        detail: "No post-deploy synthetic smoke summary is available.",
        evidence: "Deploy verification has not been attached to this control-room view.",
        href: "#post-deploy-smoke",
        id: "deploy:missing",
        kind: "deploy",
        nextAction: "Run the post-deploy smoke command and attach the latest report before promotion.",
        occurredAt: generatedAt,
        ownerEmail: null,
        ownerName: "Web release owner",
        projectName: null,
        severity: "warning",
        sourceLabel: "Post-deploy smoke",
        status: "watch",
        title: "Post-deploy smoke missing",
      },
    ];
  }

  const status = postDeployStatus(summary.status);
  const firstIssue = summary.issueRows[0];

  return [
    {
      detail: `${summary.statusLabel}; ${summary.completionPercent}% complete, ${summary.issueRows.length} issue rows, ${summary.currentPassStreak} pass streak.`,
      evidence: firstIssue ? `${firstIssue.label}: ${firstIssue.issues[0] ?? firstIssue.httpStatus ?? "failed check"}` : `${summary.passedRunCount}/${summary.totalRunCount} historical runs passed.`,
      href: "#post-deploy-smoke",
      id: `deploy:${summary.generatedAt ?? generatedAt}:${summary.projectId ?? "workspace"}`,
      kind: "deploy",
      nextAction:
        status === "blocked"
          ? "Resolve failed public checks and rerun post-deploy smoke before promotion."
          : status === "watch"
            ? "Run post-deploy smoke for the current deployment before promotion."
            : "Keep the passing smoke report attached to the release evidence.",
      occurredAt: summary.generatedAt ?? generatedAt,
      ownerEmail: null,
      ownerName: "Web release owner",
      projectName: summary.projectId,
      severity: severityForStatus(status),
      sourceLabel: "Post-deploy smoke",
      status,
      title: `Post-deploy smoke ${summary.statusLabel.toLowerCase()}`,
    },
  ];
}

function createWebhookHistoryRow(entry: ReleaseReadinessWebhookHistoryEntry): ReleaseControlRoomTimelineRow {
  const status = webhookStatus(entry.readinessRow.status);

  return {
    detail: `${entry.readinessRow.evidence} Replay ${entry.replayState}; delivery ${entry.deliveryState}.`,
    evidence: entry.deliveryAttempt?.lastError ?? entry.replayReason ?? entry.payloadDigest,
    href: "#release-readiness-webhooks",
    id: `webhook-history:${entry.id}`,
    kind: "webhook",
    nextAction: entry.readinessRow.nextAction,
    occurredAt: entry.receivedAt,
    ownerEmail: null,
    ownerName: "Automation owner",
    projectName: null,
    severity: severityForStatus(status),
    sourceLabel: "Webhook history",
    status,
    title: `${providerLabel(entry.provider)} ${entry.eventType}`,
  };
}

function createWebhookSourceRow(row: ReleaseReadinessWebhookRow): ReleaseControlRoomTimelineRow {
  const status = webhookStatus(row.status);

  return {
    detail: row.evidence,
    evidence: `Signature ${row.signatureState}; ${row.payloadDigest}`,
    href: "#release-readiness-webhooks",
    id: `webhook:${row.dedupeKey}`,
    kind: "webhook",
    nextAction: row.nextAction,
    occurredAt: row.receivedAt,
    ownerEmail: null,
    ownerName: "Automation owner",
    projectName: row.subject,
    severity: severityForStatus(status),
    sourceLabel: "Webhook readiness",
    status,
    title: `${providerLabel(row.provider)} ${row.eventType}`,
  };
}

function createWebhookRows(history: ReleaseReadinessWebhookHistoryReport | null, report: ReleaseReadinessWebhookReport | null) {
  if (history?.entries.length) {
    return history.entries.slice(0, 8).map(createWebhookHistoryRow);
  }

  return report?.rows.slice(0, 8).map(createWebhookSourceRow) ?? [];
}

function createIncidentRow(incident: ProjectIncident): ReleaseControlRoomTimelineRow {
  const status = incidentStatus(incident.severity);

  return {
    detail: incident.message,
    evidence: incident.details.slice(0, 3).join(" | ") || `${incident.count} ${incident.kind}`,
    href: "#project-incidents",
    id: `incident:${incident.id}`,
    kind: "incident",
    nextAction: incident.actionLabel,
    occurredAt: incident.occurredAt ?? new Date(0).toISOString(),
    ownerEmail: null,
    ownerName: "Incident owner",
    projectName: incident.projectName,
    severity: severityForStatus(status),
    sourceLabel: incident.source,
    status,
    title: incident.title,
  };
}

function createRunbookRecordRow(record: WorkspaceReleaseRunbookRecord): ReleaseControlRoomTimelineRow {
  const status = runbookStatus(record.status);

  return {
    detail: record.detail,
    evidence: record.checklistEvidence.slice(0, 2).join(" | ") || `${record.blockerCount} blockers`,
    href: record.auditLogHref,
    id: `runbook:${record.sourceKey}`,
    kind: "runbook",
    nextAction: record.checklistEvidence[0] ?? record.detail,
    occurredAt: record.completedAt ?? record.dueAt,
    ownerEmail: record.ownerEmail,
    ownerName: record.ownerName,
    projectName: record.projectName,
    severity: severityForStatus(status),
    sourceLabel: "Release runbook",
    status,
    title: record.title,
  };
}

function createRunbookTransitionRows(record: WorkspaceReleaseRunbookRecord): ReleaseControlRoomTimelineRow[] {
  return record.transitionHistory.slice(-3).map((transition) => {
    const status = runbookStatus(transition.toStatus);

    return {
      detail: transition.note ?? `${record.title} moved from ${transition.fromStatus} to ${transition.toStatus}.`,
      evidence: `${transition.actorName} changed ${record.title} to ${transition.toStatus}.`,
      href: record.auditLogHref,
      id: `runbook-transition:${record.sourceKey}:${transition.id}`,
      kind: "runbook",
      nextAction: transition.toStatus === "complete" ? "Keep transition evidence attached to the release packet." : record.checklistEvidence[0] ?? record.detail,
      occurredAt: transition.at,
      ownerEmail: record.ownerEmail,
      ownerName: record.ownerName,
      projectName: record.projectName,
      severity: severityForStatus(status),
      sourceLabel: "Runbook transition",
      status,
      title: `${record.title} ${transition.toStatus}`,
    };
  });
}

function createRunbookRows(report: WorkspaceReleaseRunbookReport) {
  return report.records.flatMap((record) => [createRunbookRecordRow(record), ...createRunbookTransitionRows(record)]);
}

function createOwnerActionRow(row: ExecutiveActionOwnershipRow): ReleaseControlRoomTimelineRow {
  const status = ownerStatus(row.status);

  return {
    detail: row.detail,
    evidence: row.evidenceLinks.map((link) => `${link.label}: ${link.href}`).join(" | ") || row.signalLabel,
    href: row.evidenceLinks[0]?.href ?? null,
    id: `owner-action:${row.id}`,
    kind: "owner-action",
    nextAction: row.action,
    occurredAt: row.dueAt,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    projectName: row.projectName,
    severity: severityForStatus(status),
    sourceLabel: "Executive action ownership",
    status,
    title: row.signalLabel,
  };
}

function createOwnerActionRows(matrix: ExecutiveActionOwnershipMatrix | null) {
  return matrix?.rows.slice(0, 12).map(createOwnerActionRow) ?? [];
}

function sortRows(first: ReleaseControlRoomTimelineRow, second: ReleaseControlRoomTimelineRow) {
  return (
    statusRank[first.status] - statusRank[second.status] ||
    toTime(second.occurredAt) - toTime(first.occurredAt) ||
    kindRank[first.kind] - kindRank[second.kind] ||
    first.title.localeCompare(second.title)
  );
}

function createCsv(rows: ReleaseControlRoomTimelineRow[]) {
  const header = ["kind", "status", "occurred_at", "title", "owner", "project", "next_action", "evidence"];
  const body = rows.map((row) =>
    [row.kind, row.status, row.occurredAt, row.title, row.ownerName ?? "", row.projectName ?? "", row.nextAction, row.evidence]
      .map((value) => escapeCsvValue(value === "" ? null : value))
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: ReleaseControlRoomTimelineRow[]): ReleaseControlRoomTimelineReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: ReleaseControlRoomTimelineStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    latestAt: latestIso(rows.map((row) => row.occurredAt)),
    nextAction: nextRow?.nextAction ?? "Control-room timeline has no active release updates yet.",
    ownerCount: new Set(rows.flatMap((row) => (row.ownerEmail ? [row.ownerEmail] : row.ownerName ? [row.ownerName] : []))).size,
    readyCount,
    sourceCount: new Set(rows.map((row) => row.kind)).size,
    status,
    totalCount: rows.length,
    watchCount,
  };
}

export function createReleaseControlRoomTimeline(input: CreateReleaseControlRoomTimelineInput): ReleaseControlRoomTimelineReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    ...createDeployRows(input.postDeploySummary, generatedAt),
    ...createWebhookRows(input.releaseReadinessWebhookHistory, input.releaseReadinessWebhooks),
    ...input.incidentHistory.incidents.slice(0, 12).map(createIncidentRow),
    ...createRunbookRows(input.releaseRunbook),
    ...createOwnerActionRows(input.executiveActionOwnership),
  ].sort(sortRows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId ?? "workspace")}-release-control-room-timeline.csv`,
    generatedAt,
    rows,
    summary: summarize(rows),
  };
}
