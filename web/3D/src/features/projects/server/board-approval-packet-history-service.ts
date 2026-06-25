import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardApprovalPacket } from "@/db/schema";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import {
  createBoardApprovalPacketHistoryRecord,
  createBoardApprovalPacketHistoryReport,
  getBoardApprovalPacketHistoryDownload,
  recordBoardApprovalPacketHistoryDownload,
  revokeBoardApprovalPacketHistoryRecord,
  type BoardApprovalPacketHistoryActor,
  type BoardApprovalPacketHistoryAuditEvent,
  type BoardApprovalPacketHistoryFormat,
  type BoardApprovalPacketHistoryRecord,
  type BoardApprovalPacketHistoryReport,
} from "@/features/projects/board-approval-packet-history";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardApprovalPacketSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_approval_packet (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        created_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        created_by_name text,
        created_by_email text,
        packet_id text NOT NULL,
        content_hash text NOT NULL,
        record_status text NOT NULL DEFAULT 'active',
        approval_status text NOT NULL,
        approval_score integer NOT NULL,
        blocked_sign_off_count integer NOT NULL,
        watch_sign_off_count integer NOT NULL,
        ready_sign_off_count integer NOT NULL,
        critical_path_count integer NOT NULL,
        recipient_email text,
        recipient_name text,
        recipient_purpose text NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        packet text NOT NULL,
        revoked_at integer,
        revoked_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        revoked_by_name text,
        revoked_by_email text,
        revoke_reason text,
        download_count integer NOT NULL DEFAULT 0,
        audit_trail text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_workspace_idx ON workspace_board_approval_packet(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_created_by_idx ON workspace_board_approval_packet(created_by_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_packet_idx ON workspace_board_approval_packet(workspace_id, packet_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_status_idx ON workspace_board_approval_packet(workspace_id, record_status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_created_idx ON workspace_board_approval_packet(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_approval_packet_hash_idx ON workspace_board_approval_packet(workspace_id, content_hash)");
  })();

  await schemaReady;
}

async function requireBoardPacketManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board approval packets.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardApprovalPacketHistoryActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parsePacket(value: BoardApprovalPacketReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as BoardApprovalPacketReport) : value;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(value: string) {
  return toDate(value) ?? new Date();
}

function mapPacketRow(row: typeof workspaceBoardApprovalPacket.$inferSelect): BoardApprovalPacketHistoryRecord {
  return {
    approvalScore: row.approvalScore,
    approvalStatus: row.approvalStatus,
    auditTrail: parseJsonValue<BoardApprovalPacketHistoryAuditEvent[]>(row.auditTrail, []),
    blockedSignOffCount: row.blockedSignOffCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    createdBy: {
      email: row.createdByEmail,
      name: row.createdByName,
      userId: row.createdByUserId,
    },
    criticalPathCount: row.criticalPathCount,
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    downloadCount: row.downloadCount,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    packet: parsePacket(row.packet),
    packetId: row.packetId,
    readySignOffCount: row.readySignOffCount,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    recipientPurpose: row.recipientPurpose,
    revokedAt: toIso(row.revokedAt),
    revokedBy: row.revokedByUserId
      ? {
          email: row.revokedByEmail,
          name: row.revokedByName,
          userId: row.revokedByUserId,
        }
      : null,
    revokeReason: row.revokeReason,
    status: row.recordStatus,
    updatedAt: row.updatedAt.toISOString(),
    watchSignOffCount: row.watchSignOffCount,
    workspaceId: row.workspaceId,
  };
}

async function loadWorkspaceBoardPackets(workspaceId: string, limit = 12) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardApprovalPacket)
    .where(eq(workspaceBoardApprovalPacket.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardApprovalPacket.createdAt))
    .limit(limit);

  return rows.map(mapPacketRow);
}

function createReport(records: BoardApprovalPacketHistoryRecord[]): BoardApprovalPacketHistoryReport {
  return createBoardApprovalPacketHistoryReport(records);
}

async function updatePacketRow(record: BoardApprovalPacketHistoryRecord) {
  await getDb()
    .update(workspaceBoardApprovalPacket)
    .set({
      auditTrail: record.auditTrail,
      downloadCount: record.downloadCount,
      recordStatus: record.status,
      revokedAt: toDate(record.revokedAt),
      revokedByEmail: record.revokedBy?.email ?? null,
      revokedByName: record.revokedBy?.name ?? null,
      revokedByUserId: record.revokedBy?.userId ?? null,
      revokeReason: record.revokeReason,
      updatedAt: requiredDate(record.updatedAt),
    })
    .where(eq(workspaceBoardApprovalPacket.id, record.id));
}

export async function listWorkspaceBoardApprovalPacketHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardApprovalPacketHistoryReport>> {
  await ensureWorkspaceBoardApprovalPacketSchema();

  const access = await requireBoardPacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceBoardPackets(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardApprovalPacket(input: {
  currentUserId: string;
  packet: BoardApprovalPacketReport;
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientPurpose: string;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardApprovalPacketHistoryReport; record: BoardApprovalPacketHistoryRecord }>> {
  await ensureWorkspaceBoardApprovalPacketSchema();

  const access = await requireBoardPacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const record = createBoardApprovalPacketHistoryRecord({
    actor: await getActor(input.currentUserId),
    packet: input.packet,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    recipientPurpose: input.recipientPurpose,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceBoardApprovalPacket).values({
    approvalScore: record.approvalScore,
    approvalStatus: record.approvalStatus,
    auditTrail: record.auditTrail,
    blockedSignOffCount: record.blockedSignOffCount,
    contentHash: record.contentHash,
    createdAt: requiredDate(record.createdAt),
    createdByEmail: record.createdBy.email,
    createdByName: record.createdBy.name,
    createdByUserId: record.createdBy.userId,
    criticalPathCount: record.criticalPathCount,
    csvByteSize: record.csvByteSize,
    csvFileName: record.csvFileName,
    downloadCount: record.downloadCount,
    id: record.id,
    jsonByteSize: record.jsonByteSize,
    jsonFileName: record.jsonFileName,
    packet: record.packet,
    packetId: record.packetId,
    readySignOffCount: record.readySignOffCount,
    recipientEmail: record.recipientEmail,
    recipientName: record.recipientName,
    recipientPurpose: record.recipientPurpose,
    recordStatus: record.status,
    revokedAt: toDate(record.revokedAt),
    revokedByEmail: record.revokedBy?.email ?? null,
    revokedByName: record.revokedBy?.name ?? null,
    revokedByUserId: record.revokedBy?.userId ?? null,
    revokeReason: record.revokeReason,
    updatedAt: requiredDate(record.updatedAt),
    watchSignOffCount: record.watchSignOffCount,
    workspaceId: record.workspaceId,
  });

  return {
    history: createReport(await loadWorkspaceBoardPackets(input.workspaceId)),
    record,
  };
}

async function getWorkspacePacketRecord(input: { packetRecordId: string; workspaceId: string }) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardApprovalPacket)
    .where(and(eq(workspaceBoardApprovalPacket.workspaceId, input.workspaceId), eq(workspaceBoardApprovalPacket.id, input.packetRecordId)))
    .limit(1);

  return rows[0] ? mapPacketRow(rows[0]) : null;
}

export async function revokeWorkspaceBoardApprovalPacket(input: {
  currentUserId: string;
  packetRecordId: string;
  reason?: string | null;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardApprovalPacketHistoryReport; record: BoardApprovalPacketHistoryRecord }>> {
  await ensureWorkspaceBoardApprovalPacketSchema();

  const access = await requireBoardPacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const record = await getWorkspacePacketRecord({
    packetRecordId: input.packetRecordId,
    workspaceId: input.workspaceId,
  });

  if (!record) {
    return { error: "Board approval packet not found.", status: 404 };
  }

  const revoked = revokeBoardApprovalPacketHistoryRecord(record, {
    actor: await getActor(input.currentUserId),
    reason: input.reason,
  });

  await updatePacketRow(revoked);

  return {
    history: createReport(await loadWorkspaceBoardPackets(input.workspaceId)),
    record: revoked,
  };
}

export async function getWorkspaceBoardApprovalPacketDownloadResponse(input: {
  currentUserId: string;
  format: BoardApprovalPacketHistoryFormat;
  packetRecordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardApprovalPacketSchema();

  const access = await requireBoardPacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const record = await getWorkspacePacketRecord({
    packetRecordId: input.packetRecordId,
    workspaceId: input.workspaceId,
  });

  if (!record) {
    return { error: "Board approval packet not found.", status: 404 };
  }

  if (record.status === "revoked") {
    return { error: "Board approval packet has been revoked.", status: 410 };
  }

  const downloaded = recordBoardApprovalPacketHistoryDownload(record, {
    actor: await getActor(input.currentUserId),
    format: input.format,
  });

  await updatePacketRow(downloaded);

  return getBoardApprovalPacketHistoryDownload(downloaded, input.format);
}
