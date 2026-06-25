import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { project, projectFolder } from "@/db/schema";
import { requireFolderRole } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export function generateStaticParams() {
  return [];
}

export async function PATCH(request: Request, context: { params: Promise<{ folderId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await context.params;
  const payload = updateFolderSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid folder payload" }, { status: 400 });
  }

  const access = await requireFolderRole(folderId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const rows = await getDb()
    .update(projectFolder)
    .set({ name: payload.data.name, updatedAt: new Date() })
    .where(eq(projectFolder.id, folderId))
    .returning();

  if (!rows[0]) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  return Response.json({ folder: rows[0] });
}

export async function DELETE(_request: Request, context: { params: Promise<{ folderId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await context.params;
  const access = await requireFolderRole(folderId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  await getDb()
    .update(project)
    .set({ folderId: null, updatedAt: new Date() })
    .where(and(eq(project.userId, access.folder.userId), eq(project.folderId, folderId)));

  const rows = await getDb()
    .delete(projectFolder)
    .where(eq(projectFolder.id, folderId))
    .returning({ id: projectFolder.id });

  if (!rows[0]) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  return Response.json({ deletedFolderId: rows[0].id });
}
