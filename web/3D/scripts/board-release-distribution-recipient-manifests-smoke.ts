import assert from "node:assert/strict";
import type { BoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import { createBoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-23T10:00:00.000Z";

const exportPackets = {
  packets: [
    {
      packetHash: "sha256:packet-ready",
      releasePromotionId: "release-2026-05-20",
      status: "ready",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const notifications = {
  notifications: [
    {
      channel: "email",
      nextAction: "Approve the release packet.",
      notificationId: "route-owner-email",
      recipientEmail: "owner@example.com",
      recipientName: "Ava Owner",
      recipientRole: "owner",
      releasePromotionId: "release-2026-05-20",
      status: "eligible",
      userId: "user-owner",
      workspaceId: "workspace-board",
    },
    {
      channel: "in-app",
      nextAction: "Review suppressed preferences.",
      notificationId: "route-reviewer-in-app",
      recipientEmail: "reviewer@example.com",
      recipientName: "Ray Reviewer",
      recipientRole: "viewer",
      releasePromotionId: "release-2026-05-20",
      status: "suppressed-by-preference",
      userId: "user-reviewer",
      workspaceId: "workspace-board",
    },
    {
      channel: "email",
      nextAction: "Add recipient details.",
      notificationId: "route-missing-email",
      recipientEmail: null,
      recipientName: "Missing Recipient",
      recipientRole: "viewer",
      releasePromotionId: "release-2026-05-20",
      status: "missing-recipient",
      userId: null,
      workspaceId: "workspace-board",
    },
  ],
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseCloseoutNotificationReport;

const members = [
  {
    email: "owner@example.com",
    name: "Ava Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "reviewer@example.com",
    name: "Ray Reviewer",
    role: "editor",
    userId: "user-reviewer",
  },
] as WorkspaceMemberRow[];

const report = createBoardReleaseDistributionRecipientManifestReport({
  exportPackets,
  generatedAt,
  members,
  notifications,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.manifestCount, 3);
assert.equal(report.summary.acknowledgementRequiredCount, 1);
assert.equal(report.summary.grantedAccessCount, 2);
assert.equal(report.summary.missingRecipientCount, 1);
assert.equal(report.summary.suppressedCount, 1);
assert.equal(report.manifests[0]?.packetAccess, "missing-recipient");
assert.equal(report.manifests.find((manifest) => manifest.notificationId === "route-reviewer-in-app")?.recipientRole, "editor");
assert.equal(report.manifests.find((manifest) => manifest.notificationId === "route-owner-email")?.acknowledgementRequirement, "required");
assert.match(report.manifests[0]?.manifestHash ?? "", /^sha256:/);
assert.match(report.csvContent, /manifest_id,release_promotion_id,recipient,role,channel,status,packet_access,acknowledgement_requirement,packet_hash,manifest_hash,next_action/);
assert.match(report.jsonContent, /"packetAccess": "granted"/);
assert.equal(report.csvFileName, "workspace-board-board-release-distribution-recipient-manifests-20260523.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-distribution-recipient-manifests-20260523.json");

console.log("board release distribution recipient manifests smoke passed");
