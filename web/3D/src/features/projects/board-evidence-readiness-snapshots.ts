import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  BoardAuditEvidenceReadinessDigest,
  BoardAuditEvidenceReadinessStatus,
} from "@/features/projects/board-audit-evidence-readiness-digest";

export type BoardEvidenceReadinessSnapshotFormat = "csv" | "json";
export type BoardEvidenceReadinessSnapshotTrendDirection = "declining" | "flat" | "improving";

export interface BoardEvidenceReadinessSnapshotActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardEvidenceReadinessSnapshotRecord {
  actor: BoardEvidenceReadinessSnapshotActor;
  carryForwardCount: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  digest: BoardAuditEvidenceReadinessDigest;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  readinessScore: number;
  riskCount: number;
  snapshotId: string;
  status: BoardAuditEvidenceReadinessStatus;
  topAction: string;
  trendPointCount: number;
  unresolvedAttachmentRiskCount: number;
  workspaceId: string;
}

export interface BoardEvidenceReadinessSnapshotTrendRow {
  currentValue: number | string;
  delta: number;
  direction: BoardEvidenceReadinessSnapshotTrendDirection;
  metric: string;
  previousValue: number | string;
}

export interface BoardEvidenceReadinessSnapshotHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardEvidenceReadinessSnapshotRecord[];
  summary: {
    actorCount: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    latestScore: number | null;
    previousScore: number | null;
    riskDelta: number;
    scoreDelta: number;
    statusTrend: BoardEvidenceReadinessSnapshotTrendDirection;
    totalSnapshotCount: number;
  };
  trends: BoardEvidenceReadinessSnapshotTrendRow[];
}

export interface CreateBoardEvidenceReadinessSnapshotRecordInput {
  actor: BoardEvidenceReadinessSnapshotActor;
  createdAt?: string;
  digest: BoardAuditEvidenceReadinessDigest;
  id?: string;
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

  return JSON.stringify(value) ?? "null";
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

function snapshotPayload(record: Omit<BoardEvidenceReadinessSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return {
    actor: record.actor,
    createdAt: record.createdAt,
    digest: record.digest,
    snapshotId: record.snapshotId,
    workspaceId: record.workspaceId,
  };
}

function createSnapshotId(workspaceId: string, generatedAt: string) {
  return `board-evidence-readiness-${workspaceId}-${dateStamp(generatedAt)}`;
}

function directionForDelta(delta: number, inverse = false): BoardEvidenceReadinessSnapshotTrendDirection {
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
}): BoardEvidenceReadinessSnapshotTrendRow {
  const delta = input.currentValue - input.previousValue;

  return {
    currentValue: input.currentValue,
    delta,
    direction: directionForDelta(delta, input.inverse),
    metric: input.metric,
    previousValue: input.previousValue,
  };
}

export function createBoardEvidenceReadinessSnapshotFileName(digest: BoardAuditEvidenceReadinessDigest, format: BoardEvidenceReadinessSnapshotFormat) {
  return `essence-spline-board-evidence-readiness-${dateStamp(digest.generatedAt)}.${format}`;
}

export function createBoardEvidenceReadinessSnapshotJson(record: Omit<BoardEvidenceReadinessSnapshotRecord, "csvByteSize" | "jsonByteSize">) {
  return JSON.stringify(record, null, 2);
}

export function createBoardEvidenceReadinessSnapshotCsv(record: Pick<BoardEvidenceReadinessSnapshotRecord, "digest">) {
  const digest = record.digest;
  const summaryRows = [
    ["Readiness score", digest.summary.readinessScore],
    ["Score delta", digest.summary.scoreDelta],
    ["Unresolved attachment risks", digest.summary.unresolvedAttachmentRiskCount],
    ["Carry-forward recommendations", digest.summary.carryForwardCount],
    ["Trend points", digest.summary.trendPointCount],
  ] satisfies [string, number][];

  return [
    ["Metric", "Value"].map(csvCell).join(","),
    ...summaryRows.map(([metric, value]) => [metric, value].map(csvCell).join(",")),
    "",
    ["Task", "Status", "Owner", "Risk", "Score", "Next action"].map(csvCell).join(","),
    ...digest.risks.map((risk) => [risk.title, risk.status, risk.ownerName, risk.riskLevel, risk.readinessScore, risk.nextAction].map(csvCell).join(",")),
  ].join("\n");
}

export function createBoardEvidenceReadinessSnapshotContentHash(
  record: Omit<BoardEvidenceReadinessSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">,
) {
  return sha256(snapshotPayload(record));
}

export function createBoardEvidenceReadinessSnapshotRecord(
  input: CreateBoardEvidenceReadinessSnapshotRecordInput,
): BoardEvidenceReadinessSnapshotRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const baseRecord: Omit<BoardEvidenceReadinessSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize"> = {
    actor: input.actor,
    carryForwardCount: input.digest.summary.carryForwardCount,
    createdAt,
    csvFileName: createBoardEvidenceReadinessSnapshotFileName(input.digest, "csv"),
    digest: input.digest,
    id: input.id ?? nanoid(),
    jsonFileName: createBoardEvidenceReadinessSnapshotFileName(input.digest, "json"),
    readinessScore: input.digest.summary.readinessScore,
    riskCount: input.digest.risks.length,
    snapshotId: createSnapshotId(input.workspaceId, input.digest.generatedAt),
    status: input.digest.summary.status,
    topAction: input.digest.summary.nextAction,
    trendPointCount: input.digest.summary.trendPointCount,
    unresolvedAttachmentRiskCount: input.digest.summary.unresolvedAttachmentRiskCount,
    workspaceId: input.workspaceId,
  };
  const json = createBoardEvidenceReadinessSnapshotJson({
    ...baseRecord,
    contentHash: createBoardEvidenceReadinessSnapshotContentHash(baseRecord),
  });
  const csv = createBoardEvidenceReadinessSnapshotCsv(baseRecord);

  return {
    ...baseRecord,
    contentHash: createBoardEvidenceReadinessSnapshotContentHash(baseRecord),
    csvByteSize: byteSize(csv),
    jsonByteSize: byteSize(json),
  };
}

function createTrendRows(current: BoardEvidenceReadinessSnapshotRecord | null, previous: BoardEvidenceReadinessSnapshotRecord | null) {
  if (!current || !previous) {
    return [];
  }

  return [
    trendRow({ currentValue: current.readinessScore, metric: "Readiness score", previousValue: previous.readinessScore }),
    trendRow({
      currentValue: current.unresolvedAttachmentRiskCount,
      inverse: true,
      metric: "Unresolved attachment risks",
      previousValue: previous.unresolvedAttachmentRiskCount,
    }),
    trendRow({ currentValue: current.carryForwardCount, inverse: true, metric: "Carry-forward recommendations", previousValue: previous.carryForwardCount }),
    trendRow({ currentValue: current.trendPointCount, metric: "Trend points", previousValue: previous.trendPointCount }),
  ];
}

function createHistoryCsv(records: BoardEvidenceReadinessSnapshotRecord[]) {
  const header = ["created_at", "status", "readiness_score", "attachment_risks", "carry_forward", "next_action"];
  const rows = records.map((record) =>
    [record.createdAt, record.status, record.readinessScore, record.unresolvedAttachmentRiskCount, record.carryForwardCount, record.topAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardEvidenceReadinessSnapshotHistoryReport(
  records: BoardEvidenceReadinessSnapshotRecord[],
): BoardEvidenceReadinessSnapshotHistoryReport {
  const sorted = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  const trends = createTrendRows(latest, previous);
  const scoreDelta = latest && previous ? latest.readinessScore - previous.readinessScore : 0;
  const riskDelta = latest && previous ? latest.unresolvedAttachmentRiskCount - previous.unresolvedAttachmentRiskCount : 0;
  const actors = new Set(sorted.map((record) => record.actor.userId ?? record.actor.email ?? record.actor.name ?? "unknown"));
  const csvContent = createHistoryCsv(sorted);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: "essence-spline-board-evidence-readiness-snapshots.csv",
    records: sorted,
    summary: {
      actorCount: actors.size,
      latestContentHash: latest?.contentHash ?? null,
      latestSavedAt: latest?.createdAt ?? null,
      latestScore: latest?.readinessScore ?? null,
      previousScore: previous?.readinessScore ?? null,
      riskDelta,
      scoreDelta,
      statusTrend: directionForDelta(scoreDelta),
      totalSnapshotCount: sorted.length,
    },
    trends,
  };
}

export function getBoardEvidenceReadinessSnapshotDownload(record: BoardEvidenceReadinessSnapshotRecord, format: BoardEvidenceReadinessSnapshotFormat) {
  if (format === "json") {
    return {
      body: createBoardEvidenceReadinessSnapshotJson(record),
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createBoardEvidenceReadinessSnapshotCsv(record),
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
