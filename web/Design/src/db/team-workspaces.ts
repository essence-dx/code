import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  createUserNotification,
  createUserNotificationForEmail,
} from "@/db/notifications";
import {
  teamWorkspace,
  teamWorkspaceInvite,
  teamWorkspaceMember,
  type TeamWorkspaceInviteRow,
  type TeamWorkspaceRow,
} from "@/db/schema";

const inviteLifetimeMs = 1000 * 60 * 60 * 24 * 14;

export const teamWorkspaceRoles = ["owner", "admin", "member"] as const;
export type TeamWorkspaceRole = (typeof teamWorkspaceRoles)[number];
export type TeamWorkspaceInviteRole = Exclude<TeamWorkspaceRole, "owner">;

export type TeamWorkspaceSummary = {
  id: string;
  ownerId: string;
  name: string;
  role: TeamWorkspaceRole;
  pendingInviteCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamWorkspaceInviteSummary = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: TeamWorkspaceInviteRole;
  expiresAt: string;
  createdAt: string;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeWorkspaceName(value: unknown) {
  return String(value ?? "")
    .trim()
    .slice(0, 80);
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

function isPendingInvite(
  row: Pick<TeamWorkspaceInviteRow, "acceptedAt" | "revokedAt" | "expiresAt">,
) {
  return !row.acceptedAt && !row.revokedAt && row.expiresAt > new Date();
}

function toWorkspaceSummary(input: {
  workspace: TeamWorkspaceRow;
  role: TeamWorkspaceRole;
  pendingInviteCount: number;
}): TeamWorkspaceSummary {
  return {
    id: input.workspace.id,
    ownerId: input.workspace.ownerId,
    name: input.workspace.name,
    role: input.role,
    pendingInviteCount: input.pendingInviteCount,
    createdAt: input.workspace.createdAt.toISOString(),
    updatedAt: input.workspace.updatedAt.toISOString(),
  };
}

function toInviteSummary(input: {
  invite: TeamWorkspaceInviteRow;
  workspaceName: string;
}): TeamWorkspaceInviteSummary {
  return {
    id: input.invite.id,
    workspaceId: input.invite.workspaceId,
    workspaceName: input.workspaceName,
    email: input.invite.email,
    role: normalizeInviteRole(input.invite.role),
    expiresAt: input.invite.expiresAt.toISOString(),
    createdAt: input.invite.createdAt.toISOString(),
  };
}

export async function listTeamWorkspaces(userId: string) {
  const memberships = await getDb()
    .select({
      memberRole: teamWorkspaceMember.role,
      workspaceId: teamWorkspace.id,
      ownerId: teamWorkspace.ownerId,
      name: teamWorkspace.name,
      createdAt: teamWorkspace.createdAt,
      updatedAt: teamWorkspace.updatedAt,
    })
    .from(teamWorkspaceMember)
    .innerJoin(
      teamWorkspace,
      eq(teamWorkspaceMember.workspaceId, teamWorkspace.id),
    )
    .where(eq(teamWorkspaceMember.userId, userId))
    .orderBy(desc(teamWorkspace.updatedAt))
    .limit(24);

  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const pendingCounts = new Map<string, number>();

  if (workspaceIds.length) {
    const pendingInvites = await getDb()
      .select({
        workspaceId: teamWorkspaceInvite.workspaceId,
      })
      .from(teamWorkspaceInvite)
      .where(
        and(
          inArray(teamWorkspaceInvite.workspaceId, workspaceIds),
          isNull(teamWorkspaceInvite.acceptedAt),
          isNull(teamWorkspaceInvite.revokedAt),
          gt(teamWorkspaceInvite.expiresAt, new Date()),
        ),
      );

    for (const invite of pendingInvites) {
      pendingCounts.set(
        invite.workspaceId,
        (pendingCounts.get(invite.workspaceId) ?? 0) + 1,
      );
    }
  }

  return memberships.map((membership) =>
    toWorkspaceSummary({
      workspace: {
        id: membership.workspaceId,
        ownerId: membership.ownerId,
        name: membership.name,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      },
      role: normalizeRole(membership.memberRole),
      pendingInviteCount: pendingCounts.get(membership.workspaceId) ?? 0,
    }),
  );
}

export async function listPendingWorkspaceInvites(email: string | null) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  const rows = await getDb()
    .select({
      invite: teamWorkspaceInvite,
      workspaceName: teamWorkspace.name,
    })
    .from(teamWorkspaceInvite)
    .innerJoin(
      teamWorkspace,
      eq(teamWorkspaceInvite.workspaceId, teamWorkspace.id),
    )
    .where(
      and(
        eq(teamWorkspaceInvite.email, normalizedEmail),
        isNull(teamWorkspaceInvite.acceptedAt),
        isNull(teamWorkspaceInvite.revokedAt),
        gt(teamWorkspaceInvite.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(teamWorkspaceInvite.createdAt))
    .limit(20);

  return rows.map((row) =>
    toInviteSummary({
      invite: row.invite,
      workspaceName: row.workspaceName,
    }),
  );
}

export async function createTeamWorkspace(input: {
  userId: string;
  name: string;
}) {
  const name = normalizeWorkspaceName(input.name);

  if (!name) {
    return null;
  }

  const now = new Date();
  const workspaceId = nanoid();
  const row = await getDb().transaction(async (tx) => {
    const [workspaceRow] = await tx
      .insert(teamWorkspace)
      .values({
        id: workspaceId,
        ownerId: input.userId,
        name,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(teamWorkspaceMember).values({
      id: nanoid(),
      workspaceId,
      userId: input.userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    return workspaceRow;
  });

  return toWorkspaceSummary({
    workspace: row,
    role: "owner",
    pendingInviteCount: 0,
  });
}

export async function getTeamWorkspaceMembership(input: {
  userId: string;
  workspaceId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(teamWorkspaceMember)
    .where(
      and(
        eq(teamWorkspaceMember.workspaceId, input.workspaceId),
        eq(teamWorkspaceMember.userId, input.userId),
      ),
    )
    .limit(1);

  return row ? normalizeRole(row.role) : null;
}

export async function createWorkspaceInvite(input: {
  userId: string;
  workspaceId: string;
  email: string;
  role: string;
}) {
  const email = normalizeEmail(input.email);
  const role = normalizeInviteRole(input.role);

  if (!email) {
    return null;
  }

  const membershipRole = await getTeamWorkspaceMembership({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (!canManageWorkspace(membershipRole)) {
    return null;
  }

  const [workspace] = await getDb()
    .select({ name: teamWorkspace.name })
    .from(teamWorkspace)
    .where(eq(teamWorkspace.id, input.workspaceId))
    .limit(1);

  if (!workspace) {
    return null;
  }

  const [existingPendingInvite] = await getDb()
    .select()
    .from(teamWorkspaceInvite)
    .where(
      and(
        eq(teamWorkspaceInvite.workspaceId, input.workspaceId),
        eq(teamWorkspaceInvite.email, email),
        isNull(teamWorkspaceInvite.acceptedAt),
        isNull(teamWorkspaceInvite.revokedAt),
      ),
    )
    .orderBy(desc(teamWorkspaceInvite.createdAt))
    .limit(1);

  if (existingPendingInvite && isPendingInvite(existingPendingInvite)) {
    return existingPendingInvite;
  }

  const now = new Date();
  const [invite] = await getDb()
    .insert(teamWorkspaceInvite)
    .values({
      id: nanoid(),
      workspaceId: input.workspaceId,
      invitedByUserId: input.userId,
      email,
      role,
      token: nanoid(32),
      expiresAt: new Date(now.getTime() + inviteLifetimeMs),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await createUserNotificationForEmail({
    email,
    actorUserId: input.userId,
    type: "workspace_invite",
    title: `Invite to ${workspace.name}`,
    body: `You were invited as a ${role} in ${workspace.name}.`,
    targetHref: "/designs",
  });

  return invite;
}

export async function acceptWorkspaceInvite(input: {
  userId: string;
  email: string;
  inviteId: string;
}) {
  const email = normalizeEmail(input.email);

  if (!email || !input.inviteId) {
    return false;
  }

  const [invite] = await getDb()
    .select()
    .from(teamWorkspaceInvite)
    .where(
      and(
        eq(teamWorkspaceInvite.id, input.inviteId),
        eq(teamWorkspaceInvite.email, email),
        isNull(teamWorkspaceInvite.acceptedAt),
        isNull(teamWorkspaceInvite.revokedAt),
        gt(teamWorkspaceInvite.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invite) {
    return false;
  }

  const [workspace] = await getDb()
    .select({ name: teamWorkspace.name })
    .from(teamWorkspace)
    .where(eq(teamWorkspace.id, invite.workspaceId))
    .limit(1);

  const now = new Date();
  await getDb().transaction(async (tx) => {
    const [existingMembership] = await tx
      .select()
      .from(teamWorkspaceMember)
      .where(
        and(
          eq(teamWorkspaceMember.workspaceId, invite.workspaceId),
          eq(teamWorkspaceMember.userId, input.userId),
        ),
      )
      .limit(1);

    if (!existingMembership) {
      await tx.insert(teamWorkspaceMember).values({
        id: nanoid(),
        workspaceId: invite.workspaceId,
        userId: input.userId,
        role: normalizeInviteRole(invite.role),
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(teamWorkspaceInvite)
      .set({
        acceptedAt: now,
        acceptedByUserId: input.userId,
        updatedAt: now,
      })
      .where(eq(teamWorkspaceInvite.id, invite.id));
  });

  await createUserNotification({
    userId: invite.invitedByUserId,
    actorUserId: input.userId,
    type: "workspace_invite_accepted",
    title: "Invite accepted",
    body: `${email} joined ${workspace?.name ?? "your workspace"}.`,
    targetHref: "/designs",
  });

  return true;
}
