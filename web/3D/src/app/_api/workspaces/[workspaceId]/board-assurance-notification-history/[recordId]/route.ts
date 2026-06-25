import { headers } from "next/headers";
import type { BoardAssuranceNotificationDeliveryFormat } from "@/features/projects/board-assurance-notification-history";
import { getWorkspaceBoardAssuranceNotificationHistoryDownloadResponse } from "@/features/projects/server/board-assurance-notification-history-service";
import { auth } from "@/lib/auth";

const downloadFormats = new Set<BoardAssuranceNotificationDeliveryFormat>(["csv", "json"]);

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function getDownloadFormat(url: string): BoardAssuranceNotificationDeliveryFormat {
  const rawFormat = new URL(url).searchParams.get("format") ?? "json";

  return downloadFormats.has(rawFormat as BoardAssuranceNotificationDeliveryFormat) ? (rawFormat as BoardAssuranceNotificationDeliveryFormat) : "json";
}

export async function GET(request: Request, context: { params: Promise<{ recordId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId, workspaceId } = await context.params;
  const result = await getWorkspaceBoardAssuranceNotificationHistoryDownloadResponse({
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
