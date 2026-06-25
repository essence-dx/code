import { strict as assert } from "node:assert";

import type { ReleaseAttestationDistributionPacket } from "@/features/projects/release-attestation-distribution-packet";
import type { ReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";
import type { ReleaseAttestationReplayVerifier } from "@/features/projects/release-attestation-replay-verifier";
import { createReleaseAttestationRevocationWorkflow } from "@/features/projects/release-attestation-revocation-workflow";

const generatedAt = "2026-05-24T12:00:00.000Z";
const releaseCandidateId = "native-2.0.0-attestation";
const workspaceId = "Essence Runtime";

const attestationHistoryLedger = {
  generatedAt,
  releaseCandidateId,
  rows: [
    {
      certificateVersion: "certificate-v0",
      status: "historical",
    },
    {
      certificateVersion: "certificate-v1",
      status: "current",
    },
  ],
  summary: {
    currentCertificateVersion: "certificate-v1",
    ledgerHash: "sha256:attestation-history-ledger",
    ledgerScore: 100,
    status: "current",
  },
  workspaceId,
} as unknown as ReleaseAttestationHistoryLedger;

const replayVerifier = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    currentCertificateVersion: "certificate-v1",
    driftCount: 0,
    replayHash: "sha256:attestation-replay",
    replayScore: 100,
    status: "matched",
  },
  workspaceId,
} as unknown as ReleaseAttestationReplayVerifier;

const distributionPacket = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    currentCertificateVersion: "certificate-v1",
    distributionHash: "sha256:attestation-distribution",
    distributionScore: 100,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseAttestationDistributionPacket;

const resolved = createReleaseAttestationRevocationWorkflow({
  attestationHistoryLedger,
  distributionPacket,
  generatedAt,
  releaseCandidateId,
  replayVerifier,
  revocations: [
    {
      customerNotificationHash: "sha256:customer-notification",
      customerNotificationRoute: "customer-success-secure-link",
      ownerApprovalHash: "sha256:owner-approval",
      replacementCertificateVersion: "certificate-v1",
      replacementEvidenceHash: "sha256:replacement-evidence",
      revocationOwner: "Release Certification",
      revocationReason: "Certificate v0 was superseded by certificate v1.",
      supersededCertificateVersion: "certificate-v0",
    },
  ],
  workspaceId,
});

assert.equal(resolved.summary.status, "resolved");
assert.equal(resolved.summary.rowCount, 1);
assert.equal(resolved.summary.resolvedCount, 1);
assert.equal(resolved.summary.queuedCount, 0);
assert.equal(resolved.summary.openCount, 0);
assert.equal(resolved.summary.supersededCount, 1);
assert.equal(resolved.summary.customerNotificationRouteCount, 1);
assert.equal(resolved.summary.replacementEvidenceCount, 1);
assert.equal(resolved.summary.revocationScore, 100);
assert.equal(resolved.summary.currentCertificateVersion, "certificate-v1");
assert.ok(resolved.summary.revocationHash.startsWith("sha256:"));
assert.equal(resolved.rows[0]?.ownerApprovalReady, true);
assert.equal(resolved.rows[0]?.customerNotificationReady, true);
assert.equal(resolved.rows[0]?.replacementEvidenceReady, true);
assert.match(
  resolved.csvContent,
  /^revocation_id,superseded_certificate_version,status,revocation_owner,owner_approval_ready,customer_notification_route,replacement_evidence_ready,revocation_hash,next_action/,
);
assert.match(resolved.jsonContent, /"supersededCertificateVersion": "certificate-v0"/);
assert.equal(
  resolved.csvFileName,
  "essence-runtime-release-attestation-revocation-workflow-native-2-0-0-attestation-20260524.csv",
);
assert.equal(
  resolved.jsonFileName,
  "essence-runtime-release-attestation-revocation-workflow-native-2-0-0-attestation-20260524.json",
);
assert.equal(resolved.files.length, 2);

const queued = createReleaseAttestationRevocationWorkflow({
  attestationHistoryLedger,
  distributionPacket,
  releaseCandidateId,
  replayVerifier,
  revocations: [
    {
      customerNotificationRoute: "customer-success-secure-link",
      ownerApprovalHash: "sha256:owner-approval",
      replacementCertificateVersion: "certificate-v1",
      replacementEvidenceHash: "sha256:replacement-evidence",
      revocationOwner: "Release Certification",
      supersededCertificateVersion: "certificate-v0",
    },
  ],
  workspaceId,
});

assert.equal(queued.summary.status, "queued");
assert.equal(queued.summary.queuedCount, 1);
assert.equal(queued.rows[0]?.customerNotificationReady, false);
assert.match(queued.summary.nextAction, /Notify customer-success-secure-link/);

const open = createReleaseAttestationRevocationWorkflow({
  attestationHistoryLedger,
  distributionPacket: {
    ...distributionPacket,
    summary: {
      ...distributionPacket.summary,
      status: "blocked",
    },
  },
  releaseCandidateId,
  replayVerifier: {
    ...replayVerifier,
    summary: {
      ...replayVerifier.summary,
      status: "drift",
    },
  },
  revocations: [
    {
      customerNotificationRoute: "",
      ownerApprovalHash: "",
      replacementCertificateVersion: "",
      replacementEvidenceHash: "",
      revocationOwner: "",
      supersededCertificateVersion: "certificate-v1",
    },
  ],
  workspaceId,
});

assert.equal(open.summary.status, "open");
assert.equal(open.summary.openCount, 1);
assert.equal(open.rows[0]?.ownerApprovalReady, false);
assert.equal(open.rows[0]?.replacementEvidenceReady, false);
assert.equal(open.rows[0]?.replayReady, false);
assert.equal(open.rows[0]?.distributionReady, false);
assert.match(open.summary.nextAction, /Approve revocation owner/);

console.log("release attestation revocation workflow smoke passed");
