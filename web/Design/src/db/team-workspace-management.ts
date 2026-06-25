import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  getTeamWorkspaceMembership,
  listTeamWorkspaces,
  type TeamWorkspaceInviteRole,
  type TeamWorkspaceRole,
  type TeamWorkspaceSummary,
} from "@/db/team-workspaces";
import {
  teamWorkspace,
  teamWorkspaceInvite,
  teamWorkspaceMember,
  user,
  workspaceAuditLog,
} from "@/db/schema";

export type TeamWorkspaceMemberSummary = {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: TeamWorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

export type TeamWorkspacePendingInviteSummary = {
  id: string;
  workspaceId: string;
  email: string;
  role: TeamWorkspaceInviteRole;
  expiresAt: string;
  createdAt: string;
};

export type TeamWorkspaceActivitySummary = {
  id: string;
  workspaceId: string;
  action: string;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
};

export type TeamWorkspaceManagementSummary = TeamWorkspaceSummary & {
  members: TeamWorkspaceMemberSummary[];
  pendingInvites: TeamWorkspacePendingInviteSummary[];
  recentActivity: TeamWorkspaceActivitySummary[];
};

export async function listTeamWorkspaceManagement(userId: string) {
  const workspaces = await listTeamWorkspaces(userId);
  const workspaceIds = workspaces.map((workspace) => workspace.id);

  if (!workspaceIds.length) {
    return [];
  }

  const [members, pendingInvites, activityRows] = await Promise.all([
    getDb()
      .select({
        member: teamWorkspaceMember,
        email: user.email,
      })
      .from(teamWorkspaceMember)
      .innerJoin(user, eq(teamWorkspaceMember.userId, user.id))
      .where(inArray(teamWorkspaceMember.workspaceId, workspaceIds))
      .orderBy(desc(teamWorkspaceMember.updatedAt)),
    getDb()
      .select()
      .from(teamWorkspaceInvite)
      .where(
        and(
          inArray(teamWorkspaceInvite.workspaceId, workspaceIds),
          isNull(teamWorkspaceInvite.acceptedAt),
          isNull(teamWorkspaceInvite.revokedAt),
          gt(teamWorkspaceInvite.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(teamWorkspaceInvite.createdAt)),
    getDb()
      .select({
        log: workspaceAuditLog,
        actorEmail: user.email,
      })
      .from(workspaceAuditLog)
      .leftJoin(user, eq(workspaceAuditLog.actorUserId, user.id))
      .where(
        and(
          eq(workspaceAuditLog.targetType, "team_workspace"),
          inArray(workspaceAuditLog.targetId, workspaceIds),
        ),
      )
      .orderBy(desc(workspaceAuditLog.createdAt))
      .limit(120),
  ]);

  return workspaces.map((workspace) => ({
    ...workspace,
    members: members
      .filter(({ member }) => member.workspaceId === workspace.id)
      .map(({ member, email }) => ({
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        email,
        role: normalizeRole(member.role),
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      })),
    pendingInvites: pendingInvites
      .filter((invite) => invite.workspaceId === workspace.id)
      .map((invite) => ({
        id: invite.id,
        workspaceId: invite.workspaceId,
        email: invite.email,
        role: normalizeInviteRole(invite.role),
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      })),
    recentActivity: activityRows
      .filter(({ log }) => log.targetId === workspace.id)
      .slice(0, 5)
      .map(({ log, actorEmail }) => ({
        id: log.id,
        workspaceId: workspace.id,
        action: log.action,
        summary: log.summary,
        actorEmail,
        createdAt: log.createdAt.toISOString(),
      })),
  })) satisfies TeamWorkspaceManagementSummary[];
}

export async function revokeWorkspaceInvite(input: {
  userId: string;
  workspaceId: string;
  inviteId: string;
}) {
  const membershipRole = await getTeamWorkspaceMembership({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!canManageWorkspace(membershipRole)) {
    return null;
  }

  const now = new Date();
  const [invite] = await getDb()
    .update(teamWorkspaceInvite)
    .set({
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(teamWorkspaceInvite.id, input.inviteId),
        eq(teamWorkspaceInvite.workspaceId, input.workspaceId),
        isNull(teamWorkspaceInvite.acceptedAt),
        isNull(teamWorkspaceInvite.revokedAt),
      ),
    )
    .returning();

  return invite ?? null;
}

export async function updateTeamWorkspaceMemberRole(input: {
  userId: string;
  workspaceId: string;
  memberUserId: string;
  role: string;
}) {
  const actorRole = await getTeamWorkspaceMembership({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (actorRole !== "owner") {
    return null;
  }

  const role = normalizeInviteRole(input.role);
  const [targetMember] = await getDb()
    .select()
    .from(teamWorkspaceMember)
    .where(
      and(
        eq(teamWorkspaceMember.workspaceId, input.workspaceId),
        eq(teamWorkspaceMember.userId, input.memberUserId),
      ),
    )
    .limit(1);

  if (!targetMember || normalizeRole(targetMember.role) === "owner") {
    return null;
  }

  const [member] = await getDb()
    .update(teamWorkspaceMember)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(teamWorkspaceMember.id, targetMember.id))
    .returning();

  return member ?? null;
}

export async function transferTeamWorkspaceOwnership(input: {
  userId: string;
  workspaceId: string;
  newOwnerUserId: string;
}) {
  if (input.userId === input.newOwnerUserId) {
    return false;
  }

  const actorRole = await getTeamWorkspaceMembership({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (actorRole !== "owner") {
    return false;
  }

  const [targetMember] = await getDb()
    .select()
    .from(teamWorkspaceMember)
    .where(
      and(
        eq(teamWorkspaceMember.workspaceId, input.workspaceId),
        eq(teamWorkspaceMember.userId, input.newOwnerUserId),
      ),
    )
    .limit(1);

  if (!targetMember) {
    return false;
  }

  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx
      .update(teamWorkspace)
      .set({
        ownerId: input.newOwnerUserId,
        updatedAt: now,
      })
      .where(eq(teamWorkspace.id, input.workspaceId));

    await tx
      .update(teamWorkspaceMember)
      .set({
        role: "admin",
        updatedAt: now,
      })
      .where(
        and(
          eq(teamWorkspaceMember.workspaceId, input.workspaceId),
          eq(teamWorkspaceMember.userId, input.userId),
        ),
      );

    await tx
      .update(teamWorkspaceMember)
      .set({
        role: "owner",
        updatedAt: now,
      })
      .where(eq(teamWorkspaceMember.id, targetMember.id));
  });

  return true;
}

function normalizeRole(value: unknown): TeamWorkspaceRole {
  if (value === "owner" || value === "admin") return value;

  return "member";
}

function normalizeInviteRole(value: unknown): TeamWorkspaceInviteRole {
  return value === "admin" ? "admin" : "member";
}

function canManageWorkspace(role: TeamWorkspaceRole | null) {
  return role === "owner" || role === "admin";
}
