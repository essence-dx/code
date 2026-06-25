import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspace, workspaceExecutiveReleaseSnapshot } from "@/db/schema";
import {
  createExecutiveReleaseSnapshotHistoryReport,
  createExecutiveReleaseSnapshotRecord,
  getExecutiveReleaseSnapshotDownload,
  type ExecutiveReleaseSnapshotFormat,
  type ExecutiveReleaseSnapshotHistoryReport,
  type ExecutiveReleaseSnapshotRecord,
} from "@/features/projects/executive-release-snapshots";
import type { ExecutiveReleaseIntelligenceDomain, ExecutiveReleaseIntelligenceReport } from "@/features/projects/executive-release-intelligence";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const snapshotManagerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceExecutiveReleaseSnapshotSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_executive_release_snapshot (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        snapshot_id text NOT NULL,
        content_hash text NOT NULL,
        workspace_name text NOT NULL,
        status text NOT NULL,
        executive_score integer NOT NULL,
        blocked_count integer NOT NULL,
        watch_count integer NOT NULL,
        ready_count integer NOT NULL,
        critical_path_count integer NOT NULL,
        lowest_domain text NOT NULL,
        top_action text NOT NULL,
        domain_scores text NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        report text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_executive_release_snapshot_workspace_idx ON workspace_executive_release_snapshot(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_executive_release_snapshot_actor_idx ON workspace_executive_release_snapshot(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_executive_release_snapshot_created_idx ON workspace_executive_release_snapshot(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_executive_release_snapshot_hash_idx ON workspace_executive_release_snapshot(workspace_id, content_hash)");
  })();

  await schemaReady;
}

async function requireSnapshotManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!snapshotManagerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage executive release snapshots.", status: 403 };
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

function parseJsonValue<T>(value: T | string, fallback: T): T {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emptyDomainScores(): Record<ExecutiveReleaseIntelligenceDomain, number> {
  return {
    automation: 0,
    cost: 0,
    evidence: 0,
    governance: 0,
    incident: 0,
    launch: 0,
    risk: 0,
  };
}

function parseReport(value: ExecutiveReleaseIntelligenceReport | string) {
  return typeof value === "string" ? (JSON.parse(value) as ExecutiveReleaseIntelligenceReport) : value;
}

function mapSnapshotRow(row: typeof workspaceExecutiveReleaseSnapshot.$inferSelect): ExecutiveReleaseSnapshotRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    blockedCount: row.blockedCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    criticalPathCount: row.criticalPathCount,
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    domainScores: parseJsonValue(row.domainScores, emptyDomainScores()),
    executiveScore: row.executiveScore,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    lowestDomain: row.lowestDomain,
    readyCount: row.readyCount,
    report: parseReport(row.report),
    snapshotId: row.snapshotId,
    status: row.status,
    topAction: row.topAction,
    watchCount: row.watchCount,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
  };
}

export async function listWorkspaceExecutiveReleaseSnapshotHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<ExecutiveReleaseSnapshotHistoryReport>> {
  await ensureWorkspaceExecutiveReleaseSnapshotSchema();

  const access = await requireSnapshotManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceExecutiveReleaseSnapshot)
    .where(eq(workspaceExecutiveReleaseSnapshot.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceExecutiveReleaseSnapshot.createdAt))
    .limit(input.limit ?? 12);

  return createExecutiveReleaseSnapshotHistoryReport(rows.map(mapSnapshotRow));
}

export async function recordWorkspaceExecutiveReleaseSnapshot(input: {
  currentUserId: string;
  report: ExecutiveReleaseIntelligenceReport;
  workspaceId: string;
}): Promise<ServiceResult<{ history: ExecutiveReleaseSnapshotHistoryReport; snapshot: ExecutiveReleaseSnapshotRecord }>> {
  await ensureWorkspaceExecutiveReleaseSnapshotSchema();

  const access = await requireSnapshotManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const workspaceSnapshot = await getWorkspaceSnapshot(input.workspaceId);

  if (!workspaceSnapshot) {
    return { error: "Workspace not found.", status: 404 };
  }

  const snapshot = createExecutiveReleaseSnapshotRecord({
    actor: await getActor(input.currentUserId),
    report: input.report,
    workspace: workspaceSnapshot,
  });

  await getDb().insert(workspaceExecutiveReleaseSnapshot).values({
    actorEmail: snapshot.actor.email,
    actorName: snapshot.actor.name,
    actorUserId: snapshot.actor.userId,
    blockedCount: snapshot.blockedCount,
    contentHash: snapshot.contentHash,
    createdAt: new Date(snapshot.createdAt),
    criticalPathCount: snapshot.criticalPathCount,
    csvByteSize: snapshot.csvByteSize,
    csvFileName: snapshot.csvFileName,
    domainScores: snapshot.domainScores,
    executiveScore: snapshot.executiveScore,
    id: snapshot.id,
    jsonByteSize: snapshot.jsonByteSize,
    jsonFileName: snapshot.jsonFileName,
    lowestDomain: snapshot.lowestDomain,
    readyCount: snapshot.readyCount,
    report: snapshot.report,
    snapshotId: snapshot.snapshotId,
    status: snapshot.status,
    topAction: snapshot.topAction,
    watchCount: snapshot.watchCount,
    workspaceId: snapshot.workspaceId,
    workspaceName: snapshot.workspaceName,
  });

  const history = await listWorkspaceExecutiveReleaseSnapshotHistory({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in history) {
    return history;
  }

  return { history, snapshot };
}

export async function getWorkspaceExecutiveReleaseSnapshotDownloadResponse(input: {
  currentUserId: string;
  format: ExecutiveReleaseSnapshotFormat;
  snapshotId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceExecutiveReleaseSnapshotSchema();

  const access = await requireSnapshotManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceExecutiveReleaseSnapshot)
    .where(and(eq(workspaceExecutiveReleaseSnapshot.workspaceId, input.workspaceId), eq(workspaceExecutiveReleaseSnapshot.id, input.snapshotId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Executive release snapshot not found.", status: 404 };
  }

  return getExecutiveReleaseSnapshotDownload(mapSnapshotRow(row), input.format);
}
