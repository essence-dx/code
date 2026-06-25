import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  createReleaseReadinessWebhookReport,
  normalizeReleaseReadinessWebhookEvent,
  type ReleaseReadinessWebhookProvider,
  type ReleaseReadinessWebhookReport,
  type ReleaseReadinessWebhookRow,
  type ReleaseReadinessWebhookSignatureState,
  type ReleaseReadinessWebhookStatus,
} from "@/features/projects/release-readiness-webhooks";

export type ReleaseReadinessWebhookReplayState = "accepted" | "duplicate" | "missing-timestamp" | "stale";
export type ReleaseReadinessWebhookDeliveryState = "delivered" | "exhausted" | "not-required" | "retrying";

export interface ReleaseReadinessWebhookSecrets {
  brevo?: string;
  "desktop-updater"?: string;
  turso?: string;
  vercel?: string;
}

export interface ReleaseReadinessWebhookDeliveryAttempt {
  attemptNumber: number;
  lastError?: string | null;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  providerMessageId?: string | null;
}

export interface ReleaseReadinessWebhookHistoryEntryInput {
  deliveryAttempt?: ReleaseReadinessWebhookDeliveryAttempt | null;
  eventType: string;
  headers: Record<string, string | undefined>;
  knownReplayKeys?: string[];
  payload: Record<string, unknown>;
  provider: ReleaseReadinessWebhookProvider;
  rawBody: string;
  receivedAt: string;
  replayWindowMs?: number;
  secrets?: ReleaseReadinessWebhookSecrets;
  workspaceId: string;
}

export interface ReleaseReadinessWebhookHistoryEntry {
  deliveryAttempt: ReleaseReadinessWebhookDeliveryAttempt | null;
  deliveryState: ReleaseReadinessWebhookDeliveryState;
  eventType: string;
  id: string;
  payloadDigest: string;
  provider: ReleaseReadinessWebhookProvider;
  rawBodyDigest: string;
  readinessRow: ReleaseReadinessWebhookRow;
  receivedAt: string;
  replayKey: string;
  replayReason: string | null;
  replayState: ReleaseReadinessWebhookReplayState;
  signatureDigest: string | null;
  signatureState: ReleaseReadinessWebhookSignatureState;
  workspaceId: string;
}

export interface ReleaseReadinessWebhookHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  entries: ReleaseReadinessWebhookHistoryEntry[];
  generatedAt: string;
  releaseReadiness: ReleaseReadinessWebhookReport;
  summary: {
    acceptedCount: number;
    exhaustedRetryCount: number;
    providerRetryEvidence: Record<ReleaseReadinessWebhookProvider, ReleaseReadinessWebhookProviderRetryEvidence>;
    readinessStatus: ReleaseReadinessWebhookStatus;
    replayRejectedCount: number;
    retryingCount: number;
    totalCount: number;
    trustedSignatureCount: number;
  };
}

export interface ReleaseReadinessWebhookProviderRetryEvidence {
  acceptedCount: number;
  exhaustedRetryCount: number;
  latestReceivedAt: string | null;
  replayRejectedCount: number;
  retryingCount: number;
  totalCount: number;
}

export interface CreateReleaseReadinessWebhookHistoryReportInput {
  entries: ReleaseReadinessWebhookHistoryEntry[];
  generatedAt?: string;
  workspaceId?: string;
}

interface SignatureValidationResult {
  digest: string | null;
  replayKey: string;
  replayReason: string | null;
  replayState: ReleaseReadinessWebhookReplayState;
  signatureState: ReleaseReadinessWebhookSignatureState;
}

const defaultReplayWindowMs = 5 * 60 * 1000;
const providers: ReleaseReadinessWebhookProvider[] = ["vercel", "turso", "brevo", "desktop-updater"];

const providerHeaders: Record<ReleaseReadinessWebhookProvider, { signature: string; timestamp: string }> = {
  brevo: {
    signature: "x-brevo-signature",
    timestamp: "x-brevo-timestamp",
  },
  "desktop-updater": {
    signature: "x-essence-updater-signature",
    timestamp: "x-essence-updater-timestamp",
  },
  turso: {
    signature: "x-turso-signature",
    timestamp: "x-turso-timestamp",
  },
  vercel: {
    signature: "x-vercel-signature",
    timestamp: "x-vercel-timestamp",
  },
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function hmacSignature(input: {
  provider: ReleaseReadinessWebhookProvider;
  rawBody: string;
  secret: string;
  timestamp: string;
}) {
  return `sha256=${createHmac("sha256", input.secret).update(`${input.provider}.${input.timestamp}.${input.rawBody}`).digest("hex")}`;
}

function normalizeSignature(value: string | null) {
  return value?.trim().replace(/^sha256:/, "sha256=").toLowerCase() ?? null;
}

function getHeader(headers: Record<string, string | undefined>, name: string) {
  const lowerName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);

  return match?.[1]?.trim() || null;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isStaleTimestamp(input: {
  receivedAt: string;
  replayWindowMs: number;
  timestamp: string;
}) {
  const receivedAt = new Date(input.receivedAt).getTime();
  const timestamp = new Date(input.timestamp).getTime();

  if (Number.isNaN(receivedAt) || Number.isNaN(timestamp)) {
    return true;
  }

  return Math.abs(receivedAt - timestamp) > input.replayWindowMs;
}

function replayBlockReason(state: ReleaseReadinessWebhookReplayState) {
  if (state === "duplicate") {
    return "Replay key has already been accepted for this workspace.";
  }

  if (state === "missing-timestamp") {
    return "Signed webhook is missing the provider timestamp needed for replay protection.";
  }

  if (state === "stale") {
    return "Signed webhook timestamp falls outside the replay acceptance window.";
  }

  return null;
}

function validateSignatureAndReplay(input: ReleaseReadinessWebhookHistoryEntryInput): SignatureValidationResult {
  const secret = input.secrets?.[input.provider]?.trim();
  const config = providerHeaders[input.provider];
  const timestamp = getHeader(input.headers, config.timestamp);
  const signature = normalizeSignature(getHeader(input.headers, config.signature));
  const knownReplayKeys = new Set(input.knownReplayKeys ?? []);
  const bodyDigest = sha256(input.rawBody);

  if (!secret) {
    const replayKey = `${input.provider}:unsigned:${bodyDigest}`;

    return {
      digest: null,
      replayKey,
      replayReason: null,
      replayState: knownReplayKeys.has(replayKey) ? "duplicate" : "accepted",
      signatureState: "not-required",
    };
  }

  if (!timestamp) {
    return {
      digest: signature ? sha256(signature) : null,
      replayKey: `${input.provider}:missing-timestamp:${bodyDigest}`,
      replayReason: replayBlockReason("missing-timestamp"),
      replayState: "missing-timestamp",
      signatureState: signature ? "untrusted" : "missing",
    };
  }

  const replayKey = `${input.provider}:${timestamp}:${signature ? sha256(signature) : bodyDigest}`;

  if (isStaleTimestamp({ receivedAt: input.receivedAt, replayWindowMs: input.replayWindowMs ?? defaultReplayWindowMs, timestamp })) {
    return {
      digest: signature ? sha256(signature) : null,
      replayKey,
      replayReason: replayBlockReason("stale"),
      replayState: "stale",
      signatureState: signature ? "trusted" : "missing",
    };
  }

  if (knownReplayKeys.has(replayKey)) {
    return {
      digest: signature ? sha256(signature) : null,
      replayKey,
      replayReason: replayBlockReason("duplicate"),
      replayState: "duplicate",
      signatureState: signature ? "trusted" : "missing",
    };
  }

  if (!signature) {
    return {
      digest: null,
      replayKey,
      replayReason: null,
      replayState: "accepted",
      signatureState: "missing",
    };
  }

  const expectedSignature = normalizeSignature(hmacSignature({ provider: input.provider, rawBody: input.rawBody, secret, timestamp }))!;

  return {
    digest: sha256(signature),
    replayKey,
    replayReason: null,
    replayState: "accepted",
    signatureState: safeEqual(signature, expectedSignature) ? "trusted" : "untrusted",
  };
}

function deliveryState(row: ReleaseReadinessWebhookRow, attempt: ReleaseReadinessWebhookDeliveryAttempt | null): ReleaseReadinessWebhookDeliveryState {
  if (row.status === "ready") {
    return "delivered";
  }

  if (!attempt) {
    return "not-required";
  }

  if (attempt.attemptNumber >= attempt.maxAttempts) {
    return "exhausted";
  }

  return "retrying";
}

function applyReplayGuard(row: ReleaseReadinessWebhookRow, validation: SignatureValidationResult): ReleaseReadinessWebhookRow {
  if (validation.replayState === "accepted") {
    return row;
  }

  return {
    ...row,
    evidence: `${row.evidence} ${validation.replayReason ?? "Webhook replay protection rejected this delivery."}`,
    nextAction: "Reject this delivery from release readiness until the provider sends a fresh signed event.",
    severity: "critical",
    status: "blocked",
  };
}

function createEntryId(input: {
  payloadDigest: string;
  provider: ReleaseReadinessWebhookProvider;
  receivedAt: string;
  replayKey: string;
  workspaceId: string;
}) {
  return sha256(`${input.workspaceId}:${input.provider}:${input.receivedAt}:${input.replayKey}:${input.payloadDigest}`).slice("sha256:".length, "sha256:".length + 24);
}

export function signReleaseReadinessWebhookPayload(input: {
  provider: ReleaseReadinessWebhookProvider;
  rawBody: string;
  secret: string;
  timestamp: string;
}) {
  return hmacSignature(input);
}

export function createReleaseReadinessWebhookHistoryEntry(input: ReleaseReadinessWebhookHistoryEntryInput): ReleaseReadinessWebhookHistoryEntry {
  const validation = validateSignatureAndReplay(input);
  const payloadDigest = sha256(stableJson(input.payload));
  const rawBodyDigest = sha256(input.rawBody);
  const readinessRow = applyReplayGuard(
    normalizeReleaseReadinessWebhookEvent({
      dedupeKey: `${input.provider}:${validation.replayKey}`,
      eventType: input.eventType,
      payload: input.payload,
      provider: input.provider,
      receivedAt: input.receivedAt,
      signatureState: validation.signatureState,
    }),
    validation,
  );
  const attempt = input.deliveryAttempt ?? null;

  return {
    deliveryAttempt: attempt,
    deliveryState: deliveryState(readinessRow, attempt),
    eventType: input.eventType,
    id: createEntryId({ payloadDigest, provider: input.provider, receivedAt: input.receivedAt, replayKey: validation.replayKey, workspaceId: input.workspaceId }),
    payloadDigest,
    provider: input.provider,
    rawBodyDigest,
    readinessRow,
    receivedAt: input.receivedAt,
    replayKey: validation.replayKey,
    replayReason: validation.replayReason,
    replayState: validation.replayState,
    signatureDigest: validation.digest,
    signatureState: validation.signatureState,
    workspaceId: input.workspaceId,
  };
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function createCsv(entries: ReleaseReadinessWebhookHistoryEntry[]) {
  const header = [
    "provider",
    "event_type",
    "status",
    "replay_state",
    "delivery_state",
    "signature_state",
    "received_at",
    "attempt",
    "max_attempts",
    "next_attempt_at",
    "payload_digest",
    "replay_key",
    "next_action",
  ];
  const body = entries.map((entry) =>
    [
      entry.provider,
      entry.eventType,
      entry.readinessRow.status,
      entry.replayState,
      entry.deliveryState,
      entry.signatureState,
      entry.receivedAt,
      entry.deliveryAttempt?.attemptNumber ?? "",
      entry.deliveryAttempt?.maxAttempts ?? "",
      entry.deliveryAttempt?.nextAttemptAt ?? "",
      entry.payloadDigest,
      entry.replayKey,
      entry.readinessRow.nextAction,
    ]
      .map((value) => escapeCsvValue(value === "" ? null : value))
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function latestTime(first: string | null, second: string) {
  if (!first) {
    return second;
  }

  return new Date(second).getTime() > new Date(first).getTime() ? second : first;
}

function providerEvidence(entries: ReleaseReadinessWebhookHistoryEntry[]) {
  const evidence = Object.fromEntries(
    providers.map((provider) => [
      provider,
      {
        acceptedCount: 0,
        exhaustedRetryCount: 0,
        latestReceivedAt: null,
        replayRejectedCount: 0,
        retryingCount: 0,
        totalCount: 0,
      } satisfies ReleaseReadinessWebhookProviderRetryEvidence,
    ]),
  ) as Record<ReleaseReadinessWebhookProvider, ReleaseReadinessWebhookProviderRetryEvidence>;

  for (const entry of entries) {
    const provider = evidence[entry.provider];
    provider.totalCount += 1;
    provider.acceptedCount += entry.replayState === "accepted" ? 1 : 0;
    provider.replayRejectedCount += entry.replayState === "accepted" ? 0 : 1;
    provider.retryingCount += entry.deliveryState === "retrying" ? 1 : 0;
    provider.exhaustedRetryCount += entry.deliveryState === "exhausted" ? 1 : 0;
    provider.latestReceivedAt = latestTime(provider.latestReceivedAt, entry.receivedAt);
  }

  return evidence;
}

export function createReleaseReadinessWebhookHistoryReport(input: CreateReleaseReadinessWebhookHistoryReportInput): ReleaseReadinessWebhookHistoryReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = [...input.entries].sort(
    (first, second) => new Date(second.receivedAt).getTime() - new Date(first.receivedAt).getTime() || first.provider.localeCompare(second.provider),
  );
  const acceptedEntries = entries.filter((entry) => entry.replayState === "accepted");
  const releaseReadiness = createReleaseReadinessWebhookReport({
    events: acceptedEntries.map((entry) => entry.readinessRow),
    generatedAt,
    workspaceId: input.workspaceId,
  });
  const csvContent = createCsv(entries);

  return {
    csvContent,
    csvDataUri: encodeDataUri(csvContent),
    csvFileName: `${input.workspaceId ?? "workspace"}-release-readiness-webhook-history.csv`,
    entries,
    generatedAt,
    releaseReadiness,
    summary: {
      acceptedCount: acceptedEntries.length,
      exhaustedRetryCount: entries.filter((entry) => entry.deliveryState === "exhausted").length,
      providerRetryEvidence: providerEvidence(entries),
      readinessStatus: releaseReadiness.summary.status,
      replayRejectedCount: entries.filter((entry) => entry.replayState !== "accepted").length,
      retryingCount: entries.filter((entry) => entry.deliveryState === "retrying").length,
      totalCount: entries.length,
      trustedSignatureCount: entries.filter((entry) => entry.signatureState === "trusted").length,
    },
  };
}
