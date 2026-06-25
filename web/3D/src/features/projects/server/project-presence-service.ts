import { and, desc, eq, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectPresence, user } from "@/db/schema";
import type { ProjectPresenceCursor, ProjectPresenceSummary } from "@/features/projects/presence-types";
import { requireProjectRole } from "./project-access-service";

const activePresenceWindowMs = 30_000;
let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectPresenceSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_presence (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        cursor text,
        selected_object_id text,
        last_seen_at integer NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_presence_project_idx ON project_presence(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_presence_user_idx ON project_presence(user_id)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_presence_project_user_idx ON project_presence(project_id, user_id)");
  })();

  await schemaReady;
}

function getPresenceColor(userId: string) {
  const colors = ["#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#e11d48", "#84cc16", "#f59e0b", "#6366f1"];
  let hash = 0;

  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) % colors.length;
  }

  return colors[hash];
}

export async function heartbeatProjectPresence(input: {
  cursor: ProjectPresenceCursor | null;
  projectId: string;
  selectedObjectId: string | null;
  userId: string;
}) {
  await ensureProjectPresenceSchema();
  const access = await requireProjectRole(input.projectId, input.userId, "viewer");

  if ("error" in access) {
    return access;
  }

  const now = new Date();
  const existing = await getDb()
    .select({ id: projectPresence.id })
    .from(projectPresence)
    .where(and(eq(projectPresence.projectId, input.projectId), eq(projectPresence.userId, input.userId)))
    .limit(1);

  if (existing[0]) {
    await getDb()
      .update(projectPresence)
      .set({
        cursor: input.cursor,
        selectedObjectId: input.selectedObjectId,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(projectPresence.id, existing[0].id));

    return { ok: true as const };
  }

  await getDb().insert(projectPresence).values({
    id: nanoid(),
    projectId: input.projectId,
    userId: input.userId,
    cursor: input.cursor,
    selectedObjectId: input.selectedObjectId,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true as const };
}

export async function listProjectPresence(projectId: string, userId: string): Promise<{ presence: ProjectPresenceSummary[] } | { error: string; status: 403 | 404 }> {
  await ensureProjectPresenceSchema();
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return access;
  }

  const cutoff = new Date(Date.now() - activePresenceWindowMs);
  const rows = await getDb()
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      cursor: projectPresence.cursor,
      selectedObjectId: projectPresence.selectedObjectId,
      lastSeenAt: projectPresence.lastSeenAt,
    })
    .from(projectPresence)
    .innerJoin(user, eq(projectPresence.userId, user.id))
    .where(and(eq(projectPresence.projectId, projectId), gt(projectPresence.lastSeenAt, cutoff)))
    .orderBy(desc(projectPresence.lastSeenAt));

  return {
    presence: rows
      .filter((row) => row.userId !== userId)
      .map((row) => ({
        userId: row.userId,
        name: row.name,
        email: row.email,
        color: getPresenceColor(row.userId),
        cursor: row.cursor ?? null,
        selectedObjectId: row.selectedObjectId,
        lastSeenAt: row.lastSeenAt.toISOString(),
      })),
  };
}
