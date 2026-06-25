import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { user, workspace, workspaceInvite, workspaceMember } from "@/db/schema";
import type { WorkspaceDashboard, WorkspaceInviteRole, WorkspaceRole } from "@/features/workspaces/types";

const adminRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace (
        id text PRIMARY KEY NOT NULL,
        owner_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        name text NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_owner_idx ON workspace(owner_user_id)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_member (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        role text NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_member_workspace_idx ON workspace_member(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_member_user_idx ON workspace_member(user_id)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS workspace_member_workspace_user_idx ON workspace_member(workspace_id, user_id)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_invite (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        email text NOT NULL,
        role text NOT NULL,
        token text NOT NULL UNIQUE,
        invited_by_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        accepted_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        expires_at integer NOT NULL,
        accepted_at integer,
        revoked_at integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_invite_workspace_idx ON workspace_invite(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_invite_email_idx ON workspace_invite(email)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS workspace_invite_token_idx ON workspace_invite(token)");
  })();

  await schemaReady;
}

function getWorkspaceName(name: string | null | undefined) {
  const trimmed = name?.trim();

  return trimmed ? `${trimmed}'s workspace` : "Personal workspace";
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensurePersonalWorkspace(userId: string, name: string | null | undefined) {
  await ensureWorkspaceSchema();

  const ownedWorkspace = await getDb()
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.ownerUserId, userId))
    .orderBy(asc(workspace.createdAt))
    .limit(1);

  if (ownedWorkspace[0]) {
    const existingOwnerMembership = await getDb()
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(and(eq(workspaceMember.workspaceId, ownedWorkspace[0].id), eq(workspaceMember.userId, userId)))
      .limit(1);

    if (!existingOwnerMembership[0]) {
      const now = new Date();

      await getDb().insert(workspaceMember).values({
        id: nanoid(),
        workspaceId: ownedWorkspace[0].id,
        userId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });
    }

    return ownedWorkspace[0].id;
  }

  const now = new Date();
  const workspaceId = nanoid();

  await getDb().insert(workspace).values({
    id: workspaceId,
    ownerUserId: userId,
    name: getWorkspaceName(name),
    createdAt: now,
    updatedAt: now,
  });
  await getDb().insert(workspaceMember).values({
    id: nanoid(),
    workspaceId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return workspaceId;
}

export async function listUserWorkspaces(userId: string, name: string | null | undefined) {
  await ensurePersonalWorkspace(userId, name);

  const rows = await getDb()
    .select({
      id: workspace.id,
      name: workspace.name,
      role: workspaceMember.role,
      createdAt: workspace.createdAt,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, userId))
    .orderBy(asc(workspace.createdAt));
  const memberRows = await getDb().select({ workspaceId: workspaceMember.workspaceId }).from(workspaceMember);
  const memberCounts = memberRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.workspaceId] = (counts[row.workspaceId] ?? 0) + 1;

    return counts;
  }, {});

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    memberCount: memberCounts[row.id] ?? 0,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createWorkspace(input: { currentUserId: string; name: string }) {
  await ensureWorkspaceSchema();

  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("Workspace name is required.");
  }

  const now = new Date();
  const workspaceId = nanoid();

  await getDb().insert(workspace).values({
    id: workspaceId,
    ownerUserId: input.currentUserId,
    name: trimmedName,
    createdAt: now,
    updatedAt: now,
  });
  await getDb().insert(workspaceMember).values({
    id: nanoid(),
    workspaceId,
    userId: input.currentUserId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: workspaceId,
    name: trimmedName,
    role: "owner" as const,
    memberCount: 1,
    createdAt: now.toISOString(),
  };
}

export async function getWorkspaceDashboard(userId: string, name: string | null | undefined, requestedWorkspaceId?: string | null): Promise<WorkspaceDashboard> {
  const workspaces = await listUserWorkspaces(userId, name);
  const workspaceId = workspaces.find((entry) => entry.id === requestedWorkspaceId)?.id ?? workspaces[0]?.id;

  if (!workspaceId) {
    throw new Error("Workspace access could not be created.");
  }

  const access = await getWorkspaceAccess(workspaceId, userId);

  if (!access) {
    throw new Error("Workspace access could not be created.");
  }

  const [workspaceRow] = await getDb().select().from(workspace).where(eq(workspace.id, workspaceId)).limit(1);
  const memberRows = await getDb()
    .select({
      id: workspaceMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: workspaceMember.role,
      joinedAt: workspaceMember.createdAt,
    })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
    .where(eq(workspaceMember.workspaceId, workspaceId))
    .orderBy(asc(workspaceMember.createdAt));
  const inviteRows = await getDb()
    .select({
      id: workspaceInvite.id,
      email: workspaceInvite.email,
      role: workspaceInvite.role,
      token: workspaceInvite.token,
      invitedBy: user.name,
      expiresAt: workspaceInvite.expiresAt,
      createdAt: workspaceInvite.createdAt,
    })
    .from(workspaceInvite)
    .innerJoin(user, eq(workspaceInvite.invitedByUserId, user.id))
    .where(and(eq(workspaceInvite.workspaceId, workspaceId), isNull(workspaceInvite.acceptedAt), isNull(workspaceInvite.revokedAt), gt(workspaceInvite.expiresAt, new Date())))
    .orderBy(asc(workspaceInvite.createdAt));

  return {
    id: workspaceId,
    name: workspaceRow?.name ?? getWorkspaceName(name),
    role: access.role,
    workspaces,
    members: memberRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      joinedAt: row.joinedAt.toISOString(),
    })),
    invites: inviteRows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      token: row.token,
      invitedBy: row.invitedBy,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getWorkspaceAccess(workspaceId: string, userId: string) {
  await ensureWorkspaceSchema();

  const rows = await getDb()
    .select({ role: workspaceMember.role })
    .from(workspaceMember)
    .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function createWorkspaceInvite(input: { workspaceId: string; currentUserId: string; email: string; role: WorkspaceInviteRole }) {
  await ensureWorkspaceSchema();

  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access || !adminRoles.has(access.role)) {
    throw new Error("Only workspace owners and admins can invite members.");
  }

  const email = normalizeEmail(input.email);
  const existingUser = await getDb().select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);

  if (existingUser[0]) {
    const existingMember = await getDb()
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(and(eq(workspaceMember.workspaceId, input.workspaceId), eq(workspaceMember.userId, existingUser[0].id)))
      .limit(1);

    if (existingMember[0]) {
      throw new Error("That user is already a workspace member.");
    }
  }

  const now = new Date();

  await getDb()
    .update(workspaceInvite)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(workspaceInvite.workspaceId, input.workspaceId), eq(workspaceInvite.email, email), isNull(workspaceInvite.acceptedAt), isNull(workspaceInvite.revokedAt)));

  const invite = {
    id: nanoid(),
    workspaceId: input.workspaceId,
    email,
    role: input.role,
    token: nanoid(32),
    invitedByUserId: input.currentUserId,
    acceptedByUserId: null,
    expiresAt: addDays(now, 14),
    acceptedAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(workspaceInvite).values(invite);

  return invite;
}

export async function revokeWorkspaceInvite(input: { workspaceId: string; inviteId: string; currentUserId: string }) {
  await ensureWorkspaceSchema();

  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access || !adminRoles.has(access.role)) {
    throw new Error("Only workspace owners and admins can revoke invites.");
  }

  const rows = await getDb()
    .update(workspaceInvite)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(workspaceInvite.id, input.inviteId), eq(workspaceInvite.workspaceId, input.workspaceId), isNull(workspaceInvite.acceptedAt), isNull(workspaceInvite.revokedAt)))
    .returning({ id: workspaceInvite.id });

  return rows[0] ?? null;
}

export async function getWorkspaceInvitePreview(token: string) {
  await ensureWorkspaceSchema();

  const rows = await getDb()
    .select({
      id: workspaceInvite.id,
      email: workspaceInvite.email,
      role: workspaceInvite.role,
      expiresAt: workspaceInvite.expiresAt,
      acceptedAt: workspaceInvite.acceptedAt,
      revokedAt: workspaceInvite.revokedAt,
      workspaceName: workspace.name,
      invitedBy: user.name,
    })
    .from(workspaceInvite)
    .innerJoin(workspace, eq(workspaceInvite.workspaceId, workspace.id))
    .innerJoin(user, eq(workspaceInvite.invitedByUserId, user.id))
    .where(eq(workspaceInvite.token, token))
    .limit(1);
  const invite = rows[0];

  if (!invite) {
    return null;
  }

  return {
    ...invite,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
  };
}

export async function acceptWorkspaceInvite(input: { token: string; currentUserId: string; currentUserEmail: string }) {
  await ensureWorkspaceSchema();

  const inviteRows = await getDb()
    .select()
    .from(workspaceInvite)
    .where(and(eq(workspaceInvite.token, input.token), isNull(workspaceInvite.acceptedAt), isNull(workspaceInvite.revokedAt), gt(workspaceInvite.expiresAt, new Date())))
    .limit(1);
  const invite = inviteRows[0];

  if (!invite) {
    throw new Error("Invite is expired or unavailable.");
  }

  if (invite.email !== normalizeEmail(input.currentUserEmail)) {
    throw new Error("This invite belongs to a different email address.");
  }

  const now = new Date();

  await getDb()
    .insert(workspaceMember)
    .values({
      id: nanoid(),
      workspaceId: invite.workspaceId,
      userId: input.currentUserId,
      role: invite.role,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  await getDb()
    .update(workspaceInvite)
    .set({ acceptedAt: now, acceptedByUserId: input.currentUserId, updatedAt: now })
    .where(eq(workspaceInvite.id, invite.id));

  return invite.workspaceId;
}
