import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceCompliancePacketShare } from "@/db/schema";
import {
  createSignedCompliancePacketShareRecord,
  createSignedCompliancePacketShareReport,
  getSignedCompliancePacketShareStatus,
  recordSignedCompliancePacketShareAccess,
  revokeSignedCompliancePacketShareRecord,
  signedCompliancePacketShareTokenDigest,
  type SignedCompliancePacketShareActor,
  type SignedCompliancePacketShareAuditEvent,
  type SignedCompliancePacketShareRecord,
  type SignedCompliancePacketShareReport,
  type SignedCompliancePacketShareSource,
} from "@/features/projects/compliance-packet-sharing";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceCompliancePacketShareSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_compliance_packet_share (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        created_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        created_by_name text,
        created_by_email text,
        packet_id text NOT NULL,
        packet_kind text NOT NULL,
        source_label text NOT NULL,
        content_hash text NOT NULL,
        packet_body text,
        key_id text,
        signed_at integer,
        signer text,
        verification_state text NOT NULL,
        packet_status text NOT NULL,
        recipient_email text NOT NULL,
        recipient_name text,
        access_purpose text NOT NULL,
        token_digest text NOT NULL,
        share_url text NOT NULL,
        expires_at integer NOT NULL,
        revoked_at integer,
        revoked_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        revoked_by_name text,
        revoked_by_email text,
        revoke_reason text,
        last_accessed_at integer,
        access_count integer NOT NULL DEFAULT 0,
        download_count integer NOT NULL DEFAULT 0,
        audit_trail text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_compliance_packet_share_workspace_idx ON workspace_compliance_packet_share(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_compliance_packet_share_packet_idx ON workspace_compliance_packet_share(workspace_id, packet_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_compliance_packet_share_recipient_idx ON workspace_compliance_packet_share(workspace_id, recipient_email)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_compliance_packet_share_expires_idx ON workspace_compliance_packet_share(workspace_id, expires_at)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS workspace_compliance_packet_share_token_idx ON workspace_compliance_packet_share(token_digest)");
  })();

  await schemaReady;
}

async function requireComplianceShareManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage compliance packet shares.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<SignedCompliancePacketShareActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parseAuditTrail(value: SignedCompliancePacketShareAuditEvent[] | string | null | undefined): SignedCompliancePacketShareAuditEvent[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as SignedCompliancePacketShareAuditEvent[]) : [];
  } catch {
    return [];
  }
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

function mapShareRow(row: typeof workspaceCompliancePacketShare.$inferSelect): SignedCompliancePacketShareRecord {
  const record = {
    accessCount: row.accessCount,
    accessPurpose: row.accessPurpose,
    auditTrail: parseAuditTrail(row.auditTrail),
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    createdBy: {
      email: row.createdByEmail,
      name: row.createdByName,
      userId: row.createdByUserId,
    },
    downloadCount: row.downloadCount,
    expiresAt: row.expiresAt.toISOString(),
    id: row.id,
    keyId: row.keyId,
    lastAccessedAt: toIso(row.lastAccessedAt),
    packetBody: row.packetBody,
    packetId: row.packetId,
    packetKind: row.packetKind,
    packetStatus: row.packetStatus,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    revokedAt: toIso(row.revokedAt),
    revokedBy: row.revokedByUserId
      ? {
          email: row.revokedByEmail,
          name: row.revokedByName,
          userId: row.revokedByUserId,
        }
      : null,
    revokeReason: row.revokeReason,
    shareUrl: row.shareUrl,
    signedAt: toIso(row.signedAt),
    signer: row.signer,
    sourceLabel: row.sourceLabel,
    tokenDigest: row.tokenDigest,
    updatedAt: row.updatedAt.toISOString(),
    verificationState: row.verificationState,
    workspaceId: row.workspaceId,
  };

  return {
    ...record,
    status: getSignedCompliancePacketShareStatus(record),
  };
}

async function loadWorkspaceShareRecords(workspaceId: string, limit = 20) {
  const rows = await getDb()
    .select()
    .from(workspaceCompliancePacketShare)
    .where(eq(workspaceCompliancePacketShare.workspaceId, workspaceId))
    .orderBy(desc(workspaceCompliancePacketShare.createdAt))
    .limit(limit);

  return rows.map(mapShareRow);
}

async function updateShareRow(record: SignedCompliancePacketShareRecord) {
  await getDb()
    .update(workspaceCompliancePacketShare)
    .set({
      accessCount: record.accessCount,
      auditTrail: record.auditTrail,
      downloadCount: record.downloadCount,
      lastAccessedAt: toDate(record.lastAccessedAt),
      revokedAt: toDate(record.revokedAt),
      revokedByEmail: record.revokedBy?.email ?? null,
      revokedByName: record.revokedBy?.name ?? null,
      revokedByUserId: record.revokedBy?.userId ?? null,
      revokeReason: record.revokeReason,
      updatedAt: requiredDate(record.updatedAt),
    })
    .where(eq(workspaceCompliancePacketShare.id, record.id));
}

function createReport(shares: SignedCompliancePacketShareRecord[], workspaceId: string): SignedCompliancePacketShareReport {
  return createSignedCompliancePacketShareReport({
    shares,
    workspaceId,
  });
}

export async function listWorkspaceCompliancePacketShares(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<SignedCompliancePacketShareReport>> {
  await ensureWorkspaceCompliancePacketShareSchema();

  const access = await requireComplianceShareManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceShareRecords(input.workspaceId, input.limit), input.workspaceId);
}

export async function createWorkspaceCompliancePacketShare(input: {
  accessPurpose: string;
  currentUserId: string;
  expiresAt: string;
  origin: string;
  packet: SignedCompliancePacketShareSource;
  recipientEmail: string;
  recipientName?: string | null;
  workspaceId: string;
}): Promise<ServiceResult<{ report: SignedCompliancePacketShareReport; share: SignedCompliancePacketShareRecord; token: string }>> {
  await ensureWorkspaceCompliancePacketShareSchema();

  const access = await requireComplianceShareManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  if (input.packet.status === "blocked") {
    return { error: "Blocked evidence packets cannot be shared.", status: 400 };
  }

  const expiresAt = requiredDate(input.expiresAt);

  if (expiresAt.getTime() <= Date.now()) {
    return { error: "Share expiry must be in the future.", status: 400 };
  }

  const { record, token } = createSignedCompliancePacketShareRecord({
    accessPurpose: input.accessPurpose,
    actor: await getActor(input.currentUserId),
    expiresAt: expiresAt.toISOString(),
    origin: input.origin,
    packet: input.packet,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceCompliancePacketShare).values({
    accessCount: record.accessCount,
    accessPurpose: record.accessPurpose,
    auditTrail: record.auditTrail,
    contentHash: record.contentHash,
    createdAt: requiredDate(record.createdAt),
    createdByEmail: record.createdBy.email,
    createdByName: record.createdBy.name,
    createdByUserId: record.createdBy.userId,
    downloadCount: record.downloadCount,
    expiresAt: requiredDate(record.expiresAt),
    id: record.id,
    keyId: record.keyId,
    lastAccessedAt: toDate(record.lastAccessedAt),
    packetBody: record.packetBody,
    packetId: record.packetId,
    packetKind: record.packetKind,
    packetStatus: record.packetStatus,
    recipientEmail: record.recipientEmail,
    recipientName: record.recipientName,
    revokedAt: toDate(record.revokedAt),
    revokedByEmail: record.revokedBy?.email ?? null,
    revokedByName: record.revokedBy?.name ?? null,
    revokedByUserId: record.revokedBy?.userId ?? null,
    revokeReason: record.revokeReason,
    shareUrl: record.shareUrl,
    signedAt: toDate(record.signedAt),
    signer: record.signer,
    sourceLabel: record.sourceLabel,
    tokenDigest: record.tokenDigest,
    updatedAt: requiredDate(record.updatedAt),
    verificationState: record.verificationState,
    workspaceId: record.workspaceId,
  });

  return {
    report: createReport(await loadWorkspaceShareRecords(input.workspaceId), input.workspaceId),
    share: record,
    token,
  };
}

export async function revokeWorkspaceCompliancePacketShare(input: {
  currentUserId: string;
  reason?: string | null;
  shareId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ report: SignedCompliancePacketShareReport; share: SignedCompliancePacketShareRecord }>> {
  await ensureWorkspaceCompliancePacketShareSchema();

  const access = await requireComplianceShareManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceCompliancePacketShare)
    .where(and(eq(workspaceCompliancePacketShare.workspaceId, input.workspaceId), eq(workspaceCompliancePacketShare.id, input.shareId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Compliance packet share not found.", status: 404 };
  }

  const share = revokeSignedCompliancePacketShareRecord(mapShareRow(row), {
    actor: await getActor(input.currentUserId),
    reason: input.reason,
  });

  await updateShareRow(share);

  return {
    report: createReport(await loadWorkspaceShareRecords(input.workspaceId), input.workspaceId),
    share,
  };
}

async function getShareByToken(token: string) {
  const tokenDigest = signedCompliancePacketShareTokenDigest(token);
  const rows = await getDb().select().from(workspaceCompliancePacketShare).where(eq(workspaceCompliancePacketShare.tokenDigest, tokenDigest)).limit(1);

  return rows[0] ? mapShareRow(rows[0]) : null;
}

export async function recordWorkspaceCompliancePacketShareAccess(input: {
  action: "downloaded" | "viewed";
  recipientEmail?: string | null;
  token: string;
}): Promise<ServiceResult<{ share: SignedCompliancePacketShareRecord }>> {
  await ensureWorkspaceCompliancePacketShareSchema();

  const share = await getShareByToken(input.token);

  if (!share) {
    return { error: "Compliance packet share not found.", status: 404 };
  }

  const updatedShare = recordSignedCompliancePacketShareAccess(share, {
    action: input.action,
    recipientEmail: input.recipientEmail ?? share.recipientEmail,
  });

  if (updatedShare.updatedAt !== share.updatedAt) {
    await updateShareRow(updatedShare);
  }

  return { share: updatedShare };
}

function createDownloadBody(share: SignedCompliancePacketShareRecord) {
  if (share.packetBody) {
    return {
      body: share.packetBody,
      fileName: `${share.packetId}.json`,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: JSON.stringify(
      {
        accessPurpose: share.accessPurpose,
        contentHash: share.contentHash,
        keyId: share.keyId,
        packetId: share.packetId,
        packetKind: share.packetKind,
        signedAt: share.signedAt,
        signer: share.signer,
        sourceLabel: share.sourceLabel,
        verificationState: share.verificationState,
      },
      null,
      2,
    ),
    fileName: `${share.packetId}-metadata.json`,
    mimeType: "application/json;charset=utf-8",
  };
}

export async function getWorkspaceCompliancePacketShareDownloadResponse(input: {
  token: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string; share: SignedCompliancePacketShareRecord }>> {
  const result = await recordWorkspaceCompliancePacketShareAccess({
    action: "downloaded",
    token: input.token,
  });

  if ("error" in result) {
    return result;
  }

  if (result.share.status !== "active") {
    return { error: `Compliance packet share is ${result.share.status}.`, status: 410 };
  }

  return {
    ...createDownloadBody(result.share),
    share: result.share,
  };
}
