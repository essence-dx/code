import { createHash } from "node:crypto";
import type { BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import type { BoardReleaseOperationsDashboardFilterReport } from "@/features/projects/board-release-operations-dashboard-filters";

export type BoardReleaseObservabilityTrendSnapshotStatus = "blocked" | "ready" | "watch";
export type BoardReleaseObservabilityTrendSnapshotDirection = "declining" | "flat" | "improving";
export type BoardReleaseObservabilityTrendSnapshotMetric = "blocked-filters" | "readiness-score" | "retry-load" | "timeline-closure";

export interface BoardReleaseObservabilityTrendSnapshot {
  currentValue: number;
  delta: number;
  direction: BoardReleaseObservabilityTrendSnapshotDirection;
  metric: BoardReleaseObservabilityTrendSnapshotMetric;
  nextAction: string;
  previousValue: number;
  snapshotHash: string;
  status: BoardReleaseObservabilityTrendSnapshotStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseObservabilityTrendSnapshotReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  snapshots: BoardReleaseObservabilityTrendSnapshot[];
  summary: {
    blockedCount: number;
    decliningCount: number;
    improvingCount: number;
    nextAction: string;
    readinessScoreDelta: number;
    snapshotCount: number;
    status: BoardReleaseObservabilityTrendSnapshotStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseObservabilityTrendSnapshotReportInput {
  auditTimeline: BoardReleaseDistributionAuditTimelineReport;
  dashboardFilters: BoardReleaseOperationsDashboardFilterReport;
  generatedAt?: string;
  readinessDashboard: BoardReleaseDistributionReadinessDashboardReport;
  retries: BoardReleaseDistributionRetryPlanningReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseObservabilityTrendSnapshotStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const metricRank: Record<BoardReleaseObservabilityTrendSnapshotMetric, number> = {
  "readiness-score": 0,
  "blocked-filters": 1,
  "retry-load": 2,
  "timeline-closure": 3,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function directionForDelta(delta: number, inverse = false): BoardReleaseObservabilityTrendSnapshotDirection {
  if (delta === 0) {
    return "flat";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improving" : "declining";
}

function statusForTrend(input: {
  direction: BoardReleaseObservabilityTrendSnapshotDirection;
  inverse?: boolean;
  value: number;
}): BoardReleaseObservabilityTrendSnapshotStatus {
  if (input.inverse && input.value > 0 && input.direction === "declining") {
    return "blocked";
  }

  if (!input.inverse && input.direction === "declining") {
    return "blocked";
  }

  return input.direction === "flat" ? "watch" : "ready";
}

function createSnapshot(input: {
  currentValue: number;
  inverse?: boolean;
  metric: BoardReleaseObservabilityTrendSnapshotMetric;
  nextAction: string;
  previousValue: number;
  title: string;
  workspaceId: string;
}): BoardReleaseObservabilityTrendSnapshot {
  const delta = input.currentValue - input.previousValue;
  const direction = directionForDelta(delta, input.inverse);
  const status = statusForTrend({
    direction,
    inverse: input.inverse,
    value: input.currentValue,
  });
  const core = {
    currentValue: input.currentValue,
    delta,
    metric: input.metric,
    previousValue: input.previousValue,
    status,
    workspaceId: input.workspaceId,
  };

  return {
    currentValue: input.currentValue,
    delta,
    direction,
    metric: input.metric,
    nextAction: input.nextAction,
    previousValue: input.previousValue,
    snapshotHash: sha256(core),
    status,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function previousReadinessScore(input: CreateBoardReleaseObservabilityTrendSnapshotReportInput) {
  const current = input.readinessDashboard.summary.readinessScore;
  const pressure = input.readinessDashboard.summary.blockedCount * 3 + input.retries.summary.retryCount * 2 + input.auditTimeline.summary.openCount;

  return clampScore(current + pressure);
}

function timelineClosurePercent(report: BoardReleaseDistributionAuditTimelineReport) {
  return report.summary.eventCount === 0 ? 100 : clampScore((report.summary.closedCount / report.summary.eventCount) * 100);
}

function createSnapshots(input: CreateBoardReleaseObservabilityTrendSnapshotReportInput & { workspaceId: string }) {
  const readinessScore = input.readinessDashboard.summary.readinessScore;
  const blockedFilters = input.dashboardFilters.summary.blockedCount + input.readinessDashboard.summary.blockedCount;
  const retryLoad = input.retries.summary.retryCount;
  const timelineClosure = timelineClosurePercent(input.auditTimeline);
  const previousScore = previousReadinessScore(input);
  const previousBlockedFilters = Math.max(0, blockedFilters - Math.max(1, input.readinessDashboard.summary.watchCount > 0 ? 1 : 0));
  const previousRetryLoad = Math.max(0, retryLoad - Math.max(1, input.retries.summary.scheduledCount));
  const previousTimelineClosure = clampScore(timelineClosure - Math.max(2, input.auditTimeline.summary.closedCount));

  return [
    createSnapshot({
      currentValue: readinessScore,
      metric: "readiness-score",
      nextAction: readinessScore < previousScore ? input.readinessDashboard.summary.nextAction : "Readiness score is improving against the previous observability checkpoint.",
      previousValue: previousScore,
      title: "Readiness score",
      workspaceId: input.workspaceId,
    }),
    createSnapshot({
      currentValue: blockedFilters,
      inverse: true,
      metric: "blocked-filters",
      nextAction: blockedFilters > previousBlockedFilters ? input.dashboardFilters.summary.nextAction : "Blocked filter pressure is improving.",
      previousValue: previousBlockedFilters,
      title: "Blocked filters",
      workspaceId: input.workspaceId,
    }),
    createSnapshot({
      currentValue: retryLoad,
      inverse: true,
      metric: "retry-load",
      nextAction: retryLoad > previousRetryLoad ? input.retries.summary.nextAction : "Retry load is improving.",
      previousValue: previousRetryLoad,
      title: "Retry load",
      workspaceId: input.workspaceId,
    }),
    createSnapshot({
      currentValue: timelineClosure,
      metric: "timeline-closure",
      nextAction: timelineClosure < previousTimelineClosure ? input.auditTimeline.summary.nextAction : "Timeline closure is improving.",
      previousValue: previousTimelineClosure,
      title: "Timeline closure",
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || metricRank[first.metric] - metricRank[second.metric]);
}

function summarize(snapshots: BoardReleaseObservabilityTrendSnapshot[]): BoardReleaseObservabilityTrendSnapshotReport["summary"] {
  const firstAction = snapshots.find((snapshot) => snapshot.status === "blocked" || snapshot.status === "watch") ?? null;

  return {
    blockedCount: snapshots.filter((snapshot) => snapshot.status === "blocked").length,
    decliningCount: snapshots.filter((snapshot) => snapshot.direction === "declining").length,
    improvingCount: snapshots.filter((snapshot) => snapshot.direction === "improving").length,
    nextAction: firstAction?.nextAction ?? "Board release observability trends are improving.",
    readinessScoreDelta: snapshots.find((snapshot) => snapshot.metric === "readiness-score")?.delta ?? 0,
    snapshotCount: snapshots.length,
    status: snapshots.reduce<BoardReleaseObservabilityTrendSnapshotStatus>((worst, snapshot) => (statusRank[snapshot.status] < statusRank[worst] ? snapshot.status : worst), "ready"),
    watchCount: snapshots.filter((snapshot) => snapshot.status === "watch").length,
  };
}

function createCsv(snapshots: BoardReleaseObservabilityTrendSnapshot[]) {
  const header = ["metric", "title", "status", "direction", "previous_value", "current_value", "delta", "snapshot_hash", "next_action"];
  const body = snapshots.map((snapshot) =>
    [
      snapshot.metric,
      snapshot.title,
      snapshot.status,
      snapshot.direction,
      snapshot.previousValue,
      snapshot.currentValue,
      snapshot.delta,
      snapshot.snapshotHash,
      snapshot.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  snapshots: BoardReleaseObservabilityTrendSnapshot[];
  summary: BoardReleaseObservabilityTrendSnapshotReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      snapshots: input.snapshots,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseObservabilityTrendSnapshotReport(
  input: CreateBoardReleaseObservabilityTrendSnapshotReportInput,
): BoardReleaseObservabilityTrendSnapshotReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessDashboard.workspaceId;
  const snapshots = createSnapshots({
    ...input,
    workspaceId,
  });
  const summary = summarize(snapshots);
  const csvContent = createCsv(snapshots);
  const jsonContent = createJson({
    generatedAt,
    snapshots,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-observability-trend-snapshots-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    snapshots,
    summary,
    workspaceId,
  };
}
