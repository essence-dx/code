import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { projectComment } from "@/db/schema";
import { vec3Schema } from "@/features/editor/types";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
  objectId: z.string().nullable().optional(),
  position: vec3Schema,
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const comments = await getDb()
    .select()
    .from(projectComment)
    .where(eq(projectComment.projectId, projectId))
    .orderBy(desc(projectComment.createdAt));

  return Response.json({ comments });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const payload = createCommentSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  const now = new Date();
  const comment = {
    id: nanoid(),
    userId,
    projectId,
    objectId: payload.data.objectId ?? null,
    body: payload.data.body,
    position: payload.data.position,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(projectComment).values(comment);
  await recordProjectAuditEvent({
    action: "comment.created",
    actorUserId: userId,
    category: "comments",
    createdAt: now,
    metadata: {
      objectId: comment.objectId,
    },
    projectId,
    resourceId: comment.id,
    resourceType: "comment",
    summary: comment.objectId ? `Comment added on ${comment.objectId}.` : "Project comment added.",
  });

  return Response.json({ comment }, { status: 201 });
}
