import { strict as assert } from "node:assert";
import { createBoardReleaseArchiveOversightExecutiveHealthPacket } from "@/features/projects/board-release-archive-oversight-executive-health-packet";
import type { BoardReleaseArchiveOversightBoardDistributionDigestReport } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";
import type { BoardReleaseArchiveOversightEvidenceQualityMonitorReport } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";
import type { BoardReleaseArchiveOversightExceptionRenewalCalendarReport } from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";
import type { BoardReleaseArchiveOversightIncidentReplayDrillReport } from "@/features/projects/board-release-archive-oversight-incident-replay-drill";

const generatedAt = "2026-05-29T12:00:00.000Z";
const workspaceId = "Workspace Board";

function renewal(status: BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"]["status"]): BoardReleaseArchiveOversightExceptionRenewalCalendarReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      completedCount: 5,
      dueSoonCount: status === "watch" ? 1 : 0,
      nextAction: "Archive oversight exception renewal calendar is scheduled.",
      overdueCount: status === "blocked" ? 1 : 0,
      renewalCalendarHash: "sha256:renewal-calendar",
      renewalScore: status === "scheduled" ? 100 : status === "watch" ? 86 : 42,
      rowCount: 5,
      scheduledCount: status === "scheduled" ? 5 : 4,
      status,
    },
    workspaceId,
  };
}

function quality(status: BoardReleaseArchiveOversightEvidenceQualityMonitorReport["summary"]["status"]): BoardReleaseArchiveOversightEvidenceQualityMonitorReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      healthyCount: status === "healthy" ? 5 : 4,
      missingAttestationCount: status === "blocked" ? 1 : 0,
      nextAction: "Archive oversight evidence quality monitor is healthy.",
      qualityMonitorHash: "sha256:quality-monitor",
      qualityScore: status === "healthy" ? 100 : status === "watch" ? 88 : 52,
      reviewerDriftCount: status === "watch" ? 1 : 0,
      rowCount: 5,
      staleHashCount: status === "watch" ? 1 : 0,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function distribution(status: BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"]["status"]): BoardReleaseArchiveOversightBoardDistributionDigestReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      distributionDigestHash: "sha256:distribution-digest",
      distributionScore: status === "ready" ? 100 : status === "watch" ? 84 : 44,
      nextAction: "Archive oversight board distribution digest is ready.",
      readyCount: status === "ready" ? 4 : 3,
      rowCount: 4,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

function replay(status: BoardReleaseArchiveOversightIncidentReplayDrillReport["summary"]["status"]): BoardReleaseArchiveOversightIncidentReplayDrillReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      drillHash: "sha256:incident-replay",
      drillScore: status === "passed" ? 100 : status === "watch" ? 74 : 36,
      nextAction: "Archive oversight incident replay drill is passed.",
      passedCount: status === "passed" ? 3 : 2,
      rowCount: 3,
      status,
      watchCount: status === "watch" ? 1 : 0,
    },
    workspaceId,
  };
}

const approved = createBoardReleaseArchiveOversightExecutiveHealthPacket({
  boardDistributionDigest: distribution("ready"),
  evidenceQualityMonitor: quality("healthy"),
  exceptionRenewalCalendar: renewal("scheduled"),
  generatedAt,
  incidentReplayDrill: replay("passed"),
  workspaceId,
});

assert.equal(approved.summary.status, "approved");
assert.equal(approved.summary.rowCount, 5);
assert.equal(approved.summary.approvedCount, 5);
assert.equal(approved.summary.blockedCount, 0);
assert.equal(approved.summary.watchCount, 0);
assert.equal(approved.summary.healthScore, 100);
assert.match(approved.summary.releaseRecommendation, /^APPROVE archive oversight health packet/);
assert.deepEqual(
  approved.rows.map((row) => row.kind),
  ["exception-renewals", "evidence-quality", "board-distribution", "incident-replay", "release-recommendation"],
);
assert.equal(approved.csvFileName, "workspace-board-board-release-archive-oversight-executive-health-packet-20260529.csv");
assert.equal(approved.jsonFileName, "workspace-board-board-release-archive-oversight-executive-health-packet-20260529.json");
assert.match(approved.csvContent, /^health_id,kind,title,status,score,evidence_hash/);

const blocked = createBoardReleaseArchiveOversightExecutiveHealthPacket({
  boardDistributionDigest: distribution("ready"),
  evidenceQualityMonitor: quality("blocked"),
  exceptionRenewalCalendar: renewal("scheduled"),
  generatedAt,
  incidentReplayDrill: replay("blocked"),
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.blockedCount > 0);
assert.match(blocked.summary.releaseRecommendation, /^BLOCK archive oversight health packet/);

const watch = createBoardReleaseArchiveOversightExecutiveHealthPacket({
  boardDistributionDigest: distribution("watch"),
  evidenceQualityMonitor: quality("healthy"),
  exceptionRenewalCalendar: renewal("scheduled"),
  generatedAt,
  incidentReplayDrill: replay("passed"),
  workspaceId,
});

assert.equal(watch.summary.status, "watch");
assert.ok(watch.summary.watchCount > 0);

console.log("board release archive oversight executive health packet smoke passed");
