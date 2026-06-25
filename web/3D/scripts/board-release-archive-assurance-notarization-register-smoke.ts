import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceDecisionMemoReport } from "@/features/projects/board-release-archive-assurance-decision-memo";
import { createBoardReleaseArchiveAssuranceNotarizationRegister } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const handoffDigest = {
  generatedAt,
  jsonFileName: "workspace-board-board-release-archive-evidence-handoff-digest-20260529.json",
  summary: {
    digestHash: "sha256:handoff",
    digestScore: 86,
    rowCount: 4,
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;

const decisionMemo = {
  generatedAt,
  jsonFileName: "workspace-board-board-release-archive-assurance-decision-memo-20260529.json",
  summary: {
    memoHash: "sha256:memo",
    memoScore: 71,
    ownerCount: 3,
    status: "conditional",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceDecisionMemoReport;

const reviewerPackets = {
  generatedAt,
  jsonFileName: "workspace-board-board-release-archive-evidence-reviewer-packets-20260529.json",
  summary: {
    packetCount: 4,
    reviewerPacketHash: "sha256:reviewers",
    reviewerScore: 84,
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReviewerPacketReport;

const exceptionRenewals = {
  generatedAt,
  jsonFileName: "workspace-board-board-release-archive-evidence-exception-renewals-20260529.json",
  summary: {
    renewalHash: "sha256:renewals",
    renewalScore: 92,
    rowCount: 4,
    status: "due-soon",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;

const report = createBoardReleaseArchiveAssuranceNotarizationRegister({
  decisionMemo,
  exceptionRenewals,
  generatedAt,
  handoffDigest,
  reviewerPackets,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.notarizedCount, 0);
assert.equal(report.summary.watchCount, 4);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.rows.every((row) => row.exportManifestHash.startsWith("sha256:")), true);
assert.equal(report.rows.every((row) => row.notarizationHash.startsWith("sha256:")), true);
assert.equal(report.rows.some((row) => row.kind === "decision-memo" && row.sourceHash === "sha256:memo"), true);
assert.equal(report.summary.notarizationHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-assurance-notarization-register-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-assurance-notarization-register-20260529.json");
assert.match(report.csvContent, /notarization_id,kind,title,status,source_status,record_count,export_file_name/);
assert.match(report.jsonContent, /"notarizationScore"/);

console.log("board release archive assurance notarization register smoke passed");
