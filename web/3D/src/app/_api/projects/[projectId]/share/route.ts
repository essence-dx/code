import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project } from "@/db/schema";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";
import { defaultShareSettings } from "@/features/projects/share-settings";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";

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
  const existing = await getDb()
    .select({ shareId: project.shareId, shareSettings: project.shareSettings })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (!existing[0]) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const shareSettings = existing[0].shareSettings ?? defaultShareSettings;
  const reviewGate = getProjectReviewGate(shareSettings, "publicLink");

  if (!reviewGate.allowed) {
    return Response.json({ error: reviewGate.message, reviewGate }, { status: 409 });
  }

  const rows = await getDb()
    .update(project)
    .set({ publishedAt: now, shareId: existing[0].shareId ?? nanoid(18), shareSettings, updatedAt: now })
    .where(eq(project.id, projectId))
    .returning();
  const updatedProject = rows[0];

  if (!updatedProject) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "project.published",
    actorUserId: userId,
    category: "publishing",
    createdAt: now,
    metadata: {
      shareId: updatedProject.shareId,
    },
    projectId,
    resourceId: projectId,
    resourceType: "project",
    summary: `${updatedProject.name} was published to a public link.`,
  });

  return Response.json({ project: updatedProject });
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const previousShareId = access.project.shareId;
  const rows = await getDb()
    .update(project)
    .set({ publishedAt: null, shareId: null, updatedAt: new Date() })
    .where(eq(project.id, projectId))
    .returning();

  if (!rows[0]) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "project.unpublished",
    actorUserId: userId,
    category: "publishing",
    metadata: {
      previousShareId,
    },
    projectId,
    resourceId: projectId,
    resourceType: "project",
    summary: `${rows[0].name} public link was unpublished.`,
    tombstone: {
      shareId: previousShareId,
    },
  });

  return Response.json({ project: rows[0] });
}
