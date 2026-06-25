import { headers } from "next/headers";
import { z } from "zod";
import { createProjectFromWorkspaceTemplate } from "@/features/projects/server/project-template-service";
import { auth } from "@/lib/auth";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await context.params;
  const payload = createProjectSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid project payload" }, { status: 400 });
  }

  const result = await createProjectFromWorkspaceTemplate({
    currentUserId: userId,
    name: payload.data.name,
    templateId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ project: result.project }, { status: 201 });
}
