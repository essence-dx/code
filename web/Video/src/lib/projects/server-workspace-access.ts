import { and, desc, eq, or } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import {
  folders,
  projectPermissionOverrides,
  projects,
  workspaceAuditEvents,
  workspaceInvitations,
  workspaceMembers,
} from "@/lib/db/schema";
import { canWorkspaceRole, type WorkspacePermission, type WorkspaceRole } from "@/lib/projects/workspace-permissions";
import {
  serverWorkspaceAccessMutationSchema,
  workspaceInvitationAcceptPath,
  type ServerFolderVisibility,
  type ServerProjectFolderAccess,
  type ServerWorkspaceAccessMutation,
  type ServerWorkspaceAccessSummary,
  type ServerWorkspaceInvitationAcceptance,
} from "@/lib/projects/workspace-access-contracts";

type ProjectAccessContext = {
  userId: string;
  userEmail: string;
  projectId: string;
  workspaceId: string;
  ownerId: string;
  activeRole: WorkspaceRole;
  folderId: string | null;
  folderAccess: ServerProjectFolderAccess;
};

type WorkspaceAuditTargetType = (typeof workspaceAuditEvents.$inferInsert)["targetType"];
type WorkspaceFolderRow = typeof folders.$inferSelect;

export async function listServerWorkspaceAccess(projectId: string) {
  const context = await requireProjectAccess(projectId);
  assertServerWorkspacePermission(context, "export-history:view");
  return accessSummary(context);
}

export async function mutateServerWorkspaceAccess(projectId: string, input: unknown) {
  const context = await requireProjectAccess(projectId);
  const payload = serverWorkspaceAccessMutationSchema.parse(input);

  if (payload.action === "create-invitation") {
    await createInvitation(context, payload);
  } else if (payload.action === "revoke-invitation") {
    await revokeInvitation(context, payload.invitationId);
  } else if (payload.action === "set-project-permission") {
    await setProjectPermission(context, payload);
  } else if (payload.action === "remove-project-permission") {
    await removeProjectPermission(context, payload.permissionId);
  } else if (payload.action === "create-folder") {
    await createFolder(context, payload);
  } else if (payload.action === "set-project-folder-access") {
    await setProjectFolderAccess(context, payload.folderId, payload.folderAccess);
  } else {
    await setFolderVisibility(context, payload.folderId, payload.visibility);
  }

  return accessSummary(await requireProjectAccess(projectId));
}

export async function acceptServerWorkspaceInvitation(token: string): Promise<ServerWorkspaceInvitationAcceptance> {
  const session = await getServerSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (!userId || !userEmail) {
    throw new ServerWorkspaceAccessAuthError();
  }

  const [invitation] = await getDb()
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.token, token.trim()))
    .limit(1);

  if (!invitation) {
    throw new ServerWorkspaceInvitationNotFoundError();
  }

  if (invitation.status !== "pending") {
    throw new ServerWorkspaceInvitationUnavailableError();
  }

  if (invitation.email !== userEmail) {
    throw new ServerWorkspaceAccessForbiddenError();
  }

  const now = new Date();
  const existingMember = await getWorkspaceMemberByEmail(invitation.workspaceId, userEmail);
  if (existingMember) {
    await getDb()
      .update(workspaceMembers)
      .set({
        userId,
        role: invitation.role,
        status: "active",
        updatedAt: now,
      })
      .where(eq(workspaceMembers.id, existingMember.id));
  } else {
    await getDb().insert(workspaceMembers).values({
      id: `workspace_member_${crypto.randomUUID()}`,
      workspaceId: invitation.workspaceId,
      userId,
      email: userEmail,
      role: invitation.role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  await getDb()
    .update(workspaceInvitations)
    .set({
      status: "accepted",
      updatedAt: now,
    })
    .where(eq(workspaceInvitations.id, invitation.id));

  await getDb().insert(workspaceAuditEvents).values({
    id: `workspace_audit_${crypto.randomUUID()}`,
    workspaceId: invitation.workspaceId,
    projectId: null,
    actorId: userId,
    action: "accepted",
    targetType: "invite",
    targetId: invitation.id,
    detail: `${userEmail} accepted ${invitation.role} access`,
    createdAt: now,
    updatedAt: now,
  });

  return {
    workspaceId: invitation.workspaceId,
    email: userEmail,
    role: invitation.role,
    status: "accepted",
    acceptedAt: now.toISOString(),
  };
}

async function requireProjectAccess(projectId: string): Promise<ProjectAccessContext> {
  const session = await getServerSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (!userId || !userEmail) {
    throw new ServerWorkspaceAccessAuthError();
  }

  const [project] = await getDb()
    .select({
      projectId: projects.id,
      workspaceId: projects.workspaceId,
      ownerId: projects.ownerId,
      folderId: projects.folderId,
      folderAccess: projects.folderAccess,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new ServerWorkspaceAccessNotFoundError();
  }

  const projectOverride = await getProjectOverride(project.projectId, userEmail);
  const ownerRole = project.ownerId === userId ? "owner" : null;
  const memberRole = ownerRole ? "owner" : await getWorkspaceMemberRole(project.workspaceId, userId, userEmail);
  const activeRole = highestWorkspaceRole(ownerRole, memberRole, projectOverride?.role);

  if (!activeRole) {
    throw new ServerWorkspaceAccessForbiddenError();
  }

  const folderAccess = normalizeFolderAccess(project.folderAccess);
  const folderVisibility = project.folderId ? await getProjectFolderVisibility(project.workspaceId, project.folderId) : "workspace";
  const hasDirectProjectAccess = Boolean(ownerRole || projectOverride);
  const isRestrictedFolderProject = folderAccess === "private" || (folderAccess === "inherited" && folderVisibility === "private");
  if (isRestrictedFolderProject && !hasDirectProjectAccess && !canWorkspaceRole(activeRole, "private-folder:manage")) {
    throw new ServerWorkspaceAccessForbiddenError();
  }

  return {
    userId,
    userEmail,
    projectId: project.projectId,
    workspaceId: project.workspaceId,
    ownerId: project.ownerId,
    activeRole,
    folderId: project.folderId,
    folderAccess,
  };
}

async function accessSummary(context: ProjectAccessContext): Promise<ServerWorkspaceAccessSummary> {
  const [folderRows, invitationRows, permissionRows, auditRows] = await Promise.all([
    getDb()
      .select()
      .from(folders)
      .where(eq(folders.workspaceId, context.workspaceId))
      .orderBy(folders.position, folders.name),
    canWorkspaceRole(context.activeRole, "invite:manage")
      ? getDb()
          .select()
          .from(workspaceInvitations)
          .where(eq(workspaceInvitations.workspaceId, context.workspaceId))
          .orderBy(desc(workspaceInvitations.updatedAt))
      : Promise.resolve([]),
    canWorkspaceRole(context.activeRole, "project-permission:manage")
      ? getDb()
          .select()
          .from(projectPermissionOverrides)
          .where(eq(projectPermissionOverrides.projectId, context.projectId))
          .orderBy(projectPermissionOverrides.memberEmail)
      : Promise.resolve([]),
    canWorkspaceRole(context.activeRole, "audit:view")
      ? getDb()
          .select()
          .from(workspaceAuditEvents)
          .where(eq(workspaceAuditEvents.workspaceId, context.workspaceId))
          .orderBy(desc(workspaceAuditEvents.createdAt))
          .limit(30)
      : Promise.resolve([]),
  ]);

  return {
    projectId: context.projectId,
    workspaceId: context.workspaceId,
    activeRole: context.activeRole,
    folderId: context.folderId,
    folderAccess: context.folderAccess,
    folders: visibleFolders(folderRows, context).map((folder) => ({
      id: folder.id,
      name: folder.name,
      visibility: normalizeFolderVisibility(folder.visibility),
      ownerId: folder.ownerId,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    })),
    invitations: invitationRows.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      acceptPath: workspaceInvitationAcceptPath(invitation.token),
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),
    })),
    projectPermissions: permissionRows.map((permission) => ({
      id: permission.id,
      projectId: permission.projectId,
      memberEmail: permission.memberEmail,
      role: permission.role,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    })),
    auditEvents: auditRows.map((event) => ({
      id: event.id,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      detail: event.detail,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

async function createInvitation(
  context: ProjectAccessContext,
  payload: Extract<ServerWorkspaceAccessMutation, { action: "create-invitation" }>,
) {
  assertServerWorkspacePermission(context, "invite:manage");
  const now = new Date();
  const existing = await getPendingInvitation(context.workspaceId, payload.email);
  const invitationId = existing?.id ?? `workspace_invite_${crypto.randomUUID()}`;
  await getDb()
    .insert(workspaceInvitations)
    .values({
      id: invitationId,
      workspaceId: context.workspaceId,
      invitedById: context.userId,
      email: payload.email,
      role: payload.role,
      status: "pending",
      token: existing?.token ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspaceInvitations.id,
      set: { role: payload.role, status: "pending", updatedAt: now },
    });
  await recordWorkspaceAuditEvent(context, "created", "invite", invitationId, `${payload.email} as ${payload.role}`);
}

async function revokeInvitation(context: ProjectAccessContext, invitationId: string) {
  assertServerWorkspacePermission(context, "invite:manage");
  await getDb()
    .update(workspaceInvitations)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.workspaceId, context.workspaceId)));
  await recordWorkspaceAuditEvent(context, "revoked", "invite", invitationId, "Workspace invitation revoked");
}

async function setProjectPermission(
  context: ProjectAccessContext,
  payload: Extract<ServerWorkspaceAccessMutation, { action: "set-project-permission" }>,
) {
  assertServerWorkspacePermission(context, "project-permission:manage");
  const now = new Date();
  const existing = await getProjectOverride(context.projectId, payload.memberEmail);
  const permissionId = existing?.id ?? `project_permission_${crypto.randomUUID()}`;
  await getDb()
    .insert(projectPermissionOverrides)
    .values({
      id: permissionId,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      memberEmail: payload.memberEmail,
      role: payload.role,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: projectPermissionOverrides.id,
      set: { role: payload.role, updatedAt: now },
    });
  await recordWorkspaceAuditEvent(context, existing ? "updated" : "created", "project-permission", permissionId, `${payload.memberEmail} as ${payload.role}`);
}

async function removeProjectPermission(context: ProjectAccessContext, permissionId: string) {
  assertServerWorkspacePermission(context, "project-permission:manage");
  await getDb()
    .delete(projectPermissionOverrides)
    .where(and(eq(projectPermissionOverrides.id, permissionId), eq(projectPermissionOverrides.projectId, context.projectId)));
  await recordWorkspaceAuditEvent(context, "removed", "project-permission", permissionId, "Project access override removed");
}

async function createFolder(
  context: ProjectAccessContext,
  payload: Extract<ServerWorkspaceAccessMutation, { action: "create-folder" }>,
) {
  assertServerWorkspacePermission(context, "folder:manage");
  if (payload.visibility === "private") {
    assertServerWorkspacePermission(context, "private-folder:manage");
  }

  const now = new Date();
  const folderId = `folder_${crypto.randomUUID()}`;
  await getDb().insert(folders).values({
    id: folderId,
    workspaceId: context.workspaceId,
    ownerId: context.userId,
    name: payload.name,
    visibility: payload.visibility,
    position: now.getTime(),
    createdAt: now,
    updatedAt: now,
  });

  if (payload.assignProject) {
    await setProjectFolderAccess(context, folderId, payload.folderAccess);
  }

  await recordWorkspaceAuditEvent(context, "created", "folder", folderId, `${payload.visibility} folder ${payload.name}`);
}

async function setProjectFolderAccess(context: ProjectAccessContext, folderId: string | null, folderAccess: ServerProjectFolderAccess) {
  assertServerWorkspacePermission(context, "folder:manage");
  if (folderAccess !== "inherited") {
    assertServerWorkspacePermission(context, "project-permission:manage");
  }

  if (folderId) {
    await assertFolderInWorkspace(context, folderId);
  }

  await getDb()
    .update(projects)
    .set({
      folderId,
      folderAccess,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, context.projectId), eq(projects.workspaceId, context.workspaceId)));
  await recordWorkspaceAuditEvent(context, "assigned", "folder", folderId ?? context.projectId, `Project folder access ${folderAccess}`);
}

async function setFolderVisibility(context: ProjectAccessContext, folderId: string, visibility: ServerFolderVisibility) {
  assertServerWorkspacePermission(context, "folder:manage");
  if (visibility === "private") {
    assertServerWorkspacePermission(context, "private-folder:manage");
  }

  await assertFolderInWorkspace(context, folderId);
  await getDb()
    .update(folders)
    .set({ visibility, updatedAt: new Date() })
    .where(and(eq(folders.id, folderId), eq(folders.workspaceId, context.workspaceId)));
  await recordWorkspaceAuditEvent(context, "visibility-updated", "folder", folderId, `Folder is ${visibility}`);
}

async function assertFolderInWorkspace(context: ProjectAccessContext, folderId: string) {
  const [folder] = await getDb()
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.workspaceId, context.workspaceId)))
    .limit(1);
  if (!folder) {
    throw new ServerWorkspaceAccessNotFoundError();
  }
}

async function recordWorkspaceAuditEvent(
  context: ProjectAccessContext,
  action: string,
  targetType: WorkspaceAuditTargetType,
  targetId: string | null,
  detail: string,
) {
  await getDb().insert(workspaceAuditEvents).values({
    id: `workspace_audit_${crypto.randomUUID()}`,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    actorId: context.userId,
    action,
    targetType,
    targetId,
    detail: detail.slice(0, 220),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function getWorkspaceMemberRole(workspaceId: string, userId: string, email: string): Promise<WorkspaceRole | null> {
  const [member] = await getDb()
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, "active"), or(eq(workspaceMembers.userId, userId), eq(workspaceMembers.email, email))))
    .limit(1);
  return member?.role ?? null;
}

async function getProjectOverride(projectId: string, email: string) {
  const [override] = await getDb()
    .select()
    .from(projectPermissionOverrides)
    .where(and(eq(projectPermissionOverrides.projectId, projectId), eq(projectPermissionOverrides.memberEmail, email)))
    .limit(1);
  return override ?? null;
}

async function getWorkspaceMemberByEmail(workspaceId: string, email: string) {
  const [member] = await getDb()
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.email, email)))
    .limit(1);
  return member ?? null;
}

async function getPendingInvitation(workspaceId: string, email: string) {
  const [invitation] = await getDb()
    .select()
    .from(workspaceInvitations)
    .where(and(eq(workspaceInvitations.workspaceId, workspaceId), eq(workspaceInvitations.email, email), eq(workspaceInvitations.status, "pending")))
    .limit(1);
  return invitation ?? null;
}

async function getProjectFolderVisibility(workspaceId: string, folderId: string): Promise<ServerFolderVisibility> {
  const [folder] = await getDb()
    .select({ visibility: folders.visibility })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.workspaceId, workspaceId)))
    .limit(1);
  return normalizeFolderVisibility(folder?.visibility ?? "workspace");
}

function assertServerWorkspacePermission(context: ProjectAccessContext, permission: WorkspacePermission) {
  if (!canWorkspaceRole(context.activeRole, permission)) {
    throw new ServerWorkspaceAccessForbiddenError();
  }
}

function visibleFolders(folderRows: WorkspaceFolderRow[], context: ProjectAccessContext) {
  if (canWorkspaceRole(context.activeRole, "private-folder:manage")) {
    return folderRows;
  }

  return folderRows.filter((folder) => {
    const visibility = normalizeFolderVisibility(folder.visibility);
    return visibility === "workspace" || folder.ownerId === context.userId || folder.id === context.folderId;
  });
}

function highestWorkspaceRole(...roles: Array<WorkspaceRole | null | undefined>): WorkspaceRole | null {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("editor")) return "editor";
  if (roles.includes("viewer")) return "viewer";
  return null;
}

function normalizeFolderAccess(value: string): ServerProjectFolderAccess {
  if (value === "private" || value === "shared") return value;
  return "inherited";
}

function normalizeFolderVisibility(value: string): ServerFolderVisibility {
  return value === "private" ? "private" : "workspace";
}

export class ServerWorkspaceAccessAuthError extends Error {
  constructor() {
    super("You must be signed in to manage workspace access.");
    this.name = "ServerWorkspaceAccessAuthError";
  }
}

export class ServerWorkspaceAccessForbiddenError extends Error {
  constructor() {
    super("You do not have permission to manage this workspace.");
    this.name = "ServerWorkspaceAccessForbiddenError";
  }
}

export class ServerWorkspaceAccessNotFoundError extends Error {
  constructor() {
    super("Workspace access record was not found.");
    this.name = "ServerWorkspaceAccessNotFoundError";
  }
}

export class ServerWorkspaceInvitationNotFoundError extends Error {
  constructor() {
    super("Workspace invitation was not found.");
    this.name = "ServerWorkspaceInvitationNotFoundError";
  }
}

export class ServerWorkspaceInvitationUnavailableError extends Error {
  constructor() {
    super("Workspace invitation is no longer available.");
    this.name = "ServerWorkspaceInvitationUnavailableError";
  }
}
