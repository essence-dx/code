import { headers } from "next/headers";
import type { WorkspaceRiskDigestFormat } from "@/features/projects/workspace-risk-digest";
import { getWorkspaceRiskDigestPacketDownloadResponse } from "@/features/projects/server/workspace-risk-digest-packet-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<WorkspaceRiskDigestFormat>(["audit-csv", "csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): WorkspaceRiskDigestFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as WorkspaceRiskDigestFormat) ? (rawFormat as WorkspaceRiskDigestFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ packetId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { packetId, workspaceId } = await context.params;
  const result = await getWorkspaceRiskDigestPacketDownloadResponse({
    currentUserId: userId,
    format: getDownloadFormat(request.url),
    packetId,
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
