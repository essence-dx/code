import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardReleaseArchiveIntelligencePacket } from "@/db/schema";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import {
  createBoardReleaseArchiveIntelligencePacketHistoryRecord,
  createBoardReleaseArchiveIntelligencePacketHistoryReport,
  getBoardReleaseArchiveIntelligencePacketHistoryDownload,
  type BoardReleaseArchiveIntelligencePacketHistoryActor,
  type BoardReleaseArchiveIntelligencePacketHistoryFormat,
  type BoardReleaseArchiveIntelligencePacketHistoryRecord,
  type BoardReleaseArchiveIntelligencePacketHistoryReport,
} from "@/features/projects/board-release-archive-intelligence-packet-history";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: 400 | 403 | 404 };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardReleaseArchiveIntelligencePacketSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_release_archive_intelligence_packet (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        content_hash text NOT NULL,
        packet_hash text NOT NULL,
        packet_status text NOT NULL,
        packet_score integer NOT NULL,
        section_count integer NOT NULL,
        recommendation_count integer NOT NULL,
        blocked_section_count integer NOT NULL,
        blocked_recommendation_count integer NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        packet text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_release_archive_intelligence_packet_workspace_idx ON workspace_board_release_archive_intelligence_packet(workspace_id)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_release_archive_intelligence_packet_actor_idx ON workspace_board_release_archive_intelligence_packet(actor_user_id)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_release_archive_intelligence_packet_created_idx ON workspace_board_release_archive_intelligence_packet(workspace_id, created_at)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_board_release_archive_intelligence_packet_hash_idx ON workspace_board_release_archive_intelligence_packet(workspace_id, packet_hash)",
    );
  })();

  await schemaReady;
}

async function requirePacketManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board release archive intelligence packet history.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardReleaseArchiveIntelligencePacketHistoryActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parsePacket(value: BoardReleaseArchiveIntelligencePacketReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as BoardReleaseArchiveIntelligencePacketReport) : value;
}

function mapPacketRow(row: typeof workspaceBoardReleaseArchiveIntelligencePacket.$inferSelect): BoardReleaseArchiveIntelligencePacketHistoryRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    blockedRecommendationCount: row.blockedRecommendationCount,
    blockedSectionCount: row.blockedSectionCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    packet: parsePacket(row.packet),
    packetHash: row.packetHash,
    packetScore: row.packetScore,
    recommendationCount: row.recommendationCount,
    sectionCount: row.sectionCount,
    status: row.packetStatus,
    workspaceId: row.workspaceId,
  };
}

async function loadHistory(workspaceId: string, limit = 12) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardReleaseArchiveIntelligencePacket)
    .where(eq(workspaceBoardReleaseArchiveIntelligencePacket.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardReleaseArchiveIntelligencePacket.createdAt))
    .limit(limit);

  return rows.map(mapPacketRow);
}

export async function listWorkspaceBoardReleaseArchiveIntelligencePacketHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardReleaseArchiveIntelligencePacketHistoryReport>> {
  await ensureWorkspaceBoardReleaseArchiveIntelligencePacketSchema();

  const access = await requirePacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createBoardReleaseArchiveIntelligencePacketHistoryReport(await loadHistory(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardReleaseArchiveIntelligencePacket(input: {
  currentUserId: string;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardReleaseArchiveIntelligencePacketHistoryReport; record: BoardReleaseArchiveIntelligencePacketHistoryRecord }>> {
  await ensureWorkspaceBoardReleaseArchiveIntelligencePacketSchema();

  if (input.packet.workspaceId !== input.workspaceId) {
    return { error: "Archive intelligence packet workspace does not match the requested workspace.", status: 400 };
  }

  const access = await requirePacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const record = createBoardReleaseArchiveIntelligencePacketHistoryRecord({
    actor: await getActor(input.currentUserId),
    packet: input.packet,
  });

  await getDb().insert(workspaceBoardReleaseArchiveIntelligencePacket).values({
    actorEmail: record.actor.email,
    actorName: record.actor.name,
    actorUserId: record.actor.userId,
    blockedRecommendationCount: record.blockedRecommendationCount,
    blockedSectionCount: record.blockedSectionCount,
    contentHash: record.contentHash,
    createdAt: new Date(record.createdAt),
    csvByteSize: record.csvByteSize,
    csvFileName: record.csvFileName,
    id: record.id,
    jsonByteSize: record.jsonByteSize,
    jsonFileName: record.jsonFileName,
    packet: record.packet,
    packetHash: record.packetHash,
    packetScore: record.packetScore,
    packetStatus: record.status,
    recommendationCount: record.recommendationCount,
    sectionCount: record.sectionCount,
    workspaceId: record.workspaceId,
  });

  return {
    history: createBoardReleaseArchiveIntelligencePacketHistoryReport(await loadHistory(input.workspaceId)),
    record,
  };
}

export async function getWorkspaceBoardReleaseArchiveIntelligencePacketDownloadResponse(input: {
  currentUserId: string;
  format: BoardReleaseArchiveIntelligencePacketHistoryFormat;
  packetRecordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardReleaseArchiveIntelligencePacketSchema();

  const access = await requirePacketManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardReleaseArchiveIntelligencePacket)
    .where(and(eq(workspaceBoardReleaseArchiveIntelligencePacket.workspaceId, input.workspaceId), eq(workspaceBoardReleaseArchiveIntelligencePacket.id, input.packetRecordId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Archive intelligence packet record not found.", status: 404 };
  }

  return getBoardReleaseArchiveIntelligencePacketHistoryDownload(mapPacketRow(row), input.format);
}
