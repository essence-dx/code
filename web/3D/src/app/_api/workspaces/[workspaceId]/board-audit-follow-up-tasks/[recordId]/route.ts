import { headers } from "next/headers";
import type { BoardAuditTaskPersistenceFormat } from "@/features/projects/board-audit-follow-up-tasks";
import { getWorkspaceBoardAuditTaskRecordDownloadResponse } from "@/features/projects/server/board-audit-follow-up-task-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<BoardAuditTaskPersistenceFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): BoardAuditTaskPersistenceFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as BoardAuditTaskPersistenceFormat) ? (rawFormat as BoardAuditTaskPersistenceFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ recordId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardAuditTaskRecordDownloadResponse({
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
      "content-disposition": `attachment; filename="${result.fileName}"`,
      "content-type": result.mimeType,
    },
  });
}
