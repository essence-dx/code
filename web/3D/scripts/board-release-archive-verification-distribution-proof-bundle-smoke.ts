import assert from "node:assert/strict";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";
import { createBoardReleaseArchiveVerificationDistributionProofBundle } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import type { BoardReleaseArchiveVerificationSignatureChainValidatorReport } from "@/features/projects/board-release-archive-verification-signature-chain-validator";

const generatedAt = "2026-05-29T10:00:00.000Z";

const exceptionRegister = {
  rows: [
    {
      approvalEvidenceHash: "sha256:approval-auditor",
      approvalStatus: "approved",
      approver: "Board chair",
      exceptionHash: "sha256:exception-auditor",
      expiresAt: "2026-06-12T10:00:00.000Z",
      kind: "auditor-packet",
      nextAction: "Track auditor packet under board-approved exception.",
      owner: "external audit owner",
      sourceHash: "sha256:source-auditor",
      sourceStatus: "mismatch",
      status: "open",
      title: "Auditor packet link",
    },
    {
      approvalEvidenceHash: null,
      approvalStatus: "missing",
      approver: null,
      exceptionHash: "sha256:exception-revocation",
      expiresAt: "2026-05-28T10:00:00.000Z",
      kind: "revocation-state",
      nextAction: "Attach board approval evidence for revocation state link.",
      owner: "archive certification owner",
      sourceHash: "sha256:source-revocation",
      sourceStatus: "missing",
      status: "open",
      title: "Revocation state link",
    },
  ],
  summary: {
    approvedCount: 1,
    clearedCount: 0,
    expiredCount: 0,
    missingApprovalCount: 1,
    nextAction: "Attach board approval evidence for revocation state link.",
    openCount: 2,
    registerHash: "sha256:register",
    registerScore: 35,
    rowCount: 2,
    status: "open",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationExceptionRegisterReport;

const signatureChainValidator = {
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

const report = createBoardReleaseArchiveVerificationDistributionProofBundle({
  exceptionRegister,
  generatedAt,
  recipients: [
    {
      acknowledgedAt: "2026-05-29T12:00:00.000Z",
      accessExpiresAt: "2026-06-05T10:00:00.000Z",
      accessTokenHash: "sha256:token-board",
      channel: "board-portal",
      recipient: "Board chair",
      role: "approver",
      signedAccessHash: "sha256:signed-board-chair",
    },
    {
      acknowledgedAt: null,
      accessExpiresAt: "2026-05-28T10:00:00.000Z",
      accessTokenHash: "sha256:token-audit",
      channel: "secure-email",
      recipient: "External auditor",
      role: "auditor",
      signedAccessHash: "sha256:signed-external-auditor",
    },
  ],
  signatureChainValidator,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 2);
assert.equal(report.summary.acknowledgedCount, 1);
assert.equal(report.summary.pendingCount, 0);
assert.equal(report.summary.expiredCount, 1);
assert.equal(report.summary.proofScore, 25);
assert.equal(report.rows[0]?.status, "expired");
assert.equal(report.rows[0]?.expiredLinkEvidenceHash?.startsWith("sha256:"), true);
assert.equal(report.rows[1]?.status, "acknowledged");
assert.equal(report.summary.bundleHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-verification-distribution-proof-bundle-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-verification-distribution-proof-bundle-20260529.json");
assert.match(report.csvContent, /proof_id,recipient,role,channel,status,signed_access_hash/);
assert.match(report.jsonContent, /"proofScore": 25/);

const cleanReport = createBoardReleaseArchiveVerificationDistributionProofBundle({
  exceptionRegister: {
    ...exceptionRegister,
    rows: [],
    summary: {
      ...exceptionRegister.summary,
      openCount: 0,
      status: "cleared",
    },
  } as BoardReleaseArchiveVerificationExceptionRegisterReport,
  generatedAt,
  signatureChainValidator: {
    ...signatureChainValidator,
    summary: {
      ...signatureChainValidator.summary,
      chainScore: 100,
      status: "valid",
    },
  } as BoardReleaseArchiveVerificationSignatureChainValidatorReport,
  workspaceId: "workspace-board",
});

assert.equal(cleanReport.summary.status, "ready");
assert.equal(cleanReport.summary.rowCount, 1);
assert.equal(cleanReport.rows[0]?.status, "acknowledged");

console.log("board release archive verification distribution proof bundle smoke passed");
