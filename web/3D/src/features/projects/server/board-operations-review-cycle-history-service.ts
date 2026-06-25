import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardOperationsReviewCycle } from "@/db/schema";
import {
  createBoardOperationsReviewCycleHistoryRecord,
  createBoardOperationsReviewCycleHistoryReport,
  getBoardOperationsReviewCycleHistoryDownload,
  type BoardOperationsReviewCycleHistoryActor,
  type BoardOperationsReviewCycleHistoryFormat,
  type BoardOperationsReviewCycleHistoryRecord,
  type BoardOperationsReviewCycleHistoryReport,
} from "@/features/projects/board-operations-review-cycle-history";
import type { BoardOperationsControlCenterReport, BoardOperationsReviewCycle } from "@/features/projects/board-operations-control-center";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardOperationsReviewCycleHistorySchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_operations_review_cycle (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        review_cycle_id text NOT NULL,
        review_cycle text NOT NULL,
        actor text NOT NULL,
        audit_hash text NOT NULL,
        content_hash text NOT NULL,
        status text NOT NULL,
        owner_closeout_state text NOT NULL,
        control_score integer NOT NULL,
        blocked_control_count integer NOT NULL,
        watch_control_count integer NOT NULL,
        ready_control_count integer NOT NULL,
        closeout_report text NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        control_center text NOT NULL,
        json_content text NOT NULL,
        csv_content text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_operations_review_cycle_workspace_idx ON workspace_board_operations_review_cycle(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_operations_review_cycle_actor_idx ON workspace_board_operations_review_cycle(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_operations_review_cycle_created_idx ON workspace_board_operations_review_cycle(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_operations_review_cycle_cycle_idx ON workspace_board_operations_review_cycle(workspace_id, review_cycle_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_operations_review_cycle_hash_idx ON workspace_board_operations_review_cycle(workspace_id, audit_hash)");
  })();

  await schemaReady;
}

async function requireBoardGovernanceManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board operations review cycle history.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardOperationsReviewCycleHistoryActor> {
  const actor = await getDb().select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1);

  return {
    email: actor[0]?.email ?? null,
    name: actor[0]?.name ?? null,
    userId,
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function mapReviewCycleRow(row: typeof workspaceBoardOperationsReviewCycle.$inferSelect): BoardOperationsReviewCycleHistoryRecord {
  return {
    actor: parseJsonValue<BoardOperationsReviewCycleHistoryActor>(row.actor, {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    }),
    auditHash: row.auditHash,
    blockedControlCount: row.blockedControlCount,
    closeoutReport: row.closeoutReport,
    contentHash: row.contentHash,
    controlCenter: parseJsonValue<BoardOperationsControlCenterReport>(row.controlCenter, {
      closeoutReport: row.closeoutReport,
      csvContent: row.csvContent,
      csvDataUri: "",
      csvFileName: row.csvFileName,
      generatedAt: row.createdAt.toISOString(),
      rows: [],
      summary: {
        blockedCount: row.blockedControlCount,
        controlScore: row.controlScore,
        nextAction: "Review saved board operations review cycle history.",
        readyCount: row.readyControlCount,
        rowCount: row.blockedControlCount + row.watchControlCount + row.readyControlCount,
        savedReviewCycleCount: 1,
        status: row.status,
        watchCount: row.watchControlCount,
      },
      workspaceId: row.workspaceId,
    }),
    controlScore: row.controlScore,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvContent: row.csvContent,
    csvFileName: row.csvFileName,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonContent: row.jsonContent,
    jsonFileName: row.jsonFileName,
    ownerCloseoutState: row.ownerCloseoutState,
    readyControlCount: row.readyControlCount,
    reviewCycle: parseJsonValue<BoardOperationsReviewCycle>(row.reviewCycle, {
      id: row.reviewCycleId,
      label: row.reviewCycleId,
      owner: row.actorName ?? "Board operations",
      savedAt: row.createdAt.toISOString(),
      status: row.status,
    }),
    reviewCycleId: row.reviewCycleId,
    status: row.status,
    watchControlCount: row.watchControlCount,
    workspaceId: row.workspaceId,
  };
}

async function loadWorkspaceReviewCycleHistory(workspaceId: string, limit = 12) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardOperationsReviewCycle)
    .where(eq(workspaceBoardOperationsReviewCycle.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardOperationsReviewCycle.createdAt))
    .limit(limit);

  return rows.map(mapReviewCycleRow);
}

function createReport(records: BoardOperationsReviewCycleHistoryRecord[]): BoardOperationsReviewCycleHistoryReport {
  return createBoardOperationsReviewCycleHistoryReport(records);
}

export async function listWorkspaceBoardOperationsReviewCycleHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardOperationsReviewCycleHistoryReport>> {
  await ensureWorkspaceBoardOperationsReviewCycleHistorySchema();

  const access = await requireBoardGovernanceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceReviewCycleHistory(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardOperationsReviewCycleHistory(input: {
  controlCenter: BoardOperationsControlCenterReport;
  currentUserId: string;
  reviewCycle: BoardOperationsReviewCycle;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardOperationsReviewCycleHistoryReport; record: BoardOperationsReviewCycleHistoryRecord }>> {
  await ensureWorkspaceBoardOperationsReviewCycleHistorySchema();

  const access = await requireBoardGovernanceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  if (input.controlCenter.workspaceId !== input.workspaceId) {
    return { error: "Board operations control center workspace does not match the requested workspace.", status: 400 };
  }

  const record = createBoardOperationsReviewCycleHistoryRecord({
    actor: await getActor(input.currentUserId),
    controlCenter: input.controlCenter,
    reviewCycle: input.reviewCycle,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceBoardOperationsReviewCycle).values({
    actor: record.actor,
    actorEmail: record.actor.email,
    actorName: record.actor.name,
    actorUserId: record.actor.userId,
    auditHash: record.auditHash,
    blockedControlCount: record.blockedControlCount,
    closeoutReport: record.closeoutReport,
    contentHash: record.contentHash,
    controlCenter: record.controlCenter,
    controlScore: record.controlScore,
    createdAt: toDate(record.createdAt),
    csvByteSize: record.csvByteSize,
    csvContent: record.csvContent,
    csvFileName: record.csvFileName,
    id: record.id,
    jsonByteSize: record.jsonByteSize,
    jsonContent: record.jsonContent,
    jsonFileName: record.jsonFileName,
    ownerCloseoutState: record.ownerCloseoutState,
    readyControlCount: record.readyControlCount,
    reviewCycle: record.reviewCycle,
    reviewCycleId: record.reviewCycleId,
    status: record.status,
    watchControlCount: record.watchControlCount,
    workspaceId: record.workspaceId,
  });

  return {
    history: createReport(await loadWorkspaceReviewCycleHistory(input.workspaceId)),
    record,
  };
}

export async function getWorkspaceBoardOperationsReviewCycleHistoryDownloadResponse(input: {
  currentUserId: string;
  format: BoardOperationsReviewCycleHistoryFormat;
  recordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardOperationsReviewCycleHistorySchema();

  const access = await requireBoardGovernanceManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardOperationsReviewCycle)
    .where(and(eq(workspaceBoardOperationsReviewCycle.workspaceId, input.workspaceId), eq(workspaceBoardOperationsReviewCycle.id, input.recordId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Board operations review cycle history record not found.", status: 404 };
  }

  const download = getBoardOperationsReviewCycleHistoryDownload(mapReviewCycleRow(row), input.format);

  return {
    body: download.body,
    fileName: download.fileName,
    mimeType: download.contentType,
  };
}
