import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { user, workspace, workspaceRegressionWatchlistItemState, workspaceRegressionWatchlistSnapshot } from "@/db/schema";
import {
  createProjectRegressionWatchlistSnapshotHistoryReport,
  createProjectRegressionWatchlistSnapshotRecord,
  getProjectRegressionWatchlistSnapshotDownload,
  type ProjectRegressionWatchlistSnapshotHistoryReport,
  type ProjectRegressionWatchlistSnapshotRecord,
} from "@/features/projects/regression-watchlist-history";
import type {
  ProjectRegressionWatchlistFormat,
  ProjectRegressionWatchlistItemTriageState,
  ProjectRegressionWatchlistReport,
  ProjectRegressionWatchlistTriageStatus,
} from "@/features/projects/regression-watchlist";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const watchlistManagerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceRegressionWatchlistSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_regression_watchlist_snapshot (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        snapshot_id text NOT NULL,
        content_hash text NOT NULL,
        workspace_name text NOT NULL,
        item_count integer NOT NULL,
        severe_count integer NOT NULL,
        recurring_count integer NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        report text NOT NULL,
        states text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_snapshot_workspace_idx ON workspace_regression_watchlist_snapshot(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_snapshot_actor_idx ON workspace_regression_watchlist_snapshot(actor_user_id)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_snapshot_created_idx ON workspace_regression_watchlist_snapshot(workspace_id, created_at)",
    );
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_snapshot_hash_idx ON workspace_regression_watchlist_snapshot(workspace_id, content_hash)",
    );
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_regression_watchlist_item_state (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        item_id text NOT NULL,
        title text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        note text,
        owner_user_id text REFERENCES user(id) ON DELETE SET NULL,
        owner_name text,
        owner_email text,
        snoozed_until integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_item_state_workspace_idx ON workspace_regression_watchlist_item_state(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_item_state_project_idx ON workspace_regression_watchlist_item_state(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_item_state_owner_idx ON workspace_regression_watchlist_item_state(owner_user_id)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS workspace_regression_watchlist_item_state_status_idx ON workspace_regression_watchlist_item_state(workspace_id, status)",
    );
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_regression_watchlist_item_state_workspace_item_idx ON workspace_regression_watchlist_item_state(workspace_id, item_id)",
    );
  })();

  await schemaReady;
}

async function requireWatchlistManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!watchlistManagerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage regression watchlists.", status: 403 };
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

async function getWorkspaceSnapshot(workspaceId: string) {
  const row = await getDb().select({ id: workspace.id, name: workspace.name }).from(workspace).where(eq(workspace.id, workspaceId)).limit(1);

  return row[0] ?? null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function parseReport(value: ProjectRegressionWatchlistReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as ProjectRegressionWatchlistReport) : value;
}

function parseStates(value: ProjectRegressionWatchlistItemTriageState[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as ProjectRegressionWatchlistItemTriageState[]) : [];
  } catch {
    return [];
  }
}

function mapSnapshotRow(row: typeof workspaceRegressionWatchlistSnapshot.$inferSelect): ProjectRegressionWatchlistSnapshotRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    id: row.id,
    itemCount: row.itemCount,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    recurringCount: row.recurringCount,
    report: parseReport(row.report),
    severeCount: row.severeCount,
    snapshotId: row.snapshotId,
    states: parseStates(row.states),
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
  };
}

function mapStateRow(row: typeof workspaceRegressionWatchlistItemState.$inferSelect): ProjectRegressionWatchlistItemTriageState {
  return {
    itemId: row.itemId,
    note: row.note,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    projectId: row.projectId,
    snoozedUntil: toIso(row.snoozedUntil),
    status: row.status,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWorkspaceRegressionWatchlistSnapshots(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<ProjectRegressionWatchlistSnapshotHistoryReport>> {
  await ensureWorkspaceRegressionWatchlistSchema();

  const access = await requireWatchlistManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceRegressionWatchlistSnapshot)
    .where(eq(workspaceRegressionWatchlistSnapshot.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceRegressionWatchlistSnapshot.createdAt))
    .limit(input.limit ?? 12);

  return createProjectRegressionWatchlistSnapshotHistoryReport(rows.map(mapSnapshotRow));
}

export async function listWorkspaceRegressionWatchlistItemStates(input: {
  currentUserId: string;
  itemIds?: string[];
  workspaceId: string;
}): Promise<ServiceResult<{ states: ProjectRegressionWatchlistItemTriageState[] }>> {
  await ensureWorkspaceRegressionWatchlistSchema();

  const access = await requireWatchlistManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const itemIds = [...new Set(input.itemIds ?? [])].filter(Boolean);

  if (input.itemIds && itemIds.length === 0) {
    return { states: [] };
  }

  const rows = await getDb()
    .select()
    .from(workspaceRegressionWatchlistItemState)
    .where(
      itemIds.length > 0
        ? and(eq(workspaceRegressionWatchlistItemState.workspaceId, input.workspaceId), inArray(workspaceRegressionWatchlistItemState.itemId, itemIds))
        : eq(workspaceRegressionWatchlistItemState.workspaceId, input.workspaceId),
    )
    .orderBy(desc(workspaceRegressionWatchlistItemState.updatedAt));

  return { states: rows.map(mapStateRow) };
}

export async function recordWorkspaceRegressionWatchlistSnapshot(input: {
  currentUserId: string;
  report: ProjectRegressionWatchlistReport;
  states?: ProjectRegressionWatchlistItemTriageState[];
  workspaceId: string;
}): Promise<ServiceResult<{ snapshot: ProjectRegressionWatchlistSnapshotRecord }>> {
  await ensureWorkspaceRegressionWatchlistSchema();

  const access = await requireWatchlistManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceSnapshot = await getWorkspaceSnapshot(input.workspaceId);

  if (!workspaceSnapshot) {
    return { error: "Workspace not found.", status: 404 };
  }

  const snapshot = createProjectRegressionWatchlistSnapshotRecord({
    actor: await getActor(input.currentUserId),
    report: input.report,
    states: input.states ?? [],
    workspace: workspaceSnapshot,
  });

  await getDb().insert(workspaceRegressionWatchlistSnapshot).values({
    actorEmail: snapshot.actor.email,
    actorName: snapshot.actor.name,
    actorUserId: snapshot.actor.userId,
    contentHash: snapshot.contentHash,
    createdAt: new Date(snapshot.createdAt),
    csvByteSize: snapshot.csvByteSize,
    csvFileName: snapshot.csvFileName,
    id: snapshot.id,
    itemCount: snapshot.itemCount,
    jsonByteSize: snapshot.jsonByteSize,
    jsonFileName: snapshot.jsonFileName,
    recurringCount: snapshot.recurringCount,
    report: snapshot.report,
    severeCount: snapshot.severeCount,
    snapshotId: snapshot.snapshotId,
    states: snapshot.states,
    workspaceId: snapshot.workspaceId,
    workspaceName: snapshot.workspaceName,
  });

  return { snapshot };
}

export async function updateWorkspaceRegressionWatchlistItemState(input: {
  currentUserId: string;
  itemId: string;
  note?: string | null;
  projectId: string;
  snoozedUntil?: Date | null;
  status: ProjectRegressionWatchlistTriageStatus;
  title: string;
  workspaceId: string;
}): Promise<ServiceResult<{ state: ProjectRegressionWatchlistItemTriageState }>> {
  await ensureWorkspaceRegressionWatchlistSchema();

  const access = await requireWatchlistManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const now = new Date();
  const actor = await getActor(input.currentUserId);
  const snoozedUntil = input.status === "snoozed" ? (input.snoozedUntil ?? new Date(now.getTime() + 24 * 60 * 60 * 1000)) : null;
  const existing = await getDb()
    .select()
    .from(workspaceRegressionWatchlistItemState)
    .where(and(eq(workspaceRegressionWatchlistItemState.workspaceId, input.workspaceId), eq(workspaceRegressionWatchlistItemState.itemId, input.itemId)))
    .limit(1);

  if (existing[0]) {
    const rows = await getDb()
      .update(workspaceRegressionWatchlistItemState)
      .set({
        note: input.note ?? null,
        ownerEmail: actor.email,
        ownerName: actor.name,
        ownerUserId: actor.userId,
        projectId: input.projectId,
        snoozedUntil,
        status: input.status,
        title: input.title,
        updatedAt: now,
      })
      .where(eq(workspaceRegressionWatchlistItemState.id, existing[0].id))
      .returning();

    return rows[0] ? { state: mapStateRow(rows[0]) } : { error: "Watchlist state not found.", status: 404 };
  }

  const rows = await getDb()
    .insert(workspaceRegressionWatchlistItemState)
    .values({
      createdAt: now,
      id: nanoid(),
      itemId: input.itemId,
      note: input.note ?? null,
      ownerEmail: actor.email,
      ownerName: actor.name,
      ownerUserId: actor.userId,
      projectId: input.projectId,
      snoozedUntil,
      status: input.status,
      title: input.title,
      updatedAt: now,
      workspaceId: input.workspaceId,
    })
    .returning();

  return rows[0] ? { state: mapStateRow(rows[0]) } : { error: "Watchlist state was not saved.", status: 500 };
}

export async function getWorkspaceRegressionWatchlistSnapshotDownloadResponse(input: {
  currentUserId: string;
  format: ProjectRegressionWatchlistFormat;
  snapshotId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceRegressionWatchlistSchema();

  const access = await requireWatchlistManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceRegressionWatchlistSnapshot)
    .where(and(eq(workspaceRegressionWatchlistSnapshot.workspaceId, input.workspaceId), eq(workspaceRegressionWatchlistSnapshot.id, input.snapshotId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Regression watchlist snapshot not found.", status: 404 };
  }

  return getProjectRegressionWatchlistSnapshotDownload(mapSnapshotRow(row), input.format);
}
