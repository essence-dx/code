import assert from "node:assert/strict";
import { createBoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";

const generatedAt = "2026-05-29T10:00:00.000Z";
const currentPacketHash = "sha256:current-packet";

const approvalWorkflow = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "approval.csv",
  generatedAt,
  rows: [
    {
      acknowledgedAt: "2026-05-25T10:00:00.000Z",
      acknowledgement: "acknowledged",
      approvalHash: "sha256:approval-exception",
      exceptionNote: "Temporary exception accepted for stale archive trend evidence.",
      id: "approval-1",
      nextAction: "Keep reviewer acknowledgement.",
      packetHash: currentPacketHash,
      recommendationId: "rec-1",
      recommendationKind: "governance-update",
      recommendationPriority: "high",
      recommendationStatus: "blocked",
      reviewerEmail: "owner@example.com",
      reviewerName: "Owner Reviewer",
      reviewerRole: "owner",
      reviewerUserId: "user-owner",
      signedOffAt: "2026-05-25T11:00:00.000Z",
      signedPacketHash: currentPacketHash,
      status: "approved",
      title: "Archive trend blocker",
    },
    {
      acknowledgedAt: "2026-05-29T07:00:00.000Z",
      acknowledgement: "acknowledged",
      approvalHash: "sha256:approval-hash-mismatch",
      exceptionNote: null,
      id: "approval-2",
      nextAction: "Refresh hash.",
      packetHash: currentPacketHash,
      recommendationId: "rec-2",
      recommendationKind: "remediate-anomaly",
      recommendationPriority: "high",
      recommendationStatus: "watch",
      reviewerEmail: "admin@example.com",
      reviewerName: "Admin Reviewer",
      reviewerRole: "admin",
      reviewerUserId: "user-admin",
      signedOffAt: "2026-05-29T07:30:00.000Z",
      signedPacketHash: "sha256:old-packet",
      status: "hash-mismatch",
      title: "Command center hash",
    },
  ],
  summary: {
    approvedCount: 1,
    exceptionNeededCount: 0,
    hashMismatchCount: 1,
    nextAction: "Refresh hash.",
    packetHash: currentPacketHash,
    pendingCount: 0,
    rejectedCount: 0,
    status: "hash-mismatch",
    totalCount: 2,
    workflowScore: 50,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveIntelligenceApprovalWorkflowReport;

const reviewerPackets = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "reviewer.csv",
  generatedAt,
  jsonContent: "",
  jsonDataUri: "",
  jsonFileName: "reviewer.json",
  packets: [
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 24,
      audience: "internal-board",
      evidenceHash: "sha256:internal-evidence",
      id: "packet-internal",
      nextAction: "Collect acknowledgement.",
      packetHash: "sha256:internal-packet",
      redactedSummary: "Internal summary",
      redactionCount: 0,
      removedFields: [],
      requiredRole: "owner",
      reviewerEmail: "owner@example.com",
      reviewerName: "Owner Reviewer",
      sourceHashes: ["sha256:a"],
      status: "watch",
      title: "Internal board archive evidence",
      visibility: "internal-full",
    },
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 72,
      audience: "investor",
      evidenceHash: "sha256:investor-evidence",
      id: "packet-investor",
      nextAction: "Collect acknowledgement.",
      packetHash: "sha256:investor-packet",
      redactedSummary: "Investor summary",
      redactionCount: 8,
      removedFields: ["raw vault hashes"],
      requiredRole: "external",
      reviewerEmail: null,
      reviewerName: "Investor reviewer",
      sourceHashes: ["sha256:b"],
      status: "watch",
      title: "Investor archive evidence",
      visibility: "external-redacted",
    },
  ],
  summary: {
    acknowledgementRequiredCount: 2,
    blockedCount: 0,
    externalPacketCount: 1,
    nextAction: "Collect acknowledgement.",
    packetCount: 2,
    readyCount: 0,
    reviewerPacketHash: "sha256:reviewer",
    reviewerScore: 84,
    status: "watch",
    totalRedactionCount: 8,
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReviewerPacketReport;

const report = createBoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport({
  approvalWorkflow,
  dueSoonHours: 24,
  exceptionRenewalHours: 72,
  generatedAt,
  reviewerPackets,
  signOffRenewalHours: 24,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "overdue");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.overdueCount, 1);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.dueSoonCount, 1);
assert.equal(report.summary.scheduledCount, 1);
assert.equal(report.rows.some((row) => row.kind === "exception-note" && row.status === "overdue"), true);
assert.equal(report.rows.some((row) => row.kind === "packet-hash-signoff" && row.status === "blocked"), true);
assert.equal(report.rows.some((row) => row.kind === "reviewer-acknowledgement" && row.ownerEmail === "investor@external.review"), true);
assert.equal(report.summary.renewalHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-evidence-exception-renewals-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-evidence-exception-renewals-20260529.json");
assert.match(report.csvContent, /renewal_id,kind,title,status,owner,owner_email,due_at/);
assert.match(report.jsonContent, /"blockedCount": 1/);

console.log("board release archive evidence exception renewal scheduler smoke passed");
