import { strict as assert } from "node:assert";

import type { ReleaseCertificationPacket } from "@/features/projects/release-certification-packet";
import type { ReleaseCertificationRenewalMonitor } from "@/features/projects/release-certification-renewal-monitor";
import { createReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";

const generatedAt = "2026-05-24T09:00:00.000Z";
const releaseCandidateId = "native-2.0.0-attestation";
const workspaceId = "Essence Runtime";

const certificationPacket = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    blockerRouteCount: 0,
    certificationScore: 100,
    goNoGoDecision: "go",
    nextAction: "Release certification packet is ready.",
    operatorReady: true,
    packetHash: "sha256:certification-packet",
    readyCount: 4,
    reviewCount: 0,
    rowCount: 4,
    status: "ready",
  },
  workspaceId,
} as unknown as ReleaseCertificationPacket;

const renewalMonitor = {
  generatedAt,
  releaseCandidateId,
  rows: [],
  summary: {
    blockedCount: 0,
    expiredCount: 0,
    monitorHash: "sha256:renewal-monitor",
    nextAction: "Release certification renewal monitor is ready.",
    readyCount: 3,
    releaseCertificationBlocked: false,
    renewalScore: 100,
    rowCount: 3,
    status: "ready",
    watchCount: 0,
  },
  workspaceId,
} as unknown as ReleaseCertificationRenewalMonitor;

const ledger = createReleaseAttestationHistoryLedger({
  attestations: [
    {
      attestationHash: "sha256:attestation-v1",
      attestationOwner: "Release Certification",
      certificateVersion: "certificate-v1",
      issuedAt: "2026-05-24T08:30:00.000Z",
      lineageHash: "sha256:certificate-lineage-v1",
      parentCertificateVersion: "",
      status: "current",
    },
  ],
  certificationPacket,
  generatedAt,
  releaseCandidateId,
  renewalMonitor,
  workspaceId,
});

assert.equal(ledger.summary.status, "current");
assert.equal(ledger.summary.ledgerScore, 100);
assert.equal(ledger.summary.currentCount, 1);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.historicalCount, 0);
assert.equal(ledger.summary.currentCertificateVersion, "certificate-v1");
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.certificateVersion),
  ["certificate-v1"],
);
assert.equal(ledger.rows[0]?.certificationPacketHash, "sha256:certification-packet");
assert.equal(ledger.rows[0]?.renewalMonitorHash, "sha256:renewal-monitor");
assert.equal(ledger.rows[0]?.attestationOwnerReady, true);
assert.equal(ledger.rows[0]?.certificateLineageReady, true);
assert.match(
  ledger.csvContent,
  /^certificate_version,status,attestation_owner,certification_packet_ready,renewal_monitor_ready,certificate_lineage_ready,ledger_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("Release Certification"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-release-attestation-history-ledger-native-2-0-0-attestation-20260524.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-release-attestation-history-ledger-native-2-0-0-attestation-20260524.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createReleaseAttestationHistoryLedger({
  attestations: [
    {
      attestationHash: "",
      attestationOwner: "",
      certificateVersion: "",
      issuedAt: "",
      lineageHash: "",
      parentCertificateVersion: "",
      status: "current",
    },
  ],
  certificationPacket: {
    ...certificationPacket,
    summary: {
      ...certificationPacket.summary,
      goNoGoDecision: "no-go",
      packetHash: "",
      status: "blocked",
    },
  },
  releaseCandidateId,
  renewalMonitor: {
    ...renewalMonitor,
    summary: {
      ...renewalMonitor.summary,
      monitorHash: "",
      releaseCertificationBlocked: true,
      status: "blocked",
    },
  },
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.ledgerScore < 50);
assert.equal(blocked.summary.blockedCount, 1);
assert.equal(blocked.summary.currentCount, 0);
assert.equal(blocked.rows[0]?.attestationOwnerReady, false);
assert.equal(blocked.rows[0]?.certificationPacketReady, false);
assert.equal(blocked.rows[0]?.renewalMonitorReady, false);
assert.equal(blocked.rows[0]?.certificateLineageReady, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release attestation history ledger/,
);

console.log("release attestation history ledger smoke passed");
