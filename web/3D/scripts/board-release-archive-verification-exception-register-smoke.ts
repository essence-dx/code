import assert from "node:assert/strict";
import type { BoardReleaseArchiveCertificationExecutiveAttestationDigestReport } from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import type { BoardReleaseArchiveVerificationSignatureChainValidatorReport } from "@/features/projects/board-release-archive-verification-signature-chain-validator";
import { createBoardReleaseArchiveVerificationExceptionRegister } from "@/features/projects/board-release-archive-verification-exception-register";

const generatedAt = "2026-05-29T10:00:00.000Z";

const signatureChainValidator = {
  rows: [
    {
      actualHash: "sha256:actual-auditor",
      expectedHash: "sha256:expected-auditor",
      kind: "auditor-packet",
      linkHash: "sha256:link-auditor",
      nextAction: "Reconcile external auditor packet hash drift.",
      source: "external auditor packet",
      status: "mismatch",
      title: "Auditor packet link",
    },
    {
      actualHash: null,
      expectedHash: "sha256:revocation",
      kind: "revocation-state",
      linkHash: "sha256:link-revocation",
      nextAction: "Attach revocation workflow hash evidence.",
      source: "revocation workflow",
      status: "missing",
      title: "Revocation state link",
    },
  ],
  summary: {
    chainHash: "sha256:chain",
    chainScore: 25,
    missingCount: 1,
    mismatchCount: 1,
    nextAction: "Reconcile external auditor packet hash drift.",
    rowCount: 2,
    status: "missing",
    validCount: 0,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationSignatureChainValidatorReport;

const attestationDigest = {
  rows: [
    {
      attestationHash: "sha256:attestation-auditor",
      evidenceHash: "sha256:expected-auditor",
      kind: "auditor-packet",
      nextAction: "Resolve auditor packet drift before sign-off.",
      score: 62,
      status: "blocked",
      title: "External auditor packet",
    },
    {
      attestationHash: "sha256:attestation-history",
      evidenceHash: "sha256:ledger",
      kind: "certificate-history",
      nextAction: "Keep certificate history ready.",
      score: 96,
      status: "attested",
      title: "Certificate history ledger",
    },
  ],
  summary: {
    attestationHash: "sha256:attestation",
    attestationScore: 58,
    attestedCount: 1,
    blockedCount: 1,
    nextAction: "Resolve auditor packet drift before sign-off.",
    rowCount: 2,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationExecutiveAttestationDigestReport;

const report = createBoardReleaseArchiveVerificationExceptionRegister({
  attestationDigest,
  boardApprovals: [
    {
      approvedAt: "2026-05-29T11:00:00.000Z",
      approver: "Board chair",
      evidenceHash: "sha256:approval-auditor",
      scope: "auditor-packet",
    },
  ],
  generatedAt,
  signatureChainValidator,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "open");
assert.equal(report.summary.rowCount, 2);
assert.equal(report.summary.openCount, 2);
assert.equal(report.summary.approvedCount, 1);
assert.equal(report.summary.expiredCount, 0);
assert.equal(report.summary.registerScore, 35);
assert.equal(report.rows[0]?.kind, "revocation-state");
assert.equal(report.rows[0]?.approvalStatus, "missing");
assert.equal(report.rows[1]?.kind, "auditor-packet");
assert.equal(report.rows[1]?.approvalStatus, "approved");
assert.equal(report.csvFileName, "workspace-board-board-release-archive-verification-exception-register-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-verification-exception-register-20260529.json");
assert.match(report.csvContent, /exception_id,kind,title,status,owner,expires_at,approval_status/);
assert.match(report.jsonContent, /"registerScore": 35/);

const cleanReport = createBoardReleaseArchiveVerificationExceptionRegister({
  attestationDigest: {
    ...attestationDigest,
    rows: attestationDigest.rows.map((row) => ({
      ...row,
      status: "attested",
    })),
    summary: {
      ...attestationDigest.summary,
      blockedCount: 0,
      status: "attested",
    },
  } as BoardReleaseArchiveCertificationExecutiveAttestationDigestReport,
  generatedAt,
  signatureChainValidator: {
    ...signatureChainValidator,
    rows: [],
    summary: {
      ...signatureChainValidator.summary,
      missingCount: 0,
      mismatchCount: 0,
      status: "valid",
      validCount: 2,
    },
  } as BoardReleaseArchiveVerificationSignatureChainValidatorReport,
  workspaceId: "workspace-board",
});

assert.equal(cleanReport.summary.status, "cleared");
assert.equal(cleanReport.summary.rowCount, 1);
assert.equal(cleanReport.rows[0]?.kind, "attestation-root");
assert.equal(cleanReport.rows[0]?.status, "cleared");

console.log("board release archive verification exception register smoke passed");
