import assert from "node:assert/strict";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import { createBoardReleaseCloseoutReadinessGateReport } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseObservabilityExecutiveDigestReport } from "@/features/projects/board-release-observability-executive-digest";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const observabilityDigest = {
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"blocked\"}}",
  summary: {
    alertCount: 3,
    blockedCount: 5,
    closeoutScore: 0,
    criticalAlertCount: 2,
    digestScore: 27,
    incidentCount: 3,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    status: "blocked",
    trendDeclineCount: 3,
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityExecutiveDigestReport;

const distributionReadiness = {
  generatedAt,
  jsonContent: "{\"summary\":{\"readinessScore\":72}}",
  summary: {
    blockedCount: 2,
    filterCount: 5,
    nextAction: "Resolve blocked delivery routes before distribution closeout.",
    readyCount: 8,
    readinessScore: 72,
    status: "blocked",
    watchCount: 3,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionReadinessDashboardReport;

const exportPackets = {
  generatedAt,
  jsonContent: "{}",
  packets: [
    {
      packetHash: "sha256:packet",
      status: "watch",
    },
  ],
  summary: {
    blockedCount: 0,
    exportFileCount: 6,
    nextAction: "Review watched release operations evidence before final packet distribution.",
    packetCount: 1,
    readyCount: 0,
    signedPacketCount: 1,
    status: "watch",
    varianceBlockerCount: 0,
    varianceCount: 2,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const archiveRecords = {
  csvContent: "archive_id,release_promotion_id\n",
  csvDataUri: "data:text/csv;charset=utf-8,archive_id",
  csvFileName: "archive.csv",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "archive.json",
  records: [],
  summary: {
    archiveCount: 1,
    latestArchiveHash: "sha256:archive",
    nextAction: "Board evidence release archive is sealed for release promotion.",
    promotionAllowed: true,
    status: "archived",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseArchiveRecordReport;

const report = createBoardReleaseCloseoutReadinessGateReport({
  archiveRecords,
  distributionReadiness,
  exportPackets,
  generatedAt,
  observabilityDigest,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.gateCount, 4);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.summary.readyCount, 1);
assert.equal(report.summary.readinessScore, 73);
assert.equal(report.gates[0]?.gateKind, "observability-digest");
assert.equal(report.gates.find((gate) => gate.gateKind === "evidence-archive")?.status, "ready");
assert.equal(report.gates.find((gate) => gate.gateKind === "signed-export-packets")?.score, 92);
assert.match(report.gates[0]?.gateHash ?? "", /^sha256:/);
assert.match(report.csvContent, /gate_id,gate_kind,title,status,score,metric,evidence_hash,gate_hash,next_action/);
assert.match(report.jsonContent, /"gateKind": "signed-export-packets"/);
assert.equal(report.csvFileName, "workspace-board-board-release-closeout-readiness-gates-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-closeout-readiness-gates-20260529.json");

console.log("board release closeout readiness gates smoke passed");
