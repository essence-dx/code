import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import {
  createWorkspaceRiskDigestAuditCsv,
  createWorkspaceRiskDigestCsv,
  createWorkspaceRiskDigestFileName,
  createWorkspaceRiskDigestJson,
  type WorkspaceRiskDigestFormat,
  type WorkspaceRiskDigestLevel,
  type WorkspaceRiskDigestReport,
} from "@/features/projects/workspace-risk-digest";

export interface WorkspaceRiskDigestPacketActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface WorkspaceRiskDigestPacketRecord {
  actor: WorkspaceRiskDigestPacketActor;
  auditCsvByteSize: number;
  auditCsvFileName: string;
  auditEventCount: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  digest: WorkspaceRiskDigestReport;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  packetId: string;
  riskLevel: WorkspaceRiskDigestLevel;
  score: number;
  workspaceId: string;
  workspaceName: string;
}

export interface WorkspaceRiskDigestPacketHistoryReport {
  packets: WorkspaceRiskDigestPacketRecord[];
  summary: {
    actorCount: number;
    auditEventCount: number;
    criticalPacketCount: number;
    healthyPacketCount: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    totalPacketCount: number;
    watchPacketCount: number;
  };
}

export interface CreateWorkspaceRiskDigestPacketRecordInput {
  actor: WorkspaceRiskDigestPacketActor;
  createdAt?: string;
  digest: WorkspaceRiskDigestReport;
  id?: string;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function createWorkspaceRiskDigestContentHash(report: WorkspaceRiskDigestReport) {
  return `sha256:${createHash("sha256").update(createWorkspaceRiskDigestJson(report)).digest("hex")}`;
}

export function isWorkspaceRiskDigestReport(value: unknown): value is WorkspaceRiskDigestReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<WorkspaceRiskDigestReport>;

  return (
    report.schemaVersion === 1 &&
    typeof report.packetId === "string" &&
    typeof report.generatedAt === "string" &&
    typeof report.score === "number" &&
    (report.riskLevel === "critical" || report.riskLevel === "healthy" || report.riskLevel === "watch") &&
    !!report.workspace &&
    typeof report.workspace.id === "string" &&
    typeof report.workspace.name === "string" &&
    Array.isArray(report.actionItems) &&
    !!report.audit &&
    Array.isArray(report.audit.rows) &&
    !!report.publicHealth &&
    !!report.runbook &&
    !!report.incidents &&
    !!report.trust
  );
}

export function createWorkspaceRiskDigestPacketRecord(input: CreateWorkspaceRiskDigestPacketRecordInput): WorkspaceRiskDigestPacketRecord {
  const json = createWorkspaceRiskDigestJson(input.digest);
  const csv = createWorkspaceRiskDigestCsv(input.digest);
  const auditCsv = createWorkspaceRiskDigestAuditCsv(input.digest);

  return {
    actor: input.actor,
    auditCsvByteSize: byteSize(auditCsv),
    auditCsvFileName: createWorkspaceRiskDigestFileName(input.digest, "audit-csv"),
    auditEventCount: input.digest.audit.rows.length,
    contentHash: createWorkspaceRiskDigestContentHash(input.digest),
    createdAt: input.createdAt ?? new Date().toISOString(),
    csvByteSize: byteSize(csv),
    csvFileName: createWorkspaceRiskDigestFileName(input.digest, "csv"),
    digest: input.digest,
    id: input.id ?? nanoid(),
    jsonByteSize: byteSize(json),
    jsonFileName: createWorkspaceRiskDigestFileName(input.digest, "json"),
    packetId: input.digest.packetId,
    riskLevel: input.digest.riskLevel,
    score: input.digest.score,
    workspaceId: input.digest.workspace.id,
    workspaceName: input.digest.workspace.name,
  };
}

export function createWorkspaceRiskDigestPacketHistoryReport(records: WorkspaceRiskDigestPacketRecord[]): WorkspaceRiskDigestPacketHistoryReport {
  const packets = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const actorIds = new Set(packets.map((packet) => packet.actor.userId ?? packet.actor.email ?? packet.actor.name ?? "unknown"));

  return {
    packets,
    summary: {
      actorCount: actorIds.size,
      auditEventCount: packets.reduce((sum, packet) => sum + packet.auditEventCount, 0),
      criticalPacketCount: packets.filter((packet) => packet.riskLevel === "critical").length,
      healthyPacketCount: packets.filter((packet) => packet.riskLevel === "healthy").length,
      latestContentHash: packets[0]?.contentHash ?? null,
      latestSavedAt: packets[0]?.createdAt ?? null,
      totalPacketCount: packets.length,
      watchPacketCount: packets.filter((packet) => packet.riskLevel === "watch").length,
    },
  };
}

export function getWorkspaceRiskDigestPacketDownload(packet: WorkspaceRiskDigestPacketRecord, format: WorkspaceRiskDigestFormat) {
  if (format === "json") {
    return {
      body: createWorkspaceRiskDigestJson(packet.digest),
      fileName: packet.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  if (format === "audit-csv") {
    return {
      body: createWorkspaceRiskDigestAuditCsv(packet.digest),
      fileName: packet.auditCsvFileName,
      mimeType: "text/csv;charset=utf-8",
    };
  }

  return {
    body: createWorkspaceRiskDigestCsv(packet.digest),
    fileName: packet.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
