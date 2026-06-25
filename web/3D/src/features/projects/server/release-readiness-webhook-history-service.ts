import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { workspaceReleaseReadinessWebhookEvent } from "@/db/schema";
import {
  createReleaseReadinessWebhookHistoryEntry,
  createReleaseReadinessWebhookHistoryReport,
  type ReleaseReadinessWebhookDeliveryAttempt,
  type ReleaseReadinessWebhookHistoryEntry,
  type ReleaseReadinessWebhookHistoryReport,
  type ReleaseReadinessWebhookSecrets,
} from "@/features/projects/release-readiness-webhook-history";
import type { ReleaseReadinessWebhookProvider, ReleaseReadinessWebhookRow } from "@/features/projects/release-readiness-webhooks";
import { ensureWorkspaceSchema, getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);
const providers: ReleaseReadinessWebhookProvider[] = ["vercel", "turso", "brevo", "desktop-updater"];

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceReleaseReadinessWebhookHistorySchema() {
  schemaReady ??= (async () => {
    await ensureWorkspaceSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_release_readiness_webhook_event (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        provider text NOT NULL,
        event_type text NOT NULL,
        surface text NOT NULL,
        status text NOT NULL,
        subject text NOT NULL,
        evidence text NOT NULL,
        next_action text NOT NULL,
        payload_digest text NOT NULL,
        raw_body_digest text NOT NULL,
        signature_digest text,
        signature_state text NOT NULL,
        replay_key text NOT NULL,
        replay_state text NOT NULL,
        replay_reason text,
        delivery_state text NOT NULL,
        delivery_attempt text,
        readiness_row text NOT NULL,
        payload text NOT NULL,
        received_at integer NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_readiness_webhook_event_workspace_idx ON workspace_release_readiness_webhook_event(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_readiness_webhook_event_provider_idx ON workspace_release_readiness_webhook_event(workspace_id, provider)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_readiness_webhook_event_received_idx ON workspace_release_readiness_webhook_event(workspace_id, received_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_readiness_webhook_event_replay_idx ON workspace_release_readiness_webhook_event(workspace_id, provider, replay_key)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_release_readiness_webhook_event_status_idx ON workspace_release_readiness_webhook_event(workspace_id, status)");
  })();

  await schemaReady;
}

async function requireWebhookManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can view release webhook history.", status: 403 };
  }

  return { role: access.role };
}

function parseJsonValue<T>(value: T | string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapWebhookRow(row: typeof workspaceReleaseReadinessWebhookEvent.$inferSelect): ReleaseReadinessWebhookHistoryEntry {
  return {
    deliveryAttempt: parseJsonValue<ReleaseReadinessWebhookDeliveryAttempt | null>(row.deliveryAttempt, null),
    deliveryState: row.deliveryState,
    eventType: row.eventType,
    id: row.id,
    payloadDigest: row.payloadDigest,
    provider: row.provider,
    rawBodyDigest: row.rawBodyDigest,
    readinessRow: parseJsonValue<ReleaseReadinessWebhookRow>(row.readinessRow, {
      dedupeKey: row.replayKey,
      eventType: row.eventType,
      evidence: row.evidence,
      nextAction: row.nextAction,
      payloadDigest: row.payloadDigest,
      provider: row.provider,
      receivedAt: toIso(row.receivedAt),
      severity: row.status === "blocked" ? "critical" : row.status === "watch" ? "warning" : "info",
      signatureState: row.signatureState,
      status: row.status,
      subject: row.subject,
      surface: row.surface,
    }),
    receivedAt: toIso(row.receivedAt),
    replayKey: row.replayKey,
    replayReason: row.replayReason,
    replayState: row.replayState,
    signatureDigest: row.signatureDigest,
    signatureState: row.signatureState,
    workspaceId: row.workspaceId,
  };
}

function mapHeaders(headers: Headers | Record<string, string | undefined>) {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return headers;
}

export function getReleaseReadinessWebhookSecretsFromEnv(env: NodeJS.ProcessEnv = process.env): ReleaseReadinessWebhookSecrets {
  return {
    brevo: env.RELEASE_WEBHOOK_SECRET_BREVO,
    "desktop-updater": env.RELEASE_WEBHOOK_SECRET_DESKTOP_UPDATER,
    turso: env.RELEASE_WEBHOOK_SECRET_TURSO,
    vercel: env.RELEASE_WEBHOOK_SECRET_VERCEL,
  };
}

export function isReleaseReadinessWebhookProvider(value: string | null | undefined): value is ReleaseReadinessWebhookProvider {
  return providers.includes(value as ReleaseReadinessWebhookProvider);
}

export async function listWorkspaceReleaseReadinessWebhookHistory(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<ReleaseReadinessWebhookHistoryReport>> {
  await ensureWorkspaceReleaseReadinessWebhookHistorySchema();

  const access = await requireWebhookManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select()
    .from(workspaceReleaseReadinessWebhookEvent)
    .where(eq(workspaceReleaseReadinessWebhookEvent.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseReadinessWebhookEvent.receivedAt))
    .limit(input.limit ?? 50);

  return createReleaseReadinessWebhookHistoryReport({
    entries: rows.map(mapWebhookRow),
    workspaceId: input.workspaceId,
  });
}

export async function recordWorkspaceReleaseReadinessWebhookDelivery(input: {
  deliveryAttempt?: ReleaseReadinessWebhookDeliveryAttempt | null;
  eventType: string;
  headers: Headers | Record<string, string | undefined>;
  payload: Record<string, unknown>;
  provider: ReleaseReadinessWebhookProvider;
  rawBody: string;
  receivedAt?: Date;
  secrets?: ReleaseReadinessWebhookSecrets;
  workspaceId: string;
}): Promise<ServiceResult<{ entry: ReleaseReadinessWebhookHistoryEntry; report: ReleaseReadinessWebhookHistoryReport }>> {
  await ensureWorkspaceReleaseReadinessWebhookHistorySchema();

  const rows = await getDb()
    .select({ replayKey: workspaceReleaseReadinessWebhookEvent.replayKey })
    .from(workspaceReleaseReadinessWebhookEvent)
    .where(
      and(
        eq(workspaceReleaseReadinessWebhookEvent.workspaceId, input.workspaceId),
        eq(workspaceReleaseReadinessWebhookEvent.provider, input.provider),
        eq(workspaceReleaseReadinessWebhookEvent.replayState, "accepted"),
      ),
    );
  const entry = createReleaseReadinessWebhookHistoryEntry({
    deliveryAttempt: input.deliveryAttempt ?? null,
    eventType: input.eventType,
    headers: mapHeaders(input.headers),
    knownReplayKeys: rows.map((row) => row.replayKey),
    payload: input.payload,
    provider: input.provider,
    rawBody: input.rawBody,
    receivedAt: (input.receivedAt ?? new Date()).toISOString(),
    secrets: input.secrets ?? getReleaseReadinessWebhookSecretsFromEnv(),
    workspaceId: input.workspaceId,
  });
  const createdAt = new Date();

  await getDb().insert(workspaceReleaseReadinessWebhookEvent).values({
    createdAt,
    deliveryAttempt: entry.deliveryAttempt,
    deliveryState: entry.deliveryState,
    eventType: entry.eventType,
    evidence: entry.readinessRow.evidence,
    id: entry.id,
    nextAction: entry.readinessRow.nextAction,
    payload: input.payload,
    payloadDigest: entry.payloadDigest,
    provider: entry.provider,
    rawBodyDigest: entry.rawBodyDigest,
    readinessRow: entry.readinessRow,
    receivedAt: new Date(entry.receivedAt),
    replayKey: entry.replayKey,
    replayReason: entry.replayReason,
    replayState: entry.replayState,
    signatureDigest: entry.signatureDigest,
    signatureState: entry.signatureState,
    status: entry.readinessRow.status,
    subject: entry.readinessRow.subject,
    surface: entry.readinessRow.surface,
    workspaceId: entry.workspaceId,
  });

  const latestRows = await getDb()
    .select()
    .from(workspaceReleaseReadinessWebhookEvent)
    .where(eq(workspaceReleaseReadinessWebhookEvent.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceReleaseReadinessWebhookEvent.receivedAt))
    .limit(50);

  return {
    entry,
    report: createReleaseReadinessWebhookHistoryReport({
      entries: latestRows.map(mapWebhookRow),
      workspaceId: input.workspaceId,
    }),
  };
}
