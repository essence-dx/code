import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { ReleaseReadinessWebhookHistoryReport, ReleaseReadinessWebhookProviderRetryEvidence } from "@/features/projects/release-readiness-webhook-history";
import type { ReleaseReadinessWebhookProvider, ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";
import type { WorkspaceSloDashboard, WorkspaceSloService, WorkspaceSloStatus } from "@/features/projects/workspace-slo-dashboard";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

export type OperationalAnomalySource = "cad-workers" | "collaboration-runtime" | "correlation" | "email-delivery" | "public-surfaces" | "webhook-delivery";
export type OperationalAnomalySeverity = "critical" | "info" | "warning";
export type OperationalAnomalyStatus = "blocked" | "ready" | "watch";

export interface OperationalAnomalyRow {
  affectedCount: number;
  confidence: number;
  detail: string;
  evidence: string;
  id: string;
  label: string;
  nextAction: string;
  observedAt: string | null;
  severity: OperationalAnomalySeverity;
  signals: string[];
  source: OperationalAnomalySource;
}

export interface OperationalAnomalyDetectionReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: OperationalAnomalyRow[];
  summary: {
    anomalyScore: number;
    correlatedCount: number;
    criticalCount: number;
    infoCount: number;
    sourceCoverage: OperationalAnomalySource[];
    status: OperationalAnomalyStatus;
    topSource: OperationalAnomalySource | null;
    totalCount: number;
    warningCount: number;
  };
}

export interface CreateOperationalAnomalyDetectionReportInput {
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport;
  generatedAt?: string;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
  releaseReadinessWebhookHistory?: ReleaseReadinessWebhookHistoryReport | null;
  releaseReadinessWebhooks: ReleaseReadinessWebhookReport | null;
  workspaceId?: string;
  workspaceSloDashboard: WorkspaceSloDashboard;
}

const severityRank: Record<OperationalAnomalySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const sourceLabel: Record<OperationalAnomalySource, string> = {
  "cad-workers": "CAD workers",
  "collaboration-runtime": "Collaboration runtime",
  correlation: "Correlated operations",
  "email-delivery": "Email delivery",
  "public-surfaces": "Public surfaces",
  "webhook-delivery": "Webhook delivery",
};

function countLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function newestIso(values: Array<string | null | undefined>) {
  const newest = Math.max(
    ...values.map((value) => {
      if (!value) {
        return 0;
      }

      const time = new Date(value).getTime();

      return Number.isNaN(time) ? 0 : time;
    }),
    0,
  );

  return newest > 0 ? new Date(newest).toISOString() : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function sloSeverity(status: WorkspaceSloStatus): OperationalAnomalySeverity {
  return status === "breach" ? "critical" : status === "healthy" ? "info" : "warning";
}

function workspaceSloSource(service: WorkspaceSloService): Exclude<OperationalAnomalySource, "correlation" | "webhook-delivery"> {
  return service;
}

function row(input: OperationalAnomalyRow): OperationalAnomalyRow {
  return {
    ...input,
    affectedCount: Math.max(0, input.affectedCount),
    confidence: clamp(input.confidence),
    signals: [...new Set(input.signals.filter(Boolean))],
  };
}

function createCollaborationRows(dashboard: WorkspaceSloDashboard): OperationalAnomalyRow[] {
  return dashboard.rows
    .filter((sloRow) => sloRow.id === "collaboration-runtime" && sloRow.status !== "healthy")
    .map((sloRow) =>
      row({
        affectedCount: sloRow.failingCount + sloRow.pendingCount,
        confidence: sloRow.status === "breach" ? 92 : 74,
        detail: sloRow.detail,
        evidence: `${sloRow.label}: ${sloRow.observedPct ?? "no"}% observed against ${sloRow.targetPct}% target with ${countLabel(sloRow.failingCount, "failure")} and ${countLabel(sloRow.pendingCount, "pending signal")}.`,
        id: `collaboration-runtime:slo-${sloRow.status}`,
        label: `${sloRow.label} ${sloRow.status}`,
        nextAction: sloRow.nextAction,
        observedAt: sloRow.lastObservedAt,
        severity: sloSeverity(sloRow.status),
        signals: ["workspace-slo", sloRow.status, sloRow.id],
        source: workspaceSloSource(sloRow.id),
      }),
    );
}

function createWebhookRows(report: ReleaseReadinessWebhookReport | null): OperationalAnomalyRow[] {
  if (!report) {
    return [
      row({
        affectedCount: 1,
        confidence: 55,
        detail: "Webhook readiness could not be calculated for this dashboard load.",
        evidence: "Release readiness webhook report is missing.",
        id: "webhook-delivery:missing-report",
        label: "Webhook report missing",
        nextAction: "Refresh webhook readiness sources before release automation depends on provider callbacks.",
        observedAt: null,
        severity: "warning",
        signals: ["missing-report"],
        source: "webhook-delivery",
      }),
    ];
  }

  const eventRows = report.rows
    .filter((entry) => entry.status !== "ready" || entry.signatureState === "missing" || entry.signatureState === "untrusted")
    .map((entry) =>
      row({
        affectedCount: 1,
        confidence: entry.status === "blocked" ? 90 : 72,
        detail: entry.evidence,
        evidence: `${entry.provider} ${entry.eventType} is ${entry.status}; signature ${entry.signatureState}.`,
        id: `webhook-delivery:${entry.provider}:${entry.dedupeKey}`,
        label: `${entry.provider} webhook ${entry.status}`,
        nextAction: entry.nextAction,
        observedAt: entry.receivedAt,
        severity: entry.status === "blocked" || entry.signatureState === "untrusted" ? "critical" : "warning",
        signals: ["webhook-row", entry.provider, entry.status, entry.signatureState],
        source: "webhook-delivery",
      }),
    );

  if (report.summary.missingProviderCount > 0) {
    eventRows.push(
      row({
        affectedCount: report.summary.missingProviderCount,
        confidence: 68,
        detail: "One or more provider event streams are not represented in the release readiness webhook report.",
        evidence: `${countLabel(report.summary.missingProviderCount, "provider")} missing from webhook coverage.`,
        id: "webhook-delivery:missing-provider-coverage",
        label: "Webhook provider coverage gap",
        nextAction: "Trigger fresh Vercel, Turso, Brevo, and desktop updater webhook evidence before release.",
        observedAt: report.generatedAt,
        severity: "warning",
        signals: ["webhook-coverage", "missing-provider"],
        source: "webhook-delivery",
      }),
    );
  }

  return eventRows;
}

function providerRetryRow(provider: ReleaseReadinessWebhookProvider, evidence: ReleaseReadinessWebhookProviderRetryEvidence): OperationalAnomalyRow | null {
  const affectedCount = evidence.retryingCount + evidence.exhaustedRetryCount + evidence.replayRejectedCount;

  if (affectedCount <= 0) {
    return null;
  }

  return row({
    affectedCount,
    confidence: evidence.exhaustedRetryCount > 0 ? 88 : 70,
    detail: `${provider} has ${countLabel(evidence.retryingCount, "retrying delivery")}, ${countLabel(evidence.exhaustedRetryCount, "exhausted delivery")}, and ${countLabel(evidence.replayRejectedCount, "replay rejection")}.`,
    evidence: `${provider} latest webhook received ${evidence.latestReceivedAt ?? "never"} across ${countLabel(evidence.totalCount, "record")}.`,
    id: `webhook-delivery:retry-evidence:${provider}`,
    label: `${provider} webhook retry evidence`,
    nextAction: evidence.exhaustedRetryCount > 0 ? "Resolve exhausted webhook retries and preserve failed provider evidence." : "Let retrying webhook deliveries settle or manually retry the provider event.",
    observedAt: evidence.latestReceivedAt,
    severity: evidence.exhaustedRetryCount > 0 ? "critical" : "warning",
    signals: ["webhook-history", provider, "retry-evidence"],
    source: "webhook-delivery",
  });
}

function createWebhookHistoryRows(report: ReleaseReadinessWebhookHistoryReport | null | undefined): OperationalAnomalyRow[] {
  if (!report) {
    return [];
  }

  const providerRows = Object.entries(report.summary.providerRetryEvidence)
    .map(([provider, evidence]) => providerRetryRow(provider as ReleaseReadinessWebhookProvider, evidence))
    .filter((entry): entry is OperationalAnomalyRow => Boolean(entry));

  if (report.summary.retryingCount + report.summary.exhaustedRetryCount + report.summary.replayRejectedCount <= 0) {
    return providerRows;
  }

  return [
    row({
      affectedCount: report.summary.retryingCount + report.summary.exhaustedRetryCount + report.summary.replayRejectedCount,
      confidence: report.summary.exhaustedRetryCount > 0 ? 91 : 73,
      detail: `${countLabel(report.summary.retryingCount, "delivery")} retrying, ${countLabel(report.summary.exhaustedRetryCount, "delivery")} exhausted, ${countLabel(report.summary.replayRejectedCount, "replay")} rejected.`,
      evidence: `Webhook history readiness is ${report.summary.readinessStatus} across ${countLabel(report.summary.totalCount, "event")}.`,
      id: "webhook-delivery:retry-evidence",
      label: "Webhook retry anomaly",
      nextAction: "Inspect provider retry evidence before trusting release automation callbacks.",
      observedAt: report.generatedAt,
      severity: report.summary.exhaustedRetryCount > 0 ? "critical" : "warning",
      signals: ["webhook-history", report.summary.readinessStatus],
      source: "webhook-delivery",
    }),
    ...providerRows,
  ];
}

function createEmailRows(report: WorkspaceNotificationEmailDeliveryReport): OperationalAnomalyRow[] {
  const rows: OperationalAnomalyRow[] = [];
  const failedJobs = report.jobs.filter((job) => job.status === "failed");
  const pendingJobs = report.jobs.filter((job) => job.status === "pending");
  const failedRecipients = new Set(failedJobs.map((job) => job.recipientEmail));
  const lastFailedAt = newestIso(failedJobs.map((job) => job.updatedAt));

  if (report.summary.failedCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.failedCount,
        confidence: 90,
        detail: `${countLabel(report.summary.failedCount, "email job")} failed across ${countLabel(failedRecipients.size || report.summary.failedCount, "recipient")}.`,
        evidence: failedJobs[0]?.lastError ?? "Email delivery summary reports failed jobs.",
        id: "email-delivery:failed-jobs",
        label: "Email delivery failures",
        nextAction: "Retry failed workspace email jobs and inspect Brevo provider errors before relying on notifications.",
        observedAt: lastFailedAt ?? report.generatedAt,
        severity: "critical",
        signals: ["email-summary", "failed"],
        source: "email-delivery",
      }),
    );
  }

  if (report.summary.pendingCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.pendingCount,
        confidence: pendingJobs.length > 0 ? 72 : 62,
        detail: `${countLabel(report.summary.pendingCount, "email job")} waiting for delivery.`,
        evidence: pendingJobs[0]?.nextAttemptAt ? `Next retry is scheduled for ${pendingJobs[0].nextAttemptAt}.` : "Pending email jobs are still queued.",
        id: "email-delivery:pending-backlog",
        label: "Email delivery backlog",
        nextAction: "Drain pending workspace email jobs before release and review notifications depend on them.",
        observedAt: newestIso(pendingJobs.map((job) => job.updatedAt)) ?? report.generatedAt,
        severity: report.summary.failedCount > 0 ? "warning" : "info",
        signals: ["email-summary", "pending"],
        source: "email-delivery",
      }),
    );
  }

  return rows;
}

function createCadRows(report: ProjectCadConversionQueueReport): OperationalAnomalyRow[] {
  const rows: OperationalAnomalyRow[] = [];

  if (report.summary.failedCount + report.summary.retryableCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.failedCount + report.summary.retryableCount,
        confidence: report.summary.failedCount > 0 ? 88 : 76,
        detail: `${countLabel(report.summary.failedCount, "CAD job")} failed and ${countLabel(report.summary.retryableCount, "CAD job")} retryable.`,
        evidence: `${countLabel(report.summary.succeededCount, "job")} succeeded out of ${countLabel(report.summary.totalCount, "job")}.`,
        id: "cad-workers:failed-jobs",
        label: "CAD worker failures",
        nextAction: "Inspect worker logs, retry retryable failures, and route conversions to a healthy adapter.",
        observedAt: newestIso(report.jobs.map((job) => job.updatedAt)) ?? report.generatedAt,
        severity: report.summary.failedCount > 0 ? "critical" : "warning",
        signals: ["cad-summary", "failed", "retryable"],
        source: "cad-workers",
      }),
    );
  }

  if (report.summary.queuedCount + report.summary.runningCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.queuedCount + report.summary.runningCount,
        confidence: 64,
        detail: `${countLabel(report.summary.queuedCount, "CAD job")} queued and ${countLabel(report.summary.runningCount, "CAD job")} running.`,
        evidence: "CAD worker queue still has active conversion work.",
        id: "cad-workers:active-backlog",
        label: "CAD worker backlog",
        nextAction: "Drain active CAD conversion jobs before release evidence is frozen.",
        observedAt: newestIso(report.jobs.map((job) => job.updatedAt)) ?? report.generatedAt,
        severity: report.summary.failedCount + report.summary.retryableCount > 0 ? "warning" : "info",
        signals: ["cad-summary", "active-backlog"],
        source: "cad-workers",
      }),
    );
  }

  return rows;
}

function createPublicSurfaceRows(report: ProjectPublicSurfaceHealthReport): OperationalAnomalyRow[] {
  const rows: OperationalAnomalyRow[] = [];
  const failed = report.snapshots.filter((snapshot) => snapshot.status === "fail");
  const warnings = report.snapshots.filter((snapshot) => snapshot.status === "warn");
  const screenshotPending = report.snapshots.filter((snapshot) => snapshot.screenshotState === "pending" || snapshot.screenshotState === "unavailable");

  if (report.summary.failCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.failCount,
        confidence: 91,
        detail: `${countLabel(report.summary.failCount, "public surface")} failed health checks.`,
        evidence: failed[0]?.issues.join(" ") || "Public surface summary reports failed checks.",
        id: "public-surfaces:failed-checks",
        label: "Public surface failures",
        nextAction: "Resolve failed viewer, embed, API, or app-package public checks before launch.",
        observedAt: newestIso(failed.map((snapshot) => snapshot.checkedAt)) ?? report.generatedAt,
        severity: "critical",
        signals: ["public-health", "failed"],
        source: "public-surfaces",
      }),
    );
  }

  if (report.summary.warnCount > 0) {
    rows.push(
      row({
        affectedCount: report.summary.warnCount,
        confidence: 74,
        detail: `${countLabel(report.summary.warnCount, "public surface")} returned warning status.`,
        evidence: warnings[0]?.issues.join(" ") || "Public surface summary reports warnings.",
        id: "public-surfaces:warning-checks",
        label: "Public surface warnings",
        nextAction: "Review warning public-surface checks and refresh health snapshots after remediation.",
        observedAt: newestIso(warnings.map((snapshot) => snapshot.checkedAt)) ?? report.generatedAt,
        severity: "warning",
        signals: ["public-health", "warning"],
        source: "public-surfaces",
      }),
    );
  }

  if (report.summary.screenshotPendingCount > 0 || screenshotPending.length > 0) {
    rows.push(
      row({
        affectedCount: Math.max(report.summary.screenshotPendingCount, screenshotPending.length),
        confidence: 58,
        detail: `${countLabel(Math.max(report.summary.screenshotPendingCount, screenshotPending.length), "public screenshot")} missing or pending.`,
        evidence: screenshotPending[0]?.label ? `${screenshotPending[0].label} screenshot is ${screenshotPending[0].screenshotState}.` : "Public screenshot capture has pending work.",
        id: "public-surfaces:screenshot-pending",
        label: "Public screenshot evidence gap",
        nextAction: "Capture or attach public-surface screenshots so visual health evidence is reviewer-ready.",
        observedAt: newestIso(screenshotPending.map((snapshot) => snapshot.checkedAt)) ?? report.generatedAt,
        severity: report.summary.failCount > 0 ? "warning" : "info",
        signals: ["public-health", "screenshot"],
        source: "public-surfaces",
      }),
    );
  }

  return rows;
}

function hasBrevoWebhookAnomaly(report: ReleaseReadinessWebhookReport | null, history: ReleaseReadinessWebhookHistoryReport | null | undefined) {
  const reportSignal = report?.rows.some((entry) => entry.provider === "brevo" && (entry.status !== "ready" || entry.signatureState === "untrusted" || entry.signatureState === "missing")) ?? false;
  const brevoEvidence = history?.summary.providerRetryEvidence.brevo;

  return reportSignal || !!brevoEvidence?.retryingCount || !!brevoEvidence?.exhaustedRetryCount || !!brevoEvidence?.replayRejectedCount;
}

function createCorrelationRows(input: CreateOperationalAnomalyDetectionReportInput): OperationalAnomalyRow[] {
  const rows: OperationalAnomalyRow[] = [];
  const hasEmailDeliveryAnomaly = input.emailDeliveryReport.summary.failedCount + input.emailDeliveryReport.summary.pendingCount > 0;
  const hasWebhookEmailAnomaly = hasBrevoWebhookAnomaly(input.releaseReadinessWebhooks, input.releaseReadinessWebhookHistory);

  if (hasEmailDeliveryAnomaly && hasWebhookEmailAnomaly) {
    rows.push(
      row({
        affectedCount: input.emailDeliveryReport.summary.failedCount + input.emailDeliveryReport.summary.pendingCount,
        confidence: 94,
        detail: "Email delivery failures overlap with Brevo webhook retry, trust, or replay evidence.",
        evidence: `${countLabel(input.emailDeliveryReport.summary.failedCount, "failed email job")} and ${countLabel(input.emailDeliveryReport.summary.pendingCount, "pending email job")} with Brevo webhook anomalies.`,
        id: "correlation:email-webhook-delivery",
        label: "Email and webhook pipeline correlation",
        nextAction: "Treat Brevo email delivery and webhook trust as one incident until both queues and callbacks are healthy.",
        observedAt: newestIso([input.emailDeliveryReport.generatedAt, input.releaseReadinessWebhooks?.generatedAt, input.releaseReadinessWebhookHistory?.generatedAt]),
        severity: input.emailDeliveryReport.summary.failedCount > 0 ? "critical" : "warning",
        signals: ["email-delivery", "webhook-delivery", "brevo"],
        source: "correlation",
      }),
    );
  }

  const appPackageSurfaceIssues = input.publicSurfaceHealthReport.snapshots.filter((snapshot) => snapshot.surface === "app-package" && snapshot.status !== "pass").length;
  const cadWorkerIssues = input.cadConversionQueueReport.summary.failedCount + input.cadConversionQueueReport.summary.retryableCount;

  if (appPackageSurfaceIssues > 0 && cadWorkerIssues > 0) {
    rows.push(
      row({
        affectedCount: appPackageSurfaceIssues + cadWorkerIssues,
        confidence: 79,
        detail: "App-package surface health issues overlap with unresolved CAD conversion worker failures.",
        evidence: `${countLabel(appPackageSurfaceIssues, "app-package surface issue")} and ${countLabel(cadWorkerIssues, "CAD worker issue")}.`,
        id: "correlation:cad-public-artifacts",
        label: "CAD and public artifact correlation",
        nextAction: "Review CAD output readiness before refreshing app-package public health evidence.",
        observedAt: newestIso([input.publicSurfaceHealthReport.generatedAt, input.cadConversionQueueReport.generatedAt]),
        severity: input.cadConversionQueueReport.summary.failedCount > 0 ? "critical" : "warning",
        signals: ["cad-workers", "public-surfaces", "app-package"],
        source: "correlation",
      }),
    );
  }

  return rows;
}

function createCsv(rows: OperationalAnomalyRow[]) {
  const header = ["anomaly_id", "source", "severity", "label", "affected_count", "confidence", "observed_at", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.source, entry.severity, entry.label, entry.affectedCount, entry.confidence, entry.observedAt, entry.nextAction].map(escapeCsvValue).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: OperationalAnomalyRow[]): OperationalAnomalyDetectionReport["summary"] {
  const criticalCount = rows.filter((entry) => entry.severity === "critical").length;
  const warningCount = rows.filter((entry) => entry.severity === "warning").length;
  const infoCount = rows.filter((entry) => entry.severity === "info").length;
  const sourceCoverage = [...new Set(rows.map((entry) => entry.source))].sort((first, second) => sourceLabel[first].localeCompare(sourceLabel[second]));
  const sourceWeights = rows.reduce<Map<OperationalAnomalySource, number>>((weights, entry) => {
    const weight = entry.severity === "critical" ? 5 : entry.severity === "warning" ? 2 : 1;
    weights.set(entry.source, (weights.get(entry.source) ?? 0) + weight);

    return weights;
  }, new Map());
  const topSource =
    [...sourceWeights.entries()].sort((first, second) => second[1] - first[1] || sourceLabel[first[0]].localeCompare(sourceLabel[second[0]]))[0]?.[0] ?? null;
  const penalty = criticalCount * 11 + warningCount * 5 + infoCount * 1 + rows.filter((entry) => entry.source === "correlation").length * 7;

  return {
    anomalyScore: clamp(100 - penalty),
    correlatedCount: rows.filter((entry) => entry.source === "correlation").length,
    criticalCount,
    infoCount,
    sourceCoverage,
    status: criticalCount > 0 ? "blocked" : warningCount > 0 ? "watch" : "ready",
    topSource,
    totalCount: rows.length,
    warningCount,
  };
}

export function createOperationalAnomalyDetectionReport(input: CreateOperationalAnomalyDetectionReportInput): OperationalAnomalyDetectionReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    ...createCollaborationRows(input.workspaceSloDashboard),
    ...createWebhookRows(input.releaseReadinessWebhooks),
    ...createWebhookHistoryRows(input.releaseReadinessWebhookHistory),
    ...createEmailRows(input.emailDeliveryReport),
    ...createCadRows(input.cadConversionQueueReport),
    ...createPublicSurfaceRows(input.publicSurfaceHealthReport),
    ...createCorrelationRows(input),
  ].sort(
    (first, second) =>
      severityRank[first.severity] - severityRank[second.severity] ||
      second.confidence - first.confidence ||
      (second.observedAt ?? "").localeCompare(first.observedAt ?? "") ||
      first.label.localeCompare(second.label),
  );
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeDataUri(csvContent),
    csvFileName: `${input.workspaceId ?? "workspace"}-operational-anomalies.csv`,
    generatedAt,
    rows,
    summary: summarize(rows),
  };
}
