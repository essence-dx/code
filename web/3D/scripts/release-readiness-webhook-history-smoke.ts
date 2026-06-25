import { strict as assert } from "node:assert";
import {
  createReleaseReadinessWebhookHistoryEntry,
  createReleaseReadinessWebhookHistoryReport,
  signReleaseReadinessWebhookPayload,
} from "@/features/projects/release-readiness-webhook-history";

const generatedAt = "2026-05-16T18:00:00.000Z";
const workspaceId = "workspace-1";
const vercelSecret = "vercel-release-webhook-secret";
const brevoSecret = "brevo-release-webhook-secret";

const vercelPayload = {
  deployment: {
    id: "dep_456",
    state: "READY",
    target: "production",
    url: "essence-spline.vercel.app",
  },
  project: {
    name: "essence-spline",
  },
};
const vercelRawBody = JSON.stringify(vercelPayload);
const vercelSignature = signReleaseReadinessWebhookPayload({
  provider: "vercel",
  rawBody: vercelRawBody,
  secret: vercelSecret,
  timestamp: "2026-05-16T17:55:00.000Z",
});
const trustedVercel = createReleaseReadinessWebhookHistoryEntry({
  eventType: "deployment.ready",
  headers: {
    "x-vercel-signature": vercelSignature,
    "x-vercel-timestamp": "2026-05-16T17:55:00.000Z",
  },
  knownReplayKeys: [],
  payload: vercelPayload,
  provider: "vercel",
  rawBody: vercelRawBody,
  receivedAt: generatedAt,
  secrets: {
    vercel: vercelSecret,
  },
  workspaceId,
});

assert.equal(trustedVercel.signatureState, "trusted");
assert.equal(trustedVercel.replayState, "accepted");
assert.equal(trustedVercel.readinessRow.status, "ready");
assert.ok(trustedVercel.replayKey.startsWith("vercel:"));

const replayedVercel = createReleaseReadinessWebhookHistoryEntry({
  eventType: "deployment.ready",
  headers: {
    "x-vercel-signature": vercelSignature,
    "x-vercel-timestamp": "2026-05-16T17:55:00.000Z",
  },
  knownReplayKeys: [trustedVercel.replayKey],
  payload: vercelPayload,
  provider: "vercel",
  rawBody: vercelRawBody,
  receivedAt: generatedAt,
  secrets: {
    vercel: vercelSecret,
  },
  workspaceId,
});

assert.equal(replayedVercel.replayState, "duplicate");
assert.equal(replayedVercel.readinessRow.status, "blocked");

const staleSignature = signReleaseReadinessWebhookPayload({
  provider: "vercel",
  rawBody: vercelRawBody,
  secret: vercelSecret,
  timestamp: "2026-05-16T16:30:00.000Z",
});
const staleVercel = createReleaseReadinessWebhookHistoryEntry({
  eventType: "deployment.ready",
  headers: {
    "x-vercel-signature": staleSignature,
    "x-vercel-timestamp": "2026-05-16T16:30:00.000Z",
  },
  knownReplayKeys: [],
  payload: vercelPayload,
  provider: "vercel",
  rawBody: vercelRawBody,
  receivedAt: generatedAt,
  replayWindowMs: 5 * 60 * 1000,
  secrets: {
    vercel: vercelSecret,
  },
  workspaceId,
});

assert.equal(staleVercel.replayState, "stale");
assert.equal(staleVercel.readinessRow.status, "blocked");

const brevoPayload = {
  email: "launch-owner@example.com",
  messageId: "brevo-msg-123",
  reason: "Temporary provider deferral",
  status: "delivery.failed",
};
const brevoRawBody = JSON.stringify(brevoPayload);
const brevoTimestamp = "2026-05-16T17:58:00.000Z";
const brevoSignature = signReleaseReadinessWebhookPayload({
  provider: "brevo",
  rawBody: brevoRawBody,
  secret: brevoSecret,
  timestamp: brevoTimestamp,
});
const retryingBrevo = createReleaseReadinessWebhookHistoryEntry({
  deliveryAttempt: {
    attemptNumber: 2,
    lastError: "Temporary provider deferral",
    maxAttempts: 5,
    nextAttemptAt: "2026-05-16T18:15:00.000Z",
    providerMessageId: "brevo-msg-123",
  },
  eventType: "delivery.failed",
  headers: {
    "x-brevo-signature": brevoSignature,
    "x-brevo-timestamp": brevoTimestamp,
  },
  knownReplayKeys: [],
  payload: brevoPayload,
  provider: "brevo",
  rawBody: brevoRawBody,
  receivedAt: generatedAt,
  secrets: {
    brevo: brevoSecret,
  },
  workspaceId,
});

assert.equal(retryingBrevo.signatureState, "trusted");
assert.equal(retryingBrevo.deliveryState, "retrying");
assert.equal(retryingBrevo.readinessRow.status, "blocked");

const report = createReleaseReadinessWebhookHistoryReport({
  entries: [trustedVercel, replayedVercel, staleVercel, retryingBrevo],
  generatedAt,
  workspaceId,
});

assert.equal(report.summary.totalCount, 4);
assert.equal(report.summary.acceptedCount, 2);
assert.equal(report.summary.replayRejectedCount, 2);
assert.equal(report.summary.trustedSignatureCount, 4);
assert.equal(report.summary.retryingCount, 1);
assert.equal(report.summary.providerRetryEvidence.brevo.retryingCount, 1);
assert.equal(report.summary.providerRetryEvidence.vercel.replayRejectedCount, 2);
assert.equal(report.releaseReadiness.rows.length, 2);
assert.equal(report.releaseReadiness.summary.blockedCount, 1);
assert.equal(report.releaseReadiness.summary.readyCount, 1);
assert.match(report.csvContent, /provider,event_type,status,replay_state,delivery_state/);
assert.match(report.csvContent, /brevo,delivery.failed,blocked,accepted,retrying/);

console.log("release readiness webhook history smoke passed");
