import assert from "node:assert/strict";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import { createBoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

const generatedAt = "2026-05-26T10:00:00.000Z";

const exportPackets = {
  packets: [
    {
      packetHash: "sha256:packet-ready",
      packetId: "packet-ready",
      releasePromotionId: "release-2026-05-20",
      signedAt: "2026-05-24T10:00:00.000Z",
      signerName: "Ava Owner",
      status: "ready",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const manifests = {
  generatedAt: "2026-05-24T11:00:00.000Z",
  manifests: [
    {
      channel: "email",
      manifestHash: "sha256:manifest-ready",
      manifestId: "manifest-ready",
      nextAction: "Request recipient acknowledgement for the release packet.",
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
      acknowledgementHash: "sha256:ack-pending",
      acknowledgementId: "ack-pending",
      dueAt: "2026-05-25T10:00:00.000Z",
      nextAction: "Capture recipient acknowledgement before distribution closeout.",
      releasePromotionId: "release-2026-05-20",
      signedAt: null,
      signerName: "Ava Owner",
      status: "pending",
    },
  ],
  generatedAt: "2026-05-24T12:00:00.000Z",
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAcknowledgementReport;

const retries = {
  retries: [
    {
      dueAt: "2026-05-26T16:00:00.000Z",
      nextAction: "Resend acknowledgement request before closeout.",
      recipientName: "Ava Owner",
      releasePromotionId: "release-2026-05-20",
      retryAction: "resend-acknowledgement",
      retryHash: "sha256:retry-hash",
      retryId: "retry-expired",
      status: "scheduled",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRetryPlanningReport;

const variance = {
  generatedAt: "2026-05-24T13:00:00.000Z",
  variances: [
    {
      currentValue: "stable",
      id: "closeout-status",
      nextAction: "Closeout status still matches the archived release evidence.",
      severity: "info",
      status: "stable",
      title: "Closeout status",
    },
    {
      currentValue: "critical",
      id: "unresolved-risk",
      nextAction: "Resolve unresolved readiness risks.",
      severity: "critical",
      status: "changed",
      title: "Unresolved readiness risk",
    },
  ],
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseVarianceReport;

const report = createBoardReleaseDistributionAuditTimelineReport({
  acknowledgements,
  exportPackets,
  generatedAt,
  manifests,
  retries,
  variance,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.eventCount, 6);
assert.equal(report.summary.exportPacketCount, 1);
assert.equal(report.summary.deliveryRouteCount, 1);
assert.equal(report.summary.acknowledgementEventCount, 1);
assert.equal(report.summary.retryEventCount, 1);
assert.equal(report.summary.varianceClosureCount, 2);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.events[0]?.eventType, "export-packet");
assert.equal(report.events.at(-1)?.eventType, "retry");
assert.match(report.events[0]?.eventHash ?? "", /^sha256:/);
assert.match(report.csvContent, /event_id,event_type,release_promotion_id,occurred_at,actor,status,evidence_hash,event_hash,next_action/);
assert.match(report.jsonContent, /"eventType": "variance-closure"/);
assert.equal(report.csvFileName, "workspace-board-board-release-distribution-audit-timeline-20260526.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-distribution-audit-timeline-20260526.json");

console.log("board release distribution audit timeline smoke passed");
