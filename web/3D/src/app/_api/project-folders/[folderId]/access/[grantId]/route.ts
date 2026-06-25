import { headers } from "next/headers";
import { revokeFolderAccessGrant } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function DELETE(_request: Request, context: { params: Promise<{ folderId: string; grantId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId, grantId } = await context.params;
  const result = await revokeFolderAccessGrant({
    folderId,
    grantId,
    currentUserId: userId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ deletedGrantId: result.grantId });
}
