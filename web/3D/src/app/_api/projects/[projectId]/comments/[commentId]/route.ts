import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { projectComment } from "@/db/schema";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

const updateCommentSchema = z.object({
  resolved: z.boolean(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function PATCH(request: Request, context: { params: Promise<{ commentId: string; projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId, projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "editor");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const payload = updateCommentSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  const now = new Date();
  const rows = await getDb()
    .update(projectComment)
    .set({ resolvedAt: payload.data.resolved ? now : null, updatedAt: now })
    .where(and(eq(projectComment.id, commentId), eq(projectComment.projectId, projectId)))
    .returning();

  if (!rows[0]) {
    return Response.json({ error: "Comment not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: payload.data.resolved ? "comment.resolved" : "comment.reopened",
    actorUserId: userId,
    category: "comments",
    createdAt: now,
    metadata: {
      objectId: rows[0].objectId,
    },
    projectId,
    resourceId: rows[0].id,
    resourceType: "comment",
    summary: rows[0].objectId ? `Comment on ${rows[0].objectId} was ${payload.data.resolved ? "resolved" : "reopened"}.` : `Project comment was ${payload.data.resolved ? "resolved" : "reopened"}.`,
  });

  return Response.json({ comment: rows[0] });
}

export async function DELETE(_request: Request, context: { params: Promise<{ commentId: string; projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId, projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "editor");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const rows = await getDb()
    .delete(projectComment)
    .where(and(eq(projectComment.id, commentId), eq(projectComment.projectId, projectId)))
    .returning({
      body: projectComment.body,
      createdAt: projectComment.createdAt,
      id: projectComment.id,
      objectId: projectComment.objectId,
      resolvedAt: projectComment.resolvedAt,
      userId: projectComment.userId,
    });

  if (!rows[0]) {
    return Response.json({ error: "Comment not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "comment.deleted",
    actorUserId: userId,
    category: "comments",
    projectId,
    resourceId: rows[0].id,
    resourceType: "comment",
    summary: rows[0].objectId ? `Comment on ${rows[0].objectId} was deleted.` : "Project comment was deleted.",
    tombstone: {
      bodyLength: rows[0].body.length,
      createdAt: rows[0].createdAt.toISOString(),
      objectId: rows[0].objectId,
      resolvedAt: rows[0].resolvedAt?.toISOString() ?? null,
      userId: rows[0].userId,
    },
  });

  return Response.json({ deletedCommentId: rows[0].id });
}
