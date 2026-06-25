import type { ProjectAppPackageCertificateReport, ProjectAppPackageCertificateStatus } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionJobRecord, ProjectCadConversionJobStatus, ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectIncident, ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type {
  ProjectPublicSurfaceHealthReport,
  ProjectPublicSurfaceHealthSnapshot,
  ProjectPublicSurfaceHealthSurface,
} from "@/features/projects/public-surface-health";

export type ProjectRegressionWatchlistSource = "cad-conversion" | "incident" | "public-surface" | "signing";
export type ProjectRegressionWatchlistSeverity = "critical" | "high" | "low" | "medium";
export type ProjectRegressionWatchlistTrend = "active" | "recurring" | "watch";
export type ProjectRegressionWatchlistFormat = "csv" | "json";
export type ProjectRegressionWatchlistTriageStatus = "open" | "resolved" | "snoozed" | "watching";

export interface ProjectRegressionWatchlistItemTriageState {
  itemId: string;
  note: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  projectId: string;
  snoozedUntil: string | null;
  status: ProjectRegressionWatchlistTriageStatus;
  title: string;
  updatedAt: string;
}

export interface ProjectRegressionWatchlistItem {
  detail: string;
  evidence: string[];
  evidenceCount: number;
  id: string;
  lastSeenAt: string | null;
  nextAction: string;
  projectId: string;
  projectName: string;
  severity: ProjectRegressionWatchlistSeverity;
  source: ProjectRegressionWatchlistSource;
  title: string;
  trend: ProjectRegressionWatchlistTrend;
}

export interface ProjectRegressionWatchlistReport {
  generatedAt: string;
  items: ProjectRegressionWatchlistItem[];
  summary: {
    activeCount: number;
    affectedProjectCount: number;
    cadConversionCount: number;
    criticalCount: number;
    highCount: number;
    incidentCount: number;
    latestSeenAt: string | null;
    lowCount: number;
    mediumCount: number;
    publicSurfaceCount: number;
    recurringCount: number;
    signingCount: number;
    totalCount: number;
    watchCount: number;
  };
}

export interface ProjectRegressionWatchlistTriageSummary {
  openCount: number;
  resolvedCount: number;
  snoozedCount: number;
  watchingCount: number;
}

export interface CreateProjectRegressionWatchlistInput {
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  certificateReport: ProjectAppPackageCertificateReport;
  generatedAt?: string;
  incidentHistory: ProjectIncidentHistory;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
}

const severityRank: Record<ProjectRegressionWatchlistSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const trendRank: Record<ProjectRegressionWatchlistTrend, number> = {
  recurring: 0,
  active: 1,
  watch: 2,
};

const surfaceLabels: Record<ProjectPublicSurfaceHealthSurface, string> = {
  "api-payload": "API payload",
  "app-package": "App package",
  embed: "Embed",
  "public-viewer": "Public viewer",
};

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function latestIso(values: Array<string | null | undefined>) {
  const latest = Math.max(0, ...values.map(toTime));

  return latest > 0 ? new Date(latest).toISOString() : null;
}

function stableKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Map<string, T[]>>((groups, item) => {
    const key = getKey(item);
    const group = groups.get(key) ?? [];

    group.push(item);
    groups.set(key, group);

    return groups;
  }, new Map());
}

function compactEvidence(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 4);
}

function sourceCounts(items: ProjectRegressionWatchlistItem[]) {
  return {
    cadConversionCount: items.filter((item) => item.source === "cad-conversion").length,
    incidentCount: items.filter((item) => item.source === "incident").length,
    publicSurfaceCount: items.filter((item) => item.source === "public-surface").length,
    signingCount: items.filter((item) => item.source === "signing").length,
  };
}

function severityCounts(items: ProjectRegressionWatchlistItem[]) {
  return {
    criticalCount: items.filter((item) => item.severity === "critical").length,
    highCount: items.filter((item) => item.severity === "high").length,
    lowCount: items.filter((item) => item.severity === "low").length,
    mediumCount: items.filter((item) => item.severity === "medium").length,
  };
}

function summarizeItems(items: ProjectRegressionWatchlistItem[]): ProjectRegressionWatchlistReport["summary"] {
  return {
    activeCount: items.filter((item) => item.trend === "active").length,
    affectedProjectCount: new Set(items.map((item) => item.projectId)).size,
    ...sourceCounts(items),
    ...severityCounts(items),
    latestSeenAt: latestIso(items.map((item) => item.lastSeenAt)),
    recurringCount: items.filter((item) => item.trend === "recurring").length,
    totalCount: items.length,
    watchCount: items.filter((item) => item.trend === "watch").length,
  };
}

function createPublicSurfaceItems(report: ProjectPublicSurfaceHealthReport): ProjectRegressionWatchlistItem[] {
  const actionableSnapshots = report.snapshots.filter((snapshot) => snapshot.status !== "pass" || (snapshot.screenshotDiffScore ?? 0) > 0);
  const groups = groupBy(actionableSnapshots, (snapshot) => `${snapshot.projectId}:${snapshot.surface}:${snapshot.path ?? snapshot.url ?? snapshot.sourceKey}`);

  return [...groups.entries()].map(([key, snapshots]) => {
    const first = snapshots[0];
    const failCount = snapshots.filter((snapshot) => snapshot.status === "fail").length;
    const warnCount = snapshots.filter((snapshot) => snapshot.status === "warn").length;
    const diffCount = snapshots.filter((snapshot) => (snapshot.screenshotDiffScore ?? 0) > 0).length;
    const batchCount = new Set(snapshots.map((snapshot) => snapshot.batchId)).size;
    const lastSeenAt = latestIso(snapshots.map((snapshot) => snapshot.checkedAt));

    return {
      detail: `${failCount} failing, ${warnCount} warning, and ${diffCount} visual-diff snapshot${snapshots.length === 1 ? "" : "s"} across ${batchCount} batch${batchCount === 1 ? "" : "es"}.`,
      evidence: compactEvidence(
        snapshots.flatMap((snapshot) => [
          ...snapshot.issues,
          snapshot.screenshotDiffSummary ?? "",
          snapshot.statusCode ? `${snapshot.statusCode} response from ${snapshot.url ?? snapshot.path ?? snapshot.label}` : "",
        ]),
      ),
      evidenceCount: snapshots.length,
      id: `public-surface:${stableKey(key)}`,
      lastSeenAt,
      nextAction: failCount > 0 ? "Re-run public smoke and fix the blocked route or artifact lineage before promotion." : "Capture a fresh baseline and review visual drift before handoff.",
      projectId: first.projectId,
      projectName: first.projectName,
      severity: failCount > 0 ? "high" : "medium",
      source: "public-surface",
      title: `${surfaceLabels[first.surface]} regression on ${first.label}`,
      trend: snapshots.length > 1 || batchCount > 1 ? "recurring" : "active",
    };
  });
}

function failedCadStatus(status: ProjectCadConversionJobStatus) {
  return status === "failed" || status === "retryable-failed";
}

function cadSeverity(jobs: ProjectCadConversionJobRecord[]): ProjectRegressionWatchlistSeverity {
  if (jobs.some((job) => job.status === "failed" && job.attempts >= job.maxAttempts)) {
    return "critical";
  }

  return jobs.some((job) => job.status === "failed") ? "high" : "medium";
}

function createCadConversionItems(report: ProjectCadConversionQueueReport): ProjectRegressionWatchlistItem[] {
  const failedJobs = report.jobs.filter((job) => failedCadStatus(job.status));
  const groups = groupBy(failedJobs, (job) => `${job.projectId}:${job.adapterId}:${job.target}:${job.sourceFileName}`);

  return [...groups.entries()].map(([key, jobs]) => {
    const first = jobs[0];
    const failedCount = jobs.filter((job) => job.status === "failed").length;
    const retryableCount = jobs.filter((job) => job.status === "retryable-failed").length;
    const totalAttempts = jobs.reduce((sum, job) => sum + job.attempts, 0);

    return {
      detail: `${failedCount} failed and ${retryableCount} retryable CAD worker job${jobs.length === 1 ? "" : "s"} with ${totalAttempts} total attempt${totalAttempts === 1 ? "" : "s"}.`,
      evidence: compactEvidence(jobs.flatMap((job) => [job.errorMessage ?? "", ...job.logs.map((log) => log.message)])),
      evidenceCount: jobs.length,
      id: `cad-conversion:${stableKey(key)}`,
      lastSeenAt: latestIso(jobs.map((job) => job.updatedAt)),
      nextAction: "Inspect converter logs, source diagnostics, and worker availability before accepting CAD output.",
      projectId: first.projectId,
      projectName: first.projectName,
      severity: cadSeverity(jobs),
      source: "cad-conversion",
      title: `${first.adapterId.toUpperCase()} ${first.target.toUpperCase()} conversion failure`,
      trend: jobs.length > 1 || jobs.some((job) => job.attempts > 1) ? "recurring" : "active",
    };
  });
}

function signingSeverity(status: ProjectAppPackageCertificateStatus): ProjectRegressionWatchlistSeverity {
  if (status === "expired" || status === "revoked") {
    return "critical";
  }

  if (status === "mismatch" || status === "missing") {
    return "high";
  }

  return status === "expiring" ? "medium" : "low";
}

function createSigningItems(report: ProjectAppPackageCertificateReport): ProjectRegressionWatchlistItem[] {
  const actionableRows = report.rows.filter((row) => row.status !== "valid");
  const groups = groupBy(actionableRows, (row) => `${row.projectId}:${row.presetId}:${row.platform}:${row.status}`);

  return [...groups.entries()].map(([key, rows]) => {
    const first = rows[0];
    const strongestSeverity = rows.map((row) => signingSeverity(row.status)).sort((firstSeverity, secondSeverity) => severityRank[firstSeverity] - severityRank[secondSeverity])[0];

    return {
      detail: `${rows.length} ${first.platform} signing requirement${rows.length === 1 ? "" : "s"} for ${first.presetLabel} ${rows.length === 1 ? "is" : "are"} ${first.status}.`,
      evidence: compactEvidence(rows.map((row) => row.issue ?? `${row.label} is ${row.status}.`)),
      evidenceCount: rows.length,
      id: `signing:${stableKey(key)}`,
      lastSeenAt: latestIso(rows.map((row) => row.expiresAt ?? report.generatedAt)),
      nextAction: first.status === "expiring" ? "Refresh the certificate before the release window reaches the expiry date." : "Ingest matching certificate evidence before signing or promoting packages.",
      projectId: first.projectId,
      projectName: first.projectName,
      severity: strongestSeverity,
      source: "signing",
      title: `${first.presetLabel} ${first.platform} signing ${first.status}`,
      trend: first.status === "expiring" ? "watch" : rows.length > 1 ? "recurring" : "active",
    };
  });
}

function incidentSeverity(incidents: ProjectIncident[]): ProjectRegressionWatchlistSeverity {
  if (incidents.some((incident) => incident.severity === "critical")) {
    return "critical";
  }

  return "medium";
}

function createIncidentItems(history: ProjectIncidentHistory): ProjectRegressionWatchlistItem[] {
  const groups = groupBy(history.incidents, (incident) => `${incident.projectId}:${incident.kind}:${incident.source}:${incident.title}`);

  return [...groups.entries()].map(([key, incidents]) => {
    const first = incidents[0];
    const incidentCount = incidents.reduce((sum, incident) => sum + incident.count, 0);

    return {
      detail: `${incidents.length} incident row${incidents.length === 1 ? "" : "s"} with ${incidentCount} affected check${incidentCount === 1 ? "" : "s"} in ${first.source}.`,
      evidence: compactEvidence(incidents.flatMap((incident) => [incident.message, ...incident.details])),
      evidenceCount: incidents.length,
      id: `incident:${stableKey(key)}`,
      lastSeenAt: latestIso(incidents.map((incident) => incident.occurredAt)),
      nextAction: first.actionLabel,
      projectId: first.projectId,
      projectName: first.projectName,
      severity: incidentSeverity(incidents),
      source: "incident",
      title: first.title,
      trend: incidents.length > 1 || incidentCount > 1 ? "recurring" : "active",
    };
  });
}

function sortItems(items: ProjectRegressionWatchlistItem[]) {
  return [...items].sort(
    (first, second) =>
      severityRank[first.severity] - severityRank[second.severity] ||
      trendRank[first.trend] - trendRank[second.trend] ||
      toTime(second.lastSeenAt) - toTime(first.lastSeenAt) ||
      first.projectName.localeCompare(second.projectName) ||
      first.title.localeCompare(second.title),
  );
}

function csvEscape(value: boolean | number | string | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createDateStamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "current";
  }

  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function summarizeProjectRegressionWatchlistTriage(states: ProjectRegressionWatchlistItemTriageState[]): ProjectRegressionWatchlistTriageSummary {
  return {
    openCount: states.filter((state) => state.status === "open").length,
    resolvedCount: states.filter((state) => state.status === "resolved").length,
    snoozedCount: states.filter((state) => state.status === "snoozed").length,
    watchingCount: states.filter((state) => state.status === "watching").length,
  };
}

export function filterActiveProjectRegressionWatchlistItems(input: {
  items: ProjectRegressionWatchlistItem[];
  now?: Date;
  states: ProjectRegressionWatchlistItemTriageState[];
}) {
  const now = input.now ?? new Date();
  const stateByItemId = new Map(input.states.map((state) => [state.itemId, state]));

  return input.items.filter((item) => {
    const state = stateByItemId.get(item.id);

    if (!state) {
      return true;
    }

    if (state.status === "resolved") {
      return false;
    }

    if (state.status !== "snoozed" || !state.snoozedUntil) {
      return true;
    }

    const snoozedUntil = new Date(state.snoozedUntil).getTime();

    return Number.isNaN(snoozedUntil) || snoozedUntil <= now.getTime();
  });
}

export function createProjectRegressionWatchlistJson(report: ProjectRegressionWatchlistReport) {
  return JSON.stringify(report, null, 2);
}

export function createProjectRegressionWatchlistCsv(report: ProjectRegressionWatchlistReport, states: ProjectRegressionWatchlistItemTriageState[] = []) {
  const stateByItemId = new Map(states.map((state) => [state.itemId, state]));
  const headers = [
    "itemId",
    "projectName",
    "projectId",
    "source",
    "severity",
    "trend",
    "title",
    "evidenceCount",
    "lastSeenAt",
    "triageStatus",
    "owner",
    "snoozedUntil",
    "nextAction",
    "detail",
    "evidence",
  ];
  const rows = report.items.map((item) => {
    const state = stateByItemId.get(item.id);

    return [
      item.id,
      item.projectName,
      item.projectId,
      item.source,
      item.severity,
      item.trend,
      item.title,
      item.evidenceCount,
      item.lastSeenAt,
      state?.status ?? "open",
      state?.ownerName ?? state?.ownerEmail ?? "",
      state?.snoozedUntil ?? "",
      item.nextAction,
      item.detail,
      item.evidence.join(" | "),
    ].map(csvEscape);
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function createProjectRegressionWatchlistExportBody(report: ProjectRegressionWatchlistReport, format: ProjectRegressionWatchlistFormat) {
  return format === "json" ? createProjectRegressionWatchlistJson(report) : createProjectRegressionWatchlistCsv(report);
}

export function createProjectRegressionWatchlistFileName(report: ProjectRegressionWatchlistReport, format: ProjectRegressionWatchlistFormat) {
  return `regression-watchlist-${createDateStamp(report.generatedAt)}.${format}`;
}

export function isProjectRegressionWatchlistReport(value: unknown): value is ProjectRegressionWatchlistReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<ProjectRegressionWatchlistReport>;

  return (
    typeof report.generatedAt === "string" &&
    Array.isArray(report.items) &&
    !!report.summary &&
    typeof report.summary.totalCount === "number" &&
    report.items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.projectId === "string" &&
        typeof item.projectName === "string" &&
        typeof item.title === "string" &&
        (item.source === "cad-conversion" || item.source === "incident" || item.source === "public-surface" || item.source === "signing"),
    )
  );
}

export function createProjectRegressionWatchlist(input: CreateProjectRegressionWatchlistInput): ProjectRegressionWatchlistReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const items = sortItems([
    ...createPublicSurfaceItems(input.publicSurfaceHealthReport),
    ...createCadConversionItems(input.cadConversionQueueReport),
    ...createSigningItems(input.certificateReport),
    ...createIncidentItems(input.incidentHistory),
  ]);

  return {
    generatedAt,
    items,
    summary: summarizeItems(items),
  };
}
