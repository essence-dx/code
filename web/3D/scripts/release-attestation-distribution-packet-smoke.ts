import { strict as assert } from "node:assert";

import type { ReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";
import { createReleaseAttestationDistributionPacket } from "@/features/projects/release-attestation-distribution-packet";
import type { ReleaseAttestationReplayVerifier } from "@/features/projects/release-attestation-replay-verifier";

const generatedAt = "2026-05-24T11:00:00.000Z";
const releaseCandidateId = "native-2.0.0-attestation";
const workspaceId = "Essence Runtime";

const attestationHistoryLedger = {
  generatedAt,
  releaseCandidateId,
  rows: [
    {
      certificateVersion: "certificate-v1",
      ledgerHash: "sha256:certificate-v1-row",
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
    matchedCount: 3,
    missingCount: 0,
    replayHash: "sha256:attestation-replay",
    replayScore: 100,
    rowCount: 3,
    status: "matched",
  },
  workspaceId,
} as unknown as ReleaseAttestationReplayVerifier;

const packet = createReleaseAttestationDistributionPacket({
  attestationHistoryLedger,
  generatedAt,
  recipients: [
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 24,
      audience: "release-owner",
      recipient: "release@example.com",
    },
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 48,
      audience: "customer-success",
      recipient: "success@example.com",
    },
    {
      acknowledgementRequired: false,
      acknowledgementWindowHours: 72,
      audience: "external-auditor",
      recipient: "auditor@example.com",
    },
  ],
  releaseCandidateId,
  replayVerifier,
  workspaceId,
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.recipientCount, 3);
assert.equal(packet.summary.readyCount, 3);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.pendingAcknowledgementCount, 2);
assert.equal(packet.summary.distributionScore, 100);
assert.equal(packet.summary.currentCertificateVersion, "certificate-v1");
assert.ok(packet.summary.distributionHash.startsWith("sha256:"));
assert.deepEqual(
  packet.rows.map((row) => row.audience),
  ["release-owner", "customer-success", "external-auditor"],
);
assert.equal(packet.rows[0]?.route, "internal-release-workspace");
assert.equal(packet.rows[1]?.route, "customer-success-secure-link");
assert.equal(packet.rows[2]?.route, "auditor-data-room");
assert.equal(packet.rows[0]?.acknowledgementDeadline, "2026-05-25T11:00:00.000Z");
assert.equal(packet.rows[2]?.acknowledgementDeadline, "");
assert.match(
  packet.csvContent,
  /^distribution_id,audience,status,recipient,route,acknowledgement_required,acknowledgement_deadline,history_ledger_hash,replay_hash,distribution_hash,next_action/,
);
assert.match(packet.jsonContent, /"currentCertificateVersion": "certificate-v1"/);
assert.equal(
  packet.csvFileName,
  "essence-runtime-release-attestation-distribution-packet-native-2-0-0-attestation-20260524.csv",
);
assert.equal(
  packet.jsonFileName,
  "essence-runtime-release-attestation-distribution-packet-native-2-0-0-attestation-20260524.json",
);
assert.equal(packet.files.length, 2);

const blocked = createReleaseAttestationDistributionPacket({
  attestationHistoryLedger,
  recipients: [
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 24,
      audience: "release-owner",
      recipient: "",
    },
  ],
  releaseCandidateId,
  replayVerifier: {
    ...replayVerifier,
    summary: {
      ...replayVerifier.summary,
      driftCount: 1,
      replayHash: "sha256:drifted-attestation-replay",
      status: "drift",
    },
  },
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.blockedCount, 1);
assert.equal(blocked.rows[0]?.replayReady, false);
assert.equal(blocked.rows[0]?.recipientReady, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release attestation distribution/,
);

console.log("release attestation distribution packet smoke passed");
