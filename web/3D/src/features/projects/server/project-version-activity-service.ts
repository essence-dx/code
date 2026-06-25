import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projectComment, projectPresence, user } from "@/db/schema";
import type { ProjectVersionActivityData } from "../version-activity-types";

const activePresenceWindowMs = 30_000;
let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectVersionActivitySchema() {
  schemaReady ??= (async () => {
    try {
      await runSchemaStatement("ALTER TABLE project_version ADD COLUMN activity_data text");
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";

      if (!message.includes("duplicate column") && !message.includes("already exists")) {
        throw error;
      }
    }
  })();

  await schemaReady;
}

export async function createProjectVersionActivityData(projectId: string, actorUserId: string): Promise<ProjectVersionActivityData> {
  await ensureProjectVersionActivitySchema();

  const [actor] = await getDb()
    .select({
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);
  const comments = await getDb()
    .select({
      resolvedAt: projectComment.resolvedAt,
    })
    .from(projectComment)
    .where(eq(projectComment.projectId, projectId));
  const activeCollaborators = await getDb()
    .select({
      userId: projectPresence.userId,
    })
    .from(projectPresence)
    .where(and(eq(projectPresence.projectId, projectId), gt(projectPresence.lastSeenAt, new Date(Date.now() - activePresenceWindowMs))));
  const openCommentCount = comments.filter((comment) => !comment.resolvedAt).length;

  return {
    activeCollaboratorCount: activeCollaborators.filter((entry) => entry.userId !== actorUserId).length,
    actorEmail: actor?.email ?? "",
    actorName: actor?.name ?? null,
    actorUserId,
    capturedAt: new Date().toISOString(),
    openCommentCount,
    resolvedCommentCount: comments.length - openCommentCount,
    totalCommentCount: comments.length,
  };
}
