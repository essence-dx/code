import { and, asc, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project, projectAccessGrant, projectFolder, projectFolderAccessGrant, user, workspaceMember } from "@/db/schema";
import { hasProjectRole, projectRoleRank, type ProjectAccessRole, type ProjectResolvedRole } from "@/features/projects/access-types";
import { ensureWorkspaceSchema } from "@/features/workspaces/server/workspace-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

async function runOptionalSchemaStatement(statement: string) {
  try {
    await runSchemaStatement(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureProjectAccessSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runOptionalSchemaStatement("ALTER TABLE project ADD COLUMN workspace_id text REFERENCES workspace(id) ON DELETE SET NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_folder ADD COLUMN workspace_id text REFERENCES workspace(id) ON DELETE SET NULL");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_workspace_idx ON project(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_folder_workspace_idx ON project_folder(workspace_id)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_access_grant (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        role text NOT NULL,
        created_by_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_access_grant_project_idx ON project_access_grant(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_access_grant_user_idx ON project_access_grant(user_id)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_access_grant_project_user_idx ON project_access_grant(project_id, user_id)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_folder_access_grant (
        id text PRIMARY KEY NOT NULL,
        folder_id text NOT NULL REFERENCES project_folder(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        role text NOT NULL,
        created_by_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_folder_access_grant_folder_idx ON project_folder_access_grant(folder_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_folder_access_grant_user_idx ON project_folder_access_grant(user_id)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_folder_access_grant_folder_user_idx ON project_folder_access_grant(folder_id, user_id)");
    await runSchemaStatement(`
      UPDATE project
      SET workspace_id = (
        SELECT workspace.id
        FROM workspace
        WHERE workspace.owner_user_id = project.user_id
        ORDER BY workspace.created_at
        LIMIT 1
      )
      WHERE workspace_id IS NULL
    `);
    await runSchemaStatement(`
      UPDATE project_folder
      SET workspace_id = (
        SELECT workspace.id
        FROM workspace
        WHERE workspace.owner_user_id = project_folder.user_id
        ORDER BY workspace.created_at
        LIMIT 1
      )
      WHERE workspace_id IS NULL
    `);
  })();

  await schemaReady;
}

function strongerRole(first: ProjectResolvedRole | null, second: ProjectResolvedRole | null) {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return projectRoleRank[first] >= projectRoleRank[second] ? first : second;
}

export async function getProjectAccess(projectId: string, userId: string) {
  await ensureProjectAccessSchema();

  const rows = await getDb().select().from(project).where(eq(project.id, projectId)).limit(1);
  const row = rows[0];

  if (!row) {
    return null;
  }

  if (row.userId === userId) {
    return { project: row, role: "owner" as ProjectResolvedRole };
  }

  const directRows = await getDb()
    .select({ role: projectAccessGrant.role })
    .from(projectAccessGrant)
    .where(and(eq(projectAccessGrant.projectId, projectId), eq(projectAccessGrant.userId, userId)))
    .limit(1);
  const folderRows = row.folderId
    ? await getDb()
        .select({ role: projectFolderAccessGrant.role })
        .from(projectFolderAccessGrant)
        .where(and(eq(projectFolderAccessGrant.folderId, row.folderId), eq(projectFolderAccessGrant.userId, userId)))
        .limit(1)
    : [];
  const role = strongerRole(directRows[0]?.role ?? null, folderRows[0]?.role ?? null);

  return role ? { project: row, role } : null;
}

export async function requireProjectRole(projectId: string, userId: string, minimumRole: ProjectResolvedRole) {
  const access = await getProjectAccess(projectId, userId);

  if (!access) {
    return { error: "Project not found", status: 404 as const };
  }

  if (!hasProjectRole(access.role, minimumRole)) {
    return { error: "Insufficient project permission", status: 403 as const };
  }

  return access;
}

export async function getFolderAccess(folderId: string, userId: string) {
  await ensureProjectAccessSchema();

  const rows = await getDb().select().from(projectFolder).where(eq(projectFolder.id, folderId)).limit(1);
  const row = rows[0];

  if (!row) {
    return null;
  }

  if (row.userId === userId) {
    return { folder: row, role: "owner" as ProjectResolvedRole };
  }

  const grantRows = await getDb()
    .select({ role: projectFolderAccessGrant.role })
    .from(projectFolderAccessGrant)
    .where(and(eq(projectFolderAccessGrant.folderId, folderId), eq(projectFolderAccessGrant.userId, userId)))
    .limit(1);
  const role = grantRows[0]?.role ?? null;

  return role ? { folder: row, role } : null;
}

export async function requireFolderRole(folderId: string, userId: string, minimumRole: ProjectResolvedRole) {
  const access = await getFolderAccess(folderId, userId);

  if (!access) {
    return { error: "Folder not found", status: 404 as const };
  }

  if (!hasProjectRole(access.role, minimumRole)) {
    return { error: "Insufficient folder permission", status: 403 as const };
  }

  return access;
}

export async function listAccessibleProjects(userId: string, options: { folderId?: string | null; trash?: boolean; workspaceId?: string | null } = {}) {
  await ensureProjectAccessSchema();

  const ownedRows = await getDb().select().from(project).where(eq(project.userId, userId));
  const directRows = await getDb()
    .select({ row: project })
    .from(projectAccessGrant)
    .innerJoin(project, eq(projectAccessGrant.projectId, project.id))
    .where(eq(projectAccessGrant.userId, userId));
  const folderRows = await getDb()
    .select({ row: project })
    .from(projectFolderAccessGrant)
    .innerJoin(project, eq(projectFolderAccessGrant.folderId, project.folderId))
    .where(eq(projectFolderAccessGrant.userId, userId));
  const rowsById = new Map(ownedRows.map((row) => [row.id, row]));

  for (const entry of directRows) {
    rowsById.set(entry.row.id, entry.row);
  }

  for (const entry of folderRows) {
    rowsById.set(entry.row.id, entry.row);
  }

  return [...rowsById.values()]
    .filter((row) => (options.trash ? row.archivedAt !== null : row.archivedAt === null))
    .filter((row) => (options.workspaceId ? row.workspaceId === options.workspaceId : true))
    .filter((row) => {
      if (options.folderId === undefined || options.folderId === null) {
        return true;
      }

      return options.folderId === "unfiled" ? row.folderId === null : row.folderId === options.folderId;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function listAccessibleFolders(userId: string, options: { workspaceId?: string | null } = {}) {
  await ensureProjectAccessSchema();

  const ownedRows = await getDb().select().from(projectFolder).where(eq(projectFolder.userId, userId));
  const sharedRows = await getDb()
    .select({ row: projectFolder })
    .from(projectFolderAccessGrant)
    .innerJoin(projectFolder, eq(projectFolderAccessGrant.folderId, projectFolder.id))
    .where(eq(projectFolderAccessGrant.userId, userId));
  const rowsById = new Map(ownedRows.map((row) => [row.id, row]));

  for (const entry of sharedRows) {
    rowsById.set(entry.row.id, entry.row);
  }

  return [...rowsById.values()].filter((row) => (options.workspaceId ? row.workspaceId === options.workspaceId : true)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listProjectAccessGrants(projectId: string, currentUserId: string) {
  const access = await requireProjectRole(projectId, currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const grants = await getDb()
    .select({
      id: projectAccessGrant.id,
      projectId: projectAccessGrant.projectId,
      userId: projectAccessGrant.userId,
      role: projectAccessGrant.role,
      name: user.name,
      email: user.email,
      createdAt: projectAccessGrant.createdAt,
      updatedAt: projectAccessGrant.updatedAt,
    })
    .from(projectAccessGrant)
    .innerJoin(user, eq(projectAccessGrant.userId, user.id))
    .where(eq(projectAccessGrant.projectId, projectId))
    .orderBy(asc(user.email));

  return { project: access.project, role: access.role, grants };
}

export async function upsertProjectAccessGrant(input: { projectId: string; currentUserId: string; targetUserId: string; role: ProjectAccessRole }) {
  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  if (access.project.userId === input.targetUserId) {
    return { error: "Project owner already has full access", status: 400 as const };
  }

  const now = new Date();
  const existing = await getDb()
    .select({ id: projectAccessGrant.id })
    .from(projectAccessGrant)
    .where(and(eq(projectAccessGrant.projectId, input.projectId), eq(projectAccessGrant.userId, input.targetUserId)))
    .limit(1);

  if (existing[0]) {
    const rows = await getDb()
      .update(projectAccessGrant)
      .set({ role: input.role, updatedAt: now })
      .where(eq(projectAccessGrant.id, existing[0].id))
      .returning();

    return { action: "updated" as const, grant: rows[0] };
  }

  const grant = {
    id: nanoid(),
    projectId: input.projectId,
    userId: input.targetUserId,
    role: input.role,
    createdByUserId: input.currentUserId,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(projectAccessGrant).values(grant);

  return { action: "created" as const, grant };
}

export async function revokeProjectAccessGrant(input: { projectId: string; grantId: string; currentUserId: string }) {
  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .delete(projectAccessGrant)
    .where(and(eq(projectAccessGrant.projectId, input.projectId), eq(projectAccessGrant.id, input.grantId)))
    .returning({
      createdAt: projectAccessGrant.createdAt,
      createdByUserId: projectAccessGrant.createdByUserId,
      id: projectAccessGrant.id,
      role: projectAccessGrant.role,
      updatedAt: projectAccessGrant.updatedAt,
      userId: projectAccessGrant.userId,
    });

  return rows[0] ? { grant: rows[0], grantId: rows[0].id } : { error: "Access grant not found", status: 404 as const };
}

export async function listFolderAccessGrants(folderId: string, currentUserId: string) {
  const access = await requireFolderRole(folderId, currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const grants = await getDb()
    .select({
      id: projectFolderAccessGrant.id,
      folderId: projectFolderAccessGrant.folderId,
      userId: projectFolderAccessGrant.userId,
      role: projectFolderAccessGrant.role,
      name: user.name,
      email: user.email,
      createdAt: projectFolderAccessGrant.createdAt,
      updatedAt: projectFolderAccessGrant.updatedAt,
    })
    .from(projectFolderAccessGrant)
    .innerJoin(user, eq(projectFolderAccessGrant.userId, user.id))
    .where(eq(projectFolderAccessGrant.folderId, folderId))
    .orderBy(asc(user.email));

  return { folder: access.folder, role: access.role, grants };
}

export async function upsertFolderAccessGrant(input: { folderId: string; currentUserId: string; targetUserId: string; role: ProjectAccessRole }) {
  const access = await requireFolderRole(input.folderId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  if (access.folder.userId === input.targetUserId) {
    return { error: "Folder owner already has full access", status: 400 as const };
  }

  const now = new Date();
  const existing = await getDb()
    .select({ id: projectFolderAccessGrant.id })
    .from(projectFolderAccessGrant)
    .where(and(eq(projectFolderAccessGrant.folderId, input.folderId), eq(projectFolderAccessGrant.userId, input.targetUserId)))
    .limit(1);

  if (existing[0]) {
    const rows = await getDb()
      .update(projectFolderAccessGrant)
      .set({ role: input.role, updatedAt: now })
      .where(eq(projectFolderAccessGrant.id, existing[0].id))
      .returning();

    return { grant: rows[0] };
  }

  const grant = {
    id: nanoid(),
    folderId: input.folderId,
    userId: input.targetUserId,
    role: input.role,
    createdByUserId: input.currentUserId,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(projectFolderAccessGrant).values(grant);

  return { grant };
}

export async function revokeFolderAccessGrant(input: { folderId: string; grantId: string; currentUserId: string }) {
  const access = await requireFolderRole(input.folderId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .delete(projectFolderAccessGrant)
    .where(and(eq(projectFolderAccessGrant.folderId, input.folderId), eq(projectFolderAccessGrant.id, input.grantId)))
    .returning({ id: projectFolderAccessGrant.id });

  return rows[0] ? { grantId: rows[0].id } : { error: "Access grant not found", status: 404 as const };
}

export async function listWorkspaceGrantTargets(workspaceId: string, currentUserId: string) {
  await ensureProjectAccessSchema();

  const rows = await getDb()
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .innerJoin(workspaceMember, eq(workspaceMember.userId, user.id))
    .where(and(eq(workspaceMember.workspaceId, workspaceId), ne(workspaceMember.userId, currentUserId)));

  return rows;
}
