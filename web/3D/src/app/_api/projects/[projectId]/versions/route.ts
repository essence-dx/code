import { headers } from "next/headers";
import { and, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { project, projectVersion } from "@/db/schema";
import { sceneDocumentSchema } from "@/features/editor/types";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { createProjectVersionActivityData, ensureProjectVersionActivitySchema } from "@/features/projects/server/project-version-activity-service";
import { auth } from "@/lib/auth";

const restoreVersionSchema = z.object({
  versionId: z.string().min(1),
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

  await ensureProjectVersionActivitySchema();

  const versions = await getDb()
    .select()
    .from(projectVersion)
    .where(and(eq(projectVersion.projectId, projectId), or(eq(projectVersion.userId, userId), eq(projectVersion.userId, access.project.userId))))
    .orderBy(desc(projectVersion.createdAt))
    .limit(20);

  return Response.json({ versions });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const payload = restoreVersionSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid version payload" }, { status: 400 });
  }

  const access = await requireProjectRole(projectId, userId, "editor");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  await ensureProjectVersionActivitySchema();

  const versions = await getDb()
    .select()
    .from(projectVersion)
    .where(and(eq(projectVersion.id, payload.data.versionId), eq(projectVersion.projectId, projectId), or(eq(projectVersion.userId, userId), eq(projectVersion.userId, access.project.userId))))
    .limit(1);
  const version = versions[0];

  if (!version) {
    return Response.json({ error: "Version not found" }, { status: 404 });
  }

  const parsedScene = sceneDocumentSchema.safeParse(version.sceneData);

  if (!parsedScene.success) {
    return Response.json({ error: "Version scene data is invalid" }, { status: 409 });
  }

  await getDb().insert(projectVersion).values({
    activityData: await createProjectVersionActivityData(projectId, userId),
    id: nanoid(),
    userId,
    projectId,
    name: access.project.name,
    sceneData: access.project.sceneData,
    createdAt: new Date(),
  });

  const rows = await getDb()
    .update(project)
    .set({
      name: version.name,
      sceneData: parsedScene.data,
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning();
  const restoredProject = rows[0];

  if (!restoredProject) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "version.restored",
    actorUserId: userId,
    category: "versions",
    metadata: {
      restoredVersionName: version.name,
    },
    projectId,
    resourceId: version.id,
    resourceType: "projectVersion",
    summary: `${restoredProject.name} was restored from ${version.name}.`,
  });

  return Response.json({ project: restoredProject });
}
