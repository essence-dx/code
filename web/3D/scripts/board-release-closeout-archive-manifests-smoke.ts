import assert from "node:assert/strict";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import { createBoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import type { BoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { BoardReleaseCloseoutReadinessGateReport } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseObservabilityExecutiveDigestReport } from "@/features/projects/board-release-observability-executive-digest";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

const generatedAt = "2026-05-29T10:00:00.000Z";

const observabilityDigest = {
  csvContent: "id,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,id",
  csvFileName: "observability.csv",
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"blocked\"}}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "observability.json",
  rows: [{ id: "event-health", kind: "event-health", status: "blocked" }],
  schemaVersion: 1,
  summary: {
    alertCount: 1,
    blockedCount: 1,
    closeoutScore: 45,
    criticalAlertCount: 1,
    digestScore: 45,
    incidentCount: 1,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    status: "blocked",
    trendDeclineCount: 0,
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityExecutiveDigestReport;

const distributionReadiness = {
  csvContent: "filter_id,filter_kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,filter_id",
  csvFileName: "distribution.csv",
  filters: [{ filterId: "route", filterKind: "route", status: "watch" }],
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"watch\"}}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "distribution.json",
  summary: {
    blockedCount: 0,
    filterCount: 1,
    nextAction: "Review watched delivery routes before final closeout.",
    readyCount: 0,
    readinessScore: 82,
    status: "watch",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionReadinessDashboardReport;

const operationsExportPackets = {
  csvContent: "packet_id,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,packet_id",
  csvFileName: "operations.csv",
  files: [{ fileHash: "sha256:file", fileKind: "archive", fileName: "archive.json", rowCount: 1 }],
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"ready\"}}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "operations.json",
  packets: [{ packetHash: "sha256:packet", packetId: "packet", status: "ready" }],
  summary: {
    blockedCount: 0,
    exportFileCount: 1,
    nextAction: "Operations export packets are signed for closeout.",
    packetCount: 1,
    readyCount: 1,
    signedPacketCount: 1,
    status: "ready",
    varianceBlockerCount: 0,
    varianceCount: 0,
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsExportPacketReport;

const evidenceArchive = {
  csvContent: "archive_id,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,archive_id",
  csvFileName: "evidence.csv",
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"archived\"}}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "evidence.json",
  records: [{ archiveHash: "sha256:archive", archiveId: "archive" }],
  summary: {
    archiveCount: 1,
    latestArchiveHash: "sha256:archive",
    nextAction: "Board evidence release archive is sealed for release promotion.",
    promotionAllowed: true,
    status: "archived",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseArchiveRecordReport;

const readinessGates = {
  generatedAt,
  jsonContent: "{\"gates\":[]}",
  summary: { status: "blocked" },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutReadinessGateReport;

const ownerAcknowledgements = {
  generatedAt,
  jsonContent: "{\"acknowledgements\":[]}",
  summary: { status: "blocked" },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutOwnerAcknowledgementReport;

const report = createBoardReleaseCloseoutArchiveManifestReport({
  distributionReadiness,
  evidenceArchive,
  generatedAt,
  observabilityDigest,
  operationsExportPackets,
  ownerAcknowledgements,
  readinessGates,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.manifestCount, 4);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.summary.readyCount, 2);
assert.equal(report.manifests[0]?.manifestKind, "observability");
assert.equal(report.manifests.find((manifest) => manifest.manifestKind === "evidence")?.status, "ready");
assert.match(report.summary.bundleHash, /^sha256:/);
assert.match(report.summary.readinessGateHash, /^sha256:/);
assert.match(report.summary.ownerAcknowledgementHash, /^sha256:/);
assert.match(report.manifests[0]?.manifestHash ?? "", /^sha256:/);
assert.match(
  report.csvContent,
  /manifest_id,manifest_kind,title,status,source_status,record_count,csv_file_name,json_file_name,evidence_hash,manifest_hash,next_action/,
);
assert.match(report.jsonContent, /"manifestKind": "operations"/);
assert.equal(report.csvFileName, "workspace-board-board-release-closeout-archive-manifests-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-closeout-archive-manifests-20260529.json");

console.log("board release closeout archive manifests smoke passed");
