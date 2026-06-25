import { headers } from "next/headers";
import {
  getReleaseReadinessWebhookSecretsFromEnv,
  isReleaseReadinessWebhookProvider,
  listWorkspaceReleaseReadinessWebhookHistory,
  recordWorkspaceReleaseReadinessWebhookDelivery,
} from "@/features/projects/server/release-readiness-webhook-history-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePayload(rawBody: string) {
  try {
    const parsed = JSON.parse(rawBody);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getProvider(request: Request, payload: Record<string, unknown>) {
  const url = new URL(request.url);
  const value = url.searchParams.get("provider") ?? request.headers.get("x-essence-webhook-provider") ?? readString(payload.provider);

  return isReleaseReadinessWebhookProvider(value) ? value : null;
}

function getEventType(request: Request, payload: Record<string, unknown>) {
  return request.headers.get("x-essence-webhook-event") ?? readString(payload.eventType) ?? readString(payload.type) ?? readString(payload.event) ?? "release.webhook.received";
}

function getDeliveryAttempt(payload: Record<string, unknown>) {
  const attempt = payload.deliveryAttempt;

  if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) {
    return null;
  }

  const record = attempt as Record<string, unknown>;
  const attemptNumber = typeof record.attemptNumber === "number" ? record.attemptNumber : 1;
  const maxAttempts = typeof record.maxAttempts === "number" ? record.maxAttempts : 1;

  return {
    attemptNumber,
    lastError: readString(record.lastError),
    maxAttempts,
    nextAttemptAt: readString(record.nextAttemptAt),
    providerMessageId: readString(record.providerMessageId),
  };
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const history = await listWorkspaceReleaseReadinessWebhookHistory({
    currentUserId: userId,
    workspaceId,
  });

  if ("error" in history) {
    return Response.json({ error: history.error }, { status: history.status });
  }

  return Response.json({ history });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const rawBody = await request.text();
  const payload = parsePayload(rawBody);

  if (!payload) {
    return Response.json({ error: "Invalid release readiness webhook payload" }, { status: 400 });
  }

  const provider = getProvider(request, payload);

  if (!provider) {
    return Response.json({ error: "Unsupported release readiness webhook provider" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceReleaseReadinessWebhookDelivery({
    deliveryAttempt: getDeliveryAttempt(payload),
    eventType: getEventType(request, payload),
    headers: request.headers,
    payload,
    provider,
    rawBody,
    secrets: getReleaseReadinessWebhookSecretsFromEnv(),
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (result.entry.signatureState !== "trusted") {
    return Response.json({ error: "Release readiness webhook signature is not trusted.", entry: result.entry }, { status: 401 });
  }

  if (result.entry.replayState !== "accepted") {
    return Response.json({ error: "Release readiness webhook replay was rejected.", entry: result.entry }, { status: 409 });
  }

  return Response.json(result, { status: 202 });
}
