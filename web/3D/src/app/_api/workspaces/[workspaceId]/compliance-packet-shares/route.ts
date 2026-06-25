import { headers } from "next/headers";
import { isSignedCompliancePacketShareSource } from "@/features/projects/compliance-packet-sharing";
import { createWorkspaceCompliancePacketShare, listWorkspaceCompliancePacketShares } from "@/features/projects/server/compliance-packet-share-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const report = await listWorkspaceCompliancePacketShares({
    currentUserId: userId,
    workspaceId,
  });

  if ("error" in report) {
    return Response.json({ error: report.error }, { status: report.status });
  }

  return Response.json({ report });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    accessPurpose?: unknown;
    expiresAt?: unknown;
    packet?: unknown;
    recipientEmail?: unknown;
    recipientName?: unknown;
  } | null;

  if (!isSignedCompliancePacketShareSource(payload?.packet)) {
    return Response.json({ error: "Invalid compliance packet source." }, { status: 400 });
  }

  if (!isValidEmail(payload?.recipientEmail)) {
    return Response.json({ error: "Recipient email is required." }, { status: 400 });
  }

  if (!isValidDateString(payload?.expiresAt)) {
    return Response.json({ error: "A valid expiry date is required." }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await createWorkspaceCompliancePacketShare({
    accessPurpose: typeof payload?.accessPurpose === "string" ? payload.accessPurpose : "External compliance review",
    currentUserId: userId,
    expiresAt: payload.expiresAt,
    origin: getRequestOrigin(request),
    packet: payload.packet,
    recipientEmail: payload.recipientEmail,
    recipientName: typeof payload?.recipientName === "string" ? payload.recipientName : null,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
