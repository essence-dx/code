import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { user, workspaceReleaseRunbookRecord } from "@/db/schema";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import {
  applyWorkspaceReleaseRunbookTransition,
  createWorkspaceReleaseRunbookReportFromRecords,
  type WorkspaceReleaseRunbookRecord,
  type WorkspaceReleaseRunbookReport,
  type WorkspaceReleaseRunbookRecordStatus,
} from "@/features/workspaces/release-runbook";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

type ServiceResult<T> = T | { error: string; status: number };

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceReleaseRunbookSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_release_runbook_record (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        project_id text REFERENCES project(id) ON DELETE SET NULL,
        project_name text,
        batch_id text NOT NULL,
        source_key text NOT NULL,
        milestone_id text NOT NULL,
        title text NOT NULL,
        detail text NOT NULL,
        status text NOT NULL,
        owner_user_id text REFERENCES user(id) ON DELETE SET NULL,
        owner_name text NOT NULL,
        owner_email text,
        due_at integer NOT NULL,
        completed_at integer,
        checklist_evidence text NOT NULL DEFAULT '[]',
        comments text NOT NULL DEFAULT '[]',
        attachments text NOT NULL DEFAULT '[]',
        transition_history text NOT NULL DEFAULT '[]',
        audit_log_href text NOT NULL,
        blocker_count integer NOT NULL DEFAULT 0,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_runbook_record_workspace_idx ON workspace_release_runbook_record(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_runbook_record_project_idx ON workspace_release_runbook_record(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_runbook_record_owner_idx ON workspace_release_runbook_record(owner_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_runbook_record_status_idx ON workspace_release_runbook_record(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_runbook_record_due_idx ON workspace_release_runbook_record(workspace_id, due_at)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_release_runbook_record_batch_source_idx ON workspace_release_runbook_record(workspace_id, batch_id, source_key)",
    );
  })();

  await schemaReady;
}

export function getWorkspaceReleaseRunbookBatchId(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_GIT_COMMIT_SHA ?? env.VERCEL_DEPLOYMENT_ID ?? env.VERCEL_URL ?? "local-dashboard";
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(value: string) {
  return toDate(value) ?? new Date();
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function parseEvidence(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseJsonArray<T>(value: T[] | string | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

interface ReleaseRunbookRow {
  attachments: WorkspaceReleaseRunbookRecord["attachments"] | string;
  auditLogHref: string;
  batchId: string;
  blockerCount: number;
  checklistEvidence: string[] | string;
  comments: WorkspaceReleaseRunbookRecord["comments"] | string;
  completedAt: Date | null;
  detail: string;
  dueAt: Date;
  id: string;
  milestoneId: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerUserId: string | null;
  projectId: string | null;
  projectName: string | null;
  sourceKey: string;
  status: WorkspaceReleaseRunbookRecord["status"];
  title: string;
  transitionHistory: WorkspaceReleaseRunbookRecord["transitionHistory"] | string;
  workspaceId: string;
}

function recordFromRow(row: ReleaseRunbookRow): WorkspaceReleaseRunbookRecord {
  return {
    auditLogHref: row.auditLogHref,
    attachments: parseJsonArray(row.attachments),
    batchId: row.batchId,
    blockerCount: row.blockerCount,
    checklistEvidence: parseEvidence(row.checklistEvidence),
    comments: parseJsonArray(row.comments),
    completedAt: toIso(row.completedAt),
    detail: row.detail,
    dueAt: row.dueAt.toISOString(),
    id: row.id,
    milestoneId: row.milestoneId,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    projectId: row.projectId,
    projectName: row.projectName,
    sourceKey: row.sourceKey,
    status: row.status,
    title: row.title,
    transitionHistory: parseJsonArray(row.transitionHistory),
    workspaceId: row.workspaceId,
  };
}

export async function listWorkspaceReleaseRunbookRecords(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ records: WorkspaceReleaseRunbookRecord[] }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseRunbookSchema();

  const rows = await getDb()
    .select()
    .from(workspaceReleaseRunbookRecord)
    .where(eq(workspaceReleaseRunbookRecord.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseRunbookRecord.dueAt))
    .limit(input.limit ?? 360);

  return {
    records: rows.map((row) => recordFromRow(row)),
  };
}

export async function recordWorkspaceReleaseRunbookReport(input: {
  batchId?: string;
  currentUserId: string;
  report: WorkspaceReleaseRunbookReport;
  workspaceId: string;
}): Promise<ServiceResult<{ report: WorkspaceReleaseRunbookReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseRunbookSchema();

  const now = new Date();
  const batchId = input.batchId ?? input.report.records[0]?.batchId ?? getWorkspaceReleaseRunbookBatchId();

  await getDb()
    .delete(workspaceReleaseRunbookRecord)
    .where(and(eq(workspaceReleaseRunbookRecord.workspaceId, input.workspaceId), eq(workspaceReleaseRunbookRecord.batchId, batchId)));

  if (input.report.records.length > 0) {
    await getDb()
      .insert(workspaceReleaseRunbookRecord)
      .values(
        input.report.records.map((record) => ({
          auditLogHref: record.auditLogHref,
          batchId,
          blockerCount: record.blockerCount,
          attachments: record.attachments,
          checklistEvidence: record.checklistEvidence,
          comments: record.comments,
          completedAt: toDate(record.completedAt),
          createdAt: now,
          detail: record.detail,
          dueAt: requiredDate(record.dueAt),
          id: nanoid(),
          milestoneId: record.milestoneId,
          ownerEmail: record.ownerEmail,
          ownerName: record.ownerName,
          ownerUserId: record.ownerUserId,
          projectId: record.projectId,
          projectName: record.projectName,
          sourceKey: record.sourceKey,
          status: record.status,
          title: record.title,
          transitionHistory: record.transitionHistory,
          updatedAt: now,
          workspaceId: input.workspaceId,
        })),
      );
  }

  const history = await listWorkspaceReleaseRunbookRecords({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in history) {
    return history;
  }

  return {
    report: createWorkspaceReleaseRunbookReportFromRecords(
      input.report.records.map((record) => ({ ...record, batchId, workspaceId: input.workspaceId })),
      history.records,
      input.report.generatedAt,
    ),
  };
}

export async function transitionWorkspaceReleaseRunbookRecord(input: {
  attachment?: { label: string; url: string } | null;
  comment?: string | null;
  currentUserId: string;
  nextOwnerUserId?: string | null;
  nextStatus?: WorkspaceReleaseRunbookRecordStatus;
  note?: string | null;
  recordId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ record: WorkspaceReleaseRunbookRecord }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseRunbookSchema();

  const row = (
    await getDb()
      .select()
      .from(workspaceReleaseRunbookRecord)
      .where(and(eq(workspaceReleaseRunbookRecord.id, input.recordId), eq(workspaceReleaseRunbookRecord.workspaceId, input.workspaceId)))
      .limit(1)
  )[0];

  if (!row) {
    return { error: "Release runbook record was not found.", status: 404 };
  }

  const actor = (
    await getDb()
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, input.currentUserId))
      .limit(1)
  )[0];
  const nextOwner =
    input.nextOwnerUserId === undefined
      ? null
      : input.nextOwnerUserId
        ? (
            await getDb()
              .select({ email: user.email, id: user.id, name: user.name })
              .from(user)
              .where(eq(user.id, input.nextOwnerUserId))
              .limit(1)
          )[0]
        : { email: null, id: null, name: "Unassigned" };

  if (input.nextOwnerUserId && !nextOwner) {
    return { error: "New runbook owner was not found.", status: 404 };
  }

  const currentRecord = recordFromRow(row);
  const updatedRecord = applyWorkspaceReleaseRunbookTransition(currentRecord, {
    actorName: actor?.name ?? "Unknown user",
    actorUserId: input.currentUserId,
    attachment: input.attachment
      ? {
          id: nanoid(),
          label: input.attachment.label,
          url: input.attachment.url,
        }
      : null,
    comment: input.comment
      ? {
          body: input.comment,
          id: nanoid(),
        }
      : null,
    nextOwner:
      nextOwner === null
        ? null
        : {
            email: nextOwner.email,
            name: nextOwner.name,
            userId: nextOwner.id,
          },
    nextStatus: input.nextStatus,
    note: input.note,
    transitionId: nanoid(),
  });
  const now = new Date();

  await getDb()
    .update(workspaceReleaseRunbookRecord)
    .set({
      attachments: updatedRecord.attachments,
      checklistEvidence: updatedRecord.checklistEvidence,
      comments: updatedRecord.comments,
      completedAt: toDate(updatedRecord.completedAt),
      ownerEmail: updatedRecord.ownerEmail,
      ownerName: updatedRecord.ownerName,
      ownerUserId: updatedRecord.ownerUserId,
      status: updatedRecord.status,
      transitionHistory: updatedRecord.transitionHistory,
      updatedAt: now,
    })
    .where(eq(workspaceReleaseRunbookRecord.id, input.recordId));

  if (updatedRecord.projectId) {
    await recordProjectAuditEvent({
      action: "release_runbook.transition",
      actorUserId: input.currentUserId,
      category: "releases",
      createdAt: now,
      metadata: {
        attachmentAdded: Boolean(input.attachment),
        commentAdded: Boolean(input.comment),
        nextOwnerUserId: updatedRecord.ownerUserId,
        nextStatus: updatedRecord.status,
        previousOwnerUserId: currentRecord.ownerUserId,
        previousStatus: currentRecord.status,
        sourceKey: updatedRecord.sourceKey,
      },
      projectId: updatedRecord.projectId,
      resourceId: updatedRecord.id ?? input.recordId,
      resourceType: "workspaceReleaseRunbookRecord",
      summary: `${actor?.name ?? "A workspace member"} updated release runbook record "${updatedRecord.title}".`,
    });
  }

  return {
    record: {
      ...updatedRecord,
      id: input.recordId,
    },
  };
}
