import assert from "node:assert/strict";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import { createBoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";

const generatedAt = "2026-05-26T10:00:00.000Z";

const manifests = {
  manifests: [
    {
      acknowledgementRequirement: "waived",
      manifestHash: "sha256:missing-manifest",
      manifestId: "manifest-missing",
      packetAccess: "missing-recipient",
      packetHash: null,
      recipientEmail: null,
      recipientName: "Missing Recipient",
      releasePromotionId: "release-2026-05-20",
      status: "blocked",
      workspaceId: "workspace-board",
    },
    {
      acknowledgementRequirement: "suppressed",
      manifestHash: "sha256:suppressed-manifest",
      manifestId: "manifest-suppressed",
      packetAccess: "granted",
      packetHash: "sha256:packet-ready",
      recipientEmail: "reviewer@example.com",
      recipientName: "Ray Reviewer",
      releasePromotionId: "release-2026-05-20",
      status: "watch",
      workspaceId: "workspace-board",
    },
    {
      acknowledgementRequirement: "required",
      manifestHash: "sha256:expired-manifest",
      manifestId: "manifest-expired",
      packetAccess: "granted",
      packetHash: "sha256:packet-ready",
      recipientEmail: "owner@example.com",
      recipientName: "Ava Owner",
      releasePromotionId: "release-2026-05-20",
      status: "ready",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRecipientManifestReport;

const acknowledgements = {
  acknowledgements: [
    {
      acknowledgementHash: "sha256:missing-ack",
      acknowledgementId: "ack-missing",
      dueAt: null,
      manifestId: "manifest-missing",
      packetHash: null,
      status: "blocked",
    },
    {
      acknowledgementHash: "sha256:suppressed-ack",
      acknowledgementId: "ack-suppressed",
      dueAt: null,
      manifestId: "manifest-suppressed",
      packetHash: "sha256:packet-ready",
      status: "blocked",
    },
    {
      acknowledgementHash: "sha256:expired-ack",
      acknowledgementId: "ack-expired",
      dueAt: "2026-05-25T10:00:00.000Z",
      manifestId: "manifest-expired",
      packetHash: "sha256:packet-ready",
      status: "pending",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAcknowledgementReport;

const report = createBoardReleaseDistributionRetryPlanningReport({
  acknowledgements,
  generatedAt,
  manifests,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.retryCount, 3);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.scheduledCount, 2);
assert.equal(report.summary.missingRecipientCount, 1);
assert.equal(report.summary.suppressedRouteCount, 1);
assert.equal(report.summary.expiredAcknowledgementCount, 1);
assert.equal(report.retries[0]?.reason, "missing-recipient");
assert.equal(report.retries.find((retry) => retry.reason === "expired-acknowledgement")?.retryAction, "resend-acknowledgement");
assert.equal(report.retries.find((retry) => retry.reason === "expired-acknowledgement")?.dueAt, "2026-05-26T16:00:00.000Z");
assert.match(report.retries[0]?.retryHash ?? "", /^sha256:/);
assert.match(report.csvContent, /retry_id,release_promotion_id,recipient,status,reason,retry_action,due_at,acknowledgement_id,packet_hash,retry_hash,next_action/);
assert.match(report.jsonContent, /"reason": "suppressed-route"/);
assert.equal(report.csvFileName, "workspace-board-board-release-distribution-retry-planning-20260526.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-distribution-retry-planning-20260526.json");

console.log("board release distribution retry planning smoke passed");
