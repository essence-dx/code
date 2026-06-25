import type { BoardReleaseObservabilityAlertRoutingReport } from "@/features/projects/board-release-observability-alert-routing";
import type { BoardReleaseObservabilityEventHealthReport } from "@/features/projects/board-release-observability-event-health";
import type { BoardReleaseObservabilityIncidentNotesReport } from "@/features/projects/board-release-observability-incident-notes";
import type { BoardReleaseObservabilityTrendSnapshotReport } from "@/features/projects/board-release-observability-trend-snapshots";

export type BoardReleaseObservabilityExecutiveDigestStatus = "blocked" | "ready" | "watch";
export type BoardReleaseObservabilityExecutiveDigestKind = "alert-routing" | "closeout" | "event-health" | "incident-notes" | "trend-snapshots";

export interface BoardReleaseObservabilityExecutiveDigestRow {
  detail: string;
  id: string;
  kind: BoardReleaseObservabilityExecutiveDigestKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseObservabilityExecutiveDigestStatus;
  title: string;
}

export interface BoardReleaseObservabilityExecutiveDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseObservabilityExecutiveDigestRow[];
  schemaVersion: 1;
  summary: {
    alertCount: number;
    blockedCount: number;
    closeoutScore: number;
    criticalAlertCount: number;
    digestScore: number;
    incidentCount: number;
    nextAction: string;
    status: BoardReleaseObservabilityExecutiveDigestStatus;
    trendDeclineCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseObservabilityExecutiveDigestInput {
  alertRouting: BoardReleaseObservabilityAlertRoutingReport;
  eventHealth: BoardReleaseObservabilityEventHealthReport;
  generatedAt?: string;
  incidentNotes: BoardReleaseObservabilityIncidentNotesReport;
  trendSnapshots: BoardReleaseObservabilityTrendSnapshotReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseObservabilityExecutiveDigestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<BoardReleaseObservabilityExecutiveDigestKind, number> = {
  "event-health": 0,
  "incident-notes": 1,
  "trend-snapshots": 2,
  "alert-routing": 3,
  closeout: 4,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(contentType: "application/json" | "text/csv", value: string) {
  return `data:${contentType};charset=utf-8,${encodeURIComponent(value)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFromCounts(blocked: number, watch: number): BoardReleaseObservabilityExecutiveDigestStatus {
  if (blocked > 0) {
    return "blocked";
  }

  return watch > 0 ? "watch" : "ready";
}

function rowScore(blocked: number, watch: number, total: number) {
  return clampScore(100 - blocked * 22 - watch * 9 - Math.max(0, total - blocked - watch) * 0);
}

function eventHealthRow(report: BoardReleaseObservabilityEventHealthReport): BoardReleaseObservabilityExecutiveDigestRow {
  return {
    detail: `${report.summary.blockedCount} blocked monitor${report.summary.blockedCount === 1 ? "" : "s"}, ${report.summary.watchCount} watched, ${report.summary.healthyCount} healthy.`,
    id: "event-health",
    kind: "event-health",
    metric: `${report.summary.monitorCount} monitors`,
    nextAction: report.summary.nextAction,
    score: rowScore(report.summary.blockedCount, report.summary.watchCount, report.summary.monitorCount),
    status: report.summary.status === "healthy" ? "ready" : report.summary.status,
    title: "Event health",
  };
}

function incidentNotesRow(report: BoardReleaseObservabilityIncidentNotesReport): BoardReleaseObservabilityExecutiveDigestRow {
  const status: BoardReleaseObservabilityExecutiveDigestStatus = report.summary.status === "closed" ? "ready" : report.summary.status === "open" ? "watch" : report.summary.status;

  return {
    detail: `${report.summary.blockedCount} blocked note${report.summary.blockedCount === 1 ? "" : "s"}, ${report.summary.openCount} open, ${report.summary.watchCount} watched, ${report.summary.dueSoonCount} due soon.`,
    id: "incident-notes",
    kind: "incident-notes",
    metric: `${report.summary.noteCount} notes`,
    nextAction: report.summary.nextAction,
    score: rowScore(report.summary.blockedCount + report.summary.openCount, report.summary.watchCount, report.summary.noteCount),
    status,
    title: "Incident notes",
  };
}

function trendSnapshotsRow(report: BoardReleaseObservabilityTrendSnapshotReport): BoardReleaseObservabilityExecutiveDigestRow {
  return {
    detail: `${report.summary.decliningCount} declining trend${report.summary.decliningCount === 1 ? "" : "s"}, ${report.summary.improvingCount} improving, ${report.summary.readinessScoreDelta} readiness score delta.`,
    id: "trend-snapshots",
    kind: "trend-snapshots",
    metric: `${report.summary.snapshotCount} snapshots`,
    nextAction: report.summary.nextAction,
    score: rowScore(report.summary.blockedCount + report.summary.decliningCount, report.summary.watchCount, report.summary.snapshotCount),
    status: report.summary.status,
    title: "Trend snapshots",
  };
}

function alertRoutingRow(report: BoardReleaseObservabilityAlertRoutingReport): BoardReleaseObservabilityExecutiveDigestRow {
  return {
    detail: `${report.summary.eligibleRouteCount} eligible route${report.summary.eligibleRouteCount === 1 ? "" : "s"}, ${report.summary.suppressedByRoleCount} role stops, ${report.summary.suppressedByPreferenceCount} preference stops.`,
    id: "alert-routing",
    kind: "alert-routing",
    metric: `${report.summary.routingScore}/100 routing`,
    nextAction: report.summary.nextAction,
    score: report.summary.routingScore,
    status: report.summary.status === "critical" ? "blocked" : report.summary.status === "warning" ? "watch" : "ready",
    title: "Alert routing",
  };
}

function closeoutRow(input: CreateBoardReleaseObservabilityExecutiveDigestInput): BoardReleaseObservabilityExecutiveDigestRow {
  const blocked =
    input.eventHealth.summary.blockedCount +
    input.incidentNotes.summary.blockedCount +
    input.trendSnapshots.summary.blockedCount +
    input.alertRouting.summary.criticalCount;
  const watch = input.eventHealth.summary.watchCount + input.incidentNotes.summary.watchCount + input.trendSnapshots.summary.watchCount + input.alertRouting.summary.warningCount;
  const total = input.eventHealth.summary.monitorCount + input.incidentNotes.summary.noteCount + input.trendSnapshots.summary.snapshotCount + input.alertRouting.summary.notificationCount;
  const score = rowScore(blocked, watch, total);

  return {
    detail: `${blocked} blocked closeout signal${blocked === 1 ? "" : "s"}, ${watch} watched, ${total} total observability signals.`,
    id: "closeout",
    kind: "closeout",
    metric: `${score}/100 closeout`,
    nextAction: blocked > 0 ? "Resolve blocked observability closeout signals before board release closure." : watch > 0 ? "Review watched observability signals before archive." : "Archive observability digest with the release closeout packet.",
    score,
    status: statusFromCounts(blocked, watch),
    title: "Release observability closeout",
  };
}

function createRows(input: CreateBoardReleaseObservabilityExecutiveDigestInput) {
  return [eventHealthRow(input.eventHealth), incidentNotesRow(input.incidentNotes), trendSnapshotsRow(input.trendSnapshots), alertRoutingRow(input.alertRouting), closeoutRow(input)].sort(
    (first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title),
  );
}

function createSummary(
  rows: BoardReleaseObservabilityExecutiveDigestRow[],
  input: CreateBoardReleaseObservabilityExecutiveDigestInput,
): BoardReleaseObservabilityExecutiveDigestReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const status = statusFromCounts(blockedCount, watchCount);
  const firstAction = rows.find((row) => row.status === "blocked" || row.status === "watch") ?? null;

  return {
    alertCount: input.alertRouting.summary.notificationCount,
    blockedCount,
    closeoutScore: rows.find((row) => row.kind === "closeout")?.score ?? 100,
    criticalAlertCount: input.alertRouting.summary.criticalCount,
    digestScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    incidentCount: input.incidentNotes.summary.noteCount,
    nextAction: firstAction?.nextAction ?? "Archive observability executive digest with the release closeout packet.",
    status,
    trendDeclineCount: input.trendSnapshots.summary.decliningCount,
    watchCount,
  };
}

function createExecutiveMemo(summary: BoardReleaseObservabilityExecutiveDigestReport["summary"], rows: BoardReleaseObservabilityExecutiveDigestRow[]) {
  const rowLine = rows.map((row) => `${row.title}: ${row.status} (${row.metric})`).join("; ");

  if (summary.status === "blocked") {
    return `Release observability is blocked by ${summary.blockedCount} executive signal${summary.blockedCount === 1 ? "" : "s"}. ${rowLine} Next action: ${summary.nextAction}`;
  }

  if (summary.status === "watch") {
    return `Release observability is under watch with ${summary.watchCount} monitored signal${summary.watchCount === 1 ? "" : "s"}. ${rowLine} Next action: ${summary.nextAction}`;
  }

  return `Release observability is ready for closeout. ${rowLine} Next action: ${summary.nextAction}`;
}

function createCsv(rows: BoardReleaseObservabilityExecutiveDigestRow[]) {
  const header = ["digest_id", "kind", "status", "score", "metric", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.status, row.score, row.metric, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  rows: BoardReleaseObservabilityExecutiveDigestRow[];
  summary: BoardReleaseObservabilityExecutiveDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      executiveMemo: input.executiveMemo,
      generatedAt: input.generatedAt,
      rows: input.rows,
      schemaVersion: 1,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseObservabilityExecutiveDigest(
  input: CreateBoardReleaseObservabilityExecutiveDigestInput,
): BoardReleaseObservabilityExecutiveDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.eventHealth.workspaceId;
  const rows = createRows(input);
  const summary = createSummary(rows, input);
  const executiveMemo = createExecutiveMemo(summary, rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    executiveMemo,
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const filePrefix = `${slug(workspaceId)}-board-release-observability-executive-digest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${filePrefix}.csv`,
    executiveMemo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${filePrefix}.json`,
    rows,
    schemaVersion: 1,
    summary,
    workspaceId,
  };
}
