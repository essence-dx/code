import { strict as assert } from "node:assert";
import {
  createReleaseReadinessWebhookReport,
  normalizeReleaseReadinessWebhookEvent,
} from "@/features/projects/release-readiness-webhooks";

const generatedAt = "2026-05-16T14:30:00.000Z";

const olderVercelFailure = normalizeReleaseReadinessWebhookEvent({
  dedupeKey: "vercel:deployment:dep_123",
  eventType: "deployment.failed",
  payload: {
    deployment: {
      id: "dep_123",
      state: "ERROR",
      target: "production",
      url: "essence-spline-old.vercel.app",
    },
    project: {
      name: "essence-spline",
    },
  },
  provider: "vercel",
  receivedAt: "2026-05-16T14:00:00.000Z",
  signatureState: "trusted",
});

const latestVercelReady = normalizeReleaseReadinessWebhookEvent({
  dedupeKey: "vercel:deployment:dep_123",
  eventType: "deployment.ready",
  payload: {
    deployment: {
      id: "dep_123",
      state: "READY",
      target: "production",
      url: "essence-spline.vercel.app",
    },
    project: {
      name: "essence-spline",
    },
  },
  provider: "vercel",
  receivedAt: "2026-05-16T14:05:00.000Z",
  signatureState: "trusted",
});

const tursoMigrationReady = normalizeReleaseReadinessWebhookEvent({
  eventType: "database.migration.completed",
  payload: {
    database: "essence-spline",
    migrationName: "0038_release_readiness_webhooks.sql",
    status: "completed",
  },
  provider: "turso",
  receivedAt: "2026-05-16T14:06:00.000Z",
  signatureState: "trusted",
});

const brevoDeliveryBlocked = normalizeReleaseReadinessWebhookEvent({
  eventType: "hard_bounce",
  payload: {
    email: "launch-owner@example.com",
    messageId: "brevo-msg-99",
    reason: "Mailbox unavailable",
  },
  provider: "brevo",
  receivedAt: "2026-05-16T14:07:00.000Z",
  signatureState: "trusted",
});

const desktopPromotionReady = normalizeReleaseReadinessWebhookEvent({
  eventType: "desktop.updater.promoted",
  payload: {
    channel: "stable",
    platforms: ["windows", "darwin", "linux"],
    status: "promoted",
    version: "1.4.0",
  },
  provider: "desktop-updater",
  receivedAt: "2026-05-16T14:08:00.000Z",
  signatureState: "trusted",
});

assert.equal(olderVercelFailure.status, "blocked");
assert.equal(latestVercelReady.status, "ready");
assert.equal(tursoMigrationReady.surface, "migration");
assert.equal(tursoMigrationReady.status, "ready");
assert.equal(brevoDeliveryBlocked.status, "blocked");
assert.equal(desktopPromotionReady.status, "ready");

const report = createReleaseReadinessWebhookReport({
  events: [olderVercelFailure, latestVercelReady, tursoMigrationReady, brevoDeliveryBlocked, desktopPromotionReady],
  generatedAt,
  workspaceId: "workspace-1",
});

assert.equal(report.generatedAt, generatedAt);
assert.equal(report.rows.length, 4);
assert.equal(report.summary.totalCount, 4);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.watchCount, 0);
assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.readinessScore, 75);
assert.equal(report.summary.providerCoverage.brevo, 1);
assert.equal(report.summary.providerCoverage["desktop-updater"], 1);
assert.equal(report.summary.providerCoverage.turso, 1);
assert.equal(report.summary.providerCoverage.vercel, 1);
assert.equal(report.rows.find((row) => row.provider === "vercel")?.receivedAt, latestVercelReady.receivedAt);
assert.equal(report.rows.find((row) => row.provider === "vercel")?.status, "ready");
assert.match(report.csvContent, /provider,event_type,status,surface,received_at/);
assert.match(report.csvContent, /brevo,hard_bounce,blocked,email/);
assert.match(report.csvDataUri, /^data:text\/csv;charset=utf-8,/);

console.log("release readiness webhooks smoke passed");
