import { headers } from "next/headers";
import { createWorkspaceReleaseEvidenceBundleDownload } from "@/features/projects/server/release-evidence-bundle-service";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const user = await getSessionUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const result = await createWorkspaceReleaseEvidenceBundleDownload({
    currentUserId: user.id,
    currentUserName: user.name,
    origin: new URL(request.url).origin,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": result.contentDisposition,
      "Content-Type": result.contentType,
      "X-Content-Hash": result.contentHash,
    },
  });
}
