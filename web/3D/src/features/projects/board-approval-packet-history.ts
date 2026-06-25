import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type { BoardApprovalPacketReport, BoardApprovalPacketStatus } from "@/features/projects/board-approval-packet";

export type BoardApprovalPacketHistoryFormat = "csv" | "json";
export type BoardApprovalPacketHistoryRecordStatus = "active" | "revoked";
export type BoardApprovalPacketHistoryAuditAction = "created" | "downloaded" | "revoked";

export interface BoardApprovalPacketHistoryActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardApprovalPacketHistoryAuditEvent {
  action: BoardApprovalPacketHistoryAuditAction;
  actor: BoardApprovalPacketHistoryActor;
  at: string;
  format?: BoardApprovalPacketHistoryFormat;
  note?: string | null;
}

export interface BoardApprovalPacketHistoryRecord {
  approvalScore: number;
  approvalStatus: BoardApprovalPacketStatus;
  auditTrail: BoardApprovalPacketHistoryAuditEvent[];
  blockedSignOffCount: number;
  contentHash: string;
  createdAt: string;
  createdBy: BoardApprovalPacketHistoryActor;
  criticalPathCount: number;
  csvByteSize: number;
  csvFileName: string;
  downloadCount: number;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  packet: BoardApprovalPacketReport;
  packetId: string;
  readySignOffCount: number;
  recipientEmail: string | null;
  recipientName: string | null;
  recipientPurpose: string;
  revokedAt: string | null;
  revokedBy: BoardApprovalPacketHistoryActor | null;
  revokeReason: string | null;
  status: BoardApprovalPacketHistoryRecordStatus;
  updatedAt: string;
  watchSignOffCount: number;
  workspaceId: string;
}

export interface BoardApprovalPacketHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardApprovalPacketHistoryRecord[];
  summary: {
    activeCount: number;
    blockedPacketCount: number;
    downloadCount: number;
    latestSavedAt: string | null;
    readyPacketCount: number;
    revokedCount: number;
    totalCount: number;
    watchPacketCount: number;
  };
}

export interface CreateBoardApprovalPacketHistoryRecordInput {
  actor: BoardApprovalPacketHistoryActor;
  createdAt?: string;
  id?: string;
  packet: BoardApprovalPacketReport;
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientPurpose: string;
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

function sortRecords(first: BoardApprovalPacketHistoryRecord, second: BoardApprovalPacketHistoryRecord) {
  return second.createdAt.localeCompare(first.createdAt) || second.updatedAt.localeCompare(first.updatedAt) || first.packetId.localeCompare(second.packetId);
}

function sanitizePurpose(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 160) || "Board approval review";
}

export function createBoardApprovalPacketHistoryJson(record: BoardApprovalPacketHistoryRecord) {
  return JSON.stringify(
    {
      approvalStatus: record.approvalStatus,
      auditTrail: record.auditTrail,
      contentHash: record.contentHash,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      downloadCount: record.downloadCount,
      packet: record.packet,
      packetId: record.packetId,
      recipient: {
        email: record.recipientEmail,
        name: record.recipientName,
        purpose: record.recipientPurpose,
      },
      revokedAt: record.revokedAt,
      revokedBy: record.revokedBy,
      revokeReason: record.revokeReason,
      schemaVersion: 1,
      status: record.status,
      updatedAt: record.updatedAt,
      workspaceId: record.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardApprovalPacketHistoryCsv(record: BoardApprovalPacketHistoryRecord) {
  return record.packet.csvContent;
}

export function createBoardApprovalPacketHistoryRecord(input: CreateBoardApprovalPacketHistoryRecordInput): BoardApprovalPacketHistoryRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const recipientPurpose = sanitizePurpose(input.recipientPurpose);
  const baseRecord = {
    approvalScore: input.packet.summary.approvalScore,
    approvalStatus: input.packet.summary.status,
    auditTrail: [
      {
        action: "created",
        actor: input.actor,
        at: createdAt,
        note: recipientPurpose,
      },
    ] satisfies BoardApprovalPacketHistoryAuditEvent[],
    blockedSignOffCount: input.packet.summary.blockedSignOffCount,
    createdAt,
    createdBy: input.actor,
    criticalPathCount: input.packet.summary.criticalPathCount,
    downloadCount: 0,
    id: input.id ?? nanoid(),
    packet: input.packet,
    packetId: input.packet.packetId,
    readySignOffCount: input.packet.summary.readySignOffCount,
    recipientEmail: input.recipientEmail?.trim() || null,
    recipientName: input.recipientName?.trim() || null,
    recipientPurpose,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    status: "active" as const,
    updatedAt: createdAt,
    watchSignOffCount: input.packet.summary.watchSignOffCount,
    workspaceId: input.workspaceId,
  };
  const recordWithoutFileSizes = {
    ...baseRecord,
    contentHash: sha256({
      packet: input.packet,
      recipientEmail: baseRecord.recipientEmail,
      recipientName: baseRecord.recipientName,
      recipientPurpose,
      workspaceId: input.workspaceId,
    }),
    csvByteSize: 0,
    csvFileName: `${input.packet.packetId}-board-approval.csv`,
    jsonByteSize: 0,
    jsonFileName: `${input.packet.packetId}-board-approval.json`,
  };

  return {
    ...recordWithoutFileSizes,
    csvByteSize: byteSize(createBoardApprovalPacketHistoryCsv(recordWithoutFileSizes)),
    jsonByteSize: byteSize(createBoardApprovalPacketHistoryJson(recordWithoutFileSizes)),
  };
}

export function recordBoardApprovalPacketHistoryDownload(
  record: BoardApprovalPacketHistoryRecord,
  input: {
    actor: BoardApprovalPacketHistoryActor;
    downloadedAt?: string;
    format: BoardApprovalPacketHistoryFormat;
  },
): BoardApprovalPacketHistoryRecord {
  const downloadedAt = input.downloadedAt ?? new Date().toISOString();

  return {
    ...record,
    auditTrail: [
      ...record.auditTrail,
      {
        action: "downloaded",
        actor: input.actor,
        at: downloadedAt,
        format: input.format,
      },
    ],
    downloadCount: record.downloadCount + 1,
    updatedAt: downloadedAt,
  };
}

export function revokeBoardApprovalPacketHistoryRecord(
  record: BoardApprovalPacketHistoryRecord,
  input: {
    actor: BoardApprovalPacketHistoryActor;
    reason?: string | null;
    revokedAt?: string;
  },
): BoardApprovalPacketHistoryRecord {
  if (record.status === "revoked") {
    return record;
  }

  const revokedAt = input.revokedAt ?? new Date().toISOString();
  const reason = input.reason?.trim() || "Revoked by workspace manager.";

  return {
    ...record,
    auditTrail: [
      ...record.auditTrail,
      {
        action: "revoked",
        actor: input.actor,
        at: revokedAt,
        note: reason,
      },
    ],
    revokedAt,
    revokedBy: input.actor,
    revokeReason: reason,
    status: "revoked",
    updatedAt: revokedAt,
  };
}

function createHistoryCsv(records: BoardApprovalPacketHistoryRecord[]) {
  const header = [
    "packet_id",
    "status",
    "approval_status",
    "approval_score",
    "recipient_purpose",
    "download_count",
    "created_by",
    "created_at",
    "revoked_at",
    "content_hash",
  ];
  const rows = records.map((record) =>
    [
      record.packetId,
      record.status,
      record.approvalStatus,
      record.approvalScore,
      record.recipientPurpose,
      record.downloadCount,
      record.createdBy.email ?? record.createdBy.name,
      record.createdAt,
      record.revokedAt,
      record.contentHash,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardApprovalPacketHistoryReport(records: BoardApprovalPacketHistoryRecord[]): BoardApprovalPacketHistoryReport {
  const sorted = [...records].sort(sortRecords);
  const csvContent = createHistoryCsv(sorted);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `essence-spline-board-approval-packets-${dateStamp(sorted[0]?.createdAt ?? new Date().toISOString())}.csv`,
    records: sorted,
    summary: {
      activeCount: sorted.filter((record) => record.status === "active").length,
      blockedPacketCount: sorted.filter((record) => record.approvalStatus === "blocked").length,
      downloadCount: sorted.reduce((sum, record) => sum + record.downloadCount, 0),
      latestSavedAt: sorted[0]?.createdAt ?? null,
      readyPacketCount: sorted.filter((record) => record.approvalStatus === "ready").length,
      revokedCount: sorted.filter((record) => record.status === "revoked").length,
      totalCount: sorted.length,
      watchPacketCount: sorted.filter((record) => record.approvalStatus === "watch").length,
    },
  };
}

export function getBoardApprovalPacketHistoryDownload(record: BoardApprovalPacketHistoryRecord, format: BoardApprovalPacketHistoryFormat) {
  if (format === "csv") {
    return {
      body: createBoardApprovalPacketHistoryCsv(record),
      fileName: record.csvFileName,
      mimeType: "text/csv;charset=utf-8",
    };
  }

  return {
    body: createBoardApprovalPacketHistoryJson(record),
    fileName: record.jsonFileName,
    mimeType: "application/json;charset=utf-8",
  };
}
