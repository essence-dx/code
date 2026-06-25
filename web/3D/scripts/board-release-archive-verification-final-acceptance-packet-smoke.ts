import assert from "node:assert/strict";
import type { BoardReleaseArchiveVerificationDistributionProofBundleReport } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";
import { createBoardReleaseArchiveVerificationFinalAcceptancePacket } from "@/features/projects/board-release-archive-verification-final-acceptance-packet";
import type { BoardReleaseArchiveVerificationReadinessTimelineReport } from "@/features/projects/board-release-archive-verification-readiness-timeline";
import type { BoardReleaseArchiveVerificationSignatureChainValidatorReport } from "@/features/projects/board-release-archive-verification-signature-chain-validator";

const generatedAt = "2026-05-29T10:00:00.000Z";

const signatureChainValidator = {
  summary: {
    chainHash: "sha256:chain",
    chainScore: 100,
    mismatchCount: 0,
    missingCount: 0,
    nextAction: "Archive verification signature chain is valid.",
    rowCount: 4,
    status: "valid",
    validCount: 4,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationSignatureChainValidatorReport;

const exceptionRegister = {
  summary: {
    approvedCount: 0,
    missingApprovalCount: 0,
    nextAction: "Archive verification exception register is clear.",
    openCount: 0,
    registerHash: "sha256:register",
    registerScore: 100,
    rowCount: 1,
    status: "cleared",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationExceptionRegisterReport;

const distributionProofBundle = {
  summary: {
    acknowledgedCount: 3,
    bundleHash: "sha256:bundle",
    expiredCount: 0,
    nextAction: "Archive verification distribution proof bundle is ready.",
    pendingCount: 0,
    proofScore: 100,
    rowCount: 3,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationDistributionProofBundleReport;

const readinessTimeline = {
  summary: {
    blockedCount: 0,
    nextAction: "Archive verification readiness timeline is ready for board review.",
    readyCount: 6,
    rowCount: 6,
    status: "ready",
    timelineHash: "sha256:timeline",
    timelineScore: 100,
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as unknown as BoardReleaseArchiveVerificationReadinessTimelineReport;

const acceptedReport = createBoardReleaseArchiveVerificationFinalAcceptancePacket({
  distributionProofBundle,
  exceptionRegister,
  generatedAt,
  readinessTimeline,
  signatureChainValidator,
  workspaceId: "workspace-board",
});

assert.equal(acceptedReport.summary.status, "accepted");
assert.equal(acceptedReport.summary.rowCount, 5);
assert.equal(acceptedReport.summary.acceptedCount, 5);
assert.equal(acceptedReport.summary.blockedCount, 0);
assert.equal(acceptedReport.summary.watchCount, 0);
assert.equal(acceptedReport.summary.finalAcceptanceScore, 100);
assert.match(acceptedReport.executiveRecommendation, /^APPROVE archive verification acceptance/);
assert.equal(acceptedReport.rows.at(-1)?.kind, "executive-recommendation");
assert.equal(acceptedReport.summary.finalAcceptanceHash.startsWith("sha256:"), true);
assert.equal(acceptedReport.csvFileName, "workspace-board-board-release-archive-verification-final-acceptance-packet-20260529.csv");
assert.equal(acceptedReport.jsonFileName, "workspace-board-board-release-archive-verification-final-acceptance-packet-20260529.json");
assert.match(acceptedReport.csvContent, /acceptance_id,kind,title,status,score,evidence_hash/);
assert.match(acceptedReport.jsonContent, /"executiveRecommendation": "APPROVE archive verification acceptance/);

const blockedReport = createBoardReleaseArchiveVerificationFinalAcceptancePacket({
  distributionProofBundle: {
    ...distributionProofBundle,
    summary: {
      ...distributionProofBundle.summary,
      expiredCount: 1,
      proofScore: 25,
      status: "blocked",
    },
  } as BoardReleaseArchiveVerificationDistributionProofBundleReport,
  exceptionRegister: {
    ...exceptionRegister,
    summary: {
      ...exceptionRegister.summary,
      missingApprovalCount: 1,
      openCount: 1,
      registerScore: 35,
      status: "open",
    },
  } as BoardReleaseArchiveVerificationExceptionRegisterReport,
  generatedAt,
  readinessTimeline: {
    ...readinessTimeline,
    summary: {
      ...readinessTimeline.summary,
      blockedCount: 2,
      status: "blocked",
      timelineScore: 31,
    },
  } as BoardReleaseArchiveVerificationReadinessTimelineReport,
  signatureChainValidator,
  workspaceId: "workspace-board",
});

assert.equal(blockedReport.summary.status, "blocked");
assert.equal(blockedReport.summary.blockedCount, 4);
assert.equal(blockedReport.summary.acceptedCount, 1);
assert.match(blockedReport.executiveRecommendation, /^BLOCK archive verification acceptance/);
assert.equal(blockedReport.rows.find((entry) => entry.kind === "exception-register")?.status, "blocked");

console.log("board release archive verification final acceptance packet smoke passed");
