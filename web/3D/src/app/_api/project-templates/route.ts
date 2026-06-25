import { headers } from "next/headers";
import { z } from "zod";
import { createWorkspaceProjectTemplate, listWorkspaceProjectTemplates } from "@/features/projects/server/project-template-service";
import { auth } from "@/lib/auth";

const createTemplateSchema = z.object({
  baseTemplateId: z.string().nullable().optional(),
  description: z.string().trim().max(240).nullable().optional(),
  exportPresetId: z.string().nullable().optional(),
  folderName: z.string().trim().max(60).nullable().optional(),
  name: z.string().trim().min(1).max(80),
  reviewPolicyPresetId: z.string().nullable().optional(),
  sourceProjectId: z.string().nullable().optional(),
  workspaceId: z.string().trim().min(1),
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

  if (!workspaceId) {
    return Response.json({ error: "Workspace is required" }, { status: 400 });
  }

  const result = await listWorkspaceProjectTemplates({ currentUserId: userId, workspaceId });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ templates: result.templates });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createTemplateSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid template payload" }, { status: 400 });
  }

  const result = await createWorkspaceProjectTemplate({
    baseTemplateId: payload.data.baseTemplateId,
    currentUserId: userId,
    description: payload.data.description,
    exportPresetId: payload.data.exportPresetId,
    folderName: payload.data.folderName,
    name: payload.data.name,
    reviewPolicyPresetId: payload.data.reviewPolicyPresetId,
    sourceProjectId: payload.data.sourceProjectId,
    workspaceId: payload.data.workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ template: result.template }, { status: 201 });
}
