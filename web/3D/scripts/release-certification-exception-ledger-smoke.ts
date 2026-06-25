import { strict as assert } from "node:assert";

import { createReleaseCertificationExceptionLedger } from "@/features/projects/release-certification-exception-ledger";

const generatedAt = "2026-05-23T10:00:00.000Z";
const releaseCandidateId = "native-1.9.0-certification";
const workspaceId = "Essence Runtime";

const ledger = createReleaseCertificationExceptionLedger({
  entries: [
    {
      approvalEvidenceHash: "sha256:approval-certificate-renewal",
      approvedAt: "2026-05-23T09:00:00.000Z",
      approver: "Release Director",
      deviationId: "cert-exception-001",
      expiresAt: "2026-06-23T09:00:00.000Z",
      owner: "Signing Infrastructure",
      releaseBlocking: false,
      remediationRoute: "release-certification-renewal-monitor",
      signoffHash: "sha256:signoff-certificate-renewal",
      title: "Certificate renewal evidence accepted with monitoring",
    },
    {
      approvalEvidenceHash: "sha256:approval-cad-proof",
      approvedAt: "2026-05-23T09:30:00.000Z",
      approver: "CAD Runtime Owner",
      deviationId: "cert-exception-002",
      expiresAt: "2026-06-10T09:30:00.000Z",
      owner: "CAD Runtime",
      releaseBlocking: false,
      remediationRoute: "cad-runtime-proof-renewal",
      signoffHash: "sha256:signoff-cad-proof",
      title: "CAD runtime proof renewal accepted for certification",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.ledgerScore, 100);
assert.equal(ledger.summary.certificationBlocked, false);
assert.equal(ledger.summary.approvedCount, 2);
assert.equal(ledger.summary.blockingCount, 0);
assert.equal(ledger.summary.expiredCount, 0);
assert.equal(ledger.summary.missingSignoffCount, 0);
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.deviationId),
  ["cert-exception-001", "cert-exception-002"],
);
assert.ok(ledger.rows.every((row) => row.approvalReady));
assert.ok(ledger.rows.every((row) => row.signoffReady));
assert.ok(ledger.rows.every((row) => row.remediationReady));
assert.ok(ledger.rows.every((row) => row.expiryReady));
assert.match(
  ledger.csvContent,
  /^deviation_id,status,title,owner,approver,approval_ready,signoff_ready,expiry_ready,remediation_ready,release_blocking,ledger_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("cad-runtime-proof-renewal"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-release-certification-exception-ledger-native-1-9-0-certification-20260523.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-release-certification-exception-ledger-native-1-9-0-certification-20260523.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createReleaseCertificationExceptionLedger({
  entries: [
    {
      approvalEvidenceHash: "",
      approvedAt: "",
      approver: "",
      deviationId: "cert-exception-003",
      expiresAt: "2026-04-23T09:00:00.000Z",
      owner: "",
      releaseBlocking: true,
      remediationRoute: "",
      signoffHash: "",
      title: "Unsigned native package exception",
    },
  ],
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.certificationBlocked, true);
assert.ok(blocked.summary.ledgerScore < 60);
assert.equal(blocked.summary.blockingCount, 1);
assert.equal(blocked.summary.expiredCount, 1);
assert.equal(blocked.summary.missingApprovalCount, 1);
assert.equal(blocked.summary.missingSignoffCount, 1);
assert.equal(blocked.summary.missingRemediationCount, 1);
assert.equal(blocked.rows[0]?.approvalReady, false);
assert.equal(blocked.rows[0]?.releaseBlocking, true);
assert.equal(blocked.rows[0]?.remediationReady, false);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked release certification exceptions/,
);

console.log("release certification exception ledger smoke passed");
