import assert from "node:assert/strict";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import { createBoardReleaseObservabilityEventHealthReport } from "@/features/projects/board-release-observability-event-health";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const exportPackets = {
  packets: [
    {
      packetHash: "sha256:packet-ready",
      releasePromotionId: "release-2026-05-20",
      signedAt: "2026-05-24T10:00:00.000Z",
      status: "ready",
    },
  ],
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const acknowledgements = {
  generatedAt: "2026-05-24T12:00:00.000Z",
  summary: {
    blockedCount: 1,
    overdueCount: 1,
    pendingCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAcknowledgementReport;

const retries = {
  generatedAt: "2026-05-26T10:00:00.000Z",
  summary: {
    blockedCount: 0,
    scheduledCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRetryPlanningReport;

const auditTimeline = {
  events: [
    {
      eventType: "export-packet",
      evidenceHash: "sha256:packet-ready",
      occurredAt: "2026-05-24T10:00:00.000Z",
      releasePromotionId: "release-2026-05-20",
    },
    {
      eventType: "acknowledgement",
      evidenceHash: "sha256:ack-pending",
      occurredAt: "2026-05-25T10:00:00.000Z",
      releasePromotionId: "release-2026-05-20",
    },
    {
      eventType: "retry",
      evidenceHash: "sha256:retry-scheduled",
      occurredAt: "2026-05-29T16:00:00.000Z",
      releasePromotionId: "release-2026-05-20",
    },
    {
      eventType: "variance-closure",
      evidenceHash: "sha256:variance-blocked",
      occurredAt: "2026-05-24T13:00:00.000Z",
      releasePromotionId: "release-2026-05-20",
    },
  ],
  generatedAt: "2026-05-26T10:00:00.000Z",
  summary: {
    blockedCount: 1,
    openCount: 1,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAuditTimelineReport;

const readinessDashboard = {
  generatedAt: "2026-05-26T10:00:00.000Z",
  jsonContent: "{}",
  summary: {
    blockedCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionReadinessDashboardReport;

const report = createBoardReleaseObservabilityEventHealthReport({
  acknowledgements,
  auditTimeline,
  exportPackets,
  generatedAt,
  readinessDashboard,
  retries,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.monitorCount, 4);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.watchCount, 2);
assert.equal(report.summary.criticalCount, 2);
assert.equal(report.monitors[0]?.signal, "stuck-acknowledgement");
assert.equal(report.monitors.find((monitor) => monitor.signal === "stale-packet")?.status, "watch");
assert.equal(report.monitors.find((monitor) => monitor.signal === "delayed-retry")?.status, "watch");
assert.match(report.monitors[0]?.monitorHash ?? "", /^sha256:/);
assert.match(report.csvContent, /monitor_id,signal,title,status,severity,release_promotion_id,last_seen_at,evidence_hash,monitor_hash,next_action/);
assert.match(report.jsonContent, /"signal": "unresolved-variance"/);
assert.equal(report.csvFileName, "workspace-board-board-release-observability-event-health-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-observability-event-health-20260529.json");

console.log("board release observability event health smoke passed");
