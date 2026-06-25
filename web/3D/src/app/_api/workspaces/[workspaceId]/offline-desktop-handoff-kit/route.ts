import { headers } from "next/headers";
import { createWorkspaceOfflineDesktopHandoffKitDownload } from "@/features/projects/server/offline-desktop-handoff-kit-service";
import { auth } from "@/lib/auth";

function getRequestOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return "https://essence-spline.vercel.app";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user.id) {
    return Response.json({ error: "You must be signed in to export offline desktop handoff kits." }, { status: 401 });
  }

  const { workspaceId } = await params;
  const result = await createWorkspaceOfflineDesktopHandoffKitDownload({
    currentUserId: session.user.id,
    currentUserName: session.user.name,
    origin: getRequestOrigin(requestHeaders),
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Content-Type": result.mimeType,
      "X-Content-Hash": result.contentHash,
    },
  });
}
