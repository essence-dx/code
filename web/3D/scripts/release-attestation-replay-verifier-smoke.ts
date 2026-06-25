import { strict as assert } from "node:assert";

import type { ReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";
import type { ReleaseCertificationExceptionLedger } from "@/features/projects/release-certification-exception-ledger";
import type { ReleaseCertificationPacket } from "@/features/projects/release-certification-packet";
import type { ReleaseCertificationRenewalMonitor } from "@/features/projects/release-certification-renewal-monitor";
import { createReleaseAttestationReplayVerifier } from "@/features/projects/release-attestation-replay-verifier";

const generatedAt = "2026-05-24T10:00:00.000Z";
const releaseCandidateId = "native-2.0.0-attestation";
const workspaceId = "Essence Runtime";

const certificationPacket = {
  generatedAt,
  releaseCandidateId,
  rows: [
    {
      area: "exception-posture",
      evidenceHash: "sha256:exception-ledger",
      status: "ready",
    },
  ],
  summary: {
    certificationScore: 100,
    goNoGoDecision: "go",
    packetHash: "sha256:certification-packet",
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationPacket;

const renewalMonitor = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    monitorHash: "sha256:renewal-monitor",
    releaseCertificationBlocked: false,
    renewalScore: 100,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationRenewalMonitor;

const exceptionLedger = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    certificationBlocked: false,
    ledgerHash: "sha256:exception-ledger",
    ledgerScore: 100,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationExceptionLedger;

const attestationHistoryLedger = {
  generatedAt,
  releaseCandidateId,
  rows: [
    {
      certificateVersion: "certificate-v1",
      certificationPacketHash: "sha256:certification-packet",
      renewalMonitorHash: "sha256:renewal-monitor",
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

const replay = createReleaseAttestationReplayVerifier({
  attestationHistoryLedger,
  certificationPacket,
  exceptionLedger,
  generatedAt,
  releaseCandidateId,
  renewalMonitor,
  workspaceId,
});

assert.equal(replay.summary.status, "matched");
assert.equal(replay.summary.rowCount, 3);
assert.equal(replay.summary.matchedCount, 3);
assert.equal(replay.summary.driftCount, 0);
assert.equal(replay.summary.missingCount, 0);
assert.equal(replay.summary.replayScore, 100);
assert.ok(replay.summary.replayHash.startsWith("sha256:"));
assert.deepEqual(
  replay.rows.map((row) => row.kind),
  ["certification-packet", "renewal-monitor", "exception-ledger"],
);
assert.equal(
  replay.rows.find((row) => row.kind === "certification-packet")?.expectedHash,
  "sha256:certification-packet",
);
assert.match(
  replay.csvContent,
  /^replay_id,kind,status,source_status,actual_hash,expected_hash,replay_hash,next_action/,
);
assert.match(replay.jsonContent, /"currentCertificateVersion": "certificate-v1"/);
assert.equal(
  replay.csvFileName,
  "essence-runtime-release-attestation-replay-verifier-native-2-0-0-attestation-20260524.csv",
);
assert.equal(
  replay.jsonFileName,
  "essence-runtime-release-attestation-replay-verifier-native-2-0-0-attestation-20260524.json",
);
assert.equal(replay.files.length, 2);

const packetDrift = createReleaseAttestationReplayVerifier({
  attestationHistoryLedger,
  certificationPacket: {
    ...certificationPacket,
    summary: {
      ...certificationPacket.summary,
      packetHash: "sha256:changed-certification-packet",
    },
  },
  exceptionLedger,
  releaseCandidateId,
  renewalMonitor,
  workspaceId,
});

assert.equal(packetDrift.summary.status, "drift");
assert.equal(packetDrift.summary.driftCount, 1);
assert.equal(
  packetDrift.rows.find((row) => row.kind === "certification-packet")?.status,
  "drift",
);
assert.match(packetDrift.summary.nextAction, /Review certification-packet replay drift/);

const exceptionDrift = createReleaseAttestationReplayVerifier({
  attestationHistoryLedger,
  certificationPacket,
  exceptionLedger: {
    ...exceptionLedger,
    summary: {
      ...exceptionLedger.summary,
      ledgerHash: "sha256:changed-exception-ledger",
    },
  },
  releaseCandidateId,
  renewalMonitor,
  workspaceId,
});

assert.equal(exceptionDrift.summary.status, "drift");
assert.equal(exceptionDrift.summary.driftCount, 1);
assert.equal(
  exceptionDrift.rows.find((row) => row.kind === "exception-ledger")?.status,
  "drift",
);

console.log("release attestation replay verifier smoke passed");
