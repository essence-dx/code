import assert from "node:assert/strict";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";
import type { BoardReleaseArchiveVerificationDistributionProofBundleReport } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";
import { createBoardReleaseArchiveVerificationReadinessTimeline } from "@/features/projects/board-release-archive-verification-readiness-timeline";

const generatedAt = "2026-05-29T10:00:00.000Z";

const historyLedger = {
  summary: {
    ledgerHash: "sha256:ledger",
    ledgerScore: 92,
    nextAction: "Keep certificate history ready.",
    rowCount: 3,
    status: "current",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationHistoryLedgerReport;

const replayVerifier = {
  summary: {
    driftCount: 1,
    matchedCount: 4,
    missingCount: 0,
    nextAction: "Review replay drift before board acceptance.",
    replayHash: "sha256:replay",
    replayScore: 78,
    rowCount: 5,
    status: "drift",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;

const auditorPacket = {
  summary: {
    externalPacketHash: "sha256:auditor",
    nextAction: "External auditor packet is ready.",
    packetCount: 3,
    packetScore: 94,
    readyCount: 3,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationExternalAuditorPacketReport;

const revocationWorkflow = {
  summary: {
    nextAction: "Archive certification revocation workflow is clear.",
    openCount: 0,
    queuedCount: 0,
    resolvedCount: 2,
    revocationHash: "sha256:revocation",
    revocationScore: 100,
    rowCount: 2,
    status: "resolved",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveCertificationRevocationWorkflowReport;

const exceptionRegister = {
  summary: {
    approvedCount: 1,
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

const distributionProofBundle = {
  summary: {
    acknowledgedCount: 1,
    bundleHash: "sha256:bundle",
    expiredCount: 1,
    nextAction: "Issue a fresh signed access link for External auditor.",
    pendingCount: 0,
    proofScore: 25,
    rowCount: 2,
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationDistributionProofBundleReport;

const report = createBoardReleaseArchiveVerificationReadinessTimeline({
  auditorPacket,
  distributionProofBundle,
  exceptionRegister,
  generatedAt,
  historyLedger,
  replayVerifier,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 6);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.timelineScore, 31);
assert.equal(report.rows[0]?.kind, "certificate");
assert.equal(report.rows[1]?.kind, "replay");
assert.equal(report.rows[5]?.kind, "distribution");
assert.equal(report.summary.timelineHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-verification-readiness-timeline-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-verification-readiness-timeline-20260529.json");
assert.match(report.csvContent, /timeline_id,sequence,kind,title,status,score,evidence_hash/);
assert.match(report.jsonContent, /"timelineScore": 31/);

const readyReport = createBoardReleaseArchiveVerificationReadinessTimeline({
  auditorPacket,
  distributionProofBundle: {
    ...distributionProofBundle,
    summary: {
      ...distributionProofBundle.summary,
      expiredCount: 0,
      proofScore: 100,
      status: "ready",
    },
  } as BoardReleaseArchiveVerificationDistributionProofBundleReport,
  exceptionRegister: {
    ...exceptionRegister,
    summary: {
      ...exceptionRegister.summary,
      missingApprovalCount: 0,
      openCount: 0,
      registerScore: 100,
      status: "cleared",
    },
  } as BoardReleaseArchiveVerificationExceptionRegisterReport,
  generatedAt,
  historyLedger,
  replayVerifier: {
    ...replayVerifier,
    summary: {
      ...replayVerifier.summary,
      driftCount: 0,
      replayScore: 100,
      status: "matched",
    },
  } as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport,
  revocationWorkflow,
  workspaceId: "workspace-board",
});

assert.equal(readyReport.summary.status, "ready");
assert.equal(readyReport.summary.readyCount, 6);
assert.equal(readyReport.summary.nextAction, "Archive verification readiness timeline is ready for board review.");

console.log("board release archive verification readiness timeline smoke passed");
