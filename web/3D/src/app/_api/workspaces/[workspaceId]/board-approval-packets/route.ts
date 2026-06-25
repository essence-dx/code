import { headers } from "next/headers";
import { isBoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import { listWorkspaceBoardApprovalPacketHistory, recordWorkspaceBoardApprovalPacket } from "@/features/projects/server/board-approval-packet-history-service";
import { auth } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const history = await listWorkspaceBoardApprovalPacketHistory({
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

  const payload = (await request.json().catch(() => null)) as {
    packet?: unknown;
    recipientEmail?: unknown;
    recipientName?: unknown;
    recipientPurpose?: unknown;
  } | null;

  if (!isBoardApprovalPacketReport(payload?.packet)) {
    return Response.json({ error: "Invalid board approval packet payload" }, { status: 400 });
  }

  const recipientEmail = normalizeOptionalText(payload?.recipientEmail);

  if (recipientEmail && !emailPattern.test(recipientEmail)) {
    return Response.json({ error: "Recipient email is not valid." }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceBoardApprovalPacket({
    currentUserId: userId,
    packet: payload.packet,
    recipientEmail,
    recipientName: normalizeOptionalText(payload?.recipientName),
    recipientPurpose: normalizeOptionalText(payload?.recipientPurpose) ?? "Board approval review",
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
