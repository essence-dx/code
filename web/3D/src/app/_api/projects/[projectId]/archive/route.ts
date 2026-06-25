import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { project } from "@/db/schema";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const now = new Date();
  const rows = await getDb()
    .update(project)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(project.id, projectId), isNull(project.archivedAt)))
    .returning();

  if (!rows[0]) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "project.archived",
    actorUserId: userId,
    category: "publishing",
    createdAt: now,
    projectId,
    resourceId: projectId,
    resourceType: "project",
    summary: `${rows[0].name} was moved to trash.`,
  });

  return Response.json({ project: rows[0] });
}
