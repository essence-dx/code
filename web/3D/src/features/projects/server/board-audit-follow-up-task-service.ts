import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { user, workspaceBoardAuditFollowUpTaskRecord, workspaceBoardAuditFollowUpTaskState } from "@/db/schema";
import {
  createBoardAuditTaskPersistenceRecord,
  getBoardAuditTaskPersistenceDownload,
  type BoardAuditTaskCloseoutState,
  type BoardAuditTaskCloseoutStatus,
  type BoardAuditTaskPersistenceFormat,
  type BoardAuditTaskPersistenceRecord,
  type PersistedBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardAuditFollowUpTaskSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_audit_follow_up_task_record (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        record_id text NOT NULL,
        content_hash text NOT NULL,
        task_count integer NOT NULL,
        assigned_count integer NOT NULL,
        closed_count integer NOT NULL,
        overdue_count integer NOT NULL,
        closure_score integer NOT NULL,
        json_file_name text NOT NULL,
        csv_file_name text NOT NULL,
        json_byte_size integer NOT NULL,
        csv_byte_size integer NOT NULL,
        persisted text NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_record_workspace_idx ON workspace_board_audit_follow_up_task_record(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_record_actor_idx ON workspace_board_audit_follow_up_task_record(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_record_created_idx ON workspace_board_audit_follow_up_task_record(workspace_id, created_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_record_hash_idx ON workspace_board_audit_follow_up_task_record(workspace_id, content_hash)");
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_audit_follow_up_task_state (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        task_id text NOT NULL,
        title text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        closeout_note text,
        owner_user_id text REFERENCES user(id) ON DELETE SET NULL,
        owner_name text NOT NULL,
        owner_email text,
        due_at integer NOT NULL,
        closed_at integer,
        state text NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_state_workspace_idx ON workspace_board_audit_follow_up_task_state(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_state_owner_idx ON workspace_board_audit_follow_up_task_state(owner_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_state_status_idx ON workspace_board_audit_follow_up_task_state(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_state_due_idx ON workspace_board_audit_follow_up_task_state(workspace_id, due_at)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_board_audit_follow_up_task_state_workspace_task_idx ON workspace_board_audit_follow_up_task_state(workspace_id, task_id)",
    );
  })();

  await schemaReady;
}

async function requireBoardAuditManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board audit follow-up tasks.", status: 403 };
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

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePersisted(value: PersistedBoardAuditFollowUpTasksReport | string): PersistedBoardAuditFollowUpTasksReport {
  return typeof value === "string" ? (JSON.parse(value) as PersistedBoardAuditFollowUpTasksReport) : value;
}

function parseState(value: BoardAuditTaskCloseoutState | string): BoardAuditTaskCloseoutState {
  return typeof value === "string" ? (JSON.parse(value) as BoardAuditTaskCloseoutState) : value;
}

function mapRecordRow(row: typeof workspaceBoardAuditFollowUpTaskRecord.$inferSelect): BoardAuditTaskPersistenceRecord {
  return {
    actor: {
      email: row.actorEmail,
      name: row.actorName,
      userId: row.actorUserId,
    },
    assignedCount: row.assignedCount,
    closedCount: row.closedCount,
    closureScore: row.closureScore,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    csvByteSize: row.csvByteSize,
    csvFileName: row.csvFileName,
    id: row.id,
    jsonByteSize: row.jsonByteSize,
    jsonFileName: row.jsonFileName,
    overdueCount: row.overdueCount,
    persisted: parsePersisted(row.persisted),
    recordId: row.recordId,
    taskCount: row.taskCount,
    workspaceId: row.workspaceId,
  };
}

function mapStateRow(row: typeof workspaceBoardAuditFollowUpTaskState.$inferSelect): BoardAuditTaskCloseoutState {
  return {
    ...parseState(row.state),
    closedAt: toIso(row.closedAt),
    closeoutNote: row.closeoutNote,
    dueAt: row.dueAt.toISOString(),
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    status: row.status,
    taskId: row.taskId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWorkspaceBoardAuditTaskRecords(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ records: BoardAuditTaskPersistenceRecord[] }>> {
  await ensureWorkspaceBoardAuditFollowUpTaskSchema();

  const access = await requireBoardAuditManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardAuditFollowUpTaskRecord)
    .where(eq(workspaceBoardAuditFollowUpTaskRecord.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceBoardAuditFollowUpTaskRecord.createdAt))
    .limit(input.limit ?? 12);

  return { records: rows.map(mapRecordRow) };
}

export async function listWorkspaceBoardAuditTaskStates(input: {
  currentUserId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ states: BoardAuditTaskCloseoutState[] }>> {
  await ensureWorkspaceBoardAuditFollowUpTaskSchema();

  const access = await requireBoardAuditManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardAuditFollowUpTaskState)
    .where(eq(workspaceBoardAuditFollowUpTaskState.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceBoardAuditFollowUpTaskState.updatedAt));

  return { states: rows.map(mapStateRow) };
}

export async function recordWorkspaceBoardAuditTaskSnapshot(input: {
  currentUserId: string;
  persisted: PersistedBoardAuditFollowUpTasksReport;
  workspaceId: string;
}): Promise<ServiceResult<{ record: BoardAuditTaskPersistenceRecord }>> {
  await ensureWorkspaceBoardAuditFollowUpTaskSchema();

  const access = await requireBoardAuditManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  if (input.persisted.workspaceId !== input.workspaceId) {
    return { error: "Board audit task report workspace does not match the requested workspace.", status: 400 };
  }

  const record = createBoardAuditTaskPersistenceRecord({
    actor: await getActor(input.currentUserId),
    persisted: input.persisted,
    workspaceId: input.workspaceId,
  });

  await getDb().insert(workspaceBoardAuditFollowUpTaskRecord).values({
    actorEmail: record.actor.email,
    actorName: record.actor.name,
    actorUserId: record.actor.userId,
    assignedCount: record.assignedCount,
    closedCount: record.closedCount,
    closureScore: record.closureScore,
    contentHash: record.contentHash,
    createdAt: new Date(record.createdAt),
    csvByteSize: record.csvByteSize,
    csvFileName: record.csvFileName,
    id: record.id,
    jsonByteSize: record.jsonByteSize,
    jsonFileName: record.jsonFileName,
    overdueCount: record.overdueCount,
    persisted: record.persisted,
    recordId: record.recordId,
    taskCount: record.taskCount,
    workspaceId: record.workspaceId,
  });

  return { record };
}

export async function upsertWorkspaceBoardAuditTaskState(input: {
  closedAt?: Date | null;
  closeoutNote?: string | null;
  currentUserId: string;
  dueAt: Date;
  ownerEmail?: string | null;
  ownerName: string;
  ownerUserId?: string | null;
  status: BoardAuditTaskCloseoutStatus;
  taskId: string;
  title: string;
  workspaceId: string;
}): Promise<ServiceResult<{ state: BoardAuditTaskCloseoutState }>> {
  await ensureWorkspaceBoardAuditFollowUpTaskSchema();

  const access = await requireBoardAuditManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const now = new Date();
  const state: BoardAuditTaskCloseoutState = {
    closedAt: input.status === "closed" ? (input.closedAt ?? now).toISOString() : null,
    closeoutNote: input.closeoutNote ?? null,
    dueAt: input.dueAt.toISOString(),
    ownerEmail: input.ownerEmail ?? null,
    ownerName: input.ownerName,
    ownerUserId: input.ownerUserId ?? null,
    status: input.status,
    taskId: input.taskId,
    updatedAt: now.toISOString(),
  };
  const existing = await getDb()
    .select()
    .from(workspaceBoardAuditFollowUpTaskState)
    .where(and(eq(workspaceBoardAuditFollowUpTaskState.workspaceId, input.workspaceId), eq(workspaceBoardAuditFollowUpTaskState.taskId, input.taskId)))
    .limit(1);

  if (existing[0]) {
    const rows = await getDb()
      .update(workspaceBoardAuditFollowUpTaskState)
      .set({
        closedAt: toDate(state.closedAt),
        closeoutNote: state.closeoutNote,
        dueAt: input.dueAt,
        ownerEmail: state.ownerEmail,
        ownerName: state.ownerName,
        ownerUserId: state.ownerUserId,
        state,
        status: state.status,
        title: input.title,
        updatedAt: now,
      })
      .where(eq(workspaceBoardAuditFollowUpTaskState.id, existing[0].id))
      .returning();

    return rows[0] ? { state: mapStateRow(rows[0]) } : { error: "Board audit task state not found.", status: 404 };
  }

  const rows = await getDb()
    .insert(workspaceBoardAuditFollowUpTaskState)
    .values({
      closedAt: toDate(state.closedAt),
      closeoutNote: state.closeoutNote,
      createdAt: now,
      dueAt: input.dueAt,
      id: nanoid(),
      ownerEmail: state.ownerEmail,
      ownerName: state.ownerName,
      ownerUserId: state.ownerUserId,
      state,
      status: state.status,
      taskId: input.taskId,
      title: input.title,
      updatedAt: now,
      workspaceId: input.workspaceId,
    })
    .returning();

  return rows[0] ? { state: mapStateRow(rows[0]) } : { error: "Board audit task state was not saved.", status: 500 };
}

export async function getWorkspaceBoardAuditTaskRecordDownloadResponse(input: {
  currentUserId: string;
  format: BoardAuditTaskPersistenceFormat;
  recordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ body: string; fileName: string; mimeType: string }>> {
  await ensureWorkspaceBoardAuditFollowUpTaskSchema();

  const access = await requireBoardAuditManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceBoardAuditFollowUpTaskRecord)
    .where(and(eq(workspaceBoardAuditFollowUpTaskRecord.workspaceId, input.workspaceId), eq(workspaceBoardAuditFollowUpTaskRecord.id, input.recordId)))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { error: "Board audit task record not found.", status: 404 };
  }

  return getBoardAuditTaskPersistenceDownload(mapRecordRow(row), input.format);
}
