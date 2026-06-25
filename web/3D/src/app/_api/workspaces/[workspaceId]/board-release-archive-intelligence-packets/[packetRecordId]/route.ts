import { headers } from "next/headers";
import type { BoardReleaseArchiveIntelligencePacketHistoryFormat } from "@/features/projects/board-release-archive-intelligence-packet-history";
import { getWorkspaceBoardReleaseArchiveIntelligencePacketDownloadResponse } from "@/features/projects/server/board-release-archive-intelligence-packet-history-service";
import { auth } from "@/lib/auth";

const formats = new Set<BoardReleaseArchiveIntelligencePacketHistoryFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ packetRecordId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  if (!formats.has(format as BoardReleaseArchiveIntelligencePacketHistoryFormat)) {
    return Response.json({ error: "Unsupported archive intelligence packet format." }, { status: 400 });
  }

  const { packetRecordId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardReleaseArchiveIntelligencePacketDownloadResponse({
    currentUserId: userId,
    format: format as BoardReleaseArchiveIntelligencePacketHistoryFormat,
    packetRecordId,
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
