import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceRiskDigestPacket } from "@/db/schema";
import {
  createWorkspaceRiskDigestPacketHistoryReport,
  createWorkspaceRiskDigestPacketRecord,
  getWorkspaceRiskDigestPacketDownload,
  type WorkspaceRiskDigestPacketHistoryReport,
  type WorkspaceRiskDigestPacketRecord,
} from "@/features/projects/workspace-risk-digest-history";
import type { WorkspaceRiskDigestFormat, WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

const digestManagerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

type RiskDigestManagerAccess = { role: WorkspaceRole } | { error: string; status: 403 | 404 };

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceRiskDigestPacketSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_risk_digest_packet (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        packet_id text NOT NULL,
        content_hash text NOT NULL,
        risk_level text NOT NULL,
        score integer NOT NULL,
        workspace_name text NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        audit_csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        audit_csv_byte_size integer NOT NULL,
        audit_event_count integer NOT NULL,
        digest text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_risk_digest_packet_workspace_idx ON workspace_risk_digest_packet(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_risk_digest_packet_actor_idx ON workspace_risk_digest_packet(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_risk_digest_packet_created_idx ON workspace_risk_digest_packet(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_risk_digest_packet_hash_idx ON workspace_risk_digest_packet(workspace_id, content_hash)");
  })();

  await schemaReady;
}

function parseDigest(value: WorkspaceRiskDigestReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as WorkspaceRiskDigestReport) : value;
}

function mapPacketRow(row: typeof workspaceRiskDigestPacket.$inferSelect): WorkspaceRiskDigestPacketRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    auditCsvByteSize: row.auditCsvByteSize,
    auditCsvFileName: row.auditCsvFileName,
    auditEventCount: row.auditEventCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    digest: parseDigest(row.digest),
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    packetId: row.packetId,
    riskLevel: row.riskLevel,
    score: row.score,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
  };
}

async function requireRiskDigestManager(workspaceId: string, currentUserId: string): Promise<RiskDigestManagerAccess> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found", status: 404 as const };
  }

  if (!digestManagerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage risk digest packet history.", status: 403 as const };
  }

  return { role: access.role };
}

async function getActor(userId: string) {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

export async function listWorkspaceRiskDigestPacketHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<WorkspaceRiskDigestPacketHistoryReport | { error: string; status: 403 | 404 }> {
  await ensureWorkspaceRiskDigestPacketSchema();

  const access = await requireRiskDigestManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceRiskDigestPacket)
    .where(eq(workspaceRiskDigestPacket.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceRiskDigestPacket.createdAt))
    .limit(input.limit ?? 12);

  return createWorkspaceRiskDigestPacketHistoryReport(rows.map(mapPacketRow));
}

export async function recordWorkspaceRiskDigestPacket(input: {
  currentUserId: string;
  report: WorkspaceRiskDigestReport;
  workspaceId: string;
}): Promise<{ packet: WorkspaceRiskDigestPacketRecord } | { error: string; status: 400 | 403 | 404 }> {
  await ensureWorkspaceRiskDigestPacketSchema();

  if (input.report.workspace.id !== input.workspaceId) {
    return { error: "Digest workspace does not match the requested workspace.", status: 400 };
  }

  const access = await requireRiskDigestManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const packet = createWorkspaceRiskDigestPacketRecord({
    actor: await getActor(input.currentUserId),
    digest: input.report,
  });

  await getDb().insert(workspaceRiskDigestPacket).values({
    actorEmail: packet.actor.email,
    actorName: packet.actor.name,
    actorUserId: packet.actor.userId,
    auditCsvByteSize: packet.auditCsvByteSize,
    auditCsvFileName: packet.auditCsvFileName,
    auditEventCount: packet.auditEventCount,
    contentHash: packet.contentHash,
    createdAt: new Date(packet.createdAt),
    csvByteSize: packet.csvByteSize,
    csvFileName: packet.csvFileName,
    digest: packet.digest,
    id: packet.id,
    jsonByteSize: packet.jsonByteSize,
    jsonFileName: packet.jsonFileName,
    packetId: packet.packetId,
    riskLevel: packet.riskLevel,
    score: packet.score,
    workspaceId: packet.workspaceId,
    workspaceName: packet.workspaceName,
  });

  return { packet };
}

export async function getWorkspaceRiskDigestPacketDownloadResponse(input: {
  currentUserId: string;
  format: WorkspaceRiskDigestFormat;
  packetId: string;
  workspaceId: string;
}): Promise<{ body: string; fileName: string; mimeType: string } | { error: string; status: 400 | 403 | 404 }> {
  await ensureWorkspaceRiskDigestPacketSchema();

  const access = await requireRiskDigestManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceRiskDigestPacket)
    .where(and(eq(workspaceRiskDigestPacket.workspaceId, input.workspaceId), eq(workspaceRiskDigestPacket.id, input.packetId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Risk digest packet not found.", status: 404 };
  }

  return getWorkspaceRiskDigestPacketDownload(mapPacketRow(row), input.format);
}
