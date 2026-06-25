import assert from "node:assert/strict";
import { createBoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";

const generatedAt = "2026-05-23T10:00:00.000Z";

const manifests = {
  manifests: [
    {
      acknowledgementRequirement: "required",
      channel: "email",
      manifestHash: "sha256:required-manifest",
      manifestId: "manifest-required",
      nextAction: "Request recipient acknowledgement for the release packet.",
      packetAccess: "granted",
      packetHash: "sha256:packet-ready",
      recipientEmail: "owner@example.com",
      recipientName: "Ava Owner",
      releasePromotionId: "release-2026-05-20",
      status: "ready",
      workspaceId: "workspace-board",
    },
    {
      acknowledgementRequirement: "suppressed",
      channel: "in-app",
      manifestHash: "sha256:suppressed-manifest",
      manifestId: "manifest-suppressed",
      nextAction: "Review suppressed route preferences before distribution.",
      packetAccess: "granted",
      packetHash: "sha256:packet-ready",
      recipientEmail: "reviewer@example.com",
      recipientName: "Ray Reviewer",
      releasePromotionId: "release-2026-05-20",
      status: "watch",
      workspaceId: "workspace-board",
    },
    {
      acknowledgementRequirement: "waived",
      channel: "email",
      manifestHash: "sha256:missing-manifest",
      manifestId: "manifest-missing",
      nextAction: "Add a recipient before distribution acknowledgement can be requested.",
      packetAccess: "missing-recipient",
      packetHash: "sha256:packet-ready",
      recipientEmail: null,
      recipientName: "Missing Recipient",
      releasePromotionId: "release-2026-05-20",
      status: "blocked",
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRecipientManifestReport;

const report = createBoardReleaseDistributionAcknowledgementReport({
  generatedAt,
  manifests,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.acknowledgementCount, 3);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.pendingCount, 1);
assert.equal(report.summary.waivedCount, 0);
assert.equal(report.acknowledgements.find((acknowledgement) => acknowledgement.manifestId === "manifest-required")?.status, "pending");
assert.equal(report.acknowledgements.find((acknowledgement) => acknowledgement.manifestId === "manifest-required")?.dueAt, "2026-05-25T10:00:00.000Z");
assert.equal(report.acknowledgements.find((acknowledgement) => acknowledgement.manifestId === "manifest-suppressed")?.status, "blocked");
assert.match(report.acknowledgements[0]?.acknowledgementHash ?? "", /^sha256:/);
assert.match(report.csvContent, /acknowledgement_id,release_promotion_id,signer,recipient_email,status,due_at,signed_at,packet_hash,manifest_hash,acknowledgement_hash,next_action/);
assert.match(report.jsonContent, /"status": "pending"/);
assert.equal(report.csvFileName, "workspace-board-board-release-distribution-acknowledgements-20260523.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-distribution-acknowledgements-20260523.json");

console.log("board release distribution acknowledgements smoke passed");
