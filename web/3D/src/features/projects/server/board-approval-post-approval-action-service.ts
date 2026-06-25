import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workspaceBoardPostApprovalAction } from "@/db/schema";
import {
  createBoardApprovalPostApprovalActionHistoryReport,
  createBoardApprovalPostApprovalActionRecords,
  type BoardApprovalPostApprovalActionActor,
  type BoardApprovalPostApprovalActionAuditEvent,
  type BoardApprovalPostApprovalActionHistoryReport,
  type BoardApprovalPostApprovalActionRecord,
} from "@/features/projects/board-approval-post-approval-history";
import type { BoardApprovalPostApprovalAction, BoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceBoardPostApprovalActionSchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_board_post_approval_action (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        created_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        created_by_name text,
        created_by_email text,
        updated_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        updated_by_name text,
        updated_by_email text,
        source_key text NOT NULL,
        runbook_source_key text NOT NULL,
        calendar_source_key text NOT NULL,
        role text NOT NULL,
        status text NOT NULL,
        title text NOT NULL,
        action text NOT NULL,
        owner_name text NOT NULL,
        owner_email text,
        due_at integer NOT NULL,
        tracker_generated_at integer NOT NULL,
        content_hash text NOT NULL,
        refresh_count integer NOT NULL DEFAULT 0,
        generated_action text NOT NULL,
        audit_trail text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_board_post_approval_action_source_idx ON workspace_board_post_approval_action(workspace_id, source_key)",
    );
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_post_approval_action_workspace_idx ON workspace_board_post_approval_action(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_post_approval_action_status_idx ON workspace_board_post_approval_action(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_post_approval_action_due_idx ON workspace_board_post_approval_action(workspace_id, due_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_board_post_approval_action_updated_idx ON workspace_board_post_approval_action(workspace_id, updated_at)");
  })();

  await schemaReady;
}

async function requireBoardAutomationManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can manage board automation actions.", status: 403 };
  }

  return { role: access.role };
}

async function getActor(userId: string): Promise<BoardApprovalPostApprovalActionActor> {
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

function toDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(value: string) {
  return toDate(value) ?? new Date();
}

function mapActionRow(row: typeof workspaceBoardPostApprovalAction.$inferSelect): BoardApprovalPostApprovalActionRecord {
  return {
    action: row.action,
    auditTrail: parseJsonValue<BoardApprovalPostApprovalActionAuditEvent[]>(row.auditTrail, []),
    calendarSourceKey: row.calendarSourceKey,
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    createdBy: {
      email: row.createdByEmail,
      name: row.createdByName,
      userId: row.createdByUserId,
    },
    dueAt: row.dueAt.toISOString(),
    generatedAction: parseJsonValue<BoardApprovalPostApprovalAction>(row.generatedAction, {
      action: row.action,
      agendaItemId: null,
      calendarSourceKey: row.calendarSourceKey,
      dueAt: row.dueAt.toISOString(),
      evidence: [],
      id: row.sourceKey,
      ownerEmail: row.ownerEmail,
      ownerName: row.ownerName,
      role: row.role,
      runbookSourceKey: row.runbookSourceKey,
      source: "board-sign-off",
      status: row.status,
      title: row.title,
    }),
    id: row.id,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    refreshCount: row.refreshCount,
    role: row.role,
    runbookSourceKey: row.runbookSourceKey,
    sourceKey: row.sourceKey,
    status: row.status,
    title: row.title,
    trackerGeneratedAt: row.trackerGeneratedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: {
      email: row.updatedByEmail,
      name: row.updatedByName,
      userId: row.updatedByUserId,
    },
    workspaceId: row.workspaceId,
  };
}

async function loadWorkspaceBoardPostApprovalActions(workspaceId: string, limit = 60) {
  const rows = await getDb()
    .select()
    .from(workspaceBoardPostApprovalAction)
    .where(eq(workspaceBoardPostApprovalAction.workspaceId, workspaceId))
    .orderBy(desc(workspaceBoardPostApprovalAction.updatedAt))
    .limit(limit);

  return rows.map(mapActionRow);
}

function createReport(records: BoardApprovalPostApprovalActionRecord[]): BoardApprovalPostApprovalActionHistoryReport {
  return createBoardApprovalPostApprovalActionHistoryReport(records);
}

async function saveActionRecord(record: BoardApprovalPostApprovalActionRecord, existingId: string | null) {
  const values = {
    action: record.action,
    auditTrail: record.auditTrail,
    calendarSourceKey: record.calendarSourceKey,
    contentHash: record.contentHash,
    dueAt: requiredDate(record.dueAt),
    generatedAction: record.generatedAction,
    ownerEmail: record.ownerEmail,
    ownerName: record.ownerName,
    refreshCount: record.refreshCount,
    role: record.role,
    runbookSourceKey: record.runbookSourceKey,
    sourceKey: record.sourceKey,
    status: record.status,
    title: record.title,
    trackerGeneratedAt: requiredDate(record.trackerGeneratedAt),
    updatedAt: requiredDate(record.updatedAt),
    updatedByEmail: record.updatedBy.email,
    updatedByName: record.updatedBy.name,
    updatedByUserId: record.updatedBy.userId,
    workspaceId: record.workspaceId,
  };

  if (existingId) {
    await getDb().update(workspaceBoardPostApprovalAction).set(values).where(eq(workspaceBoardPostApprovalAction.id, existingId));
    return;
  }

  await getDb().insert(workspaceBoardPostApprovalAction).values({
    ...values,
    createdAt: requiredDate(record.createdAt),
    createdByEmail: record.createdBy.email,
    createdByName: record.createdBy.name,
    createdByUserId: record.createdBy.userId,
    id: record.id,
  });
}

export async function listWorkspaceBoardPostApprovalActions(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<BoardApprovalPostApprovalActionHistoryReport>> {
  await ensureWorkspaceBoardPostApprovalActionSchema();

  const access = await requireBoardAutomationManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  return createReport(await loadWorkspaceBoardPostApprovalActions(input.workspaceId, input.limit));
}

export async function recordWorkspaceBoardPostApprovalActions(input: {
  currentUserId: string;
  tracker: BoardApprovalPostApprovalTrackerReport;
  workspaceId: string;
}): Promise<ServiceResult<{ history: BoardApprovalPostApprovalActionHistoryReport; records: BoardApprovalPostApprovalActionRecord[] }>> {
  await ensureWorkspaceBoardPostApprovalActionSchema();

  const access = await requireBoardAutomationManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const existingRecords = await loadWorkspaceBoardPostApprovalActions(input.workspaceId, 360);
  const existingBySourceKey = new Map(existingRecords.map((record) => [record.sourceKey, record]));
  const actor = await getActor(input.currentUserId);
  const records = createBoardApprovalPostApprovalActionRecords({
    actor,
    existingRecords,
    tracker: input.tracker,
    workspaceId: input.workspaceId,
  });

  for (const record of records) {
    await saveActionRecord(record, existingBySourceKey.get(record.sourceKey)?.id ?? null);
  }

  return {
    history: createReport(await loadWorkspaceBoardPostApprovalActions(input.workspaceId)),
    records,
  };
}
