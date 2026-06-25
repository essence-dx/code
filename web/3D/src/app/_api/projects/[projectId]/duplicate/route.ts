import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project } from "@/db/schema";
import { sceneDocumentSchema } from "@/features/editor/types";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function createCopyName(name: string) {
  const suffix = " Copy";
  return `${name.slice(0, 80 - suffix.length)}${suffix}`;
}

export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const source = access.project;

  const parsedScene = sceneDocumentSchema.safeParse(source.sceneData);

  if (!parsedScene.success) {
    return Response.json({ error: "Project scene data is invalid" }, { status: 409 });
  }

  const now = new Date();
  const name = createCopyName(source.name);
  const sceneData = {
    ...structuredClone(parsedScene.data),
    id: nanoid(),
    name,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const row = {
    id: nanoid(),
    userId,
    folderId: source.userId === userId ? source.folderId : null,
    name,
    description: source.description,
    sceneData,
    shareId: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(project).values(row);
  await recordProjectAuditEvent({
    action: "project.duplicated",
    actorUserId: userId,
    category: "publishing",
    createdAt: now,
    metadata: {
      sourceProjectId: source.id,
    },
    projectId: row.id,
    resourceId: row.id,
    resourceType: "project",
    summary: `${source.name} was duplicated into ${row.name}.`,
  });

  return Response.json({ project: row }, { status: 201 });
}
