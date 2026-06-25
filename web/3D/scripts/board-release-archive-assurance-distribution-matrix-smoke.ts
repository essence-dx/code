import assert from "node:assert/strict";
import { createBoardReleaseArchiveAssuranceDistributionMatrix } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import type { BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const notarizationRegister = {
  generatedAt,
  rows: [
    {
      kind: "handoff-digest",
      notarizationHash: "sha256:handoff-notary",
      status: "watch",
    },
    {
      kind: "reviewer-packets",
      notarizationHash: "sha256:reviewer-notary",
      status: "watch",
    },
  ],
  summary: {
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceNotarizationRegisterReport;

const reviewerPackets = {
  generatedAt,
  packets: [
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 24,
      audience: "internal-board",
      packetHash: "sha256:internal-packet",
      reviewerEmail: "owner@example.com",
      reviewerName: "Owner",
      status: "ready",
      title: "Internal board archive evidence",
    },
    {
      acknowledgementRequired: true,
      acknowledgementWindowHours: 72,
      audience: "investor",
      packetHash: "sha256:investor-packet",
      reviewerEmail: null,
      reviewerName: "Investor reviewer",
      status: "watch",
      title: "Investor archive evidence",
    },
  ],
  summary: {
    packetCount: 2,
    status: "watch",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReviewerPacketReport;

const report = createBoardReleaseArchiveAssuranceDistributionMatrix({
  generatedAt,
  notarizationRegister,
  reviewerPackets,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "watch");
assert.equal(report.summary.recipientCount, 2);
assert.equal(report.summary.coveredCount, 0);
assert.equal(report.summary.watchCount, 2);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.distributionHash.startsWith("sha256:"), true);
assert.equal(report.recipients.every((recipient) => recipient.coverageHash.startsWith("sha256:")), true);
assert.equal(report.recipients.some((recipient) => recipient.audience === "internal-board" && recipient.route === "internal-workspace"), true);
assert.equal(report.recipients.some((recipient) => recipient.audience === "investor" && recipient.route === "investor-data-room"), true);
assert.equal(report.recipients[0]?.acknowledgementDeadline, "2026-05-30T10:00:00.000Z");
assert.equal(report.csvFileName, "workspace-board-board-release-archive-assurance-distribution-matrix-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-assurance-distribution-matrix-20260529.json");
assert.match(report.csvContent, /distribution_id,audience,title,status,route,recipient/);
assert.match(report.jsonContent, /"matrixScore"/);

console.log("board release archive assurance distribution matrix smoke passed");
