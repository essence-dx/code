import { headers } from "next/headers";
import type { ReleaseDrillHistoryFormat } from "@/features/projects/release-drill-history";
import { getWorkspaceReleaseDrillHistoryDownloadResponse } from "@/features/projects/server/release-drill-history-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<ReleaseDrillHistoryFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): ReleaseDrillHistoryFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as ReleaseDrillHistoryFormat) ? (rawFormat as ReleaseDrillHistoryFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ recordId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId, workspaceId } = await context.params;
  const result = await getWorkspaceReleaseDrillHistoryDownloadResponse({
    currentUserId: userId,
    format: getDownloadFormat(request.url),
    recordId,
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
    },
  });
}
