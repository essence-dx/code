import { headers } from "next/headers";
import type { BoardDecisionReplaySnapshotFormat } from "@/features/projects/board-decision-replay-snapshots";
import { getWorkspaceBoardDecisionReplaySnapshotDownloadResponse } from "@/features/projects/server/board-decision-replay-snapshot-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<BoardDecisionReplaySnapshotFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): BoardDecisionReplaySnapshotFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as BoardDecisionReplaySnapshotFormat) ? (rawFormat as BoardDecisionReplaySnapshotFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ snapshotId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { snapshotId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardDecisionReplaySnapshotDownloadResponse({
    currentUserId: userId,
    format: getDownloadFormat(request.url),
    snapshotId,
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
