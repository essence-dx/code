import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import { createBoardReleaseArchiveAssurancePostReleaseAuditChecklist } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import type { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";

const generatedAt = "2026-05-29T10:00:00.000Z";

const distributionMatrix = {
  generatedAt,
  recipients: [
    {
      acknowledgementDeadline: "2026-05-30T10:00:00.000Z",
      audience: "internal-board",
      coverageHash: "sha256:internal-coverage",
      recipient: "owner@example.com",
      status: "covered",
      title: "Internal board archive evidence",
    },
    {
      acknowledgementDeadline: "2026-06-01T10:00:00.000Z",
      audience: "investor",
      coverageHash: "sha256:investor-coverage",
      recipient: "Investor reviewer",
      status: "watch",
      title: "Investor archive evidence",
    },
  ],
  summary: {
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceDistributionMatrixReport;

const exceptionRenewals = {
  generatedAt,
  rows: [
    {
      dueAt: "2026-06-02T10:00:00.000Z",
      id: "renewal:scheduled",
      ownerEmail: "owner@example.com",
      renewalHash: "sha256:renewal-scheduled",
      status: "scheduled",
      title: "Internal board archive evidence acknowledgement",
    },
    {
      dueAt: "2026-05-30T10:00:00.000Z",
      id: "renewal:due-soon",
      ownerEmail: "investor@external.review",
      renewalHash: "sha256:renewal-due-soon",
      status: "due-soon",
      title: "Investor archive evidence acknowledgement",
    },
  ],
  summary: {
    status: "due-soon",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;

const report = createBoardReleaseArchiveAssurancePostReleaseAuditChecklist({
  distributionMatrix,
  exceptionRenewals,
  generatedAt,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "pending");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.closedCount, 2);
assert.equal(report.summary.pendingCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.acknowledgementClosedCount, 1);
assert.equal(report.summary.renewalClosedCount, 1);
assert.equal(report.summary.auditHash.startsWith("sha256:"), true);
assert.equal(report.rows.every((row) => row.proofHash.startsWith("sha256:")), true);
assert.equal(report.rows.some((row) => row.kind === "acknowledgement-completion" && row.status === "closed"), true);
assert.equal(report.rows.some((row) => row.kind === "renewal-closure" && row.status === "pending"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-assurance-post-release-audit-checklist-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-assurance-post-release-audit-checklist-20260529.json");
assert.match(report.csvContent, /audit_id,kind,title,status,owner,due_at/);
assert.match(report.jsonContent, /"checklistScore"/);

console.log("board release archive assurance post-release audit checklist smoke passed");
