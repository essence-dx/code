import { strict as assert } from "node:assert";
import {
  createSignedCompliancePacketShareRecord,
  createSignedCompliancePacketShareReport,
  recordSignedCompliancePacketShareAccess,
  revokeSignedCompliancePacketShareRecord,
  signedCompliancePacketShareTokenDigest,
} from "@/features/projects/compliance-packet-sharing";

const generatedAt = "2026-05-16T21:00:00.000Z";
const actor = {
  email: "owner@example.com",
  name: "Owner",
  userId: "owner-1",
};
const packet = {
  contentHash: "sha256:4f4f918f0e7f6aa36df7f7204e9bb81a12e5de90c30d58d7d995cc15f2b0d111",
  keyId: "evidence-key-1",
  packetBody: "{\"workspace\":\"workspace-1\",\"score\":96}",
  packetId: "risk-digest-workspace-20260516",
  packetKind: "risk-digest" as const,
  signedAt: "2026-05-16T20:58:00.000Z",
  signer: "Release owner",
  sourceLabel: "Workspace risk digest",
  status: "ready" as const,
  verificationState: "verified" as const,
};

const { record: activeShare, token } = createSignedCompliancePacketShareRecord({
  accessPurpose: "External compliance review",
  actor,
  createdAt: generatedAt,
  expiresAt: "2026-05-23T21:00:00.000Z",
  id: "share-active",
  origin: "https://essence-spline.example",
  packet,
  recipientEmail: "auditor@example.com",
  recipientName: "Auditor",
  token: "ecp_test_active_token",
  workspaceId: "workspace-1",
});

assert.equal(token, "ecp_test_active_token");
assert.equal(activeShare.tokenDigest, signedCompliancePacketShareTokenDigest(token));
assert.equal(activeShare.shareUrl, "https://essence-spline.example/compliance-packet-shares/ecp_test_active_token");
assert.equal(activeShare.status, "active");
assert.equal(activeShare.auditTrail[0]?.action, "created");
assert.equal(activeShare.auditTrail[0]?.recipientEmail, "auditor@example.com");
assert.equal(activeShare.shareUrl.includes(activeShare.tokenDigest), false);

const viewedShare = recordSignedCompliancePacketShareAccess(activeShare, {
  action: "viewed",
  occurredAt: "2026-05-17T00:00:00.000Z",
  recipientEmail: "auditor@example.com",
});
const downloadedShare = recordSignedCompliancePacketShareAccess(viewedShare, {
  action: "downloaded",
  occurredAt: "2026-05-17T00:05:00.000Z",
  recipientEmail: "auditor@example.com",
});

assert.equal(downloadedShare.accessCount, 1);
assert.equal(downloadedShare.downloadCount, 1);
assert.equal(downloadedShare.lastAccessedAt, "2026-05-17T00:05:00.000Z");
assert.equal(downloadedShare.auditTrail.map((event) => event.action).join(","), "created,viewed,downloaded");

const revokedBaseShare = recordSignedCompliancePacketShareAccess(
  createSignedCompliancePacketShareRecord({
    accessPurpose: "Reviewer handoff review",
    actor,
    createdAt: "2026-05-16T22:00:00.000Z",
    expiresAt: "2026-05-23T22:00:00.000Z",
    id: "share-revoked",
    origin: "https://essence-spline.example",
    packet: {
      ...packet,
      packetId: "reviewer-handoff-20260516",
      packetKind: "reviewer-handoff",
      sourceLabel: "Reviewer handoff packet",
    },
    recipientEmail: "old-reviewer@example.com",
    recipientName: "Old Reviewer",
    token: "ecp_test_revoked_token",
    workspaceId: "workspace-1",
  }).record,
  {
    action: "viewed",
    occurredAt: "2026-05-17T00:30:00.000Z",
    recipientEmail: "old-reviewer@example.com",
  },
);
const revokedShare = revokeSignedCompliancePacketShareRecord(revokedBaseShare, {
  actor,
  occurredAt: "2026-05-17T01:00:00.000Z",
  reason: "Reviewer changed.",
});

assert.equal(revokedShare.status, "revoked");
assert.equal(revokedShare.revokedAt, "2026-05-17T01:00:00.000Z");
assert.equal(revokedShare.revokedBy?.email, "owner@example.com");
assert.equal(revokedShare.auditTrail.at(-1)?.action, "revoked");

const expiredShare = createSignedCompliancePacketShareRecord({
  accessPurpose: "Expired archive review",
  actor,
  createdAt: "2026-05-10T21:00:00.000Z",
  expiresAt: "2026-05-12T21:00:00.000Z",
  id: "share-expired",
  origin: "https://essence-spline.example",
  packet: {
    ...packet,
    packetId: "reviewer-handoff-20260510",
    packetKind: "reviewer-handoff",
    sourceLabel: "Reviewer handoff packet",
  },
  recipientEmail: "archivist@example.com",
  recipientName: "Archivist",
  token: "ecp_test_expired_token",
  workspaceId: "workspace-1",
}).record;

const activeReport = createSignedCompliancePacketShareReport({
  generatedAt: "2026-05-17T00:10:00.000Z",
  shares: [downloadedShare],
  workspaceId: "workspace-1",
});

assert.equal(activeReport.summary.activeCount, 1);
assert.equal(activeReport.summary.expiredCount, 0);
assert.equal(activeReport.summary.revokedCount, 0);
assert.equal(activeReport.summary.auditEventCount, 3);
assert.equal(activeReport.summary.status, "ready");

const mixedReport = createSignedCompliancePacketShareReport({
  generatedAt,
  shares: [downloadedShare, revokedShare, expiredShare],
  workspaceId: "workspace-1",
});

assert.equal(mixedReport.summary.totalCount, 3);
assert.equal(mixedReport.summary.activeCount, 1);
assert.equal(mixedReport.summary.expiredCount, 1);
assert.equal(mixedReport.summary.revokedCount, 1);
assert.equal(mixedReport.summary.auditEventCount, 7);
assert.equal(mixedReport.summary.status, "watch");
assert.equal(mixedReport.rows[0]?.id, "share-active");
assert.match(mixedReport.csvContent, /share_id,status,packet_id,packet_kind,recipient_email,expires_at,revoked_at,access_count,download_count,audit_events/);
assert.match(mixedReport.csvDataUri, /^data:text\/csv/);
assert.equal(mixedReport.csvFileName, "workspace-1-compliance-packet-shares.csv");

console.log("compliance packet sharing smoke passed");
