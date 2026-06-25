import { headers } from "next/headers";
import type { BoardApprovalPacketHistoryFormat } from "@/features/projects/board-approval-packet-history";
import { getWorkspaceBoardApprovalPacketDownloadResponse, revokeWorkspaceBoardApprovalPacket } from "@/features/projects/server/board-approval-packet-history-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<BoardApprovalPacketHistoryFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): BoardApprovalPacketHistoryFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as BoardApprovalPacketHistoryFormat) ? (rawFormat as BoardApprovalPacketHistoryFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ packetId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packetId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardApprovalPacketDownloadResponse({
    currentUserId: userId,
    format: getDownloadFormat(request.url),
    packetRecordId: packetId,
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

export async function PATCH(request: Request, context: { params: Promise<{ packetId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof payload?.reason === "string" && payload.reason.trim().length > 0 ? payload.reason.trim() : null;
  const { packetId, workspaceId } = await context.params;
  const result = await revokeWorkspaceBoardApprovalPacket({
    currentUserId: userId,
    packetRecordId: packetId,
    reason,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result);
}
