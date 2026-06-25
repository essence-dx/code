import assert from "node:assert/strict";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import { createBoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";

const generatedAt = "2026-05-26T10:00:00.000Z";

const manifests = {
  summary: {
    blockedCount: 1,
    grantedAccessCount: 2,
    manifestCount: 3,
    missingRecipientCount: 1,
    readyCount: 1,
    suppressedCount: 1,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRecipientManifestReport;

const acknowledgements = {
  summary: {
    acknowledgementCount: 3,
    blockedCount: 1,
    overdueCount: 1,
    pendingCount: 1,
    signedCount: 1,
    waivedCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAcknowledgementReport;

const retries = {
  summary: {
    blockedCount: 1,
    nextAction: "Add recipient contact details before retrying distribution.",
    readyCount: 0,
    retryCount: 2,
    scheduledCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRetryPlanningReport;

const auditTimeline = {
  summary: {
    blockedCount: 1,
    closedCount: 4,
    eventCount: 7,
    nextAction: "Resolve unresolved readiness risks.",
    openCount: 1,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAuditTimelineReport;

const report = createBoardReleaseDistributionReadinessDashboardReport({
  acknowledgements,
  auditTimeline,
  generatedAt,
  manifests,
  retries,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.filterCount, 5);
assert.equal(report.summary.blockedCount, 5);
assert.equal(report.summary.watchCount, 7);
assert.equal(report.filters[0]?.status, "blocked");
assert.equal(report.filters.find((filter) => filter.filterKind === "recipient")?.blockedCount, 1);
assert.equal(report.filters.find((filter) => filter.filterKind === "timeline")?.watchCount, 2);
assert.match(report.filters[0]?.evidenceHash ?? "", /^sha256:/);
assert.match(report.csvContent, /filter_id,filter_kind,title,status,total_count,blocked_count,watch_count,ready_count,evidence_hash,next_action/);
assert.match(report.jsonContent, /"filterKind": "acknowledgement"/);
assert.equal(report.csvFileName, "workspace-board-board-release-distribution-readiness-dashboard-20260526.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-distribution-readiness-dashboard-20260526.json");

console.log("board release distribution readiness dashboard smoke passed");
