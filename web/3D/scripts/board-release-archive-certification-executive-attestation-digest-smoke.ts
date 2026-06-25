import assert from "node:assert/strict";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import { createBoardReleaseArchiveCertificationExecutiveAttestationDigest } from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";

const generatedAt = "2026-05-29T10:00:00.000Z";

const historyLedger = {
  summary: {
    currentVersion: "v3-final-closeout",
    ledgerHash: "sha256:ledger",
    ledgerScore: 94,
    nextAction: "Keep active certificate history ready for executive attestation.",
    revocationHoldCount: 0,
    rowCount: 3,
    status: "current",
    supersededCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationHistoryLedgerReport;

const replayVerifier = {
  summary: {
    driftCount: 1,
    matchedCount: 4,
    missingCount: 0,
    nextAction: "Review one replay drift before executive attestation.",
    replayHash: "sha256:replay",
    replayScore: 82,
    rowCount: 5,
    status: "drift",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;

const auditorPacket = {
  summary: {
    blockedCount: 0,
    externalPacketHash: "sha256:auditor",
    packetCount: 3,
    packetScore: 91,
    readyCount: 3,
    nextAction: "External auditor packet is ready.",
    redactionCount: 5,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationExternalAuditorPacketReport;

const revocationWorkflow = {
  summary: {
    nextAction: "Queue revocation notice for replay drift and attach replacement evidence.",
    openCount: 0,
    queuedCount: 1,
    resolvedCount: 2,
    revocationHash: "sha256:revocation",
    revocationScore: 74,
    rowCount: 3,
    status: "queued",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationRevocationWorkflowReport;

const report = createBoardReleaseArchiveCertificationExecutiveAttestationDigest({
  auditorPacket,
  generatedAt,
  historyLedger,
  replayVerifier,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.attestedCount, 2);
assert.equal(report.summary.watchCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.attestationScore, 69);
assert.equal(report.rows[0]?.kind, "replay-verification");
assert.equal(report.rows[1]?.kind, "revocation-state");
assert.equal(report.summary.attestationHash.startsWith("sha256:"), true);
assert.equal(report.executiveMemo.startsWith("WATCH archive certification executive attestation"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-certification-executive-attestation-digest-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-certification-executive-attestation-digest-20260529.json");
assert.match(report.csvContent, /attestation_id,kind,title,status,score,metric,evidence_hash/);
assert.match(report.jsonContent, /"executiveMemo"/);

const cleanReport = createBoardReleaseArchiveCertificationExecutiveAttestationDigest({
  auditorPacket,
  generatedAt,
  historyLedger,
  replayVerifier: {
    ...replayVerifier,
    summary: {
      ...replayVerifier.summary,
      driftCount: 0,
      matchedCount: 5,
      nextAction: "Archive certification replay verifier is clean.",
      replayScore: 100,
      status: "matched",
    },
  } as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport,
  revocationWorkflow: {
    ...revocationWorkflow,
    summary: {
      ...revocationWorkflow.summary,
      nextAction: "Archive certification revocation workflow is clear.",
      queuedCount: 0,
      resolvedCount: 3,
      revocationScore: 100,
      status: "resolved",
    },
  } as BoardReleaseArchiveCertificationRevocationWorkflowReport,
  workspaceId: "workspace-board",
});

assert.equal(cleanReport.summary.status, "attested");
assert.equal(cleanReport.summary.attestedCount, 4);
assert.equal(cleanReport.summary.nextAction, "Executive archive certification attestation is ready to sign.");

console.log("board release archive certification executive attestation digest smoke passed");
