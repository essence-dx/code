import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditRow, BoardDecisionReplayAuditStatus } from "@/features/projects/board-decision-replay-audit";

export type BoardDecisionReplaySnapshotFormat = "csv" | "json";
export type BoardDecisionReplaySnapshotTrendDirection = "declining" | "flat" | "improving";

export interface BoardDecisionReplaySnapshotActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardDecisionReplaySnapshotRecord {
  actor: BoardDecisionReplaySnapshotActor;
  activeApprovalCount: number;
  blockedRowCount: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  laterIncidentCount: number;
  releaseEvidenceDriftCount: number;
  report: BoardDecisionReplayAuditReport;
  replayScore: number;
  rowCount: number;
  runbookBlockedCount: number;
  runbookIncompleteCount: number;
  snapshotId: string;
  status: BoardDecisionReplayAuditStatus;
  topAction: string;
  watchRowCount: number;
  workspaceId: string;
}

export interface BoardDecisionReplaySnapshotTrendRow {
  currentValue: number | string;
  delta: number;
  direction: BoardDecisionReplaySnapshotTrendDirection;
  metric: string;
  previousValue: number | string;
}

export interface BoardDecisionReplaySnapshotHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardDecisionReplaySnapshotRecord[];
  summary: {
    actorCount: number;
    blockedRowDelta: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    latestScore: number | null;
    previousScore: number | null;
    scoreDelta: number;
    statusTrend: BoardDecisionReplaySnapshotTrendDirection;
    totalSnapshotCount: number;
  };
  trends: BoardDecisionReplaySnapshotTrendRow[];
}

export interface CreateBoardDecisionReplaySnapshotRecordInput {
  actor: BoardDecisionReplaySnapshotActor;
  createdAt?: string;
  id?: string;
  report: BoardDecisionReplayAuditReport;
  workspaceId: string;
}

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

  return JSON.stringify(value);
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function snapshotPayload(record: Omit<BoardDecisionReplaySnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return {
    actor: record.actor,
    createdAt: record.createdAt,
    report: record.report,
    snapshotId: record.snapshotId,
    workspaceId: record.workspaceId,
  };
}

function createSnapshotId(workspaceId: string, generatedAt: string) {
  return `board-decision-replay-${workspaceId}-${dateStamp(generatedAt)}`;
}

export function createBoardDecisionReplaySnapshotFileName(report: BoardDecisionReplayAuditReport, format: BoardDecisionReplaySnapshotFormat) {
  return `essence-spline-board-decision-replay-${dateStamp(report.generatedAt)}.${format}`;
}

export function createBoardDecisionReplaySnapshotJson(record: Omit<BoardDecisionReplaySnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return JSON.stringify(snapshotPayload(record), null, 2);
}

export function createBoardDecisionReplaySnapshotCsv(record: Pick<BoardDecisionReplaySnapshotRecord, "report">) {
  const report = record.report;
  const summaryRows = [
    ["Replay score", report.summary.replayScore],
    ["Blocked replay rows", report.summary.blockedRowCount],
    ["Watch replay rows", report.summary.watchRowCount],
    ["Later incidents", report.summary.laterIncidentCount],
    ["Release evidence drift", report.summary.releaseEvidenceDriftCount],
    ["Runbook blocked", report.summary.runbookBlockedCount],
    ["Runbook incomplete", report.summary.runbookIncompleteCount],
  ] satisfies [string, number][];

  return [
    ["Metric", "Value"].map(csvCell).join(","),
    ...summaryRows.map(([metric, value]) => [metric, value].map(csvCell).join(",")),
    "",
    ["Kind", "Status", "Title", "Baseline", "Current", "Delta", "Next action"].map(csvCell).join(","),
    ...report.rows.map((row) => [row.kind, row.status, row.title, row.baselineValue, row.currentValue, row.delta, row.nextAction].map(csvCell).join(",")),
  ].join("\n");
}

export function createBoardDecisionReplaySnapshotContentHash(
  record: Omit<BoardDecisionReplaySnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">,
) {
  return sha256(snapshotPayload(record));
}

export function createBoardDecisionReplaySnapshotRecord(input: CreateBoardDecisionReplaySnapshotRecordInput): BoardDecisionReplaySnapshotRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const baseRecord: Omit<BoardDecisionReplaySnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize"> = {
    actor: input.actor,
    activeApprovalCount: input.report.summary.activeApprovalCount,
    blockedRowCount: input.report.summary.blockedRowCount,
    createdAt,
    csvFileName: createBoardDecisionReplaySnapshotFileName(input.report, "csv"),
    id: input.id ?? nanoid(),
    jsonFileName: createBoardDecisionReplaySnapshotFileName(input.report, "json"),
    laterIncidentCount: input.report.summary.laterIncidentCount,
    releaseEvidenceDriftCount: input.report.summary.releaseEvidenceDriftCount,
    report: input.report,
    replayScore: input.report.summary.replayScore,
    rowCount: input.report.summary.rowCount,
    runbookBlockedCount: input.report.summary.runbookBlockedCount,
    runbookIncompleteCount: input.report.summary.runbookIncompleteCount,
    snapshotId: createSnapshotId(input.workspaceId, input.report.generatedAt),
    status: input.report.summary.status,
    topAction: input.report.summary.nextAction,
    watchRowCount: input.report.summary.watchRowCount,
    workspaceId: input.workspaceId,
  };
  const json = createBoardDecisionReplaySnapshotJson(baseRecord);
  const csv = createBoardDecisionReplaySnapshotCsv(baseRecord);

  return {
    ...baseRecord,
    contentHash: createBoardDecisionReplaySnapshotContentHash(baseRecord),
    csvByteSize: byteSize(csv),
    jsonByteSize: byteSize(json),
  };
}

function directionForDelta(delta: number, inverse = false): BoardDecisionReplaySnapshotTrendDirection {
  if (delta === 0) {
    return "flat";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improving" : "declining";
}

function trendRow(input: {
  currentValue: number;
  inverse?: boolean;
  metric: string;
  previousValue: number;
}): BoardDecisionReplaySnapshotTrendRow {
  const delta = input.currentValue - input.previousValue;

  return {
    currentValue: input.currentValue,
    delta,
    direction: directionForDelta(delta, input.inverse),
    metric: input.metric,
    previousValue: input.previousValue,
  };
}

function createTrendRows(current: BoardDecisionReplaySnapshotRecord | null, previous: BoardDecisionReplaySnapshotRecord | null) {
  if (!current || !previous) {
    return [];
  }

  return [
    trendRow({ currentValue: current.replayScore, metric: "Replay score", previousValue: previous.replayScore }),
    trendRow({ currentValue: current.blockedRowCount, inverse: true, metric: "Blocked replay rows", previousValue: previous.blockedRowCount }),
    trendRow({ currentValue: current.watchRowCount, inverse: true, metric: "Watch replay rows", previousValue: previous.watchRowCount }),
    trendRow({ currentValue: current.laterIncidentCount, inverse: true, metric: "Later incidents", previousValue: previous.laterIncidentCount }),
    trendRow({ currentValue: current.releaseEvidenceDriftCount, inverse: true, metric: "Evidence drift rows", previousValue: previous.releaseEvidenceDriftCount }),
    trendRow({ currentValue: current.runbookBlockedCount, inverse: true, metric: "Runbook blocked rows", previousValue: previous.runbookBlockedCount }),
  ];
}

function createHistoryCsv(records: BoardDecisionReplaySnapshotRecord[]) {
  const header = ["created_at", "status", "replay_score", "blocked_rows", "watch_rows", "later_incidents", "runbook_blocked", "next_action"];
  const rows = records.map((record) =>
    [
      record.createdAt,
      record.status,
      record.replayScore,
      record.blockedRowCount,
      record.watchRowCount,
      record.laterIncidentCount,
      record.runbookBlockedCount,
      record.topAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardDecisionReplaySnapshotHistoryReport(records: BoardDecisionReplaySnapshotRecord[]): BoardDecisionReplaySnapshotHistoryReport {
  const sorted = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  const trends = createTrendRows(latest, previous);
  const scoreDelta = latest && previous ? latest.replayScore - previous.replayScore : 0;
  const blockedRowDelta = latest && previous ? latest.blockedRowCount - previous.blockedRowCount : 0;
  const actors = new Set(sorted.map((record) => record.actor.userId ?? record.actor.email ?? record.actor.name ?? "unknown"));
  const csvContent = createHistoryCsv(sorted);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: "essence-spline-board-decision-replay-snapshots.csv",
    records: sorted,
    summary: {
      actorCount: actors.size,
      blockedRowDelta,
      latestContentHash: latest?.contentHash ?? null,
      latestSavedAt: latest?.createdAt ?? null,
      latestScore: latest?.replayScore ?? null,
      previousScore: previous?.replayScore ?? null,
      scoreDelta,
      statusTrend: directionForDelta(scoreDelta),
      totalSnapshotCount: sorted.length,
    },
    trends,
  };
}

export function getBoardDecisionReplaySnapshotDownload(record: BoardDecisionReplaySnapshotRecord, format: BoardDecisionReplaySnapshotFormat) {
  if (format === "json") {
    return {
      body: createBoardDecisionReplaySnapshotJson(record),
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createBoardDecisionReplaySnapshotCsv(record),
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}

function isReplayStatus(value: unknown): value is BoardDecisionReplayAuditStatus {
  return value === "blocked" || value === "ready" || value === "watch";
}

function isReplayRow(value: unknown): value is BoardDecisionReplayAuditRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<BoardDecisionReplayAuditRow>;

  return typeof row.id === "string" && typeof row.kind === "string" && isReplayStatus(row.status) && typeof row.title === "string" && typeof row.nextAction === "string";
}

export function isBoardDecisionReplayAuditReport(value: unknown): value is BoardDecisionReplayAuditReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardDecisionReplayAuditReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.workspaceId === "string" &&
    typeof report.csvContent === "string" &&
    Array.isArray(report.rows) &&
    report.rows.every(isReplayRow) &&
    !!report.summary &&
    isReplayStatus(report.summary.status) &&
    typeof report.summary.replayScore === "number" &&
    typeof report.summary.blockedRowCount === "number" &&
    typeof report.summary.watchRowCount === "number" &&
    typeof report.summary.nextAction === "string"
  );
}
