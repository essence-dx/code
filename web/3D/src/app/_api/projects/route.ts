import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { project, projectFolder } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { sceneDocumentSchema } from "@/features/editor/types";
import { createProjectTemplatePayload } from "@/features/projects/project-templates";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { ensureProjectAccessSchema, listAccessibleProjects, requireFolderRole } from "@/features/projects/server/project-access-service";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  folderId: z.string().nullable().optional(),
  exportPresetId: z.string().nullable().optional(),
  reviewPolicyPresetId: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
  sceneData: sceneDocumentSchema.optional(),
  templateId: z.string().nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const rows = await listAccessibleProjects(userId, { workspaceId });

  return Response.json({ projects: rows });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createProjectSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid project payload" }, { status: 400 });
  }

  await ensureProjectAccessSchema();

  let workspaceId = payload.data.workspaceId ?? null;

  if (workspaceId) {
    const access = await getWorkspaceAccess(workspaceId, userId);

    if (!access || access.role === "viewer") {
      return Response.json({ error: "Insufficient workspace permission" }, { status: 403 });
    }
  }

  let folderId = payload.data.folderId ?? null;

  if (folderId) {
    const folderAccess = await requireFolderRole(folderId, userId, "editor");

    if ("error" in folderAccess) {
      return Response.json({ error: folderAccess.error }, { status: folderAccess.status });
    }

    workspaceId = folderAccess.folder.workspaceId ?? workspaceId;
  }

  const now = new Date();
  const templatePayload = payload.data.sceneData
    ? null
    : createProjectTemplatePayload({
        exportPresetId: payload.data.exportPresetId,
        name: payload.data.name,
        reviewPolicyPresetId: payload.data.reviewPolicyPresetId,
        templateId: payload.data.templateId,
      });
  if (!folderId && templatePayload?.template.workspaceDefaults.folderName && workspaceId) {
    const folderName = templatePayload.template.workspaceDefaults.folderName;
    const existingFolder = (
      await getDb()
        .select({ id: projectFolder.id })
        .from(projectFolder)
        .where(and(eq(projectFolder.userId, userId), eq(projectFolder.workspaceId, workspaceId), eq(projectFolder.name, folderName)))
        .limit(1)
    )[0];

    if (existingFolder) {
      folderId = existingFolder.id;
    } else {
      const now = new Date();
      const folder = {
        id: nanoid(),
        name: folderName,
        updatedAt: now,
        userId,
        workspaceId,
        createdAt: now,
      };

      await getDb().insert(projectFolder).values(folder);
      folderId = folder.id;
    }
  }

  const document = payload.data.sceneData ?? templatePayload?.sceneData ?? createDefaultDocument(payload.data.name);
  const row = {
    id: nanoid(),
    workspaceId,
    userId,
    folderId,
    name: payload.data.name,
    description: payload.data.description ?? templatePayload?.description ?? "",
    sceneData: document,
    shareId: null,
    shareSettings: templatePayload?.shareSettings ?? null,
    publishedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(project).values(row);
  await recordProjectAuditEvent({
    action: "project.created",
    actorUserId: userId,
    category: "publishing",
    createdAt: now,
    metadata: {
      exportPresetId: payload.data.exportPresetId ?? templatePayload?.template.exportPresetId ?? null,
      folderId: row.folderId,
      reviewPolicyPresetId: payload.data.reviewPolicyPresetId ?? templatePayload?.template.reviewPolicyPresetId ?? null,
      templateId: templatePayload?.template.id ?? null,
      workspaceId: row.workspaceId,
    },
    projectId: row.id,
    resourceId: row.id,
    resourceType: "project",
    summary: `${row.name} was created.`,
  });

  return Response.json({ project: row }, { status: 201 });
}
