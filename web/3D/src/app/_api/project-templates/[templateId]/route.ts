import { headers } from "next/headers";
import { z } from "zod";
import { deleteWorkspaceProjectTemplate, updateWorkspaceProjectTemplate } from "@/features/projects/server/project-template-service";
import { auth } from "@/lib/auth";

const updateTemplateSchema = z.object({
  description: z.string().trim().max(240).optional(),
  folderName: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  sourceProjectId: z.string().nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function PATCH(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await context.params;
  const payload = updateTemplateSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid template payload" }, { status: 400 });
  }

  const result = await updateWorkspaceProjectTemplate({
    currentUserId: userId,
    description: payload.data.description,
    folderName: payload.data.folderName,
    name: payload.data.name,
    sourceProjectId: payload.data.sourceProjectId,
    templateId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ template: result.template });
}

export async function DELETE(_request: Request, context: { params: Promise<{ templateId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await context.params;
  const result = await deleteWorkspaceProjectTemplate({ currentUserId: userId, templateId });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ deletedTemplateId: result.deletedTemplateId });
}
