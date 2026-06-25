import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import type { BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import type { BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import { createBoardReleaseArchiveCertificationEvidenceReplayVerifier } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

const generatedAt = "2026-05-29T10:00:00.000Z";

const handoffDigest = {
  summary: {
    digestHash: "sha256:handoff",
    rowCount: 4,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;

const notarizationRegister = {
  summary: {
    notarizationHash: "sha256:notarization",
    rowCount: 4,
    status: "notarized",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceNotarizationRegisterReport;

const distributionMatrix = {
  summary: {
    distributionHash: "sha256:distribution",
    recipientCount: 4,
    status: "covered",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceDistributionMatrixReport;

const postReleaseAuditChecklist = {
  summary: {
    auditHash: "sha256:audit",
    rowCount: 8,
    status: "closed",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport;

const finalCloseoutCertificate = {
  evidence: [
    {
      evidenceHash: "sha256:handoff",
      kind: "handoff-digest",
    },
    {
      evidenceHash: "sha256:notarization",
      kind: "notarization",
    },
    {
      evidenceHash: "sha256:distribution",
      kind: "distribution",
    },
    {
      evidenceHash: "sha256:audit",
      kind: "post-release-audit",
    },
  ],
  summary: {
    certificateHash: "sha256:certificate",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;

const historyLedger = {
  rows: [
    {
      certificateHash: "sha256:certificate",
      version: "v3-final-closeout",
    },
  ],
  summary: {
    currentVersion: "v3-final-closeout",
    rowCount: 3,
    status: "current",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationHistoryLedgerReport;

const report = createBoardReleaseArchiveCertificationEvidenceReplayVerifier({
  distributionMatrix,
  finalCloseoutCertificate,
  generatedAt,
  handoffDigest,
  historyLedger,
  notarizationRegister,
  postReleaseAuditChecklist,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "matched");
assert.equal(report.summary.rowCount, 5);
assert.equal(report.summary.matchedCount, 5);
assert.equal(report.summary.driftCount, 0);
assert.equal(report.summary.missingCount, 0);
assert.equal(report.summary.replayHash.startsWith("sha256:"), true);
assert.equal(report.rows.every((row) => row.replayHash.startsWith("sha256:")), true);
assert.equal(report.rows.some((row) => row.kind === "history-ledger" && row.status === "matched"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-certification-evidence-replay-verifier-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-certification-evidence-replay-verifier-20260529.json");
assert.match(report.csvContent, /replay_id,kind,title,status,source_status,record_count/);
assert.match(report.jsonContent, /"replayScore"/);

const driftReport = createBoardReleaseArchiveCertificationEvidenceReplayVerifier({
  distributionMatrix: {
    ...distributionMatrix,
    summary: {
      ...distributionMatrix.summary,
      distributionHash: "sha256:changed-distribution",
    },
  } as BoardReleaseArchiveAssuranceDistributionMatrixReport,
  finalCloseoutCertificate,
  generatedAt,
  handoffDigest,
  historyLedger,
  notarizationRegister,
  postReleaseAuditChecklist,
  workspaceId: "workspace-board",
});

assert.equal(driftReport.summary.status, "drift");
assert.equal(driftReport.summary.driftCount, 1);
assert.equal(driftReport.rows.some((row) => row.kind === "distribution" && row.status === "drift"), true);

console.log("board release archive certification evidence replay verifier smoke passed");
