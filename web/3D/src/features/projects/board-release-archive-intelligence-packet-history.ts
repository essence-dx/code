import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

export type BoardReleaseArchiveIntelligencePacketHistoryFormat = "csv" | "json";

export interface BoardReleaseArchiveIntelligencePacketHistoryActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardReleaseArchiveIntelligencePacketHistoryRecord {
  actor: BoardReleaseArchiveIntelligencePacketHistoryActor;
  blockedRecommendationCount: number;
  blockedSectionCount: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  packetHash: string;
  packetScore: number;
  recommendationCount: number;
  sectionCount: number;
  status: BoardReleaseCloseoutReadinessGateStatus;
  workspaceId: string;
}

export interface BoardReleaseArchiveIntelligencePacketHistoryReport {
  csvContent: string;
  csvDataUri: string;
  records: BoardReleaseArchiveIntelligencePacketHistoryRecord[];
  summary: {
    actorCount: number;
    blockedPacketCount: number;
    latestPacketHash: string | null;
    latestSavedAt: string | null;
    readyPacketCount: number;
    totalPacketCount: number;
    watchPacketCount: number;
  };
}

export interface CreateBoardReleaseArchiveIntelligencePacketHistoryRecordInput {
  actor: BoardReleaseArchiveIntelligencePacketHistoryActor;
  createdAt?: string;
  id?: string;
  packet: BoardReleaseArchiveIntelligencePacketReport;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

export function createBoardReleaseArchiveIntelligencePacketJson(packet: BoardReleaseArchiveIntelligencePacketReport) {
  return JSON.stringify(
    {
      executiveMemo: packet.executiveMemo,
      generatedAt: packet.generatedAt,
      recommendations: packet.recommendations,
      sections: packet.sections,
      summary: packet.summary,
      workspaceId: packet.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseArchiveIntelligencePacketCsv(packet: BoardReleaseArchiveIntelligencePacketReport) {
  return packet.csvContent;
}

export function createBoardReleaseArchiveIntelligencePacketContentHash(packet: BoardReleaseArchiveIntelligencePacketReport) {
  return `sha256:${createHash("sha256").update(createBoardReleaseArchiveIntelligencePacketJson(packet)).digest("hex")}`;
}

export function isBoardReleaseArchiveIntelligencePacketReport(value: unknown): value is BoardReleaseArchiveIntelligencePacketReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardReleaseArchiveIntelligencePacketReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.workspaceId === "string" &&
    typeof report.executiveMemo === "string" &&
    Array.isArray(report.sections) &&
    Array.isArray(report.recommendations) &&
    !!report.summary &&
    typeof report.summary.packetHash === "string" &&
    typeof report.summary.packetScore === "number" &&
    (report.summary.status === "blocked" || report.summary.status === "ready" || report.summary.status === "watch")
  );
}

export function createBoardReleaseArchiveIntelligencePacketHistoryRecord(
  input: CreateBoardReleaseArchiveIntelligencePacketHistoryRecordInput,
): BoardReleaseArchiveIntelligencePacketHistoryRecord {
  const json = createBoardReleaseArchiveIntelligencePacketJson(input.packet);
  const csv = createBoardReleaseArchiveIntelligencePacketCsv(input.packet);

  return {
    actor: input.actor,
    blockedRecommendationCount: input.packet.summary.blockedRecommendationCount,
    blockedSectionCount: input.packet.summary.blockedSectionCount,
    contentHash: createBoardReleaseArchiveIntelligencePacketContentHash(input.packet),
    createdAt: input.createdAt ?? new Date().toISOString(),
    csvByteSize: byteSize(csv),
    csvFileName: input.packet.csvFileName,
    id: input.id ?? nanoid(),
    jsonByteSize: byteSize(json),
    jsonFileName: input.packet.jsonFileName,
    packet: input.packet,
    packetHash: input.packet.summary.packetHash,
    packetScore: input.packet.summary.packetScore,
    recommendationCount: input.packet.summary.recommendationCount,
    sectionCount: input.packet.summary.sectionCount,
    status: input.packet.summary.status,
    workspaceId: input.packet.workspaceId,
  };
}

function createHistoryCsv(records: BoardReleaseArchiveIntelligencePacketHistoryRecord[]) {
  const header = [
    "record_id",
    "created_at",
    "actor_name",
    "actor_email",
    "status",
    "packet_score",
    "section_count",
    "recommendation_count",
    "blocked_sections",
    "blocked_recommendations",
    "packet_hash",
    "content_hash",
  ];
  const body = records.map((record) =>
    [
      record.id,
      record.createdAt,
      record.actor.name,
      record.actor.email,
      record.status,
      record.packetScore,
      record.sectionCount,
      record.recommendationCount,
      record.blockedSectionCount,
      record.blockedRecommendationCount,
      record.packetHash,
      record.contentHash,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardReleaseArchiveIntelligencePacketHistoryReport(
  records: BoardReleaseArchiveIntelligencePacketHistoryRecord[],
): BoardReleaseArchiveIntelligencePacketHistoryReport {
  const sortedRecords = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const actorKeys = new Set(sortedRecords.map((record) => record.actor.userId ?? record.actor.email ?? record.actor.name ?? "unknown"));
  const csvContent = createHistoryCsv(sortedRecords);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    records: sortedRecords,
    summary: {
      actorCount: actorKeys.size,
      blockedPacketCount: sortedRecords.filter((record) => record.status === "blocked").length,
      latestPacketHash: sortedRecords[0]?.packetHash ?? null,
      latestSavedAt: sortedRecords[0]?.createdAt ?? null,
      readyPacketCount: sortedRecords.filter((record) => record.status === "ready").length,
      totalPacketCount: sortedRecords.length,
      watchPacketCount: sortedRecords.filter((record) => record.status === "watch").length,
    },
  };
}

export function getBoardReleaseArchiveIntelligencePacketHistoryDownload(
  record: BoardReleaseArchiveIntelligencePacketHistoryRecord,
  format: BoardReleaseArchiveIntelligencePacketHistoryFormat,
) {
  if (format === "json") {
    return {
      body: createBoardReleaseArchiveIntelligencePacketJson(record.packet),
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createBoardReleaseArchiveIntelligencePacketCsv(record.packet),
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
