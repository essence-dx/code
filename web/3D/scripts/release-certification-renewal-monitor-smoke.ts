import { strict as assert } from "node:assert";

import { createReleaseCertificationRenewalMonitor } from "@/features/projects/release-certification-renewal-monitor";

const generatedAt = "2026-05-23T12:00:00.000Z";
const releaseCandidateId = "native-1.9.0-certification";
const workspaceId = "Essence Runtime";

const monitor = createReleaseCertificationRenewalMonitor({
  generatedAt,
  releaseCandidateId,
  renewals: [
    {
      evidenceHash: "sha256:certificate-signing-renewal",
      evidenceUrl:
        "https://release.essence-spline.com/native/1.9.0/certification/signing-renewal.json",
      kind: "certificate-signing-evidence",
      lastRenewedAt: "2026-05-23T10:00:00.000Z",
      owner: "Signing Infrastructure",
      renewBy: "2026-07-01T10:00:00.000Z",
      renewalProofHash: "sha256:certificate-signing-proof",
    },
    {
      evidenceHash: "sha256:archive-retention-renewal",
      evidenceUrl:
        "https://release.essence-spline.com/native/1.9.0/certification/archive-renewal.json",
      kind: "archive-retention-renewal",
      lastRenewedAt: "2026-05-23T10:10:00.000Z",
      owner: "Release Archive",
      renewBy: "2026-08-23T10:10:00.000Z",
      renewalProofHash: "sha256:archive-retention-proof",
    },
    {
      evidenceHash: "sha256:cad-runtime-proof-renewal",
      evidenceUrl:
        "https://release.essence-spline.com/native/1.9.0/certification/cad-runtime-proof.json",
      kind: "cad-runtime-proof-renewal",
      lastRenewedAt: "2026-05-23T10:20:00.000Z",
      owner: "CAD Runtime",
      renewBy: "2026-06-23T10:20:00.000Z",
      renewalProofHash: "sha256:cad-runtime-proof",
    },
  ],
  workspaceId,
});

assert.equal(monitor.summary.status, "ready");
assert.equal(monitor.summary.renewalScore, 100);
assert.equal(monitor.summary.releaseCertificationBlocked, false);
assert.equal(monitor.summary.readyCount, 3);
assert.equal(monitor.summary.blockedCount, 0);
assert.equal(monitor.summary.watchCount, 0);
assert.equal(monitor.summary.expiredCount, 0);
assert.ok(monitor.summary.monitorHash.startsWith("sha256:"));
assert.deepEqual(
  monitor.rows.map((row) => row.kind),
  [
    "certificate-signing-evidence",
    "archive-retention-renewal",
    "cad-runtime-proof-renewal",
  ],
);
assert.ok(monitor.rows.every((row) => row.evidenceLinked));
assert.ok(monitor.rows.every((row) => row.renewalProofReady));
assert.ok(monitor.rows.every((row) => row.ownerReady));
assert.match(
  monitor.csvContent,
  /^kind,status,owner,days_until_renewal,evidence_linked,renewal_proof_ready,owner_ready,monitor_hash,next_action/,
);
assert.ok(monitor.jsonContent.includes("cad-runtime-proof-renewal"));
assert.equal(
  monitor.csvFileName,
  "essence-runtime-release-certification-renewal-monitor-native-1-9-0-certification-20260523.csv",
);
assert.equal(
  monitor.jsonFileName,
  "essence-runtime-release-certification-renewal-monitor-native-1-9-0-certification-20260523.json",
);
assert.equal(monitor.files.length, 2);

const blocked = createReleaseCertificationRenewalMonitor({
  generatedAt,
  releaseCandidateId,
  renewals: [
    {
      evidenceHash: "",
      evidenceUrl: "",
      kind: "certificate-signing-evidence",
      lastRenewedAt: "2026-04-01T10:00:00.000Z",
      owner: "",
      renewBy: "2026-05-01T10:00:00.000Z",
      renewalProofHash: "",
    },
  ],
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.renewalScore < 50);
assert.equal(blocked.summary.releaseCertificationBlocked, true);
assert.equal(blocked.summary.blockedCount, 3);
assert.equal(blocked.summary.expiredCount, 1);
assert.equal(
  blocked.rows.find((row) => row.kind === "certificate-signing-evidence")
    ?.ownerReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.kind === "certificate-signing-evidence")
    ?.renewalProofReady,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.kind === "cad-runtime-proof-renewal")
    ?.evidenceLinked,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release certification renewals/,
);

console.log("release certification renewal monitor smoke passed");
