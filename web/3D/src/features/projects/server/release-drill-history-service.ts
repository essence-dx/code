import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspace, workspaceReleaseDrillHistory } from "@/db/schema";
import {
  createReleaseDrillHistoryRecord,
  createReleaseDrillHistoryReport,
  getReleaseDrillHistoryDownload,
  type ReleaseDrillHistoryFormat,
  type ReleaseDrillHistoryRecord,
  type ReleaseDrillHistoryReport,
  type ReleaseDrillHistoryScenarioRecord,
} from "@/features/projects/release-drill-history";
import type { ReleaseDrillSimulationReport } from "@/features/projects/release-drill-simulation";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const drillHistoryManagerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceReleaseDrillHistorySchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_release_drill_history (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        drill_id text NOT NULL,
        content_hash text NOT NULL,
        workspace_name text NOT NULL,
        score integer NOT NULL,
        total_count integer NOT NULL,
        ready_count integer NOT NULL,
        watch_count integer NOT NULL,
        missing_count integer NOT NULL,
        blocked_count integer NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        report text NOT NULL,
        drill_rows text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_drill_history_workspace_idx ON workspace_release_drill_history(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_drill_history_actor_idx ON workspace_release_drill_history(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_drill_history_created_idx ON workspace_release_drill_history(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_drill_history_hash_idx ON workspace_release_drill_history(workspace_id, content_hash)");
  })();

  await schemaReady;
}

async function requireDrillHistoryManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!drillHistoryManagerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage release drill history.", status: 403 };
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
  const rows = await getDb().select({ id: workspace.id, name: workspace.name }).from(workspace).where(eq(workspace.id, workspaceId)).limit(1);

  return rows[0] ?? null;
}

function parseReport(value: ReleaseDrillSimulationReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as ReleaseDrillSimulationReport) : value;
}

function parseRows(value: ReleaseDrillHistoryScenarioRecord[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as ReleaseDrillHistoryScenarioRecord[]) : [];
  } catch {
    return [];
  }
}

function mapHistoryRow(row: typeof workspaceReleaseDrillHistory.$inferSelect): ReleaseDrillHistoryRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    blockedCount: row.blockedCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    drillId: row.drillId,
    drillRows: parseRows(row.drillRows),
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    missingCount: row.missingCount,
    readyCount: row.readyCount,
    report: parseReport(row.report),
    score: row.score,
    totalCount: row.totalCount,
    watchCount: row.watchCount,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
  };
}

export async function listWorkspaceReleaseDrillHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<ReleaseDrillHistoryReport>> {
  await ensureWorkspaceReleaseDrillHistorySchema();

  const access = await requireDrillHistoryManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceReleaseDrillHistory)
    .where(eq(workspaceReleaseDrillHistory.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseDrillHistory.createdAt))
    .limit(input.limit ?? 12);

  return createReleaseDrillHistoryReport(rows.map(mapHistoryRow));
}

export async function recordWorkspaceReleaseDrillHistory(input: {
  currentUserId: string;
  report: ReleaseDrillSimulationReport;
  workspaceId: string;
}): Promise<ServiceResult<{ record: ReleaseDrillHistoryRecord }>> {
  await ensureWorkspaceReleaseDrillHistorySchema();

  const access = await requireDrillHistoryManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceSnapshot = await getWorkspaceSnapshot(input.workspaceId);

  if (!workspaceSnapshot) {
    return { error: "Workspace not found.", status: 404 };
  }

  const record = createReleaseDrillHistoryRecord({
    actor: await getActor(input.currentUserId),
    report: input.report,
    workspace: workspaceSnapshot,
  });

  await getDb().insert(workspaceReleaseDrillHistory).values({
    actorEmail: record.actor.email,
    actorName: record.actor.name,
    actorUserId: record.actor.userId,
    blockedCount: record.blockedCount,
    contentHash: record.contentHash,
    createdAt: new Date(record.createdAt),
    csvByteSize: record.csvByteSize,
    csvFileName: record.csvFileName,
    drillId: record.drillId,
    drillRows: record.drillRows,
    id: record.id,
    jsonByteSize: record.jsonByteSize,
    jsonFileName: record.jsonFileName,
    missingCount: record.missingCount,
    readyCount: record.readyCount,
    report: record.report,
    score: record.score,
    totalCount: record.totalCount,
    watchCount: record.watchCount,
    workspaceId: record.workspaceId,
    workspaceName: record.workspaceName,
  });

  return { record };
}

export async function getWorkspaceReleaseDrillHistoryDownloadResponse(input: {
  currentUserId: string;
  format: ReleaseDrillHistoryFormat;
  recordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceReleaseDrillHistorySchema();

  const access = await requireDrillHistoryManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceReleaseDrillHistory)
    .where(and(eq(workspaceReleaseDrillHistory.workspaceId, input.workspaceId), eq(workspaceReleaseDrillHistory.id, input.recordId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Release drill history record not found.", status: 404 };
  }

  return getReleaseDrillHistoryDownload(mapHistoryRow(row), input.format);
}
