import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectAuditEvent, user, type ProjectAuditEventMetadata } from "@/db/schema";
import type { ProjectAuditCategory, ProjectAuditEvent, ProjectAuditStatus } from "@/features/projects/types";

export interface RecordProjectAuditEventInput {
  action: string;
  actorUserId: string | null;
  category: ProjectAuditCategory;
  createdAt?: Date;
  metadata?: ProjectAuditEventMetadata | null;
  projectId: string;
  resourceId?: string | null;
  resourceType: string;
  summary: string;
  tombstone?: ProjectAuditEventMetadata | null;
}

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectAuditEventSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_audit_event (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL,
        actor_user_id text REFERENCES user(id) ON DELETE SET NULL,
        actor_name text,
        actor_email text,
        category text NOT NULL,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id text,
        summary text NOT NULL,
        metadata text,
        tombstone text,
        created_at integer NOT NULL
      )
    `);
    await runOptionalSchemaStatement("ALTER TABLE project_audit_event ADD COLUMN actor_name text");
    await runOptionalSchemaStatement("ALTER TABLE project_audit_event ADD COLUMN actor_email text");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_audit_event_project_idx ON project_audit_event(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_audit_event_actor_idx ON project_audit_event(actor_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_audit_event_created_idx ON project_audit_event(created_at)");
  })();

  await schemaReady;
}

async function runOptionalSchemaStatement(statement: string) {
  try {
    await runSchemaStatement(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

function titleFromAction(action: string) {
  return action
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function statusForAction(action: string, category: ProjectAuditCategory): ProjectAuditStatus {
  if (action.includes("delete") || action.includes("revoke") || action.includes("unpublish") || action.includes("archive")) {
    return "warning";
  }

  if (action.includes("approve") || action.includes("publish") || action.includes("restore") || action.includes("resolve")) {
    return "success";
  }

  if (category === "permissions" && action.includes("change")) {
    return "warning";
  }

  return "info";
}

function compactMetadata(metadata: ProjectAuditEventMetadata | null | undefined) {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, boolean | number | string | null] => entry[1] !== undefined));
}

export async function recordProjectAuditEvent(input: RecordProjectAuditEventInput) {
  await ensureProjectAuditEventSchema();

  const actor = input.actorUserId
    ? (
        await getDb()
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, input.actorUserId))
          .limit(1)
      )[0]
    : null;
  const event = {
    action: input.action,
    actorEmail: actor?.email ?? null,
    actorName: actor?.name ?? null,
    actorUserId: input.actorUserId,
    category: input.category,
    createdAt: input.createdAt ?? new Date(),
    id: nanoid(),
    metadata: compactMetadata(input.metadata),
    projectId: input.projectId,
    resourceId: input.resourceId ?? null,
    resourceType: input.resourceType,
    summary: input.summary,
    tombstone: compactMetadata(input.tombstone),
  };

  await getDb().insert(projectAuditEvent).values(event);

  return event;
}

export async function listProjectAuditEvents(projectId: string, limit = 80): Promise<ProjectAuditEvent[]> {
  await ensureProjectAuditEventSchema();

  const rows = await getDb()
    .select({
      action: projectAuditEvent.action,
      actorEmailSnapshot: projectAuditEvent.actorEmail,
      actorEmail: user.email,
      actorNameSnapshot: projectAuditEvent.actorName,
      actorName: user.name,
      category: projectAuditEvent.category,
      createdAt: projectAuditEvent.createdAt,
      id: projectAuditEvent.id,
      metadata: projectAuditEvent.metadata,
      resourceId: projectAuditEvent.resourceId,
      resourceType: projectAuditEvent.resourceType,
      summary: projectAuditEvent.summary,
      tombstone: projectAuditEvent.tombstone,
    })
    .from(projectAuditEvent)
    .leftJoin(user, eq(projectAuditEvent.actorUserId, user.id))
    .where(eq(projectAuditEvent.projectId, projectId))
    .orderBy(desc(projectAuditEvent.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    action: row.action,
    actorEmail: row.actorEmail ?? row.actorEmailSnapshot,
    actorName: row.actorName ?? row.actorNameSnapshot,
    category: row.category,
    description: row.summary,
    id: `persisted:${row.id}`,
    metadata: {
      action: row.action,
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      ...(row.metadata ?? {}),
    },
    occurredAt: row.createdAt.toISOString(),
    resourceId: row.resourceId,
    resourceType: row.resourceType,
    status: statusForAction(row.action, row.category),
    tombstone: row.tombstone,
    title: titleFromAction(row.action),
  }));
}
