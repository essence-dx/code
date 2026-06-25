import { headers } from "next/headers";
import { cloneWorkspaceProjectTemplate } from "@/features/projects/server/project-template-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(_request: Request, context: { params: Promise<{ templateId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await context.params;
  const result = await cloneWorkspaceProjectTemplate({ currentUserId: userId, templateId });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ template: result.template }, { status: 201 });
}
