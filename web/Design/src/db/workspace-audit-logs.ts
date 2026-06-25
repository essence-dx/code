import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  user,
  workspaceAuditLog,
  type WorkspaceAuditLogRow,
} from "@/db/schema";

export type WorkspaceAuditAction =
  | "project.created"
  | "project.renamed"
  | "project.moved"
  | "project.trashed"
  | "project.restored"
  | "project.deleted"
  | "project.deletion.blocked"
  | "project.legal_hold.enabled"
  | "project.legal_hold.released"
  | "folder.created"
  | "campaign.created"
  | "campaign.variants.created"
  | "campaign.deliverables.scheduled"
  | "approval.updated"
  | "content.scheduled"
  | "content.rescheduled"
  | "content.status.updated"
  | "content.deleted"
  | "team.created"
  | "team.invite.created"
  | "team.invite.accepted"
  | "team.invite.revoked"
  | "team.member.role.updated"
  | "team.owner.transferred"
  | "automation.recipe.applied"
  | "website.published"
  | "website.unpublished"
  | "website.domain.added"
  | "website.domain.verified"
  | "website.domain.attached"
  | "website.domain.refreshed"
  | "website.domain.deleted"
  | "asset.deleted"
  | "asset.duplicates_deleted"
  | "template.marketplace.updated"
  | "auth.verification.sent"
  | "auth.two_factor.enabled"
  | "auth.two_factor.disabled"
  | "release.override.requested"
  | "release.operation.blocked"
  | "collaboration.operation.merged"
  | "collaboration.operation.conflicted"
  | "extension.installed"
  | "extension.removed"
  | "workflow_template.installed";

export type WorkspaceAuditLogSummary = {
  id: string;
  action: WorkspaceAuditAction | string;
  targetType: string;
  targetId: string | null;
  summary: string;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function parseAuditMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toSummary(input: {
  row: WorkspaceAuditLogRow;
  actorEmail: string | null;
}): WorkspaceAuditLogSummary {
  return {
    id: input.row.id,
    action: input.row.action,
    targetType: input.row.targetType,
    targetId: input.row.targetId,
    summary: input.row.summary,
    actorEmail: input.actorEmail,
    metadata: parseAuditMetadata(input.row.metadata),
    createdAt: input.row.createdAt.toISOString(),
  };
}

export async function createWorkspaceAuditLog(input: {
  userId: string;
  actorUserId?: string | null;
  action: WorkspaceAuditAction;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const [row] = await getDb()
    .insert(workspaceAuditLog)
    .values({
      id: nanoid(),
      userId: input.userId,
      actorUserId: input.actorUserId ?? input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary.trim().slice(0, 240) || input.action,
      metadata: JSON.stringify(input.metadata ?? {}),
      createdAt: new Date(),
    })
    .returning();

  return row;
}

export async function listWorkspaceAuditLogs(userId: string) {
  const rows = await getDb()
    .select({
      log: workspaceAuditLog,
      actorEmail: user.email,
    })
    .from(workspaceAuditLog)
    .leftJoin(user, eq(workspaceAuditLog.actorUserId, user.id))
    .where(eq(workspaceAuditLog.userId, userId))
    .orderBy(desc(workspaceAuditLog.createdAt))
    .limit(30);

  return rows.map((row) =>
    toSummary({
      row: row.log,
      actorEmail: row.actorEmail,
    }),
  );
}

export async function hasActiveProjectLegalHold(input: {
  userId: string;
  projectId: string;
}) {
  const rows = await getDb()
    .select()
    .from(workspaceAuditLog)
    .where(
      and(
        eq(workspaceAuditLog.userId, input.userId),
        eq(workspaceAuditLog.targetType, "project"),
        eq(workspaceAuditLog.targetId, input.projectId),
      ),
    )
    .orderBy(desc(workspaceAuditLog.createdAt))
    .limit(50);

  for (const row of rows) {
    if (row.action === "project.legal_hold.released") return false;
    if (row.action === "project.legal_hold.enabled") return true;
  }

  return false;
}
