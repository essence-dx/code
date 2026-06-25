import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import { createBoardReleaseArchiveAssuranceFinalCloseoutCertificate } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import type { BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

const generatedAt = "2026-05-29T10:00:00.000Z";

const handoffDigest = {
  generatedAt,
  summary: {
    digestHash: "sha256:handoff",
    rowCount: 4,
    status: "ready",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;

const notarizationRegister = {
  generatedAt,
  summary: {
    notarizationHash: "sha256:notarization",
    rowCount: 4,
    status: "notarized",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceNotarizationRegisterReport;

const distributionMatrix = {
  generatedAt,
  summary: {
    distributionHash: "sha256:distribution",
    recipientCount: 4,
    status: "covered",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceDistributionMatrixReport;

const postReleaseAuditChecklist = {
  generatedAt,
  summary: {
    auditHash: "sha256:audit",
    rowCount: 8,
    status: "pending",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport;

const report = createBoardReleaseArchiveAssuranceFinalCloseoutCertificate({
  distributionMatrix,
  generatedAt,
  handoffDigest,
  notarizationRegister,
  postReleaseAuditChecklist,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "conditional");
assert.equal(report.summary.evidenceCount, 4);
assert.equal(report.summary.certifiedCount, 3);
assert.equal(report.summary.conditionalCount, 1);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.certificateHash.startsWith("sha256:"), true);
assert.equal(report.evidence.some((row) => row.kind === "post-release-audit" && row.status === "conditional"), true);
assert.equal(report.evidence.some((row) => row.kind === "handoff-digest" && row.status === "certified"), true);
assert.match(report.certificateText, /CONDITIONAL final archive closeout certificate/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-assurance-final-closeout-certificate-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-assurance-final-closeout-certificate-20260529.json");
assert.match(report.csvContent, /certificate_evidence_id,kind,title,status,source_status,record_count/);
assert.match(report.jsonContent, /"certificateScore"/);

console.log("board release archive assurance final closeout certificate smoke passed");
