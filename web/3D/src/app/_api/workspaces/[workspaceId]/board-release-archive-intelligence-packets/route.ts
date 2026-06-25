import { headers } from "next/headers";
import { isBoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet-history";
import {
  listWorkspaceBoardReleaseArchiveIntelligencePacketHistory,
  recordWorkspaceBoardReleaseArchiveIntelligencePacket,
} from "@/features/projects/server/board-release-archive-intelligence-packet-history-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const history = await listWorkspaceBoardReleaseArchiveIntelligencePacketHistory({
    currentUserId: userId,
    workspaceId,
  });

  if ("error" in history) {
    return Response.json({ error: history.error }, { status: history.status });
  }

  return Response.json({ history });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { packet?: unknown } | null;

  if (!isBoardReleaseArchiveIntelligencePacketReport(payload?.packet)) {
    return Response.json({ error: "Invalid board release archive intelligence packet payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceBoardReleaseArchiveIntelligencePacket({
    currentUserId: userId,
    packet: payload.packet,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
