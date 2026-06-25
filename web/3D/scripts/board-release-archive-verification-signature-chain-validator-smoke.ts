import assert from "node:assert/strict";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import { createBoardReleaseArchiveCertificationExecutiveAttestationDigest } from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";
import { createBoardReleaseArchiveVerificationSignatureChainValidator } from "@/features/projects/board-release-archive-verification-signature-chain-validator";

const generatedAt = "2026-05-29T10:00:00.000Z";

const historyLedger = {
  summary: {
    currentVersion: "v3-final-closeout",
    ledgerHash: "sha256:ledger",
    ledgerScore: 98,
    nextAction: "Keep active certificate history ready for executive attestation.",
    revocationHoldCount: 0,
    rowCount: 3,
    status: "current",
    supersededCount: 2,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationHistoryLedgerReport;

const replayVerifier = {
  summary: {
    driftCount: 0,
    matchedCount: 5,
    missingCount: 0,
    nextAction: "Archive certification replay verifier is clean.",
    replayHash: "sha256:replay",
    replayScore: 100,
    rowCount: 5,
    status: "matched",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;

const auditorPacket = {
  summary: {
    blockedCount: 0,
    externalPacketHash: "sha256:auditor",
    packetCount: 3,
    packetScore: 95,
    readyCount: 3,
    nextAction: "External auditor packet is ready.",
    redactionCount: 5,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationExternalAuditorPacketReport;

const revocationWorkflow = {
  summary: {
    nextAction: "Archive certification revocation workflow is clear.",
    openCount: 0,
    queuedCount: 0,
    resolvedCount: 3,
    revocationHash: "sha256:revocation",
    revocationScore: 100,
    rowCount: 3,
    status: "resolved",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationRevocationWorkflowReport;

const attestationDigest = createBoardReleaseArchiveCertificationExecutiveAttestationDigest({
  auditorPacket,
  generatedAt,
  historyLedger,
  replayVerifier,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

const report = createBoardReleaseArchiveVerificationSignatureChainValidator({
  auditorPacket,
  attestationDigest,
  generatedAt,
  historyLedger,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "valid");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.validCount, 4);
assert.equal(report.summary.mismatchCount, 0);
assert.equal(report.summary.missingCount, 0);
assert.equal(report.summary.chainScore, 100);
assert.equal(report.rows[0]?.kind, "attestation-root");
assert.equal(report.summary.chainHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-verification-signature-chain-validator-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-verification-signature-chain-validator-20260529.json");
assert.match(report.csvContent, /chain_id,kind,title,status,source,expected_hash,actual_hash/);
assert.match(report.jsonContent, /"chainScore": 100/);

const mismatchReport = createBoardReleaseArchiveVerificationSignatureChainValidator({
  auditorPacket: {
    ...auditorPacket,
    summary: {
      ...auditorPacket.summary,
      externalPacketHash: "sha256:auditor-drift",
    },
  } as BoardReleaseArchiveCertificationExternalAuditorPacketReport,
  attestationDigest,
  generatedAt,
  historyLedger,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(mismatchReport.summary.status, "mismatch");
assert.equal(mismatchReport.summary.validCount, 3);
assert.equal(mismatchReport.summary.mismatchCount, 1);
assert.equal(mismatchReport.rows[0]?.kind, "auditor-packet");

console.log("board release archive verification signature chain validator smoke passed");
