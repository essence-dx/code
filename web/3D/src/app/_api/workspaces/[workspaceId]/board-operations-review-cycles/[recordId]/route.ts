import { headers } from "next/headers";
import type { BoardOperationsReviewCycleHistoryFormat } from "@/features/projects/board-operations-review-cycle-history";
import { getWorkspaceBoardOperationsReviewCycleHistoryDownloadResponse } from "@/features/projects/server/board-operations-review-cycle-history-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<BoardOperationsReviewCycleHistoryFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): BoardOperationsReviewCycleHistoryFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as BoardOperationsReviewCycleHistoryFormat) ? (rawFormat as BoardOperationsReviewCycleHistoryFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ recordId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardOperationsReviewCycleHistoryDownloadResponse({
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
