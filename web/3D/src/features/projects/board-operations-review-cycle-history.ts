import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type { BoardOperationsControlCenterReport, BoardOperationsControlStatus, BoardOperationsReviewCycle } from "@/features/projects/board-operations-control-center";

export type BoardOperationsReviewCycleHistoryFormat = "csv" | "json";
export type BoardOperationsReviewCycleCloseoutState = "blocked" | "closed" | "watch";

export interface BoardOperationsReviewCycleHistoryActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardOperationsReviewCycleHistoryRecord {
  actor: BoardOperationsReviewCycleHistoryActor;
  auditHash: string;
  blockedControlCount: number;
  closeoutReport: string;
  contentHash: string;
  controlCenter: BoardOperationsControlCenterReport;
  controlScore: number;
  createdAt: string;
  csvByteSize: number;
  csvContent: string;
  csvFileName: string;
  id: string;
  jsonByteSize: number;
  jsonContent: string;
  jsonFileName: string;
  ownerCloseoutState: BoardOperationsReviewCycleCloseoutState;
  readyControlCount: number;
  reviewCycle: BoardOperationsReviewCycle;
  reviewCycleId: string;
  status: BoardOperationsControlStatus;
  watchControlCount: number;
  workspaceId: string;
}

export interface BoardOperationsReviewCycleHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardOperationsReviewCycleHistoryRecord[];
  summary: {
    blockedRecordCount: number;
    closedRecordCount: number;
    latestAuditHash: string | null;
    latestSavedAt: string | null;
    latestStatus: BoardOperationsControlStatus | null;
    ownerCount: number;
    totalRecordCount: number;
    watchRecordCount: number;
  };
}

export interface CreateBoardOperationsReviewCycleHistoryRecordInput {
  actor: BoardOperationsReviewCycleHistoryActor;
  controlCenter: BoardOperationsControlCenterReport;
  createdAt?: string;
  id?: string;
  reviewCycle: BoardOperationsReviewCycle;
  workspaceId: string;
}

export function isBoardOperationsControlCenterReport(value: unknown): value is BoardOperationsControlCenterReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardOperationsControlCenterReport>;

  return (
    typeof report.closeoutReport === "string" &&
    typeof report.generatedAt === "string" &&
    Array.isArray(report.rows) &&
    typeof report.summary?.controlScore === "number" &&
    typeof report.summary?.status === "string" &&
    typeof report.workspaceId === "string"
  );
}

export function isBoardOperationsReviewCycle(value: unknown): value is BoardOperationsReviewCycle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cycle = value as Partial<BoardOperationsReviewCycle>;

  return typeof cycle.id === "string" && typeof cycle.label === "string" && typeof cycle.owner === "string" && typeof cycle.savedAt === "string" && typeof cycle.status === "string";
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

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
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

function ownerCloseoutState(status: BoardOperationsControlStatus): BoardOperationsReviewCycleCloseoutState {
  if (status === "ready") {
    return "closed";
  }

  return status;
}

function createRecordCsv(input: {
  auditHash: string;
  controlCenter: BoardOperationsControlCenterReport;
  reviewCycle: BoardOperationsReviewCycle;
}) {
  const header = ["cycle_id", "label", "status", "owner", "control_score", "audit_hash", "next_action"];
  const row = [
    input.reviewCycle.id,
    input.reviewCycle.label,
    input.controlCenter.summary.status,
    input.reviewCycle.owner,
    input.controlCenter.summary.controlScore,
    input.auditHash,
    input.controlCenter.summary.nextAction,
  ];

  return `${header.join(",")}\n${row.map(csvCell).join(",")}\n`;
}

function createRecordJson(input: {
  actor: BoardOperationsReviewCycleHistoryActor;
  auditHash: string;
  controlCenter: BoardOperationsControlCenterReport;
  createdAt: string;
  reviewCycle: BoardOperationsReviewCycle;
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      actor: input.actor,
      auditHash: input.auditHash,
      controlCenter: input.controlCenter,
      createdAt: input.createdAt,
      reviewCycle: input.reviewCycle,
      schemaVersion: 1,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardOperationsReviewCycleHistoryRecord(input: CreateBoardOperationsReviewCycleHistoryRecordInput): BoardOperationsReviewCycleHistoryRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const auditHash = sha256({
    closeoutReport: input.controlCenter.closeoutReport,
    rows: input.controlCenter.rows,
    summary: input.controlCenter.summary,
  });
  const csvContent = createRecordCsv({
    auditHash,
    controlCenter: input.controlCenter,
    reviewCycle: input.reviewCycle,
  });
  const jsonContent = createRecordJson({
    actor: input.actor,
    auditHash,
    controlCenter: input.controlCenter,
    createdAt,
    reviewCycle: input.reviewCycle,
    workspaceId: input.workspaceId,
  });
  const filePrefix = `${slug(input.workspaceId)}-board-review-cycle-${slug(input.reviewCycle.id)}-${dateStamp(createdAt)}`;

  return {
    actor: input.actor,
    auditHash,
    blockedControlCount: input.controlCenter.summary.blockedCount,
    closeoutReport: input.controlCenter.closeoutReport,
    contentHash: sha256({ auditHash, jsonContent }),
    controlCenter: input.controlCenter,
    controlScore: input.controlCenter.summary.controlScore,
    createdAt,
    csvByteSize: byteSize(csvContent),
    csvContent,
    csvFileName: `${filePrefix}.csv`,
    id: input.id ?? nanoid(),
    jsonByteSize: byteSize(jsonContent),
    jsonContent,
    jsonFileName: `${filePrefix}.json`,
    ownerCloseoutState: ownerCloseoutState(input.controlCenter.summary.status),
    readyControlCount: input.controlCenter.summary.readyCount,
    reviewCycle: input.reviewCycle,
    reviewCycleId: input.reviewCycle.id,
    status: input.controlCenter.summary.status,
    watchControlCount: input.controlCenter.summary.watchCount,
    workspaceId: input.workspaceId,
  };
}

function createHistoryCsv(records: BoardOperationsReviewCycleHistoryRecord[]) {
  const header = ["created_at", "cycle_id", "label", "status", "owner", "control_score", "audit_hash"];
  const rows = records.map((record) =>
    [record.createdAt, record.reviewCycleId, record.reviewCycle.label, record.status, record.reviewCycle.owner, record.controlScore, record.auditHash].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardOperationsReviewCycleHistoryReport(records: BoardOperationsReviewCycleHistoryRecord[]): BoardOperationsReviewCycleHistoryReport {
  const sortedRecords = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt) || first.id.localeCompare(second.id));
  const ownerKeys = new Set(sortedRecords.map((record) => record.reviewCycle.owner.trim().toLowerCase()).filter(Boolean));
  const csvContent = createHistoryCsv(sortedRecords);
  const latest = sortedRecords[0] ?? null;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: "essence-spline-board-operations-review-cycle-history.csv",
    records: sortedRecords,
    summary: {
      blockedRecordCount: sortedRecords.filter((record) => record.ownerCloseoutState === "blocked").length,
      closedRecordCount: sortedRecords.filter((record) => record.ownerCloseoutState === "closed").length,
      latestAuditHash: latest?.auditHash ?? null,
      latestSavedAt: latest?.createdAt ?? null,
      latestStatus: latest?.status ?? null,
      ownerCount: ownerKeys.size,
      totalRecordCount: sortedRecords.length,
      watchRecordCount: sortedRecords.filter((record) => record.ownerCloseoutState === "watch").length,
    },
  };
}

export function getBoardOperationsReviewCycleHistoryDownload(record: BoardOperationsReviewCycleHistoryRecord, format: BoardOperationsReviewCycleHistoryFormat) {
  if (format === "csv") {
    return {
      body: record.csvContent,
      contentType: "text/csv; charset=utf-8",
      fileName: record.csvFileName,
    };
  }

  return {
    body: record.jsonContent,
    contentType: "application/json; charset=utf-8",
    fileName: record.jsonFileName,
  };
}
