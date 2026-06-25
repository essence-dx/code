import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardDecisionReplaySnapshot } from "@/db/schema";
import {
  createBoardDecisionReplaySnapshotHistoryReport,
  createBoardDecisionReplaySnapshotRecord,
  getBoardDecisionReplaySnapshotDownload,
  type BoardDecisionReplaySnapshotActor,
  type BoardDecisionReplaySnapshotFormat,
  type BoardDecisionReplaySnapshotHistoryReport,
  type BoardDecisionReplaySnapshotRecord,
} from "@/features/projects/board-decision-replay-snapshots";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardDecisionReplaySnapshotSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_decision_replay_snapshot (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        snapshot_id text NOT NULL,
        content_hash text NOT NULL,
        status text NOT NULL,
        replay_score integer NOT NULL,
        blocked_row_count integer NOT NULL,
        watch_row_count integer NOT NULL,
        row_count integer NOT NULL,
        active_approval_count integer NOT NULL,
        later_incident_count integer NOT NULL,
        release_evidence_drift_count integer NOT NULL,
        runbook_blocked_count integer NOT NULL,
        runbook_incomplete_count integer NOT NULL,
        top_action text NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        report text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_decision_replay_snapshot_workspace_idx ON workspace_board_decision_replay_snapshot(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_decision_replay_snapshot_actor_idx ON workspace_board_decision_replay_snapshot(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_decision_replay_snapshot_created_idx ON workspace_board_decision_replay_snapshot(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_decision_replay_snapshot_hash_idx ON workspace_board_decision_replay_snapshot(workspace_id, content_hash)");
  })();

  await schemaReady;
}

async function requireBoardAssuranceManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board assurance snapshots.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardDecisionReplaySnapshotActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parseReport(value: BoardDecisionReplayAuditReport | string): BoardDecisionReplayAuditReport {
  return typeof value === "string" ? (JSON.parse(value) as BoardDecisionReplayAuditReport) : value;
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapSnapshotRow(row: typeof workspaceBoardDecisionReplaySnapshot.$inferSelect): BoardDecisionReplaySnapshotRecord {
  return {
    activeApprovalCount: row.activeApprovalCount,
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    blockedRowCount: row.blockedRowCount,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    laterIncidentCount: row.laterIncidentCount,
    releaseEvidenceDriftCount: row.releaseEvidenceDriftCount,
    report: parseReport(row.report),
    replayScore: row.replayScore,
    rowCount: row.rowCount,
    runbookBlockedCount: row.runbookBlockedCount,
    runbookIncompleteCount: row.runbookIncompleteCount,
    snapshotId: row.snapshotId,
    status: row.status,
    topAction: row.topAction,
    watchRowCount: row.watchRowCount,
    workspaceId: row.workspaceId,
  };
}

async function loadWorkspaceReplaySnapshots(workspaceId: string, limit = 12) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardDecisionReplaySnapshot)
    .where(eq(workspaceBoardDecisionReplaySnapshot.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardDecisionReplaySnapshot.createdAt))
    .limit(limit);

  return rows.map(mapSnapshotRow);
}

function createReport(records: BoardDecisionReplaySnapshotRecord[]): BoardDecisionReplaySnapshotHistoryReport {
  return createBoardDecisionReplaySnapshotHistoryReport(records);
}

export async function listWorkspaceBoardDecisionReplaySnapshotHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardDecisionReplaySnapshotHistoryReport>> {
  await ensureWorkspaceBoardDecisionReplaySnapshotSchema();

  const access = await requireBoardAssuranceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceReplaySnapshots(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardDecisionReplaySnapshot(input: {
  currentUserId: string;
  report: BoardDecisionReplayAuditReport;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardDecisionReplaySnapshotHistoryReport; snapshot: BoardDecisionReplaySnapshotRecord }>> {
  await ensureWorkspaceBoardDecisionReplaySnapshotSchema();

  const access = await requireBoardAssuranceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  if (input.report.workspaceId !== input.workspaceId) {
    return { error: "Board decision replay audit workspace does not match the requested workspace.", status: 400 };
  }

  const snapshot = createBoardDecisionReplaySnapshotRecord({
    actor: await getActor(input.currentUserId),
    report: input.report,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceBoardDecisionReplaySnapshot).values({
    activeApprovalCount: snapshot.activeApprovalCount,
    actorEmail: snapshot.actor.email,
    actorName: snapshot.actor.name,
    actorUserId: snapshot.actor.userId,
    blockedRowCount: snapshot.blockedRowCount,
    contentHash: snapshot.contentHash,
    createdAt: toDate(snapshot.createdAt),
    csvByteSize: snapshot.csvByteSize,
    csvFileName: snapshot.csvFileName,
    id: snapshot.id,
    jsonByteSize: snapshot.jsonByteSize,
    jsonFileName: snapshot.jsonFileName,
    laterIncidentCount: snapshot.laterIncidentCount,
    releaseEvidenceDriftCount: snapshot.releaseEvidenceDriftCount,
    report: snapshot.report,
    replayScore: snapshot.replayScore,
    rowCount: snapshot.rowCount,
    runbookBlockedCount: snapshot.runbookBlockedCount,
    runbookIncompleteCount: snapshot.runbookIncompleteCount,
    snapshotId: snapshot.snapshotId,
    status: snapshot.status,
    topAction: snapshot.topAction,
    watchRowCount: snapshot.watchRowCount,
    workspaceId: snapshot.workspaceId,
  });

  return {
    history: createReport(await loadWorkspaceReplaySnapshots(input.workspaceId)),
    snapshot,
  };
}

export async function getWorkspaceBoardDecisionReplaySnapshotDownloadResponse(input: {
  currentUserId: string;
  format: BoardDecisionReplaySnapshotFormat;
  snapshotId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardDecisionReplaySnapshotSchema();

  const access = await requireBoardAssuranceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardDecisionReplaySnapshot)
    .where(and(eq(workspaceBoardDecisionReplaySnapshot.workspaceId, input.workspaceId), eq(workspaceBoardDecisionReplaySnapshot.id, input.snapshotId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Board decision replay snapshot not found.", status: 404 };
  }

  return getBoardDecisionReplaySnapshotDownload(mapSnapshotRow(row), input.format);
}
