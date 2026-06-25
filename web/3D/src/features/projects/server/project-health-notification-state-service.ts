import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectHealthNotificationState, type ProjectHealthNotificationStateRecord } from "@/db/schema";
import type { ProjectHealthNotificationStateSummary } from "@/features/projects/project-health-notifications";
import { requireProjectRole } from "@/features/projects/server/project-access-service";

type ServiceResult<T> = T | { error: string; status: number };

export type ProjectHealthNotificationStateAction = "dismiss" | "read" | "restore" | "snooze";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectHealthNotificationStateSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_health_notification_state (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        notification_id text NOT NULL,
        read_at integer,
        dismissed_at integer,
        snoozed_until integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_health_notification_state_user_idx ON project_health_notification_state(user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_health_notification_state_project_idx ON project_health_notification_state(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_health_notification_state_notification_idx ON project_health_notification_state(notification_id)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS project_health_notification_state_user_notification_idx ON project_health_notification_state(user_id, notification_id)",
    );
  })();

  await schemaReady;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toSummary(row: ProjectHealthNotificationStateRecord): ProjectHealthNotificationStateSummary {
  return {
    dismissedAt: toIso(row.dismissedAt),
    notificationId: row.notificationId,
    projectId: row.projectId,
    readAt: toIso(row.readAt),
    snoozedUntil: toIso(row.snoozedUntil),
  };
}

export async function listProjectHealthNotificationStates(input: {
  notificationIds: string[];
  userId: string;
}): Promise<ProjectHealthNotificationStateSummary[]> {
  const ids = [...new Set(input.notificationIds)].filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  await ensureProjectHealthNotificationStateSchema();

  const rows = await getDb()
    .select()
    .from(projectHealthNotificationState)
    .where(and(eq(projectHealthNotificationState.userId, input.userId), inArray(projectHealthNotificationState.notificationId, ids)));

  return rows.map(toSummary);
}

function getStatePatch(action: ProjectHealthNotificationStateAction, now: Date, snoozedUntil?: Date | null) {
  switch (action) {
    case "dismiss":
      return {
        dismissedAt: now,
        readAt: now,
        snoozedUntil: null,
      };
    case "read":
      return {
        readAt: now,
      };
    case "restore":
      return {
        dismissedAt: null,
        readAt: null,
        snoozedUntil: null,
      };
    case "snooze":
      return {
        dismissedAt: null,
        readAt: now,
        snoozedUntil: snoozedUntil ?? new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
  }
}

export function createProjectHealthNotificationStateSummary(input: {
  action: ProjectHealthNotificationStateAction;
  existing?: ProjectHealthNotificationStateSummary | null;
  notificationId: string;
  now: Date;
  projectId: string;
  snoozedUntil?: Date | null;
}): ProjectHealthNotificationStateSummary {
  const patch = getStatePatch(input.action, input.now, input.snoozedUntil);

  return {
    dismissedAt:
      "dismissedAt" in patch
        ? toIso(patch.dismissedAt)
        : (input.existing?.dismissedAt ?? null),
    notificationId: input.notificationId,
    projectId: input.projectId,
    readAt: "readAt" in patch ? toIso(patch.readAt) : (input.existing?.readAt ?? null),
    snoozedUntil:
      "snoozedUntil" in patch
        ? toIso(patch.snoozedUntil)
        : (input.existing?.snoozedUntil ?? null),
  };
}

export async function updateProjectHealthNotificationState(input: {
  action: ProjectHealthNotificationStateAction;
  currentUserId: string;
  notificationId: string;
  projectId: string;
  snoozedUntil?: Date | null;
}): Promise<ServiceResult<{ state: ProjectHealthNotificationStateSummary }>> {
  const access = await requireProjectRole(input.projectId, input.currentUserId, "viewer");

  if ("error" in access) {
    return access;
  }

  await ensureProjectHealthNotificationStateSchema();

  const now = new Date();
  const existing = (
    await getDb()
      .select()
      .from(projectHealthNotificationState)
      .where(and(eq(projectHealthNotificationState.userId, input.currentUserId), eq(projectHealthNotificationState.notificationId, input.notificationId)))
      .limit(1)
  )[0];
  const patch = getStatePatch(input.action, now, input.snoozedUntil);

  if (existing) {
    const rows = await getDb()
      .update(projectHealthNotificationState)
      .set({
        ...patch,
        projectId: input.projectId,
        updatedAt: now,
      })
      .where(eq(projectHealthNotificationState.id, existing.id))
      .returning();

    return rows[0] ? { state: toSummary(rows[0]) } : { error: "Notification state not found", status: 404 };
  }

  const rows = await getDb()
    .insert(projectHealthNotificationState)
    .values({
      ...patch,
      createdAt: now,
      id: nanoid(),
      notificationId: input.notificationId,
      projectId: input.projectId,
      updatedAt: now,
      userId: input.currentUserId,
    })
    .returning();

  return rows[0] ? { state: toSummary(rows[0]) } : { error: "Notification state was not saved", status: 500 };
}
