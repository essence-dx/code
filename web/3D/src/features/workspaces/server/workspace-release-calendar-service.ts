import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { workspaceReleaseCalendarMilestone, type WorkspaceReleaseCalendarMilestoneRecord } from "@/db/schema";
import {
  createWorkspaceReleaseCalendarReport,
  summarizeWorkspaceReleaseCalendarMilestones,
  type WorkspaceReleaseCalendarInput,
  type WorkspaceReleaseCalendarMilestone,
  type WorkspaceReleaseCalendarReport,
} from "@/features/workspaces/workspace-release-calendar";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

type ServiceResult<T> = T | { error: string; status: number };

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceReleaseCalendarMilestoneSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_release_calendar_milestone (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        project_id text REFERENCES project(id) ON DELETE SET NULL,
        source_key text NOT NULL,
        kind text NOT NULL,
        source text NOT NULL,
        status text NOT NULL,
        title text NOT NULL,
        detail text NOT NULL,
        action_label text NOT NULL,
        blocker_count integer NOT NULL DEFAULT 0,
        due_at integer NOT NULL,
        completed_at integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_calendar_milestone_workspace_idx ON workspace_release_calendar_milestone(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_calendar_milestone_project_idx ON workspace_release_calendar_milestone(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_calendar_milestone_status_idx ON workspace_release_calendar_milestone(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_calendar_milestone_due_idx ON workspace_release_calendar_milestone(workspace_id, due_at)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_release_calendar_milestone_workspace_source_idx ON workspace_release_calendar_milestone(workspace_id, source_key)",
    );
  })();

  await schemaReady;
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

function toMilestone(row: WorkspaceReleaseCalendarMilestoneRecord): WorkspaceReleaseCalendarMilestone {
  return {
    actionLabel: row.actionLabel,
    blockerCount: row.blockerCount,
    completedAt: toIso(row.completedAt),
    detail: row.detail,
    dueAt: toIso(row.dueAt) ?? new Date(0).toISOString(),
    id: row.id,
    kind: row.kind,
    projectId: row.projectId,
    projectName: null,
    source: row.source,
    sourceKey: row.sourceKey,
    status: row.status,
    title: row.title,
  };
}

function createReportFromRows(rows: WorkspaceReleaseCalendarMilestoneRecord[], generatedAt = new Date().toISOString()): WorkspaceReleaseCalendarReport {
  const milestones = rows.map(toMilestone);

  return {
    generatedAt,
    milestones,
    summary: summarizeWorkspaceReleaseCalendarMilestones(milestones),
  };
}

async function upsertMilestones(input: {
  milestones: WorkspaceReleaseCalendarMilestone[];
  now: Date;
  pruneMissing?: boolean;
  workspaceId: string;
}) {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(workspaceReleaseCalendarMilestone)
    .where(eq(workspaceReleaseCalendarMilestone.workspaceId, input.workspaceId));
  const existingBySourceKey = new Map(existingRows.map((row) => [row.sourceKey, row]));
  const nextSourceKeys = new Set(input.milestones.map((milestone) => milestone.sourceKey));

  if (input.pruneMissing ?? true) {
    for (const row of existingRows) {
      if (!nextSourceKeys.has(row.sourceKey)) {
        await db.delete(workspaceReleaseCalendarMilestone).where(eq(workspaceReleaseCalendarMilestone.id, row.id));
      }
    }
  }

  for (const milestone of input.milestones) {
    const existing = existingBySourceKey.get(milestone.sourceKey);
    const values = {
      actionLabel: milestone.actionLabel,
      blockerCount: milestone.blockerCount,
      completedAt: toDate(milestone.completedAt),
      detail: milestone.detail,
      dueAt: toDate(milestone.dueAt) ?? input.now,
      kind: milestone.kind,
      projectId: milestone.projectId,
      source: milestone.source,
      sourceKey: milestone.sourceKey,
      status: milestone.status,
      title: milestone.title,
      updatedAt: input.now,
      workspaceId: input.workspaceId,
    };

    if (existing) {
      await db.update(workspaceReleaseCalendarMilestone).set(values).where(eq(workspaceReleaseCalendarMilestone.id, existing.id));
    } else {
      await db.insert(workspaceReleaseCalendarMilestone).values({
        ...values,
        createdAt: input.now,
        id: nanoid(),
      });
    }
  }
}

export async function listWorkspaceReleaseCalendarReport(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ report: WorkspaceReleaseCalendarReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseCalendarMilestoneSchema();

  const rows = await getDb()
    .select()
    .from(workspaceReleaseCalendarMilestone)
    .where(eq(workspaceReleaseCalendarMilestone.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseCalendarMilestone.dueAt))
    .limit(input.limit ?? 120);

  return { report: createReportFromRows(rows) };
}

export async function syncWorkspaceReleaseCalendarMilestones(
  input: WorkspaceReleaseCalendarInput & {
    currentUserId: string;
  },
): Promise<ServiceResult<{ report: WorkspaceReleaseCalendarReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseCalendarMilestoneSchema();

  const report = createWorkspaceReleaseCalendarReport(input);
  const now = input.now ?? new Date(report.generatedAt);

  await upsertMilestones({
    milestones: report.milestones,
    now,
    workspaceId: input.workspaceId,
  });

  return { report };
}

export async function upsertWorkspaceReleaseCalendarMilestones(input: {
  currentUserId: string;
  milestones: WorkspaceReleaseCalendarMilestone[];
  now?: Date;
  workspaceId: string;
}): Promise<ServiceResult<{ report: WorkspaceReleaseCalendarReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceReleaseCalendarMilestoneSchema();

  const now = input.now ?? new Date();

  await upsertMilestones({
    milestones: input.milestones,
    now,
    pruneMissing: false,
    workspaceId: input.workspaceId,
  });

  const rows = await getDb()
    .select()
    .from(workspaceReleaseCalendarMilestone)
    .where(eq(workspaceReleaseCalendarMilestone.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseCalendarMilestone.dueAt));

  return { report: createReportFromRows(rows, now.toISOString()) };
}
