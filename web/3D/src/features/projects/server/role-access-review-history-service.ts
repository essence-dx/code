import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceRoleAccessReviewAttestation, workspaceRoleAccessReviewReminderDelivery } from "@/db/schema";
import type { RoleAccessReviewCampaignReport } from "@/features/projects/role-access-review-campaigns";
import {
  createRoleAccessReviewAttestationRows,
  createRoleAccessReviewHistoryReport,
  createRoleAccessReviewReminderDeliveryRows,
  type RoleAccessReviewAttestationRecord,
  type RoleAccessReviewHistoryReport,
  type RoleAccessReviewPersistedAttestationStatus,
  type RoleAccessReviewReminderDeliveryRecord,
} from "@/features/projects/role-access-review-history";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const roleAccessReviewManagerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceRoleAccessReviewHistorySchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_role_access_review_attestation (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        campaign_id text NOT NULL,
        scope_hash text NOT NULL,
        member_id text NOT NULL,
        member_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        member_email text NOT NULL,
        member_name text NOT NULL,
        workspace_role text NOT NULL,
        status text NOT NULL,
        note text,
        grant_evidence text NOT NULL,
        review_scope_count integer NOT NULL,
        attested_at integer NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_attestation_workspace_idx ON workspace_role_access_review_attestation(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_attestation_actor_idx ON workspace_role_access_review_attestation(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_attestation_member_idx ON workspace_role_access_review_attestation(member_user_id)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_role_access_review_attestation_campaign_idx ON workspace_role_access_review_attestation(workspace_id, campaign_id)",
    );
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_role_access_review_attestation_member_unique_idx ON workspace_role_access_review_attestation(workspace_id, campaign_id, member_id)",
    );
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_role_access_review_reminder_delivery (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        campaign_id text NOT NULL,
        scope_hash text NOT NULL,
        dedupe_key text NOT NULL,
        member_id text NOT NULL,
        member_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        recipient_email text NOT NULL,
        recipient_name text NOT NULL,
        channel text NOT NULL,
        subject text NOT NULL,
        preview_text text NOT NULL,
        status text NOT NULL DEFAULT 'queued',
        provider_message_id text,
        error text,
        sent_at integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_reminder_workspace_idx ON workspace_role_access_review_reminder_delivery(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_reminder_actor_idx ON workspace_role_access_review_reminder_delivery(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_role_access_review_reminder_member_idx ON workspace_role_access_review_reminder_delivery(member_user_id)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_role_access_review_reminder_campaign_idx ON workspace_role_access_review_reminder_delivery(workspace_id, campaign_id)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_role_access_review_reminder_status_idx ON workspace_role_access_review_reminder_delivery(workspace_id, status)",
    );
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS workspace_role_access_review_reminder_dedupe_idx ON workspace_role_access_review_reminder_delivery(dedupe_key)");
  })();

  await schemaReady;
}

async function requireRoleAccessReviewManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!roleAccessReviewManagerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage role-access review history.", status: 403 };
  }

  return { role: access.role };
}

function requireCampaignWorkspace(campaign: RoleAccessReviewCampaignReport, workspaceId: string): { error: string; status: 400 } | null {
  return campaign.workspace.id === workspaceId ? null : { error: "Role-access review campaign does not belong to this workspace.", status: 400 };
}

async function getActor(userId: string) {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapAttestationRow(row: typeof workspaceRoleAccessReviewAttestation.$inferSelect): RoleAccessReviewAttestationRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    attestedAt: row.attestedAt.toISOString(),
    campaignId: row.campaignId,
    grantEvidence: row.grantEvidence,
    id: row.id,
    memberEmail: row.memberEmail,
    memberId: row.memberId,
    memberName: row.memberName,
    memberUserId: row.memberUserId,
    note: row.note,
    reviewScopeCount: row.reviewScopeCount,
    scopeHash: row.scopeHash,
    status: row.status,
    workspaceId: row.workspaceId,
    workspaceRole: row.workspaceRole,
  };
}

function mapReminderRow(row: typeof workspaceRoleAccessReviewReminderDelivery.$inferSelect): RoleAccessReviewReminderDeliveryRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    campaignId: row.campaignId,
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    dedupeKey: row.dedupeKey,
    error: row.error,
    id: row.id,
    memberId: row.memberId,
    memberName: row.recipientName,
    memberUserId: row.memberUserId,
    previewText: row.previewText,
    providerMessageId: row.providerMessageId,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    scopeHash: row.scopeHash,
    sentAt: toIso(row.sentAt),
    status: row.status,
    subject: row.subject,
    workspaceId: row.workspaceId,
  };
}

async function loadHistoryRows(workspaceId: string, campaignId: string) {
  const attestations = await getDb()
    .select()
    .from(workspaceRoleAccessReviewAttestation)
    .where(and(eq(workspaceRoleAccessReviewAttestation.workspaceId, workspaceId), eq(workspaceRoleAccessReviewAttestation.campaignId, campaignId)))
    .orderBy(desc(workspaceRoleAccessReviewAttestation.attestedAt));
  const reminders = await getDb()
    .select()
    .from(workspaceRoleAccessReviewReminderDelivery)
    .where(and(eq(workspaceRoleAccessReviewReminderDelivery.workspaceId, workspaceId), eq(workspaceRoleAccessReviewReminderDelivery.campaignId, campaignId)))
    .orderBy(desc(workspaceRoleAccessReviewReminderDelivery.createdAt));

  return {
    attestations: attestations.map(mapAttestationRow),
    reminders: reminders.map(mapReminderRow),
  };
}

export async function listWorkspaceRoleAccessReviewHistory(input: {
  campaign: RoleAccessReviewCampaignReport;
  currentUserId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ history: RoleAccessReviewHistoryReport }>> {
  await ensureWorkspaceRoleAccessReviewHistorySchema();

  const access = await requireRoleAccessReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceError = requireCampaignWorkspace(input.campaign, input.workspaceId);

  if (workspaceError) {
    return workspaceError;
  }

  const rows = await loadHistoryRows(input.workspaceId, input.campaign.campaignId);

  return {
    history: createRoleAccessReviewHistoryReport({
      ...rows,
      campaign: input.campaign,
    }),
  };
}

export async function recordWorkspaceRoleAccessReviewAttestations(input: {
  campaign: RoleAccessReviewCampaignReport;
  currentUserId: string;
  note?: string | null;
  statusesByMemberId?: Partial<Record<string, RoleAccessReviewPersistedAttestationStatus>>;
  workspaceId: string;
}): Promise<ServiceResult<{ history: RoleAccessReviewHistoryReport; savedCount: number }>> {
  await ensureWorkspaceRoleAccessReviewHistorySchema();

  const access = await requireRoleAccessReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceError = requireCampaignWorkspace(input.campaign, input.workspaceId);

  if (workspaceError) {
    return workspaceError;
  }

  const statusesByMemberId =
    input.statusesByMemberId ??
    Object.fromEntries(input.campaign.rows.filter((row) => row.attestationStatus !== "approved").map((row) => [row.memberId, "approved" as const]));
  const rows = createRoleAccessReviewAttestationRows({
    actor: await getActor(input.currentUserId),
    campaign: input.campaign,
    note: input.note,
    statusesByMemberId,
  });
  const now = new Date();
  const existing =
    rows.length > 0
      ? await getDb()
          .select({ id: workspaceRoleAccessReviewAttestation.id, memberId: workspaceRoleAccessReviewAttestation.memberId })
          .from(workspaceRoleAccessReviewAttestation)
          .where(and(eq(workspaceRoleAccessReviewAttestation.workspaceId, input.workspaceId), eq(workspaceRoleAccessReviewAttestation.campaignId, input.campaign.campaignId), inArray(workspaceRoleAccessReviewAttestation.memberId, rows.map((row) => row.memberId))))
      : [];
  const existingIdByMemberId = new Map(existing.map((row) => [row.memberId, row.id]));

  for (const row of rows) {
    const existingId = existingIdByMemberId.get(row.memberId);
    const values = {
      actorEmail: row.actor.email,
      actorName: row.actor.name,
      actorUserId: row.actor.userId,
      attestedAt: new Date(row.attestedAt),
      campaignId: row.campaignId,
      grantEvidence: row.grantEvidence,
      memberEmail: row.memberEmail,
      memberId: row.memberId,
      memberName: row.memberName,
      memberUserId: row.memberUserId,
      note: row.note,
      reviewScopeCount: row.reviewScopeCount,
      scopeHash: row.scopeHash,
      status: row.status,
      updatedAt: now,
      workspaceId: row.workspaceId,
      workspaceRole: row.workspaceRole,
    };

    if (existingId) {
      await getDb().update(workspaceRoleAccessReviewAttestation).set(values).where(eq(workspaceRoleAccessReviewAttestation.id, existingId));
    } else {
      await getDb()
        .insert(workspaceRoleAccessReviewAttestation)
        .values({
          ...values,
          createdAt: now,
          id: row.id,
        });
    }
  }

  const history = await listWorkspaceRoleAccessReviewHistory({
    campaign: input.campaign,
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in history) {
    return history;
  }

  return {
    history: history.history,
    savedCount: rows.length,
  };
}

export async function queueWorkspaceRoleAccessReviewReminders(input: {
  campaign: RoleAccessReviewCampaignReport;
  currentUserId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ createdCount: number; history: RoleAccessReviewHistoryReport }>> {
  await ensureWorkspaceRoleAccessReviewHistorySchema();

  const access = await requireRoleAccessReviewManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceError = requireCampaignWorkspace(input.campaign, input.workspaceId);

  if (workspaceError) {
    return workspaceError;
  }

  const rows = createRoleAccessReviewReminderDeliveryRows({
    actor: await getActor(input.currentUserId),
    campaign: input.campaign,
  });
  const existing =
    rows.length > 0
      ? await getDb()
          .select({ dedupeKey: workspaceRoleAccessReviewReminderDelivery.dedupeKey })
          .from(workspaceRoleAccessReviewReminderDelivery)
          .where(inArray(workspaceRoleAccessReviewReminderDelivery.dedupeKey, rows.map((row) => row.dedupeKey)))
      : [];
  const existingKeys = new Set(existing.map((row) => row.dedupeKey));
  const createdRows = rows.filter((row) => !existingKeys.has(row.dedupeKey));
  const now = new Date();

  if (createdRows.length > 0) {
    await getDb()
      .insert(workspaceRoleAccessReviewReminderDelivery)
      .values(
        createdRows.map((row) => ({
          actorEmail: row.actor.email,
          actorName: row.actor.name,
          actorUserId: row.actor.userId,
          campaignId: row.campaignId,
          channel: row.channel,
          createdAt: now,
          dedupeKey: row.dedupeKey,
          error: row.error,
          id: row.id,
          memberId: row.memberId,
          memberUserId: row.memberUserId,
          previewText: row.previewText,
          providerMessageId: row.providerMessageId,
          recipientEmail: row.recipientEmail,
          recipientName: row.recipientName,
          scopeHash: row.scopeHash,
          sentAt: row.sentAt ? new Date(row.sentAt) : null,
          status: row.status,
          subject: row.subject,
          updatedAt: now,
          workspaceId: row.workspaceId,
        })),
      );
  }

  const history = await listWorkspaceRoleAccessReviewHistory({
    campaign: input.campaign,
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in history) {
    return history;
  }

  return {
    createdCount: createdRows.length,
    history: history.history,
  };
}
